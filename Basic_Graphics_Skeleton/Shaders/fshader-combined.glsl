#version 300 es
precision mediump float;
precision lowp int;

in vec4 ovNormal;
in vec4 ovSpecularColor;
in float ovSpecularExponent;
in vec4 oveyepos;

uniform mat4 model_view;

uniform vec4 uLightPos[5];
uniform vec4 uLightColor[5];
uniform vec4 uLightAmbient[5];
uniform vec4 uLightDirection[5];
uniform vec4 uLightEnabled[5];    // Per-term toggles: .x ambient, .y diffuse, .z specular (1.0 = on)
uniform float uLightCutoff[5];

uniform vec4 uColor;

out vec4  fColor;

void main(){
    fColor = vec4(0,0,0,1);

    for(int i = 0; i < 5; i++){
        vec3 L = normalize(uLightPos[i].xyz - oveyepos.xyz);
        vec3 LD = normalize(uLightDirection[i].xyz);
        vec3 N = normalize((model_view * ovNormal).xyz);
        vec3 V = normalize(-oveyepos.xyz);

        if( (dot(LD,L) >= uLightCutoff[i]) ){
            vec3 R = reflect(-L,N);

            vec4 amb = uColor * uLightAmbient[i];
            vec4 diff = max(dot(L,N),0.0) * uColor * uLightColor[i];
            vec4 spec = pow(max(dot(R,V),0.0),ovSpecularExponent) * ovSpecularColor * uLightColor[i];


            if(dot(L,N) < 0.0){
                spec = vec4(0,0,0,1);
            }

            // Per-channel enables (treating uLightEnabled as a switch vector):
            // .x -> ambient, .y -> diffuse, .z -> specular
            if(uLightEnabled[i].x == 1.0){
                fColor += amb;
            }
            if(uLightEnabled[i].y == 1.0){
                fColor += diff;
            }
            if(uLightEnabled[i].z == 1.0){
                fColor += spec;
            }
        }
    }


}