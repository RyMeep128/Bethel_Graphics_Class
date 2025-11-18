#version 300 es

precision highp float;

in vec2 ftexCoord;
in vec4 position;
in vec4 fSpecularColor;
in float fSpecularExponent;
in vec3 vN;       // perpendicular to surface in eye space

uniform vec4 light_position;
uniform vec4 light_color;
uniform vec4 ambient_light;
uniform sampler2D cloudMap;

uniform bool useCloudMap;

out vec4 fColor;

void main()
{

    vec4 baseColor = vec4(0.0);

    vec3 nvN = normalize(vN);

    vec3 N = nvN;

    vec3 L = normalize((light_position - position).xyz);

    float lambert = max(dot(L, N), 0.0);

    if (useCloudMap) {
        baseColor = texture(cloudMap, ftexCoord);
        if(lambert > 0.0){
            fColor = baseColor;
        }else {
            vec4 amb = baseColor * ambient_light;
            fColor = amb;
        }
    }else{
        fColor = vec4(0.0);
    }







}
