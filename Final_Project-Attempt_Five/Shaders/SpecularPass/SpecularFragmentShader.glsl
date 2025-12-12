#version 300 es
precision highp float;
precision lowp int;

in vec2 texCords;

// G-buffer inputs
uniform sampler2D gAlbedo;    // location 0
uniform sampler2D gSpecular;  // location 1 (not used yet, but OK)
uniform sampler2D gNormalTex; // location 2
uniform sampler2D gPosition;  // location 3
uniform sampler2D intensity;

// Scene lights
uniform vec4 uLightPos[5];
uniform vec4 uLightColor[5];     // diffuse color/intensity
uniform vec4 uLightAmbient[5];   // ambient color (unused here)
uniform vec4 uLightEnabled[5];   // .x ambient, .y diffuse, .z specular
uniform vec4 uLightDirection[5]; // spotlight direction
uniform float uLightCutoff[5];   // cosine cutoff

uniform sampler2D paperTex;
uniform vec3 cameraPos;
uniform float k_ambient;   // unused in this pass
uniform float k_diffuse;   // unused in this pass
uniform float k_specular;
uniform float p;           // shininess

layout(location = 0) out vec4 fspecular;


vec4 addFragment(vec4 previous){


    vec4 Ls_xy = previous;
    vec4 prev_xy = texture(intensity, texCords);
    float result = prev_xy.a * (1.0 - step(k_specular, Ls_xy.r));
    // float result = step(k_s, vec3(Ls_xy)).r * prev_xy.a;
    return vec4(prev_xy.rgb, result);
}


void main() {

    // Extract G-buffer data
    vec4 albedo   = texture(gAlbedo, texCords);
    vec4 specData = texture(gSpecular, texCords);
    vec4 normData = texture(gNormalTex, texCords);
    vec4 posData  = texture(gPosition, texCords);

    vec3 N = normalize(normData.xyz);
    vec3 pos = posData.xyz;

    vec3 specColor = specData.rgb;
    float specExp  = specData.a;
    vec4 fColor = vec4(0.0,0.0,0.0,0.0);


    for (int i = 0; i < 5; i++)
    {
        vec3 L  = normalize(uLightPos[i].xyz - pos);
        vec3 LD = normalize(uLightDirection[i].xyz);
        vec3 V  = normalize(-pos);// viewer at origin in eye-space
        vec3 R  = reflect(-L, N);

        // Spotlight test
        if (dot(LD, L) >= uLightCutoff[i])
        {
            vec4 amb  = albedo * uLightAmbient[i];
            vec4 diff = max(dot(L, N), 0.0) * albedo * uLightColor[i];
            vec4 spec = pow(max(dot(R, V), 0.0), specExp)
            * vec4(specColor, 1.0) * uLightColor[i];

            if (dot(L, N) < 0.0)
            {
                spec = vec4(0.0, 0.0, 0.0, 1.0);
            }

            // Channel toggles, same as before
            if (uLightEnabled[i].x == 1.0)
            fColor += amb;
//            if (uLightEnabled[i].y == 1.0)
//            fColor += diff;
            if (uLightEnabled[i].z == 1.0)
            fColor += spec;

        }

    }

    fspecular = fColor;
}


