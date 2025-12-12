#version 300 es
precision mediump float;

in vec2 texCords;

uniform float k_theta;
uniform float k_delta;
uniform float h;          // 1/width  (you already upload these)
uniform float v;          // 1/height

uniform sampler2D prevOutput;
uniform sampler2D paperTex;

layout(location = 0) out vec4 edgeMod;

void main() {
    vec4 base = texture(prevOutput, texCords);

    // --- Paper grain darkness (0..1) ---
    vec3 paper = texture(paperTex, texCords).rgb;
    float paperDark = 1.0 - (paper.r*0.5 + paper.g*0.2 + paper.b*0.5);
    paperDark = clamp(paperDark, 0.0, 1.0);

    // --- Edge strength from alpha gradient ---
    float aC = base.a;
    float aR = texture(prevOutput, texCords + vec2(h, 0.0)).a;
    float aL = texture(prevOutput, texCords - vec2(h, 0.0)).a;
    float aU = texture(prevOutput, texCords + vec2(0.0, v)).a;
    float aD = texture(prevOutput, texCords - vec2(0.0, v)).a;

    float grad = abs(aR - aL) + abs(aU - aD);  // simple Sobel-lite

    // Only modulate when we're near patch boundaries
    float edgeMask = smoothstep(k_delta, k_delta * 2.0, grad);

    // Apply grain to alpha more strongly at edges
    base.a += k_theta * paperDark * edgeMask;

    edgeMod = base;
}
