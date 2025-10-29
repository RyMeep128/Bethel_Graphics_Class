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
    private cutOffAngle:number;
    /**
     * 1 is on, 0 is off
     * [0] = amvient
     * [1] = diffuse
     * [2] = spec
     * [3] = unused for now
     * @private
     */
    private enabled:vec4;

    private static count = 0;
    private id;

    constructor(gl: WebGLRenderingContext,program:WebGLProgram ,x:number, y:number,z:number, color:vec4 = null, ambient:vec4 = null,cutOffAngle = 180, direction:vec4 = new vec4(0,0,0,0),) {
        this.gl = gl;
        this.program = program;
        this.position = new vec4(x,y,z,1);
        this.color = color;
        this.ambient = ambient;
        this.direction = direction;
        this.enabled = new vec4(1,1,1,1);
        this.cutOffAngle = cutOffAngle;
        Light.count++;
        this.id = Light.count;


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
    // public sendLightDataWorld(view: mat4){
    //     if(this.color === null){
    //         throw new Error("Color for a lightSource is set to null")
    //     }
    //     if(this.ambient === null){
    //         throw new Error("Ambient color for a lightSource is set to null")
    //     }
    //
    //     // console.log(this.id+" | "+this.direction)
    //     let uploadableDirection:vec4 = view.mult(this.direction);
    //
    //     // light eye space
    //     let lightEye = view.mult(this.position);
    //     // console.log(this.id+"| "+ this.uLightColor+" "+this.uAmbient+" "+this.uLightPos+" "+this.uDirection)
    //
    //     this.gl.uniform4f(this.uLightColor, this.color[0],this.color[1],this.color[2],this.color[3]);
    //     this.gl.uniform4f(this.uAmbient,    this.ambient[0],  this.ambient[1],  this.ambient[2],  this.ambient[3]);
    //     this.gl.uniform4f(this.uLightPos,   lightEye[0], lightEye[1], lightEye[2], lightEye[3]);
    //     this.gl.uniform3f(this.uDirection, uploadableDirection[0],uploadableDirection[1],uploadableDirection[2]);
    // }

    public getColor():vec4{
        return this.color;
    }

    public getAmbient(){
        return this.ambient;
    }

    public getDirection(view:mat4){
        return view.mult(this.direction);
    }

    public getPosition(view:mat4){
        return view.mult(this.position);
    }

    public getCutOffAngle(){
        return this.cutOffAngle;
    }

    public disable(){
        this.enabled = new vec4(0,0,0,0);
    }


    public disableAmbient(){
        this.enabled = new vec4(this.enabled[0],0,this.enabled[2],this.enabled[3])
    }

    public enableAmbient(){
        this.enabled = new vec4(this.enabled[0],1,this.enabled[2],this.enabled[3])
    }

    public disableDiffuse(){
        this.enabled = new vec4(this.enabled[0],0,this.enabled[2],this.enabled[3])
    }

    public disableSpec(){
        this.enabled = new vec4(this.enabled[0],this.enabled[1],0,this.enabled[3])
    }



    public enable(){
        this.enabled = new vec4(1,1,1,1)
    }

    public getEnabled(){
        return this.enabled;
    }

}