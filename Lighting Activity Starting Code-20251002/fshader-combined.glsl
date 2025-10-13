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
uniform int pulse; // 0 false 1 true
uniform vec4 light_position;
uniform vec4 light_color;
uniform vec4 ambient_light;
uniform mat4 model_view;



uniform float time;



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
    }else if(mode == 3){
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

        float lookup= fColor.r;
        if(pulse == 1){
            float osc = 0.05 * sin(time * 2.0 * 3.14159 * 0.33);
            lookup = clamp(lookup + osc, 0.0, 1.0);
        }

        if(lookup >= 0.0 && lookup <= 0.1){
            fColor = vec4(0, 0, 0, 1);
        }else if( lookup >= 0.1 && lookup <= 0.2){
            fColor = vec4(0.1,0,0,1);
        }else if( lookup >= 0.2 && lookup <= 0.3){
            fColor = vec4(0.2,0,0,1);
        }else if( lookup >= 0.3 && lookup <= 0.4){
            fColor = vec4(0.3,0,0,1) ;
        }else if( lookup >= 0.4 && lookup <= 0.5){
            fColor = vec4(0.4,0,0,1) ;
        }else if( lookup >= 0.5 && lookup <= 0.6){
            fColor = vec4(0.5,0,0,1) ;
        }else if( lookup >= 0.6 && lookup <= 0.7){
            fColor = vec4(0.6,0,0,1) ;
        }else if( lookup >= 0.7 && lookup <= 0.8){
           fColor = vec4(0.7,0.2,0.2,1) ;
        }else if( lookup >= 0.8 && lookup <= 9.0){
           fColor = vec4(1,1,1,1) ;
        }else if (lookup >= 0.9 && lookup <= 1.0){
            fColor = vec4(1,1,1,1) ;
        }

        float fudge = dot(N,V);

        if(fudge <= 0.1 ){
            fColor = vec4(0,0,0,1);
        }else if (fudge == 0.0){
            fColor = vec4(0,0,0,1);
        }
    }else if (mode == 4){
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

        float lookup= 1.0 - dot(N,V);
        if(pulse == 1){
            float osc = 0.05 * sin(time * 2.0 * 3.14159 * 0.33);
            lookup = clamp(lookup + osc, 0.0, 1.0);
        }

        if(lookup >= 0.0 && lookup <= 0.1){
            fColor = vec4(1, 1, 1, 1);
        }else if( lookup >= 0.1 && lookup <= 0.2){
            fColor = vec4(0.9,0.5,0.5,1);
        }else if( lookup >= 0.2 && lookup <= 0.3){
            fColor = vec4(0.8,0.2,0.2,1);
        }else if( lookup >= 0.3 && lookup <= 0.4){
            fColor = vec4(0.7,0.1,0.1,1) ;
        }else if( lookup >= 0.4 && lookup <= 0.5){
            fColor = vec4(0.6,0,0,1) ;
        }else if( lookup >= 0.5 && lookup <= 0.6){
            fColor = vec4(0.5,0,0,1) ;
        }else if( lookup >= 0.6 && lookup <= 0.7){
            fColor = vec4(0.4,0,0,1) ;
        }else if( lookup >= 0.7 && lookup <= 0.8){
            fColor = vec4(0.3,0,0,1) ;
        }else if( lookup >= 0.8 && lookup <= 9.0){
            fColor = vec4(0.2,0,0,1) ;
        }else if (lookup >= 0.9 && lookup <= 1.0){
            fColor = vec4(0.1,0,0,1) ;
        }

//        float fudge = dot(N,V);
//
//        if(fudge <= 0.1 ){
//            fColor = vec4(0,0,0,1);
//        }else if (fudge == 0.0){
//            fColor = vec4(0,0,0,1);
//        }
    }else if(mode == 5){

    }

//    vec3 L = normalize(light_position.xyz - oveyepos.xyz);
//    vec3 V = normalize(-oveyepos.xyz);
//    vec3 N = normalize((model_view * ovNormal).xyz);
//    vec3 R = reflect(-L,N); // Vector from the light source refleccted across the normal vector
//
//    float lookup= dot(N,L);
//
//    if(lookup >= 0.1 && lookup <= 0.2){
//        amb = vec4(1,0,0,1) * ambient_light;
//    }else if( lookup >= 0.2 && lookup <= 0.3){
//        amb = vec4(0.9,0,0,1) * ambient_light;
//    }else if( lookup >= 0.3 && lookup <= 0.4){
//        amb = vec4(0.8,0,0,1) * ambient_light;
//    }else if( lookup >= 0.4 && lookup <= 0.5){
//        amb = vec4(0.7,0,0,1) * ambient_light;
//    }else if( lookup >= 0.6 && lookup <= 0.7){
//        amb = vec4(0.6,0,0,1) * ambient_light;
//    }else if( lookup >= 0.7 && lookup <= 0.8){
//        amb = vec4(0.5,0,0,1) * ambient_light;
//    }else if( lookup >= 0.8 && lookup <= 0.9){
//        amb = vec4(0.4,0,0,1) * ambient_light;
//    }else if( lookup >= 0.9 && lookup <= 1.0){
//        amb = vec4(0.3,0,0,1) * ambient_light;
//    }else {
//        amb = vec4(0.2,0,0,1) * ambient_light;
//    }
//
//    float fudge = dot(N,V);
//
//    if(fudge < 0.0 ){
//        amb = amb / ambient_light;
//    }else if (fudge == 0.0){
//        amb = vec4(1,1,1,1);
//    }
//
//    vec4 diff = max(dot(L,N),0.0) * ovAmbientDiffuseColor * light_color;
//    vec4 spec = pow(max(dot(R,V),0.0),ovSpecularExponent) * ovSpecularColor * light_color;
//
//    if(dot(L,N) < 0.0){
//        spec = vec4(0,0,0,1); //No glare beyond the horizon
//    }
//    fColor = amb + diff + spec;
	

}