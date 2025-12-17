#version 300 es
precision highp float;
precision lowp int;

in vec2 texCords;
uniform sampler2D prevOutput;
uniform sampler2D originalOutput;

uniform int radius;
uniform vec4 screenSize;

const int SECTOR_COUNT = 8;

out vec4 fColor;
//Adapted from Maxime Heckel, On Crafting Painterly Shaders (CC BY-NC 4.0).

// Adapted from https://www.color.org/chardata/rgb/srgb.xalter
vec4 fromLinear(vec4 linearRGB) {
    bvec3 cutoff = lessThan(linearRGB.rgb, vec3(0.0031308));
    vec3 higher = vec3(1.055)*pow(linearRGB.rgb, vec3(1.0/2.4)) - vec3(0.055);
    vec3 lower = linearRGB.rgb * vec3(12.92);
    return vec4(mix(higher, lower, cutoff), linearRGB.a);
}


//u=p+delta/(W,H)

vec3 sampleColor(vec2 offset) {
    vec2 coord = (gl_FragCoord.xy + offset) / screenSize.xy;
    return texture(originalOutput, coord).rgb;
}


vec4 findLargerEigenValue(vec4 prevOutputTex) {
    //Make a syymetric matrix
    //    Axx Axy
    //    Axy Ayy
    float A_xx = prevOutputTex.r;
    float A_yy = prevOutputTex.g;
    float A_xy = prevOutputTex.b;

    float trace = A_xx + A_yy;
    float determinant = A_xx * A_yy - A_xy * A_xy;

    float lambda1 = trace * 0.5 + sqrt(trace * trace * 0.25 - determinant);
    float lambda2 = trace * 0.5 - sqrt(trace * trace * 0.25 - determinant);

    float jxyStrength = abs(A_xy) / (abs(A_xx) + abs(A_yy) + abs(A_xy) + 1e-7);

    vec2 v;

    if (abs(A_xy) > 1e-6) {
        v = vec2(1.0, -(A_xx - lambda1) / A_xy);
    } else {
        if ((A_xx >= A_yy))
        {
            v =  vec2(1.0, 0.0);
        }
        else {
            v =vec2(0.0, 1.0);
        }
    }

    return vec4(normalize(v), lambda1, lambda2);
}

float polynomialWeight(float x, float y, float eta, float lambda) {
    float polyValue = (x + eta) - lambda * (y * y);
    return max(0.0, polyValue * polyValue);
}

void getSectorVarianceAndAverageColor(mat2 anisotropyMat, float angle, float radius, out vec3 avgColor, out float variance) {
    vec3 weightedColorSum = vec3(0.0);
    vec3 weightedSquaredColorSum = vec3(0.0);
    float totalWeight = 0.0;

    float eta = 0.1;
    float lambda = 0.5;

    float halfV = 3.14 / 8.0;          // ~22
    float step = 3.14 / 16.0;               // ~11°

    for (float r = 1.0; r <= radius; r += 1.0) {
        for (float a = -halfV; a <= halfV + 1e-6; a += step){
            vec2 sampleOffset = r * vec2(cos(angle + a), sin(angle + a));
            sampleOffset *= anisotropyMat;

            vec3 color = sampleColor(sampleOffset);
            float weight = polynomialWeight(sampleOffset.x, sampleOffset.y, eta, lambda);

            weightedColorSum += color * weight;
            weightedSquaredColorSum += color * color * weight;
            totalWeight += weight;
        }
    }

    // Calculate average color and variance
    avgColor = weightedColorSum / totalWeight;
    vec3 varianceRes = (weightedSquaredColorSum / totalWeight) - (avgColor * avgColor);
    variance = dot(varianceRes, vec3(0.299, 0.587, 0.114));// Convert to luminance
}


void main() {
    vec4 structureTensor = texture(prevOutput, texCords);

    vec3 sectorAvgColors[SECTOR_COUNT];
    float sectorVariances[SECTOR_COUNT];

    vec4 lambda = findLargerEigenValue(structureTensor);
    vec2 orientation = lambda.xy;


    float anisotropy = (lambda.z - lambda.w) / (lambda.z + lambda.w + 0.000001);

    float alpha = 25.0;
    float scaleX = alpha / (anisotropy + alpha);
    float scaleY = (anisotropy + alpha) / alpha;

//    R
    mat2 anisotropyMat = mat2(orientation.x, -orientation.y, orientation.y, orientation.x) * mat2(scaleX, 0.0, 0.0, scaleY);

    for (int i = 0; i < SECTOR_COUNT; i++) {
        float angle = float(i) * (2.0*3.14) / float(SECTOR_COUNT);
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

    vec4 color = vec4(finalColor, 1.0);
    fColor = fromLinear(color);
}
