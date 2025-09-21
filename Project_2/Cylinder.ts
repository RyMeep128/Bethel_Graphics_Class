import {RenderableObject} from "./RenderableObject.js";
import {vec4} from "./helperfunctions.js";
import * as util from "./util.js";

export class Cylinder extends RenderableObject{

    private topCircle:vec4[];
    private bottomCircle:vec4[];
    private middleBits:vec4[];
    private vertexPerFace:number;

    constructor(gl:WebGLRenderingContext, program: WebGLProgram,radius:number, height:number) {
        super(gl,program,3);

        this.topCircle = [];
        this.bottomCircle = [];
        this.middleBits = [];

        let angle:number = (2*Math.PI)/(util.Detail);


        let hy:number = height/2;
        let topCenter:vec4 = new vec4(0, hy,0,1);
        let bottomCenter:vec4 = new vec4(0,-hy,0,1);

        let topRing:vec4[] = [];
        let bottomRing:vec4[] = [];
        for (let i = 0; i < util.Detail; i++) {
            let theta = i * angle;
            let x = radius* Math.cos(theta);
            let z: number = radius * Math.sin(theta);

            topRing.push(new vec4(x,hy,z,1))
            bottomRing.push(new vec4(x,-hy,z,1));

        }

        topRing.push(topRing[0])
        bottomRing.push(bottomRing[0])

        for(let i = 0; i < util.Detail; i++) {
            this.topCircle.push(topCenter);
            this.topCircle.push(topRing[i]);
            this.topCircle.push(topRing[i+1]);
            this.vertexCount +=3;

            this.bottomCircle.push(bottomCenter);
            this.bottomCircle.push(bottomRing[i+1]);
            this.bottomCircle.push(bottomRing[i]);
            this.vertexCount +=3;

            this.middleBits.push(topRing[i]);
            this.middleBits.push(bottomRing[i]);
            this.middleBits.push(bottomRing[i+1]);
            this.middleBits.push(topRing[i]);
            this.middleBits.push(bottomRing[i+1]);
            this.middleBits.push(topRing[i+1]);
            this.vertexCount +=6;
        }

    }

    public setTopColor(color:vec4):void{
        this.topCircle.push(color);
    }

    public setBottomColor(color:vec4):void{
        this.bottomCircle.push(color);
    }

    public setAllColor(topColor:vec4, bottomColor:vec4, middleBitsColor:vec4):void{
        this.topCircle.push(topColor);
        this.bottomCircle.push(bottomColor);
        this.middleBits.push(middleBitsColor);
    }

    public override getObjectData():vec4[]{
        let tempArr:vec4[] = [];

        tempArr.push(...this.loadingArrayHelper(this.topCircle));
        tempArr.push(...this.loadingArrayHelper(this.bottomCircle));
        tempArr.push(...this.loadingArrayHelper(this.middleBits));

        return tempArr;

    }

    protected override loadingArrayHelper(face: vec4[]): vec4[] {
        let tempArr:vec4[] = [];
        //we don't go all the way through the array.
        for (let i = 0; i < face.length-1; i++) {
            tempArr.push(face[i]);
            tempArr.push(face[face.length-1]);
        }

        return tempArr;
    }


}