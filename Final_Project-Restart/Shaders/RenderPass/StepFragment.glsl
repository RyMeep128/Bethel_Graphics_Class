#version 300 es
precision mediump float;
precision lowp int;

in vec2 texCords;


uniform sampler2D prevOutput;
uniform sampler2D paperTex;


uniform float patchCuttoff;
uniform float alphaScalingFactor;


layout(location = 0) out vec4 fStep;
void main() {
    vec4 alphaScaled = texture(prevOutput, texCords);
    alphaScaled.a = alphaScalingFactor * step(patchCuttoff, alphaScaled.a);
    fStep = alphaScaled;
//    fStep = vec4(alphaScaled.a,alphaScaled.a,alphaScaled.a,1.0);
//    fStep = vec4(texture(prevOutput,texCords).xyz,1.0);
//    fStep = vec4(1.0,0.0,0.0,1.0);
}