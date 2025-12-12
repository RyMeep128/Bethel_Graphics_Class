#version 300 es
precision mediump float;
precision lowp int;

//Text cords
in vec2 texCords;

//Inputs
uniform sampler2D prevOutput;    // location 0
uniform float v;

//output
layout(location = 0) out vec4 VBlur;


void main() {
    vec4 sum = vec4(0.0);

    sum += texture(prevOutput, vec2(texCords.x, texCords.y - 4.0 * v)) * 0.051;
    sum += texture(prevOutput, vec2(texCords.x, texCords.y - 3.0 * v)) * 0.0918;
    sum += texture(prevOutput, vec2(texCords.x, texCords.y - 2.0 * v)) * 0.12245;
    sum += texture(prevOutput, vec2(texCords.x, texCords.y - 1.0 * v)) * 0.1531;
    sum += texture(prevOutput, vec2(texCords.x, texCords.y)) * 0.1633;
    sum += texture(prevOutput, vec2(texCords.x, texCords.y + 1.0 * v)) * 0.1531;
    sum += texture(prevOutput, vec2(texCords.x, texCords.y + 2.0 * v)) * 0.12245;
    sum += texture(prevOutput, vec2(texCords.x, texCords.y + 3.0 * v)) * 0.0918;
    sum += texture(prevOutput, vec2(texCords.x, texCords.y + 4.0 * v)) * 0.051;


    VBlur = sum;
}


