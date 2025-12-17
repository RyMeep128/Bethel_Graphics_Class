#version 300 es
precision mediump float;
precision lowp int;


layout(location=0) in vec2 aPosition;   // e.g. (-1,-1), (1,-1), (1,1), (-1,1)
layout(location=1) in vec2 aTexCoord;   // (0,0)-(1,1)

out vec2 texCords;

void main()
{
    texCords = aTexCoord;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
