#version 300 es
precision mediump float;
precision lowp int;
in vec4 vPosition;
in vec4 vAmbientDiffuseColor;
in vec4 vNormal;
in vec4 vSpecularColor;
in float vSpecularExponent; // Note this is a float not a vec4 RYAN!!!!!!!!!!!!


out vec4 ovAmbientDiffuseColor;
out vec4 ovNormal;
out vec4 ovSpecularColor;
out float ovSpecularExponent;
out vec4 oveyepos;


uniform mat4 model_view;
uniform mat4 projection;


void main()
{
    gl_Position = vec4(0, 0, 0, 1); //to make the shader compiler happy

        ovAmbientDiffuseColor = vAmbientDiffuseColor;
        ovNormal = vNormal;
        ovSpecularColor = vSpecularColor;
        ovSpecularExponent = vSpecularExponent;
        oveyepos = model_view * vPosition;

        gl_Position = projection * model_view * vPosition;
}