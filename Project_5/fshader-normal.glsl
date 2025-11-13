#version 300 es

precision highp float;

in vec2 ftexCoord;
in vec3 vT;       // parallel to surface in eye space
in vec3 vN;       // perpendicular to surface in eye space
in vec4 position;

uniform vec4 light_position;
uniform vec4 light_color;
uniform vec4 ambient_light;
uniform sampler2D colorMap;
uniform sampler2D normalMap;

uniform bool useNormalMap;
uniform bool useColorMap;

out vec4 fColor;

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
        // Normal from normal-map in tangent space, remapped from [0,1] -> [-1,1]
        vec3 nT = texture(normalMap, ftexCoord).xyz * 2.0 - 1.0;

        // Transform to eye space via TBN
        vec4 nEye = basisChange * vec4(nT, 0.0);
        N = normalize(nEye.xyz);
    } else {
        N = nvN;
    }


    vec4 baseColor = texture(colorMap, ftexCoord);

    vec4 amb = baseColor * ambient_light;

    float lambert = max(dot(L, N), 0.0);
    vec4 diff = lambert * baseColor * light_color;

    // No specular term for now
    fColor = amb + diff;




}
