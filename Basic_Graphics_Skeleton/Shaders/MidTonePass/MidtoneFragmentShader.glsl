#version 300 es
precision mediump float;
precision lowp int;

in vec2 texCords;

// === G-buffer inputs ===
uniform sampler2D gAlbedo;       // location 0
uniform sampler2D gSpecular;     // location 1  (unused here but available)
uniform sampler2D gNormalTex;    // location 2
uniform sampler2D gPosition;     // location 3

// === Scene lights ===
uniform vec4 uLightPos[5];
uniform vec4 uLightColor[5];     // diffuse color/intensity (unused here)
uniform vec4 uLightAmbient[5];   // ambient color (unused here)
uniform vec4 uLightEnabled[5];   // .x ambient, .y diffuse, .z specular
uniform vec4 uLightDirection[5]; // spotlight direction
uniform float uLightCutoff[5];   // spotlight cosine cutoff

// === Watercolor / shading params ===
uniform sampler2D paperTex;
uniform vec3 cameraPos;
uniform float k_ambient;   // unused here, kept for consistency
uniform float k_diffuse;   // unused here, kept for consistency
uniform float k_specular;  // unused here, kept for consistency
uniform float p;           // unused here, kept for consistency

// Output: the watercolor midtone layer
layout(location = 0) out vec4 watercolorMidtoneTex;

void main() {
    // ----- G-buffer fetch -----
    vec3 albedo   = texture(gAlbedo,    texCords).rgb;
    vec3 normal   = normalize(texture(gNormalTex, texCords).xyz);
    vec3 position = texture(gPosition,  texCords).xyz;

    // ----- Soft toon mask over all lights (like their NdotL trick) -----
    float maxSoftToon = 0.0;

    for (int i = 0; i < 5; ++i) {
        // Skip lights with diffuse disabled
        if (uLightEnabled[i].y <= 0.0) {
            continue;
        }

        // Direction from fragment to light and spotlight cone test
        vec3 L  = normalize(uLightPos[i].xyz - position);
        vec3 LD = normalize(uLightDirection[i].xyz);

        // Spotlight cutoff: only consider fragments inside the cone
        if (dot(LD, L) < uLightCutoff[i]) {
            continue;
        }

        // Match their slightly odd NdotL = dot(lightPos, normal)
        float NdotL = dot(uLightPos[i].xyz, normal);

        // Radius and half-vector kept for parity with their code (unused)
        float r = length(uLightPos[i].xyz - position);
        vec3 h = (cameraPos + uLightPos[i].xyz) /
        length(cameraPos + uLightPos[i].xyz);

        // Soft toon band as in reference: smoothstep on NdotL
        float softToon = smoothstep(1.8, 2.0, NdotL);
        maxSoftToon = max(maxSoftToon, softToon);
    }

    // If any light says "inside the soft toon band", discard
    // (this mimics their `if (softToon > 0.0) discard;`)
    if (maxSoftToon > 0.0) {
        discard;
    }

    // ----- Paper * baseColor, like their midtone -----
    vec3 paperColor = texture(paperTex, texCords).rgb;

    // In your pipeline, this midtone pass is modulating the base albedo
    vec3 baseColor  = albedo;

    vec3 color = paperColor * baseColor;

    // Same alpha heuristic as reference
    float alpha = (1.0 - (color.r * 0.8 + color.g * 0.1 + color.b * 0.7)) * 0.9;

    watercolorMidtoneTex = vec4(color, alpha);
}
