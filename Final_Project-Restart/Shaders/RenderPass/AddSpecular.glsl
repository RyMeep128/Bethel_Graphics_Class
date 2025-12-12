#version 300 es
precision mediump float;
precision lowp int;

in vec2 texCords;

uniform sampler2D intensity;  // base watercolor RGBA
uniform sampler2D prevOutput;   // sparkle map RGB
uniform float k_specular;     // strength of sparkle (e.g. 0.3)

layout(location = 0) out vec4 specularAdded;

void main() {
    vec4 base    = texture(intensity, texCords);
    vec3 sparkle = texture(prevOutput, texCords).rgb;

    // Add sparkles into the base color
    vec3 color = base.rgb + k_specular * sparkle;

    // Clamp to avoid blowing out
    color = clamp(color, 0.0, 1.0);

    // Keep base alpha (or tweak slightly if you want)
    float alpha = base.a;

    specularAdded = vec4(color, alpha);
//    specularAdded = texture(prevOutput,texCords);
}
