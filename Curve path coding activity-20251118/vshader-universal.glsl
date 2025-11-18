#version 300 es

in vec2 vPosition;
in vec4 vColor;

uniform int mode;
uniform float t;
uniform mat4 model_view;
uniform mat4 projection;
uniform vec2 controlPoints[4];

out vec4 color;

vec4 bezier(){
    //TODO fill this in
    //following line is just to make compiler happy, delete later
    return vec4(100,100,100,1);
}

vec4 bSpline(){
    //TODO Fill this in
    //following line is just to make compiler happy, delete later
    return vec4(100,100,100,1);
}

vec4 cr(){
    //TODO we'll fill this on in together
    //following line is just to make compiler happy, delete later
    return vec4(100,100,100,1);
}

vec4 lerp(){
	//this will calculate the x and y coordinates as a vec2, then add on the z and w coordinates
	//linearly interpolate between 2nd and 3rd control point (ignore 1st and 4th)s
	return vec4(controlPoints[1]*(1.0-t) + t*controlPoints[2], 0.0, 1.0);
}

//this is for drawing the control points
vec4 control(){
    return vec4(vPosition, 0.0, 1.0);
}


void main()
{
    if(mode == 0){ //mode 0 is control points, so use supplied point color
        color = vColor;

    }else{
        color = vec4(0.0,0.0,1.0,1.0); //make the "ball" blue
    }

    vec4 position;
    switch(mode){
        case 0: //control point
            position = control();
            gl_PointSize = 10.0;
            break;
        case 1: //lerp
            position = lerp();
            gl_PointSize = 20.0;
            break;
        case 2: //bezier
            position = bezier();
            gl_PointSize = 20.0;
            break;
        case 3: //cr
            position = cr();
            gl_PointSize = 20.0;
            break;
        case 4: //b-spline
            position = bSpline();
            gl_PointSize = 20.0;
            break;
    }

	gl_Position = projection * model_view * position;
	

}