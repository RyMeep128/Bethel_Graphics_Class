#version 300 es
precision mediump float;
precision lowp int;

in vec2 texCords;


uniform sampler2D prevOutput;
uniform sampler2D intensity;
uniform float k_omega;
uniform float k_r;
uniform sampler2D paperTex;



layout(location = 0) out vec4 fEdge;

void main() {
    vec4 lambda_xy = texture(prevOutput, texCords);
    vec4 intense = texture(intensity, texCords);
    lambda_xy.a = lambda_xy.a * (1.0 + k_omega * (1.0 - intense.a));
    fEdge = lambda_xy;

    vec3 paper = texture(paperTex, texCords).rgb;

    // weighted darkness
    float paperDark = paper.r*0.5 + paper.g*0.2 + paper.b*0.5;

    // “grain” factor (stronger than raw 1-dark)
    float grain = clamp((1.0 - paperDark) * 2.0 + 0.2, 0.0, 1.0);

    // apply to edge alpha (if you really want it here)
    fEdge.a = clamp(fEdge.a * (1.0 - k_r) + fEdge.a * grain * k_r, 0.0, 1.0);

    // gl_FragColor.a = 1.;
}