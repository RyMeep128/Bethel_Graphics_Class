#version 300 es
precision mediump float;
precision lowp int;

in vec3 gPos;
in vec3 gNormal;
in vec2 gUV;
in vec4 gSpecularColor;
in float gSpecularExponent;

// If you're using a uniform color instead of a texture:
uniform vec4 uColor;

// Or, if you have a texture instead, use this instead of uColor:
// uniform sampler2D uDiffuse;

layout(location = 0) out vec4 outAlbedo;    // base color
layout(location = 1) out vec4 outSpecular;  // rgb = spec color, a = exponent
layout(location = 2) out vec4 outNormal;    // xyz = normal, w unused
layout(location = 3) out vec4 outPosition;  // xyz = pos in eye-space, w = 1

void main()
{
    // Albedo: either flat color or sampled texture
    // outAlbedo = texture(uDiffuse, gUV);
    outAlbedo = uColor;

    // Specular color + exponent packed into alpha
    outSpecular = vec4(gSpecularColor.rgb, gSpecularExponent);

    // Store the normal. You can store it raw or encode; for now keep it simple
    outNormal = vec4(normalize(gNormal), 0.0);

    // Eye-space position
    outPosition = vec4(gPos, 1.0);
}
