#version 300 es
precision mediump float;
precision lowp int;

in vec2 vUV;

uniform sampler2D gAlbedo;    // location 0
uniform sampler2D gSpecular;  // location 1
uniform sampler2D gNormalTex; // location 2
uniform sampler2D gPosition;  // location 3

uniform sampler2D diffuse;  // location 4
uniform sampler2D shadow;  // location 4
uniform sampler2D midtone;  // location 4
uniform sampler2D test;  // location 4

uniform bool mode;


uniform vec4 uLightPos[5];
uniform vec4 uLightColor[5];
uniform vec4 uLightAmbient[5];
uniform vec4 uLightDirection[5];
uniform vec4 uLightEnabled[5]; // .x ambient, .y diffuse, .z specular
uniform float uLightCutoff[5];

out vec4 fColor;

vec3 heatmap(float a) {
    return vec3(
    smoothstep(0.5, 1.0, a),     // red increases with alpha
    smoothstep(0.0, 1.0, a),     // green  from low to high
    smoothstep(0.0, 0.5, 1.0-a)  // blue for low alpha
    );
}

void main()
{
    fColor = vec4(0.0,0.0,0.0,1.0);


    if(mode == false){
        // Reconstruct data from the G-buffer
        vec4 albedo   = texture(gAlbedo, vUV);
        vec4 specData = texture(gSpecular, vUV);
        vec4 normData = texture(gNormalTex, vUV);
        vec4 posData  = texture(gPosition, vUV);

        vec3 N = normalize(normData.xyz);
        vec3 pos = posData.xyz;

        vec3 specColor = specData.rgb;
        float specExp  = specData.a;


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
                if (uLightEnabled[i].y == 1.0)
                fColor += diff;
                if (uLightEnabled[i].z == 1.0)
                fColor += spec;

            }

        }
    }else {

        vec4 base  = texture(shadow,   vUV);

        fColor = base;
        vec4 sh = texture(midtone, vUV);
        fColor = vec4(sh.xyz,1.0);
        fColor = texture(test,vUV);
//        float a = texture(test, vUV).a;
//        fColor = vec4(heatmap(a), 1.0);
//        fColor = vec4(a,a,a,1.0);
    }


}
