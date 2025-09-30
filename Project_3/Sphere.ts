import {RenderableObject} from "./RenderableObject.js";
import {vec4} from "./helperfunctions.js";
import * as Util from "./util.js"

export class Sphere extends RenderableObject{

    private radius:number;
    private bands:number;
    private segments:number;
    private vertices:vec4[] = [];
    private colorArray:vec4[] = [];

    constructor(
        gl: WebGLRenderingContext,
        program: WebGLProgram,
        objectArr: RenderableObject[],
        radius:number,
        x: number = 0,
        y: number = 0,
        z: number = 0,
        yaw: number = 0,
        pitch: number = 0,
        roll: number = 0
    ) {
        super(gl,program, objectArr, 1, x, y, z,yaw,pitch,roll);
        this.radius = radius;
        this.bands = Util.Detail;
        this.segments = this.bands/2;
        for (let i = 0; i < this.bands; i++) {
            for (let j = 0; j < this.segments ; j++) {
                let jRight = (j + 1) % this.segments;
                let tl:vec4 = this.sphereHelper(i,j)
                let tr:vec4 = this.sphereHelper(i,jRight)
                let bl:vec4 = this.sphereHelper(i+1,j)
                let br:vec4 = this.sphereHelper(i+1,jRight)

                this.vertices.push(tl);
                this.vertexCount++;
                this.vertices.push(bl);
                this.vertexCount++;
                this.vertices.push(tr);
                this.vertexCount++;


                this.vertices.push(tr);
                this.vertexCount++;
                this.vertices.push(bl);
                this.vertexCount++;
                this.vertices.push(br);
                this.vertexCount++;
            }
        }
    }

    private sphereHelper(i:number,j:number):vec4{
        let phi:number = (-Math.PI/2) + i * Math.PI/this.bands;
        let theta:number = j * 2*Math.PI/this.segments;
        return new vec4(this.radius*Math.cos(phi)*Math.cos(theta), this.radius*Math.sin(phi), this.radius*Math.cos(phi)*Math.sin(theta), 1);
    }

    public setColor(color:vec4):void{
        this.colorArray = [];
        for (let i=0; i<this.vertexCount; i++) {
            this.colorArray.push(color);
        }
    }

    public setGradientColor(color:vec4[]):void{
        this.colorArray = [];
        this.colorArray = this.helperGradientColor(color,this.vertices);
    }

    getObjectData(): vec4[] {
        return this.loadingArrayHelper(this.vertices,this.colorArray);
    }

}