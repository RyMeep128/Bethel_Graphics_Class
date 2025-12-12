#version 300 es
precision mediump float;
precision lowp int;

in vec2 texCords;

uniform sampler2D prevOutput;
uniform sampler2D diffuse;

uniform vec3 color0;
uniform vec3 color1;


// Output: the watercolor diffuse base layer
layout(location = 0) out vec4 cmykBase;

vec3 CMYKtoRGB (vec4 cmyk) {
    float c = cmyk.x;
    float m = cmyk.y;
    float y = cmyk.z;
    float k = cmyk.w;

    float invK = 1.0 - k;
    float r = 1.0 - min(1.0, c * invK + k);
    float g = 1.0 - min(1.0, m * invK + k);
    float b = 1.0 - min(1.0, y * invK + k);
    return clamp(vec3(r, g, b), 0.0, 1.0);
}

vec4 RGBtoCMYK (vec3 rgb) {
    float r = rgb.r;
    float g = rgb.g;
    float b = rgb.b;
    float k = min(1.0 - r, min(1.0 - g, 1.0 - b));
    vec3 cmy = vec3(0.0);
    float invK = 1.0 - k;
    if (invK != 0.0) {
        cmy.x = (1.0 - r - k) / invK;
        cmy.y = (1.0 - g - k) / invK;
        cmy.z = (1.0 - b - k) / invK;
    }
    return clamp(vec4(cmy, k), 0.0, 1.0);
}

void main() {

    vec4 Ld_xy = texture(diffuse, texCords);
    vec4 prev_xy = texture(prevOutput, texCords);
    float scale = (1. - (Ld_xy.r*0.5 + Ld_xy.g*0.2 + Ld_xy.b*0.5));
    vec4 color0_cmyk = RGBtoCMYK(color0);
    vec4 color1_cmyk = RGBtoCMYK(color1);
    vec4 interp_cmyk = (color1_cmyk * scale + color0_cmyk * (1. - scale));
    cmykBase = vec4(CMYKtoRGB(interp_cmyk), prev_xy.a);

}
