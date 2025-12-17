#version 300 es
precision mediump float;
precision lowp int;

in vec2 texCords;
uniform sampler2D prevOutput;
uniform sampler2D paperTex;

out vec4 fColor;


void main() {
    fColor = texture(prevOutput,texCords) * texture(paperTex,texCords);
}
