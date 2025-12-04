#version 300 es
precision mediump float;
precision lowp int;

in vec4 vPosition;
in vec4 vNormal;
in vec4 vTex;            // assuming xy = uv
in vec4 vSpecularColor;
in float vSpecularExponent;

uniform mat4 model_view;
uniform mat4 projection;

out vec3 gPos;           // eye-space position
out vec3 gNormal;        // eye-space normal
out vec2 gUV;
out vec4 gSpecularColor;
out float gSpecularExponent;

void main()
{
    // Eye-space position
    vec4 eyePos = model_view * vPosition;
    gPos = eyePos.xyz;

    // Eye-space normal (no translation, just rotation/scale)
    gNormal = normalize((model_view * vNormal).xyz);

    gUV = vTex.xy;
    gSpecularColor = vSpecularColor;
    gSpecularExponent = vSpecularExponent;

    gl_Position = projection * eyePos;
}
