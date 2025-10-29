#version 300 es
precision mediump float;
precision lowp int;

in vec4 color;

in vec4 ovAmbientDiffuseColor;
in vec4 ovNormal;
in vec4 ovSpecularColor;
in float ovSpecularExponent;
in vec4 oveyepos;


uniform vec4 light_position;
uniform vec4 light_color;
uniform vec4 ambient_light;
uniform mat4 model_view;

uniform vec4 left_headlight_pos;
uniform vec4 left_headlight_color;
uniform vec4 left_headlight_ambient;
uniform vec3 left_headlight_direction;

uniform vec4 right_headlight_pos;
uniform vec4 right_headlight_color;
uniform vec4 right_headlight_ambient;
uniform vec3 right_headlight_direction;

uniform float headlight_cutoff;





//Wambulance
uniform vec4 left_light_pos;
uniform vec4 left_light_color;
uniform vec4 left_light_ambient;
uniform vec3 left_light_direction;

uniform vec4 right_light_pos;
uniform vec4 right_light_color;
uniform vec4 right_light_ambient;
uniform vec3 right_light_direction;


uniform vec4 uLightPos[5];
uniform vec4 uLightColor[5];
uniform vec4 uLightAmbient[5];
uniform vec4 uLightDirection[5];
uniform vec4 uLightEnabled[5];
uniform float uLightCutoff[5];



uniform float light_cutoff;


uniform float time;



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

            vec4 amb = ovAmbientDiffuseColor * uLightAmbient[i];
            vec4 diff = max(dot(L,N),0.0) * ovAmbientDiffuseColor * uLightColor[i];
            vec4 spec = pow(max(dot(R,V),0.0),ovSpecularExponent) * ovSpecularColor * uLightColor[i];


            if(dot(L,N) < 0.0){
                spec = vec4(0,0,0,1);
            }

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