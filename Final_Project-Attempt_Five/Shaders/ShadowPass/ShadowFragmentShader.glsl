#version 300 es
precision mediump float;

in vec2 texCords;

uniform sampler2D gAlbedo;
uniform sampler2D gNormalTex;
uniform sampler2D gPosition;

uniform vec4 uLightPos[5];
uniform vec4 uLightEnabled[5];
uniform vec4 uLightDirection[5];
uniform float uLightCutoff[5];

uniform sampler2D paperTex;

layout(location = 0) out vec4 watercolorShadowTex;

float maxLightAmount(vec3 N, vec3 P) {
    float m = 0.0;
    for (int i = 0; i < 5; ++i) {
        if (uLightEnabled[i].y <= 0.0) continue;

        vec3 L = normalize(uLightPos[i].xyz - P);
        vec3 LD = normalize(uLightDirection[i].xyz);

        if (dot(LD, L) < uLightCutoff[i]) continue;

        float ndl = max(dot(N, L), 0.0);
        m = max(m, ndl);
    }
    return m;
}

void main() {
    vec3 albedo = texture(gAlbedo, texCords).rgb;
    vec3 N = normalize(texture(gNormalTex, texCords).xyz);
    vec3 P = texture(gPosition, texCords).xyz;
    vec3 paper = texture(paperTex, texCords).rgb;

    float Lm = maxLightAmount(N, P);

    // Shadow band: only keep pixels below threshold
    float shadowCut = 0.35;               // tune this
    if (Lm > shadowCut) discard;

    vec3 base = paper * albedo;
    float darken = 0.45;                  // tune this
    vec3 shadowColor = base * (1.0 - darken);

    float alpha = clamp(1.0 - (base.r*0.8 + base.g*0.1 + base.b*0.7), 0.0, 1.0);
    watercolorShadowTex = vec4(shadowColor, alpha);
}
