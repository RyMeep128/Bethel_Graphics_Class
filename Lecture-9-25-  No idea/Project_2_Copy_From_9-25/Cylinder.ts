import {RenderableObject} from "./RenderableObject.js";
import {vec4} from "./helperfunctions.js";
import * as util from "./util.js";

export class Cylinder extends RenderableObject{

    private topCircle:vec4[];
    private bottomCircle:vec4[];
    private middleBits:vec4[];

    private topCircleColor:vec4[];
    private bottomCircleColor:vec4[];
    private middleBitsColor:vec4[];

    private vertexPerFace:number;

    constructor(gl:WebGLRenderingContext, program: WebGLProgram,objectArr:RenderableObject[],radius:number, height:number, x:number = 0,y:number = 0 ,z:number = 0, pitch:number = 0, yaw:number = 0, roll:number = 0) {
    super(gl,program,objectArr,3,x,y,z,yaw,pitch,roll);

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
        this.topCircleColor = this.helperColor(color,this.topCircle);
    }

    public setBottomColor(color:vec4):void{
        this.bottomCircleColor = this.helperColor(color,this.bottomCircle);
    }

    public setMiddleBitsColor(color:vec4):void{
        this.middleBitsColor = this.helperColor(color,this.middleBits);
    }

    public setMiddleBitsColors(colors:vec4[]):void{
        this.middleBitsColor = this.helperGradientColor(colors,this.middleBits);
    }

    public setTopColors(colors:vec4[]):void{
        this.topCircleColor = this.helperGradientColor(colors,this.topCircle);
    }

    public setBottomColors(colors:vec4[]):void{
        this.bottomCircleColor = this.helperGradientColor(colors,this.bottomCircle);
    }


    public setAllColor(topColor:vec4, bottomColor:vec4, middleBitsColor:vec4):void{
        this.setTopColor(topColor);
        this.setBottomColor(bottomColor);
        this.setMiddleBitsColor(middleBitsColor);
    }

    public override getObjectData():vec4[]{
        let tempArr:vec4[] = [];

        tempArr.push(...this.loadingArrayHelper(this.topCircle,this.topCircleColor));
        tempArr.push(...this.loadingArrayHelper(this.bottomCircle,this.bottomCircleColor));
        tempArr.push(...this.loadingArrayHelper(this.middleBits,this.middleBitsColor));

        return tempArr;

    }

}