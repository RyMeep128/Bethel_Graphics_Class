#version 300 es
/**
 * @file ReferenceKuwaharaFragmentShader.glsl
 * @author Ryan Shafer
 * @remarks Comments by ChatGPT model 5.2.
 *
 * @description
 * Reference anisotropic Kuwahara filter driven by a structure tensor.
 *
 * High-level idea:
 * 1) Read the structure tensor at the current pixel (prevOutput).
 * 2) Compute a dominant orientation from the tensor (largest eigenvector).
 * 3) Build an anisotropy transform that stretches sampling along the dominant direction
 *    (and compresses across it).
 * 4) For each of SECTOR_COUNT angular sectors around the pixel:
 *    - sample a wedge-shaped neighborhood (radius, sector angles),
 *    - compute a weighted average color and its variance,
 * 5) Pick the sector with the lowest variance (smoothest region) and output its mean color.
 *
 * Inputs:
 * - prevOutput      : structure tensor texture (packed: R=Axx, G=Ayy, B=Axy)
 * - originalOutput  : the *color* texture to actually sample for the filter result
 *
 * Credit:
 * - Adapted from Maxime Heckel, "On Crafting Painterly Shaders" (CC BY-NC 4.0).
 */

precision highp float;
precision lowp int;

/**
 * UV coordinates for this fragment (from fullscreen quad).
 */
in vec2 texCords;

/**
 * Structure tensor texture from a previous pass.
 * Packed channels:
 *  - .r = Axx = (Sx·Sx)
 *  - .g = Ayy = (Sy·Sy)
 *  - .b = Axy = (Sx·Sy)
 */
uniform sampler2D prevOutput;

/**
 * Original color buffer to be filtered (the thing you want to look painterly).
 */
uniform sampler2D originalOutput;

/**
 * Filter radius in pixels. Controls sampling extent.
 */
uniform int radius;

/**
 * Screen size packed into a vec4. Only .xy are used as (width, height).
 * Used for pixel -> UV conversion and gl_FragCoord normalization.
 */
uniform vec4 screenSize;

/**
 * Number of angular sectors used by the Kuwahara filter.
 * More sectors can produce smoother directional results but cost more samples.
 */
const int SECTOR_COUNT = 8;

/**
 * Final filtered color output.
 */
out vec4 fColor;

// -----------------------------------------------------------------------------
// Color-space helper
// -----------------------------------------------------------------------------

/**
 * Converts linear RGB to approximate sRGB (gamma-corrected).
 * This is useful if originalOutput is stored/treated as linear and you want an sRGB-like output.
 *
 * @param linearRGB - Linear color (rgb) with alpha preserved.
 * @returns Gamma-corrected color (approx sRGB).
 */
vec4 fromLinear(vec4 linearRGB) {
    bvec3 cutoff = lessThan(linearRGB.rgb, vec3(0.0031308));
    vec3 higher = vec3(1.055) * pow(linearRGB.rgb, vec3(1.0 / 2.4)) - vec3(0.055);
    vec3 lower  = linearRGB.rgb * vec3(12.92);
    return vec4(mix(higher, lower, cutoff), linearRGB.a);
}

// -----------------------------------------------------------------------------
// Sampling helpers
// -----------------------------------------------------------------------------

/**
 * Samples the color buffer in *pixel space* by offsetting gl_FragCoord.
 *
 * Important detail:
 * - Uses gl_FragCoord.xy (pixel coordinates of current fragment)
 * - Adds a pixel offset
 * - Normalizes by screenSize.xy to obtain UV for texture sampling
 *
 * This makes offsets naturally "in pixels", which is convenient for filters.
 *
 * @param offset - Pixel offset from the current fragment.
 * @returns RGB color sampled from originalOutput.
 */
vec3 sampleColor(vec2 offset) {
    vec2 coord = (gl_FragCoord.xy + offset) / screenSize.xy;
    return texture(originalOutput, coord).rgb;
}

// -----------------------------------------------------------------------------
// Tensor -> orientation helpers
// -----------------------------------------------------------------------------

/**
 * Computes the dominant orientation for the structure tensor by extracting eigen info.
 *
 * The tensor is interpreted as a symmetric 2×2 matrix:
 *    [ Axx  Axy ]
 *    [ Axy  Ayy ]
 *
 * Returns:
 * - xy : normalized eigenvector corresponding to the larger eigenvalue (dominant direction)
 * - z  : lambda1 (larger eigenvalue)
 * - w  : lambda2 (smaller eigenvalue)
 *
 * @param prevOutputTex - Packed tensor value (R=Axx, G=Ayy, B=Axy).
 * @returns vec4(eigenVec.x, eigenVec.y, lambda1, lambda2)
 */
vec4 findLargerEigenValue(vec4 prevOutputTex) {
    float A_xx = prevOutputTex.r;
    float A_yy = prevOutputTex.g;
    float A_xy = prevOutputTex.b;

    // Eigenvalues for 2x2 symmetric matrix via trace/determinant.
    float trace = A_xx + A_yy;
    float determinant = A_xx * A_yy - A_xy * A_xy;

    float disc = trace * trace * 0.25 - determinant;
    float lambda1 = trace * 0.5 + sqrt(max(disc, 0.0));
    float lambda2 = trace * 0.5 - sqrt(max(disc, 0.0));

    vec2 v;

    // If A_xy is not ~0, compute eigenvector from (A - λI)v = 0.
    if (abs(A_xy) > 1e-6) {
        // One possible eigenvector form for lambda1:
        // v = (1, -(A_xx - lambda1)/A_xy)
        v = vec2(1.0, -(A_xx - lambda1) / A_xy);
    } else {
        // If off-diagonal is ~0, tensor is axis-aligned:
        // pick x-axis if Axx >= Ayy else y-axis.
        if (A_xx >= A_yy) v = vec2(1.0, 0.0);
        else             v = vec2(0.0, 1.0);
    }

    return vec4(normalize(v), lambda1, lambda2);
}

// -----------------------------------------------------------------------------
// Weighting + sector statistics
// -----------------------------------------------------------------------------

/**
 * Polynomial weight used to downweight samples far from the center or outside the sector shape.
 * Heuristic form:
 *   w = max(0, ((x + eta) - lambda*y^2)^2)
 *
 * @param x - Sample offset x in the sector's (anisotropy-transformed) coordinates.
 * @param y - Sample offset y in the sector's (anisotropy-transformed) coordinates.
 * @param eta - Horizontal bias/shift term.
 * @param lambda - Controls the parabola "tightness" in y.
 * @returns Non-negative weight.
 */
float polynomialWeight(float x, float y, float eta, float lambda) {
    float polyValue = (x + eta) - lambda * (y * y);
    return max(0.0, polyValue * polyValue);
}

/**
 * Computes the average color and variance of samples within a wedge-shaped sector.
 *
 * The sector is defined by:
 * - a base angle (sector direction),
 * - an angular half-width (halfV),
 * - a radial range [1..radius],
 * with offsets transformed by anisotropyMat to produce oriented/anisotropic sampling.
 *
 * Variance is computed in RGB, then converted to a luminance-like scalar to compare sectors.
 *
 * @param anisotropyMat - 2×2 transform aligning and stretching sample offsets.
 * @param angle - Central angle of the sector.
 * @param radius - Sampling radius in pixels.
 * @param avgColor - Output: weighted mean color for this sector.
 * @param variance - Output: scalar variance (lower means smoother region).
 */
void getSectorVarianceAndAverageColor(
mat2 anisotropyMat,
float angle,
float radius,
out vec3 avgColor,
out float variance
) {
    vec3 weightedColorSum        = vec3(0.0);
    vec3 weightedSquaredColorSum = vec3(0.0);
    float totalWeight            = 0.0;

    // Heuristic parameters for the polynomial weight.
    float eta    = 0.1;
    float lambda = 0.5;

    // Sector sampling settings:
    // - halfV sets the wedge half-angle
    // - step controls angular sampling density
    float halfV = 3.14 / 8.0;     // ~22.5°
    float step  = 3.14 / 16.0;    // ~11.25°

    for (float r = 1.0; r <= radius; r += 1.0) {
        for (float a = -halfV; a <= halfV + 1e-6; a += step) {
            // Raw offset in the sector direction (in pixels).
            vec2 sampleOffset = r * vec2(cos(angle + a), sin(angle + a));

            // Apply anisotropy: rotate into dominant direction + stretch/compress.
            sampleOffset *= anisotropyMat;

            // Sample the original color buffer at that offset.
            vec3 color = sampleColor(sampleOffset);

            // Weight this sample based on its offset.
            float weight = polynomialWeight(sampleOffset.x, sampleOffset.y, eta, lambda);

            weightedColorSum        += color * weight;
            weightedSquaredColorSum += color * color * weight;
            totalWeight             += weight;
        }
    }

    // Weighted mean color
    avgColor = weightedColorSum / totalWeight;

    // Weighted variance per channel: E[x^2] - (E[x])^2
    vec3 varianceRGB = (weightedSquaredColorSum / totalWeight) - (avgColor * avgColor);

    // Convert RGB variance to a luminance-like scalar for comparison.
    variance = dot(varianceRGB, vec3(0.299, 0.587, 0.114));
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

void main() {
    // Read the structure tensor for this pixel.
    vec4 structureTensor = texture(prevOutput, texCords);

    // Storage for each sector's stats.
    vec3  sectorAvgColors[SECTOR_COUNT];
    float sectorVariances[SECTOR_COUNT];

    // Extract dominant direction and eigenvalues.
    vec4 lambda = findLargerEigenValue(structureTensor);
    vec2 orientation = lambda.xy;

    // Measure anisotropy: (λ1 - λ2) / (λ1 + λ2).
    // - near 0 => isotropic (no clear direction)
    // - near 1 => strongly directional
    float anisotropy = (lambda.z - lambda.w) / (lambda.z + lambda.w + 0.000001);

    // Build scaling factors that control how stretched the filter is along the dominant direction.
    // alpha is a stabilizer that keeps scaling from exploding when anisotropy is small.
    float alpha  = 25.0;
    float scaleX = alpha / (anisotropy + alpha);
    float scaleY = (anisotropy + alpha) / alpha;

    // Rotation matrix from orientation, then scale in the rotated basis.
    // This produces an oriented ellipse-like sampling domain.
    mat2 anisotropyMat =
    mat2(orientation.x, -orientation.y,
    orientation.y,  orientation.x) *
    mat2(scaleX, 0.0,
    0.0,   scaleY);

    // Compute average + variance for each sector around the pixel.
    for (int i = 0; i < SECTOR_COUNT; i++) {
        float angle = float(i) * (2.0 * 3.14) / float(SECTOR_COUNT);
        getSectorVarianceAndAverageColor(
        anisotropyMat,
        angle,
        float(radius),
        sectorAvgColors[i],
        sectorVariances[i]
        );
    }

    // Select the sector with the minimum variance (smoothest neighborhood).
    float minVariance = sectorVariances[0];
    vec3 finalColor = sectorAvgColors[0];

    for (int i = 1; i < SECTOR_COUNT; i++) {
        if (sectorVariances[i] < minVariance) {
            minVariance = sectorVariances[i];
            finalColor = sectorAvgColors[i];
        }
    }

    // Output final color. Converted from linear to approximate sRGB.
    vec4 color = vec4(finalColor, 1.0);
    fColor = fromLinear(color);
}
