#version 300 es
precision mediump float;
precision lowp int;

uniform sampler2D diffuse;  // location 4
uniform sampler2D shadow;  // location 4
uniform sampler2D midtone;  // location 4

layout(location = 0) out vec4 result;

in vec2 texCords;

void main(){
    vec4 d = texture(diffuse, texCords);
    vec4 s = texture(shadow, texCords);
    vec4 m = texture(midtone, texCords);

    vec3 rgb = clamp(d.rgb + s.rgb + m.rgb, 0.0, 1.0);
    float a  = clamp(d.a + s.a + m.a, 0.0, 1.0);

    result = vec4(rgb, a);

}