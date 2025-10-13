#version 300 es
precision mediump float;
precision lowp int;
in vec4 vPosition;
in vec4 vAmbientDiffuseColor;
in vec4 vNormal;
in vec4 vSpecularColor;
in float vSpecularExponent; // Note this is a float not a vec4!!!!!!!!!


out vec4 color;

out vec4 ovAmbientDiffuseColor;
out vec4 ovNormal;
out vec4 ovSpecularColor;
out float ovSpecularExponent;
out vec4 oveyepos;


uniform mat4 model_view;
uniform mat4 projection;
uniform int mode; //0: unlit, 1:Gouraud, 2: Phong, 3: Cel

uniform vec4 light_position;
uniform vec4 light_color;
uniform vec4 ambient_light;


uniform float time;


void main()
{
    gl_Position = vec4(0, 0, 0, 1); //to make the shader compiler happy
    if(mode == 0){ //unlit
        color = vAmbientDiffuseColor;
        gl_Position = projection * model_view * vPosition;

    }else if(mode == 1){ //Gouraud
        vec4 veyepos = model_view * vPosition; // get vertex from model to eye space
        vec3 L = normalize(light_position.xyz - veyepos.xyz);
        vec3 V = normalize(-veyepos.xyz);
        vec3 N = normalize((model_view * vNormal).xyz);
        vec3 R = reflect(-L,N); // Vector from the light source refleccted across the normal vector

        gl_Position = projection * veyepos; // Finsih bringing it to the nroamlez device cords( -1 - 1)

        vec4 amb = vAmbientDiffuseColor * ambient_light;
        vec4 diff = max(dot(L,N),0.0) * vAmbientDiffuseColor * light_color;
        vec4 spec = pow(max(dot(R,V),0.0),vSpecularExponent) * vSpecularColor * light_color;


        if(dot(L,N) < 0.0){
            spec = vec4(0,0,0,1); //No glare beyond the horizon
        }
        color = amb + diff + spec;
    }
    else if(mode == 2){
        ovAmbientDiffuseColor = vAmbientDiffuseColor;
        ovNormal = vNormal;
        ovSpecularColor = vSpecularColor;
        ovSpecularExponent = vSpecularExponent;
        oveyepos = model_view * vPosition;

        gl_Position = projection * model_view * vPosition;

    } else if(mode == 3){

        ovAmbientDiffuseColor = vAmbientDiffuseColor;
        ovNormal = vNormal;
        ovSpecularColor = vSpecularColor;
        ovSpecularExponent = vSpecularExponent;
        oveyepos = model_view * vPosition;

        gl_Position = projection * model_view * vPosition;
    } else if(mode == 4){

        ovAmbientDiffuseColor = vAmbientDiffuseColor;
        ovNormal = vNormal;
        ovSpecularColor = vSpecularColor;
        ovSpecularExponent = vSpecularExponent;
        oveyepos = model_view * vPosition;

        gl_Position = projection * model_view * vPosition;
    }else if(mode == 5){

        ovAmbientDiffuseColor = vAmbientDiffuseColor;
        ovNormal = vNormal;
        ovSpecularColor = vSpecularColor;
        ovSpecularExponent = vSpecularExponent;
        oveyepos = model_view * vPosition;

        gl_Position = projection * model_view * vPosition;
    }

}