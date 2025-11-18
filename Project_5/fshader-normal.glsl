#version 300 es

precision highp float;

in vec2 ftexCoord;
in vec3 vT;       // parallel to surface in eye space
in vec3 vN;       // perpendicular to surface in eye space
in vec4 position;
in vec4 fSpecularColor;
in float fSpecularExponent;

uniform vec4 light_position;
uniform vec4 light_color;
uniform vec4 ambient_light;
uniform sampler2D colorMap;
uniform sampler2D normalMap;
uniform sampler2D specMap;
uniform sampler2D nightMap;

uniform bool useNormalMap;
uniform bool useColorMap;
uniform bool useSpecMap;
uniform bool useNightMap;

out vec4 fColor;

vec4 specular(vec3 N, vec3 L, float lambert, vec3 E){
        vec4 specMapVal = texture(specMap,ftexCoord);
        if(specMapVal.r >= 0.5){
            float specFactor = 0.0;
            if (lambert > 0.0) {
                vec3 R  = normalize(reflect(-L, N));
                float RV = max(dot(R, E), 0.0);
                specFactor = pow(RV, fSpecularExponent);
            }
            return specFactor * fSpecularColor * light_color;
        }else{
            return vec4(0.0);
        }
}

vec4 color(){
    return texture(colorMap, ftexCoord);
}



void main()
{
    // Re-normalize normal and tangent vectors
    vec3 nvN = normalize(vN);
    vec3 nvT = normalize(vT);

    // Binormal = N × T
    vec3 vB = normalize(cross(nvN, nvT));

    // Build TBN matrix (tangent -> eye space)
    vec4 v4T = vec4(nvT, 0.0);
    vec4 v4B = vec4(vB,  0.0);
    vec4 v4N = vec4(nvN, 0.0);
    vec4 v40001 = vec4(0.0, 0.0, 0.0, 1.0);

    mat4 basisChange = mat4(v4T, v4B, v4N, v40001);

    vec3 L = normalize((light_position - position).xyz);
    vec3 E = normalize(-position.xyz);

    // Final normal in eye space
    vec3 N;

    if (useNormalMap) {
        vec3 nT = texture(normalMap, ftexCoord).xyz * 2.0 - 1.0;

        // Transform to eye space via TBN
        vec4 nEye = basisChange * vec4(nT, 0.0);
        N = normalize(nEye.xyz);
    } else {
        N = nvN;
    }

    vec4 baseColor = vec4(1.0);  // default white

    if (useColorMap) {
        baseColor = color();
    }


    float lambert = max(dot(L, N), 0.0);

    vec4 amb = baseColor * ambient_light;

    vec4 diff = lambert * baseColor * light_color;

    fColor = amb + diff;

    if(useSpecMap){
        fColor += specular(N, L, lambert, E);
    }

    //Nighttime
    float ndotl   = dot(L, N);

    vec4 nightColor = texture(nightMap, ftexCoord);
    float twilight = smoothstep(0.0, 0.2, ndotl);

    if (useNightMap) {
        fColor = mix(nightColor, fColor, twilight);
    }

}


