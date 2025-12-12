#version 300 es
precision mediump float;
precision lowp int;

in vec2 texCords;

uniform float k_delta;
uniform float k_theta;

uniform sampler2D prevOutput;
uniform sampler2D paperTex;


layout(location = 0) out vec4 edgeMod;


void main() {
    vec3 color = texture(paperTex, texCords).rgb;
    float alpha = 1.0-(color.r*0.5 + color.g*0.2 + color.b*0.5);
    edgeMod = texture(prevOutput, texCords) + vec4(0., 0., 0., alpha) * k_theta;
    // gl_FragColor = texture2D(intensity, vUv);
    // gl_FragColor.a = alpha;
//    edgeMod = texture(prevOutput,texCords);
//    edgeMod = vec4(1.0,0.0,0.0,1.0);
}