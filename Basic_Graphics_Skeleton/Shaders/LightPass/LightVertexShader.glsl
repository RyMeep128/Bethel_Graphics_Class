#version 300 es
precision mediump float;

in vec2 aPosition;   // e.g. (-1,-1), (1,-1), (1,1), (-1,1)
in vec2 aTexCoord;   // (0,0)-(1,1)

out vec2 vUV;

void main()
{
    vUV = aTexCoord;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
