#version 300 es
precision mediump float;
precision lowp int;

//Text cords
in vec2 texCords;

//Inputs
uniform sampler2D waterColorMidtoneTex;    // location 0
uniform sampler2D paperTex;  // location 1


//output
layout(location = 0) out vec4 watercolorTexture;

void main() {

    vec4 paper   = texture(paperTex,    texCords);
    vec4 baseColor = texture(waterColorMidtoneTex,  texCords);

    vec3 color = baseColor.rgb * paper.rgb;
    float alpha = baseColor.a;

    watercolorTexture = vec4(color, alpha);


}

