#version 300 es
precision mediump float;

in vec2 texCords;

uniform sampler2D prevOutput;
uniform sampler2D paperTex;

// 0.0 = no paper, 1.0 = full paper effect
const float paperStrength = 0.8;

// Scale paper UVs (e.g. vec2(2.0) makes grain smaller/tighter; vec2(0.5) makes it bigger)
const vec2 paperScale = vec2(1.0);

out vec4 fColor;

void main() {
    vec4 base = texture(prevOutput, texCords);

    vec2 puv = texCords * paperScale;
    vec3 paper = texture(paperTex, puv).rgb;

    vec3 paperMod = mix(vec3(1.0), paper, paperStrength);

    fColor = vec4(base.rgb * paperMod, base.a);
}
