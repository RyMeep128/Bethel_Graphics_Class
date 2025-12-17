#version 300 es
precision mediump float;

in vec2 texCords;

uniform sampler2D diffuse;
uniform sampler2D shadow;
uniform sampler2D midtone;

layout(location = 0) out vec4 result;

vec4 over(vec4 top, vec4 bottom) {
    float a = top.a + bottom.a * (1.0 - top.a);
    vec3 rgb = (top.rgb * top.a + bottom.rgb * bottom.a * (1.0 - top.a)) / max(a, 1e-5);
    return vec4(rgb, a);
}

void main() {
    vec4 d = texture(diffuse, texCords);
    vec4 s = texture(shadow, texCords);
    vec4 m = texture(midtone, texCords);

    // Suggested order: shadows laid first, then midtones, then diffuse wash last
    // (so highlights/holes from diffuse survive)
    vec4 res = vec4(1.0);
    res = over(s, res);
    res = over(m, res);


    result = res;

}
