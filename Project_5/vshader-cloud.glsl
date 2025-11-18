#version 300 es

in vec4 vPosition;
in vec2 texCoord;
in vec4 vNormal;
in vec4 vTangent;
in vec4 vSpecularColor;
in float vSpecularExponent;

out vec2 ftexCoord;
out vec4 position;
out vec4 fSpecularColor;
out float fSpecularExponent;
out vec3 vN;

uniform mat4 model_view;
uniform mat4 projection;
uniform vec4 light_position;


void
main()
{

    vec4 veyepos = model_view*vPosition;
    position = veyepos;

    fSpecularColor = vSpecularColor;
    fSpecularExponent = vSpecularExponent;
    vN = normalize(model_view * vNormal).xyz;

    ftexCoord = texCoord;

    gl_Position = projection * model_view*vPosition;


}