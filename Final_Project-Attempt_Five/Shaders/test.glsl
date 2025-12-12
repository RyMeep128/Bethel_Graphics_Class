#version 300 es
precision mediump float;

in vec2 texCords;
out vec4 FragColor;

// G-buffer
uniform sampler2D gAlbedo;
uniform sampler2D gSpecular;   // rgb = spec color, a = shininess
uniform sampler2D gNormalTex;  // eye-space normal [-1,1]
uniform sampler2D gPosition;   // eye-space position

// Paper
uniform sampler2D paperTex;

// Lights
uniform vec4  uLightPos[5];
uniform vec4  uLightColor[5];
uniform vec4  uLightAmbient[5];
uniform vec4  uLightEnabled[5];
uniform vec4  uLightDirection[5];
uniform float uLightCutoff[5]; // ALREADY cos(theta)

// Palette
uniform vec3 color0;
uniform vec3 color1;

// Watercolor constants
uniform float k_ambient;
uniform float k_diffuse;
uniform float k_specular;
uniform float p;

uniform float h;
uniform float v;

uniform float k_theta;
uniform float k_delta;
uniform float k_omega;
uniform float k_r;
uniform float alphaScalingFactor;
uniform float patchCuttoff;

// ---------------- helpers ----------------
float saturate(float x) { return clamp(x, 0.0, 1.0); }
vec3  saturate(vec3 x)  { return clamp(x, vec3(0.0), vec3(1.0)); }

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float sceneDepth(vec3 p) { return length(p); }

// Edge detection
float edgeFactor(vec2 uv, vec3 nC) {
    vec2 dx = vec2(h, 0.0);
    vec2 dy = vec2(0.0, v);

    vec3 posR = texture(gPosition, uv + dx).xyz;
    vec3 posL = texture(gPosition, uv - dx).xyz;
    vec3 posU = texture(gPosition, uv + dy).xyz;
    vec3 posD = texture(gPosition, uv - dy).xyz;

    float depthGrad =
    abs(sceneDepth(posR) - sceneDepth(posL)) +
    abs(sceneDepth(posU) - sceneDepth(posD));

    vec3 nR = normalize(texture(gNormalTex, uv + dx).xyz);
    vec3 nL = normalize(texture(gNormalTex, uv - dx).xyz);
    vec3 nU = normalize(texture(gNormalTex, uv + dy).xyz);
    vec3 nD = normalize(texture(gNormalTex, uv - dy).xyz);

    float normalGrad =
    (1.0 - dot(nC, nR)) +
    (1.0 - dot(nC, nL)) +
    (1.0 - dot(nC, nU)) +
    (1.0 - dot(nC, nD));

    float e = (depthGrad * 0.75 + normalGrad * 2.0) * k_delta;
    return smoothstep(0.08, 0.35, e);
}

float bandValue(float x) {
    float bands = mix(18.0, 5.0, saturate(k_theta));
    return floor(x * bands) / bands;
}

// Spotlight factor (cutoff already cosine)
float spotFactor(int i, vec3 L) {
    float cutoff = uLightCutoff[i];

    // 180° or invalid → omnidirectional
    if (cutoff <= 0.0 || cutoff >= 0.9999) return 1.0;

    vec3 spotDir = normalize(uLightDirection[i].xyz);
    float cd = dot(spotDir, normalize(-L));

    return smoothstep(cutoff, cutoff + 0.05, cd);
}

void main() {
    vec2 uv = texCords;

    vec3 albedo = texture(gAlbedo, uv).rgb;
    vec4 specPack = texture(gSpecular, uv);
    vec3 specColor = specPack.rgb;
    float shininess = max(specPack.a, 1.0) * max(p, 1.0);

    vec3 N = normalize(texture(gNormalTex, uv).xyz);
    vec3 P = texture(gPosition, uv).xyz;
    vec3 V = normalize(-P);

    // Paper
    vec2 paperUV = uv * max(k_r, 0.0001);
    float paperN = texture(paperTex, paperUV).r;
    float paper = saturate(mix(paperN, hash21(uv * 1024.0), 0.15));

    float ambAcc = 0.0;
    float diffAcc = 0.0;
    float specAcc = 0.0;

    for (int i = 0; i < 5; i++) {
        if (uLightEnabled[i].x + uLightEnabled[i].y + uLightEnabled[i].z <= 0.0)
        continue;

        vec3 lightCol = uLightColor[i].rgb;
        float lc = luma(lightCol);

        vec3 L;
        float atten = 1.0;

        bool hasDirection = length(uLightDirection[i].xyz) > 0.0001;

        if (!hasDirection) {
            // point light
            vec3 toLight = uLightPos[i].xyz - P;
            float dist = length(toLight);
            L = toLight / max(dist, 1e-4);
            atten = 1.0 / (1.0 + 0.09 * dist + 0.032 * dist * dist);
        } else {
            // directional / spot
            L = normalize(-uLightDirection[i].xyz);
        }

        float spot = hasDirection ? spotFactor(i, L) : 1.0;
        float NdotL = saturate(dot(N, L));

        if (uLightEnabled[i].x > 0.0)
        ambAcc += luma(uLightAmbient[i].rgb) * atten;

        if (uLightEnabled[i].y > 0.0)
        diffAcc += NdotL * lc * atten * spot;

        if (uLightEnabled[i].z > 0.0) {
            vec3 H = normalize(L + V);
            float spec = pow(saturate(dot(N, H)), shininess);
            specAcc += spec * lc * luma(specColor) * atten * spot;
        }
    }

    float lit = k_ambient * ambAcc +
    k_diffuse * diffAcc +
    k_specular * specAcc;

    lit = saturate(lit);

    // ----- watercolor stylization -----
    float banded = bandValue(lit);

    vec3 pigment = mix(color1, color0, banded);
    pigment = mix(pigment, albedo, 0.30);
    pigment *= mix(0.65, 1.35, lit);

    float gran = (0.5 - paper) * 2.0;
    pigment *= (1.0 + gran * k_omega);

    float patchMask = smoothstep(patchCuttoff, patchCuttoff + 0.12, paper);
    pigment = mix(pigment * 0.55, pigment, patchMask);

    float e = edgeFactor(uv, N);
    vec3 finalRGB = pigment * (1.0 - 0.55 * e);
    finalRGB = mix(finalRGB, finalRGB * (0.92 + 0.16 * paper), 0.6);

    float alpha = alphaScalingFactor *
    mix(0.82, 1.0, patchMask) *
    (1.0 - 0.3 * e);

    FragColor = vec4(saturate(finalRGB), saturate(alpha));
}
