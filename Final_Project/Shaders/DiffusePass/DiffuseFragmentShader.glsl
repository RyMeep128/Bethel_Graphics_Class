#version 300 es
precision mediump float;
precision lowp int;

//Text cords
in vec2 texCords;


//Inputs
uniform sampler2D gAlbedo;    // location 0
uniform sampler2D gSpecular;  // location 1 //Not being used here
uniform sampler2D gNormalTex; // location 2
uniform sampler2D gPosition;  // location 3


//Light uniforms
uniform vec4 uLightPos[5];
uniform vec4 uLightColor[5];
uniform vec4 uLightAmbient[5];
uniform vec4 uLightDirection[5];
uniform vec4 uLightEnabled[5]; // .x ambient, .y diffuse, .z specular
uniform float uLightCutoff[5];

//Color Uniforms
uniform vec4 color0;
uniform vec4 color1;



//output
layout(location = 0) out vec4 watercolorBase;

void main() {

    vec4 albedo   = texture(gAlbedo,    texCords);
    vec4 specData = texture(gSpecular,  texCords); // Not using
    vec4 normData = texture(gNormalTex, texCords);
    vec4 posData  = texture(gPosition,  texCords);

    vec3 N = normalize(normData).xyz;

    vec3 specColor = specData.rgb;
    float specExp  = specData.a;

    float intensity = 0.0;


    for (int i = 0; i < 5; i++)
    {
        vec3 L  = normalize(uLightPos[i].xyz - posData.xyz);
        vec3 LD = normalize(uLightDirection[i].xyz);
        vec3 V  = normalize(-posData.xyz);      // viewer at origin in eye-space
        vec3 R  = reflect(-L, N);

        // Spotlight test
        if (dot(LD, L) >= uLightCutoff[i])
        {
            vec4 amb  = albedo * uLightAmbient[i];
            vec4 diff = max(dot(L, N), 0.0) * albedo * uLightColor[i];
            vec4 spec = pow(max(dot(R, V), 0.0), specExp) * vec4(specColor, 1.0) * uLightColor[i];

            if (dot(L, N) < 0.0)
            {
                spec = vec4(0.0, 0.0, 0.0, 1.0);
            }

            // Channel toggles, same as before
            if (uLightEnabled[i].x == 1.0)
            intensity += dot(amb.rgb, vec3(0.299, 0.587, 0.114));;
            if (uLightEnabled[i].y == 1.0)
            intensity += dot(diff.rgb, vec3(0.299, 0.587, 0.114));
            if (uLightEnabled[i].z == 1.0)
            intensity += dot(spec.rgb, vec3(0.299, 0.587, 0.114));

        }

    }

    float magicNumber = 0.9;

    float t = clamp(intensity * magicNumber, 0.0, 1.0);

    vec4 paletteRGB = mix(color0, color1, t);

    watercolorBase.rgb = paletteRGB.rgb;
//    watercolorBase.a = t; //This line breaks everything why???
    watercolorBase = vec4(paletteRGB.rgb, 1.0); //setting it to 1.0 for now
//
//    watercolorBase = vec4(t, t, t, 1.0);

}

