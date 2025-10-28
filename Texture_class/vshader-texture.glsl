#version 300 es

in vec4 vPosition;
//TODO in vec2 texCoord;

//TODO out vec2 ftexCoord;

uniform mat4 model_view;
uniform mat4 projection;
void main()
{	

	//TODO ftexCoord = texCoord;

	gl_Position = projection * model_view*vPosition;
	

}