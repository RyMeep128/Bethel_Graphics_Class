#version 300 es
precision mediump float;
precision lowp int;

in vec3 gPos;
in vec3 gNormal;
in vec2 gUV;
in vec4 gSpecularColor;
in float gSpecularExponent;

uniform vec4 uColor;



layout(location = 0) out vec4 outAlbedo;
layout(location = 1) out vec4 outSpecular;
layout(location = 2) out vec4 outNormal;
layout(location = 3) out vec4 outPosition;

void main()
{

    outAlbedo = uColor;

    outSpecular = vec4(gSpecularColor.rgb, gSpecularExponent);

    outNormal = vec4(normalize(gNormal), 0.0);

    outPosition = vec4(gPos, 1.0);
}
