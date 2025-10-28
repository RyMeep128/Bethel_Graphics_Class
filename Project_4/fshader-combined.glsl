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

uniform float light_cutoff;


uniform float time;



out vec4  fColor;
void main()
{

        vec3 L = normalize(light_position.xyz - oveyepos.xyz);
        vec3 V = normalize(-oveyepos.xyz);
        vec3 N = normalize((model_view * ovNormal).xyz);
        vec3 R = reflect(-L,N); // Vector from the light source refleccted across the normal vector

        vec4 amb = ovAmbientDiffuseColor * ambient_light;
        vec4 diff = max(dot(L,N),0.0) * ovAmbientDiffuseColor * light_color;
        vec4 spec = pow(max(dot(R,V),0.0),ovSpecularExponent) * ovSpecularColor * light_color;


        if(dot(L,N) < 0.0){
            spec = vec4(0,0,0,1); //No glare beyond the horizon
        }
        fColor = amb + diff + spec;



    L = normalize(left_headlight_pos.xyz - oveyepos.xyz);
    vec3 LD = normalize(left_headlight_direction);

    if( (dot(LD,L) >= headlight_cutoff ) ){
        R = reflect(-L,N);

         amb = ovAmbientDiffuseColor * left_headlight_ambient;
         diff = max(dot(L,N),0.0) * ovAmbientDiffuseColor * left_headlight_color;
         spec = pow(max(dot(R,V),0.0),ovSpecularExponent) * ovSpecularColor * left_headlight_color;


        if(dot(L,N) < 0.0){
            spec = vec4(0,0,0,1);
        }
        fColor += amb + diff + spec;
    }


    L = normalize(right_headlight_pos.xyz - oveyepos.xyz);
    LD = normalize(right_headlight_direction);

    if( (dot(LD,L) >= headlight_cutoff ) ){
        R = reflect(-L,N);

        amb = ovAmbientDiffuseColor * right_headlight_ambient;
        diff = max(dot(L,N),0.0) * ovAmbientDiffuseColor * right_headlight_color;
        spec = pow(max(dot(R,V),0.0),ovSpecularExponent) * ovSpecularColor * right_headlight_color;


        if(dot(L,N) < 0.0){
            spec = vec4(0,0,0,1);
        }
        fColor += amb + diff + spec;
    }






    L = normalize(right_light_pos.xyz - oveyepos.xyz);
    LD = normalize(right_light_direction);

    if( (dot(LD,L) >= light_cutoff ) ){
        R = reflect(-L,N);

        amb = ovAmbientDiffuseColor * right_light_ambient;
        diff = max(dot(L,N),0.0) * ovAmbientDiffuseColor * right_light_color;
        spec = pow(max(dot(R,V),0.0),ovSpecularExponent) * ovSpecularColor * right_light_color;


        if(dot(L,N) < 0.0){
            spec = vec4(0,0,0,1);
        }
        fColor += amb + diff + spec;
    }

    L = normalize(left_light_pos.xyz - oveyepos.xyz);
    LD = normalize(left_light_direction);

    if( (dot(LD,L) >= light_cutoff ) ){
        R = reflect(-L,N);

        amb = ovAmbientDiffuseColor * left_light_ambient;
        diff = max(dot(L,N),0.0) * ovAmbientDiffuseColor * left_light_color;
        spec = pow(max(dot(R,V),0.0),ovSpecularExponent) * ovSpecularColor * left_light_color;


        if(dot(L,N) < 0.0){
            spec = vec4(0,0,0,1);
        }
        fColor += amb + diff + spec;
    }



}