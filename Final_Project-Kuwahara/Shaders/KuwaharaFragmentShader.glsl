#version 300 es
precision highp float;
precision lowp int;

in vec2 texCords;

uniform sampler2D prevOutput;
uniform sampler2D originalOutput;

uniform sampler2D gAlbedo;
uniform sampler2D gNormalTex;
uniform sampler2D gPosition;

uniform int radius;
uniform vec4 screenSize;// xy = (width, height)

out vec4 fColor;

const int SECTOR_COUNT = 8;

const float NORMAL_POWER  = 2.0;// higher = stronger normal edge stopping
const float DEPTH_FALLOFF = 2.0;// higher = stronger depth edge stopping
const float DEPTH_SCALE   = 0.05;// scales depth diffs into a sane range for variance
const vec3  FEATURE_WEIGHTS = vec3(1.0, 2.0, 1.0);// (albedo lum, normal diff, depth diff)

//Adapted from Maxime Heckel, On Crafting Painterly Shaders (CC BY-NC 4.0).


// Adapted from https://www.color.org/chardata/rgb/srgb.xalter
vec4 fromLinear(vec4 linearRGB) {
    bvec3 cutoff = lessThan(linearRGB.rgb, vec3(0.0031308));
    vec3 higher = vec3(1.055) * pow(linearRGB.rgb, vec3(1.0 / 2.4)) - vec3(0.055);
    vec3 lower  = linearRGB.rgb * vec3(12.92);
    return vec4(mix(higher, lower, cutoff), linearRGB.a);
}

vec3 sampleColor(vec2 offset) {
    vec2 xy = texCords + offset / screenSize.xy;
    return texture(originalOutput, xy).rgb;
}

vec3 sampleAlbedo(vec2 offset) {
    vec2 xy = texCords + offset / screenSize.xy;
    return texture(gAlbedo, xy).rgb;
}

vec3 sampleNormal(vec2 offset) {
    vec2 xy = texCords + offset / screenSize.xy;
    return normalize(texture(gNormalTex, xy).xyz);
}

float sampleDepth(vec2 offset) {
    vec2 xy = texCords + offset / screenSize.xy;
    return -texture(gPosition, xy).z;
}

vec4 findLargerEigenValue(vec4 prevOutputTex) {
    // Symmetric matrix:
    // [Axx Axy]
    // [Axy Ayy]
    float A_xx = prevOutputTex.r;
    float A_yy = prevOutputTex.g;
    float A_xy = prevOutputTex.b;

    float trace = A_xx + A_yy;
    float determinant = A_xx * A_yy - A_xy * A_xy;

    float disc = trace * trace * 0.25 - determinant;
    float lambda1 = trace * 0.5 + sqrt(disc);
    float lambda2 = trace * 0.5 - sqrt(disc);

    vec2 v;
    if (abs(A_xy) > 0.0001) {
        v = vec2(1.0, -(A_xx - lambda1) / A_xy);
    } else {
        v = (A_xx >= A_yy) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    }

    return vec4(normalize(v), lambda1, lambda2);
}

float polynomialWeight(float x, float y, float eta, float lambda) {
    float polyValue = (x + eta) - lambda * (y * y);
    return max(0.0, polyValue * polyValue);
}

float edgeStopWeight(vec2 offset, vec3 nCenter, float dCenter) {
    vec3 n = sampleNormal(offset);
    float d = sampleDepth(offset);

    float nSim = clamp(dot(n, nCenter), 0.0, 1.0);
    float wN = pow(nSim, NORMAL_POWER);

    float dd = abs(d - dCenter);
    float wD = exp(-DEPTH_FALLOFF * dd);

    return wN * wD;
}


void getSectorVarianceAndAverageColor(mat2 anisotropyMat, float angle, float radiusF, out vec3 avgColor, out float variance)
{
    vec3 weightedColorSum = vec3(0.0);
    float totalWeight = 0.0;

    vec3 featSum = vec3(0.0);
    vec3 featSqSum = vec3(0.0);

    vec3 nCenter = sampleNormal(vec2(0.0));
    float dCenter = sampleDepth(vec2(0.0));

    float eta = 0.1;
    float lambda = 0.5;

    for (float r = 1.0; r <= radiusF; r += 1.0) {
        for (float a = -0.392699; a <= 0.392699; a += 0.196349) {
            vec2 sampleOffset = r * vec2(cos(angle + a), sin(angle + a));
            sampleOffset *= anisotropyMat;

            float wPoly = polynomialWeight(sampleOffset.x, sampleOffset.y, eta, lambda);
            float wEdge = edgeStopWeight(sampleOffset, nCenter, dCenter);
            float w = wPoly * wEdge;

            // Average LIT color (stylize lit result)
            vec3 color = sampleColor(sampleOffset);
            weightedColorSum += color * w;

            // Variance features from GBuffer (stable under lighting)
            vec3 albedo = sampleAlbedo(sampleOffset);
            float lum = dot(albedo, vec3(0.299, 0.587, 0.114));

            vec3 n = sampleNormal(sampleOffset);
            float nDiff = 1.0 - clamp(dot(n, nCenter), 0.0, 1.0);

            float d = sampleDepth(sampleOffset);
            float dDiff = abs(d - dCenter) * DEPTH_SCALE;

            vec3 feat = vec3(lum, nDiff, dDiff);

            featSum   += feat * w;
            featSqSum += (feat * feat) * w;

            totalWeight += w;
        }
    }

    float invW = 1.0 / max(totalWeight, 1e-6);
    avgColor = weightedColorSum * invW;

    vec3 featMean = featSum * invW;
    vec3 featVar  = (featSqSum * invW) - (featMean * featMean);

    variance = dot(featVar, FEATURE_WEIGHTS);
}

void main() {
    vec4 structureTensor = texture(prevOutput, texCords);

    vec3 sectorAvgColors[SECTOR_COUNT];
    float sectorVariances[SECTOR_COUNT];

    vec4 lambda = findLargerEigenValue(structureTensor);
    vec2 orientation = lambda.xy;

    float anisotropy = (lambda.z - lambda.w) / (lambda.z + lambda.w + 1e-6);

    float alpha = 25.0;
    float scaleX = alpha / (anisotropy + alpha);
    float scaleY = (anisotropy + alpha) / alpha;

    // Rotate into orientation, then scale for anisotropy
    mat2 R = mat2(orientation.x, -orientation.y,
    orientation.y, orientation.x);

    mat2 S = mat2(scaleX, 0.0,
    0.0, scaleY);

    mat2 anisotropyMat = R * S;

    for (int i = 0; i < SECTOR_COUNT; i++) {
        float angle = float(i) * (2.0 * 3.14159265) / float(SECTOR_COUNT);
        getSectorVarianceAndAverageColor(anisotropyMat, angle, float(radius), sectorAvgColors[i], sectorVariances[i]);
    }

    float minVariance = sectorVariances[0];
    vec3 finalColor = sectorAvgColors[0];

    for (int i = 1; i < SECTOR_COUNT; i++) {
        if (sectorVariances[i] < minVariance) {
            minVariance = sectorVariances[i];
            finalColor = sectorAvgColors[i];
        }
    }

    fColor = fromLinear(vec4(finalColor, 1.0));

}
