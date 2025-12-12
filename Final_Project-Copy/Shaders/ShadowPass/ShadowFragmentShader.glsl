#version 300 es
precision mediump float;
precision lowp int;

in vec2 texCords;

// G-buffer inputs
uniform sampler2D gAlbedo;       // location 0
uniform sampler2D gSpecular;     // location 1  (unused here but available)
uniform sampler2D gNormalTex;    // location 2
uniform sampler2D gPosition;     // location 3

uniform sampler2D prevInput;

// Scene lights
uniform vec4 uLightPos[5];
uniform vec4 uLightColor[5];     // diffuse color/intensity
uniform vec4 uLightAmbient[5];   // ambient color (unused here, but available)
uniform vec4 uLightEnabled[5];   // .x ambient, .y diffuse, .z specular
uniform vec4 uLightDirection[5]; // spotlight direction
uniform float uLightCutoff[5];   // spotlight cosine cutoff

// Watercolor / shading params
uniform sampler2D paperTex;
uniform vec3 cameraPos;
uniform float k_ambient;   // unused here, kept for consistency
uniform float k_diffuse;   // unused here, kept for consistency
uniform float k_specular;  // unused here, kept for consistency
uniform float p;           // unused here, kept for consistency

// Output: the watercolor shadow layer
layout(location = 0) out vec4 watercolorShadowTex;

void main() {

    // Extract G-buffer data
    vec3 albedo   = texture(gAlbedo,    texCords).rgb;
    vec3 normal   = normalize(texture(gNormalTex, texCords).xyz);
    vec3 position = texture(gPosition,  texCords).xyz;

    // Paper color (screen-space UV)
    vec3 paperColor = texture(paperTex, texCords).rgb;

    bool litByAnyLight = false;

    // Loop over all 5 lights
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

        // === Toon-style light term ===
        // Using normalized N·L, so this is in [-1, 1].
        float NdotL = dot(normal, L);

        float toon = smoothstep(1.5, 1.7, NdotL);

        // Distance attenuation (1/r^2),
        float r     = length(uLightPos[i].xyz - position);
        float inv_r2 = 1.0 / max(r * r, 0.0001);

        float toonIntensity = toon * inv_r2 * length(uLightColor[i].rgb);

        // If this light "hits" the fragment, we treat it as lit and discard
        if (toonIntensity > 0.0) {
            litByAnyLight = true;
            break;
        }
    }

    // Match the reference: lit regions are discarded in the shadow pass
    if (litByAnyLight) {
        discard;
    }

    // Shadow color: paper * base color (no extra lighting)
    vec3 color = paperColor * albedo;

    float k = 0.3; // how strong the extra dark is
    vec3 shadowColor = color * (1.0 - k);

    // Watercolor-style alpha
    float alpha = (1.0 - (color.r * 0.8 +
    color.g * 0.1 +
    color.b * 0.7));

    watercolorShadowTex = vec4(shadowColor, alpha);
}
