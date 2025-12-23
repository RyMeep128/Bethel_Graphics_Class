#version 300 es
/**
 * @file GBufferKuwaharaFragmentShader.glsl
 * @author Ryan Shafer
 * @remarks Comments by ChatGPT model 5.2.
 *
 * @description
 * Your anisotropic Kuwahara attempt that:
 * - uses a *structure tensor* (prevOutput) to choose an orientation + anisotropy scaling,
 * - samples *lit color* from originalOutput to produce the final stylized image,
 * - but computes *sub_Box variance* from G-buffer-derived features (albedo luminance,
 *   normal difference, depth difference) for stability under lighting changes,
 * - and applies an edge-stopping weight using normals + depth to prevent bleeding across edges.
 *
 * Pipeline expectations:
 * - prevOutput is a tensor texture where:
 *     R = Axx = Sx·Sx
 *     G = Ayy = Sy·Sy
 *     B = Axy = Sx·Sy
 * - originalOutput is the image you want to filter (usually the lit composite).
 * - gAlbedo, gNormalTex, gPosition are the G-buffer feature textures.

  * Credit:
 * - Adapted from Maxime Heckel, "On Crafting Painterly Shaders" (CC BY-NC 4.0).
 */

precision highp float;
precision lowp int;

/** UV coordinates from fullscreen quad. */
in vec2 texCords;

/**
 * Tensor field texture produced earlier.
 * Packed (R,G,B) = (Axx, Ayy, Axy).
 */
uniform sampler2D prevOutput;
/**
Test for commit
*/

/** Lit/composited color buffer to be stylized by the filter. */
uniform sampler2D originalOutput;

/** G-buffer features used to compute variance and edge stopping. */
uniform sampler2D gAlbedo;
uniform sampler2D gNormalTex;
uniform sampler2D gPosition;

/** Filter radius in pixels (sampling extent). */
uniform int radius;

/** Screen size (xy = width,height). Used to convert pixel offsets -> UV offsets. */
uniform vec4 screenSize;

/** Output filtered color. */
out vec4 fColor;

/** Number of wedge sub_Boxs (angular partitions) used by the filter. */
const int SUB_BOX_COUNT = 8;

/**
 * Edge-stopping and feature variance controls.
 * - NORMAL_POWER   : exponent applied to normal similarity weight
 * - DEPTH_FALLOFF  : exponential falloff for depth difference in edge stop
 * - DEPTH_SCALE    : scale factor for depth feature variance
 * - FEATURE_WEIGHTS: weights used to reduce vec3 feature variance into scalar variance
 *                   (e.g., vec3(lumWeight, normalWeight, depthWeight))
 */
uniform float NORMAL_POWER;
uniform float DEPTH_FALLOFF;
uniform float DEPTH_SCALE;
uniform vec3  FEATURE_WEIGHTS;

// -----------------------------------------------------------------------------
// Color-space helper
// -----------------------------------------------------------------------------

/**
 * Converts linear RGB into approximate sRGB (gamma corrected).
 * Useful when your intermediate buffers are linear but you want display-ready output.
 */
vec4 fromLinear(vec4 linearRGB) {
    bvec3 cutoff = lessThan(linearRGB.rgb, vec3(0.0031308));
    vec3 higher = vec3(1.055) * pow(linearRGB.rgb, vec3(1.0 / 2.4)) - vec3(0.055);
    vec3 lower  = linearRGB.rgb * vec3(12.92);
    return vec4(mix(higher, lower, cutoff), linearRGB.a);
}

// -----------------------------------------------------------------------------
// Sampling helpers (pixel offsets -> UV)
// -----------------------------------------------------------------------------

/**
 * Samples the lit image (originalOutput) using a *pixel-space* offset.
 *
 * @param offset - Pixel offset relative to the current fragment.
 * @returns RGB lit color at that offset.
 */
vec3 sampleColor(vec2 offset) {
    vec2 xy = texCords + offset / screenSize.xy;
    return texture(originalOutput, xy).rgb;
}

/** Samples the albedo G-buffer using a pixel-space offset. */
vec3 sampleAlbedo(vec2 offset) {
    vec2 xy = texCords + offset / screenSize.xy;
    return texture(gAlbedo, xy).rgb;
}

/** Samples and normalizes the normal G-buffer using a pixel-space offset. */
vec3 sampleNormal(vec2 offset) {
    vec2 xy = texCords + offset / screenSize.xy;
    return normalize(texture(gNormalTex, xy).xyz);
}

/**
 * Samples eye-space depth from gPosition.z (stored as eye-space position).
 * You negate z so that "forward" distance becomes positive if eye-space forward is -Z.
 */
float sampleDepth(vec2 offset) {
    vec2 xy = texCords + offset / screenSize.xy;
    return -texture(gPosition, xy).z;
}

// -----------------------------------------------------------------------------
// Tensor -> dominant orientation
// -----------------------------------------------------------------------------

/**
 * Extracts dominant orientation from a packed 2x2 structure tensor.
 *
 * Interprets the tensor as:
 *   [Axx Axy]
 *   [Axy Ayy]
 *
 * Returns:
 * - xy : eigenvector for the larger eigenvalue (dominant direction)
 * - z  : lambda1 (larger eigenvalue)
 * - w  : lambda2 (smaller eigenvalue)
 */
vec4 findLargerEigenValue(vec4 prevOutputTex) {
    float A_xx = prevOutputTex.r;
    float A_yy = prevOutputTex.g;
    float A_xy = prevOutputTex.b;

    float trace = A_xx + A_yy;
    float determinant = A_xx * A_yy - A_xy * A_xy;

    float disc = trace * trace * 0.25 - determinant;

    // NOTE: if disc can go slightly negative from precision, you may want max(disc,0.0).
    float lambda1 = trace * 0.5 + sqrt(disc);
    float lambda2 = trace * 0.5 - sqrt(disc);

    vec2 v;
    if (abs(A_xy) > 0.0001) {
        // One valid eigenvector form for lambda1:
        v = vec2(1.0, -(A_xx - lambda1) / A_xy);
    } else {
        // Axis-aligned fallback
        v = (A_xx >= A_yy) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    }

    return vec4(normalize(v), lambda1, lambda2);
}

// -----------------------------------------------------------------------------
// Weights
// -----------------------------------------------------------------------------

/**
 * Polynomial wedge weight used in Kuwahara-style sampling.
 * This biases samples toward a sub_Box-shaped region.
 */
float polynomialWeight(float x, float y, float eta, float lambda) {
    float polyValue = (x + eta) - lambda * (y * y);
    return max(0.0, polyValue * polyValue);
}

/**
 * Edge-stopping weight that reduces bleeding across geometry edges.
 *
 * It combines:
 * - normal similarity (raised to NORMAL_POWER), and
 * - depth similarity via exp(-DEPTH_FALLOFF * |d - dCenter|).
 *
 * @param offset  - Pixel offset for the sample point.
 * @param nCenter - Center normal at this fragment.
 * @param dCenter - Center depth at this fragment.
 * @returns Weight in [0,1] (approximately), small across discontinuities.
 */
float edgeStopWeight(vec2 offset, vec3 nCenter, float dCenter) {
    vec3 n = sampleNormal(offset);
    float d = sampleDepth(offset);

    // Normal similarity: 1 = same direction, 0 = orthogonal/opposite (clamped)
    float nSim = clamp(dot(n, nCenter), 0.0, 1.0);
    float wN = pow(nSim, NORMAL_POWER);

    // Depth similarity: decays with absolute depth difference
    float dd = abs(d - dCenter);
    float wD = exp(-DEPTH_FALLOFF * dd);

    return wN * wD;
}

// -----------------------------------------------------------------------------
// SubBox statistics
// -----------------------------------------------------------------------------

/**
 * Computes the average lit color and a scalar variance for one sub_Box.
 *
 * Average:
 * - computed from originalOutput (lit color) using combined weights.
 *
 * Variance:
 * - computed from G-buffer features to be less sensitive to lighting:
 *   feature vector = (albedo luminance, normal difference, depth difference)
 * - feature variance is then reduced to a scalar via dot(featVar, FEATURE_WEIGHTS).
 *
 * @param anisotropyMat - Oriented scaling matrix controlling the anisotropic sample footprint.
 * @param angle         - SubBox center direction (radians).
 * @param radiusF       - Radius in pixels as float.
 * @param avgColor      - Output weighted average lit color for the sub_Box.
 * @param variance      - Output scalar variance (lower is smoother).
 */
void getSubBoxVarianceAndAverageColor(
mat2 anisotropyMat,
float angle,
float radiusF,
out vec3 avgColor,
out float variance
) {
    vec3  weightedColorSum = vec3(0.0);
    float totalWeight      = 0.0;

    // Accumulators for feature mean/variance
    vec3 featSum   = vec3(0.0);
    vec3 featSqSum = vec3(0.0);

    // Center features (used for edge stop + relative diffs)
    vec3  nCenter = sampleNormal(vec2(0.0));
    float dCenter = sampleDepth(vec2(0.0));

    // Polynomial weight params (heuristics)
    float eta    = 0.1;
    float lambda = 0.5;

    // Your wedge sampling: +/- 0.392699 (~22.5°) around the sub_Box angle,
    // in steps of 0.196349 (~11.25°).

    float halfV = 3.14 / 8.0;
    float step  = 3.14 / 16.0;

    for (float r = 1.0; r <= radiusF; r += 1.0) {
        for (float a = -halfV; a <= halfV + 1e-6; a += step) {

            // Base offset direction within this sub_Box (in pixels)
            vec2 sampleOffset = r * vec2(cos(angle + a), sin(angle + a));

            // Apply anisotropic orientation/scaling
            sampleOffset *= anisotropyMat;

            // Combined weight = wedge weight * edge-stopping weight
            float wPoly = polynomialWeight(sampleOffset.x, sampleOffset.y, eta, lambda);
            float wEdge = edgeStopWeight(sampleOffset, nCenter, dCenter);
            float w     = wPoly * wEdge;

            // ---- Mean color from lit buffer (what you actually output)
            vec3 color = sampleColor(sampleOffset);
            weightedColorSum += color * w;

            // ---- Feature variance from G-buffer (for robust sub_Box choice)
            vec3 albedo = sampleAlbedo(sampleOffset);

            // Albedo luminance feature
            float lum = dot(albedo, vec3(0.299, 0.587, 0.114));

            // Normal difference feature (0 = same, 1 = very different)
            vec3 n = sampleNormal(sampleOffset);
            float nDiff = 1.0 - clamp(dot(n, nCenter), 0.0, 1.0);

            // Depth difference feature (scaled)
            float d = sampleDepth(sampleOffset);
            float dDiff = abs(d - dCenter) * DEPTH_SCALE;

            vec3 feat = vec3(lum, nDiff, dDiff);

            featSum   += feat * w;
            featSqSum += (feat * feat) * w;

            totalWeight += w;
        }
    }

    // Normalize sums
    float invW = 1.0 / max(totalWeight, 0.0001);

    // SubBox mean lit color
    avgColor = weightedColorSum * invW;

    // Feature mean and variance
    vec3 featMean = featSum * invW;
    vec3 featVar  = (featSqSum * invW) - (featMean * featMean);

    // Reduce vec3 variance into a scalar using user-supplied weights
    variance = dot(featVar, FEATURE_WEIGHTS);
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

void main() {
    // Tensor value for this pixel (drives orientation + anisotropy footprint)
    vec4 structureTensor = texture(prevOutput, texCords);

    vec3  subBoxAvgColors[SUB_BOX_COUNT];
    float subBoxVariances[SUB_BOX_COUNT];

    // Dominant direction + eigenvalues from the tensor
    vec4 lambda = findLargerEigenValue(structureTensor);
    vec2 orientation = lambda.xy;

    // Anisotropy measure: (λ1 - λ2) / (λ1 + λ2)
    float anisotropy = (lambda.z - lambda.w) / (lambda.z + lambda.w + 0.000001);

    // Stabilized scaling: keeps footprint sane when anisotropy is small
    float alpha  = 25.0;
    float scaleX = alpha / (anisotropy + alpha);
    float scaleY = (anisotropy + alpha) / alpha;

    // Rotation into dominant direction
    mat2 R = mat2(
    orientation.x, -orientation.y,
    orientation.y, orientation.x
    );

    // Anisotropic scaling (ellipse)
    mat2 S = mat2(
    scaleX, 0.0,
    0.0, scaleY
    );

    // Combined anisotropy transform
    mat2 anisotropyMat = R * S;

    // Evaluate each box
    for (int i = 0; i < SUB_BOX_COUNT; i++) {
        float angle = float(i) * (2.0 * 3.14) / float(SUB_BOX_COUNT);
        getSubBoxVarianceAndAverageColor(
        anisotropyMat,
        angle,
        float(radius),
        subBoxAvgColors[i],
        subBoxVariances[i]
        );
    }

    // Choose the sub_Box with minimum variance (most "uniform" region)
    float minVariance = subBoxVariances[0];
    vec3 finalColor = subBoxAvgColors[0];

    for (int i = 1; i < SUB_BOX_COUNT; i++) {
        if (subBoxVariances[i] < minVariance) {
            minVariance = subBoxVariances[i];
            finalColor = subBoxAvgColors[i];
        }
    }

    // Output gamma-corrected result
    fColor = fromLinear(vec4(finalColor, 1.0));
}
