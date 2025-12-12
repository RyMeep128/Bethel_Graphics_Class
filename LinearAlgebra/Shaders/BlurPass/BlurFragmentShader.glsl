#version 300 es
precision mediump float;
precision lowp int;

//Text cords
in vec2 texCords;

//Inputs
uniform sampler2D watercolorTexturedTex;    // location 0
uniform vec2 uTexelSize;

//output
layout(location = 0) out vec4 watercolorBlurTex;

void main() {


}

