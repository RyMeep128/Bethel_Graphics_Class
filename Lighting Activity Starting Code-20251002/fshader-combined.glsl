#version 300 es
precision mediump float;
precision lowp int;

in vec4 color;

in vec4 ovAmbientDiffuseColor;
in vec4 ovNormal;
in vec4 ovSpecularColor;
in float ovSpecularExponent;
in vec4 oveyepos;



uniform int mode; //0: unlit, 1:Gouraud, 2: Phong, 3: Cel
uniform vec4 light_position;
uniform vec4 light_color;
uniform vec4 ambient_light;
uniform mat4 model_view;



out vec4  fColor;

void main()
{
	vec4 amb = vec4(0,0,0,1);
	vec4 diff = vec4(0,0,0,1);
	vec4 spec = vec4(0,0,0,1);

	if(mode == 0){ //Unlit
		fColor = color;

	}else if(mode == 1){ //Gouraud
		fColor = color;
	}else if(mode == 2){
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
    }
	

}