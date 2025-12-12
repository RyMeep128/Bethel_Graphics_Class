#version 300 es
precision mediump float;
precision lowp int;

//Text cords
in vec2 texCords;

//Inputs
uniform sampler2D prevOutput;    // location 0
uniform float h;

//output
layout(location = 0) out vec4 HBlur;


void main() {
    vec4 sum = vec4(0.0);

    sum += texture(prevOutput, vec2(texCords.x - 4.0 * h, texCords.y)) * 0.051;
    sum += texture(prevOutput, vec2(texCords.x - 3.0 * h, texCords.y)) * 0.0918;
    sum += texture(prevOutput, vec2(texCords.x - 2.0 * h, texCords.y)) * 0.12245;
    sum += texture(prevOutput, vec2(texCords.x - 1.0 * h, texCords.y)) * 0.1531;
    sum += texture(prevOutput, vec2(texCords.x, texCords.y)) * 0.1633;
    sum += texture(prevOutput, vec2(texCords.x + 1.0 * h, texCords.y)) * 0.1531;
    sum += texture(prevOutput, vec2(texCords.x + 2.0 * h, texCords.y)) * 0.12245;
    sum += texture(prevOutput, vec2(texCords.x + 3.0 * h, texCords.y)) * 0.0918;
    sum += texture(prevOutput, vec2(texCords.x + 4.0 * h, texCords.y)) * 0.051;

    HBlur = sum;
}


