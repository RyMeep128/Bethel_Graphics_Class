import {mat4, vec4} from "./helperfunctions.js";

export class Light{

    private gl: WebGLRenderingContext;
    private program:WebGLProgram;
    private uLightPos:WebGLUniformLocation;
    private uLightColor:WebGLUniformLocation;
    private uAmbient:WebGLUniformLocation;
    private uDirection:WebGLUniformLocation;

    private color:vec4;
    private ambient:vec4;
    private position:vec4;
    private direction: vec4;

    private static count = 0;
    private id;

    constructor(gl: WebGLRenderingContext,program:WebGLProgram ,x:number, y:number,z:number, color:vec4 = null, ambient:vec4 = null,positionName:string =  "light_position", colorName = "light_color", ambientName = "ambient_light", uDirection = "not assigned", direction:vec4 = new vec4(0,0,0,0)) {
        this.gl = gl;
        this.program = program;
        this.position = new vec4(x,y,z,1);
        this.color = color;
        this.ambient = ambient;
        this.direction = direction;
        Light.count++;
        this.id = Light.count;

        this.updateProgram(this.program, positionName,colorName,ambientName,uDirection);
    }

    public updateProgram(program:WebGLProgram = this.program, positionName:string, colorName:string, ambientName:string, lightDirName:string):void {
        this.program = program ?? this.program;
        this.uLightPos   = this.gl.getUniformLocation(program, positionName);
        this.uLightColor = this.gl.getUniformLocation(program, colorName);
        this.uAmbient    = this.gl.getUniformLocation(program, ambientName);
        this.uDirection = this.gl.getUniformLocation(program,lightDirName);
    }

    public setColor(color:vec4){
        this.color = color;
    }

    public setAmbient(ambient:vec4){
        this.ambient = ambient;
    }

    public setDirection(direction: vec4){
        this.direction = direction;
    }

    //getCamera().getCameraMV();
    // his.gl.uniform4f(this.uLightColor, 0.4,  0.4,  0.4,  1.0);
    // this.gl.uniform4f(this.uAmbient,    0.1,  0.1,  0.1,  1.0);
    public sendLightDataWorld(view: mat4){
        if(this.color === null){
            throw new Error("Color for a lightSource is set to null")
        }
        if(this.ambient === null){
            throw new Error("Ambient color for a lightSource is set to null")
        }

        // console.log(this.id+" | "+this.direction)
        let uploadableDirection:vec4 = view.mult(this.direction);

        // light eye space
        let lightEye = view.mult(this.position);
        // console.log(this.id+"| "+ this.uLightColor+" "+this.uAmbient+" "+this.uLightPos+" "+this.uDirection)

        this.gl.uniform4f(this.uLightColor, this.color[0],this.color[1],this.color[2],this.color[3]);
        this.gl.uniform4f(this.uAmbient,    this.ambient[0],  this.ambient[1],  this.ambient[2],  this.ambient[3]);
        this.gl.uniform4f(this.uLightPos,   lightEye[0], lightEye[1], lightEye[2], lightEye[3]);
        this.gl.uniform3f(this.uDirection, uploadableDirection[0],uploadableDirection[1],uploadableDirection[2]);
    }

    public disable(){
        this.gl.uniform4f(this.uLightColor, -1,-1,-1,-1);
        this.gl.uniform4f(this.uAmbient,    -1,-1,-1,-1);
        this.gl.uniform4f(this.uLightPos,  -1,-1,-1,-1);
        this.gl.uniform3f(this.uDirection, 0,0,0,);
    }

}