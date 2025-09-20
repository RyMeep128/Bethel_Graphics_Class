import {vec4} from "./helperfunctions.js";
import * as util from "./util.js";

export class Cube {

    private frontFace: vec4[];
    private backFace: vec4[];
    private leftFace: vec4[];
    private rightFace: vec4[];
    private topFace: vec4[];
    private bottomFace: vec4[];

    constructor(width: number, height: number, depth: number) {
        let hx = width / 2;
        let hy = height / 2;
        let dz = depth / 2;

        this.frontFace.push(new vec4(hx, -hy, hz, 1.0));
        this.frontFace.push(new vec4(hx, hy, hz, 1.0));
        this.frontFace.push(new vec4(-hx, hy, hz, 1.0));
        this.frontFace.push(new vec4(-hx, hy, hz, 1.0));
        this.frontFace.push(new vec4(-hx, -hy, hz, 1.0));
        this.frontFace.push(new vec4(hx, -hy, hz, 1.0));

        this.backFace.push(new vec4(-hx, -hy, -hz, 1.0));
        this.backFace.push(new vec4(-hx, hy, -hz, 1.0));
        this.backFace.push(new vec4(hx, hy, -hz, 1.0));
        this.backFace.push(new vec4(hx, hy, -hz, 1.0));
        this.backFace.push(new vec4(hx, -hy, -hz, 1.0));
        this.backFace.push(new vec4(-hx, -hy, -hz, 1.0));

        this.leftFace.push(new vec4(hx, hy, hz, 1.0));
        this.leftFace.push(new vec4(hx, -hy, hz, 1.0));
        this.leftFace.push(new vec4(hx, -hy, -hz, 1.0));
        this.leftFace.push(new vec4(hx, -hy, -hz, 1.0));
        this.leftFace.push(new vec4(hx, hy, -hz, 1.0));
        this.leftFace.push(new vec4(hx, hy, hz, 1.0));

        this.rightFace.push(new vec4(-hx, hy, -hz, 1.0));
        this.rightFace.push(new vec4(-hx, -hy, -hz, 1.0));
        this.rightFace.push(new vec4(-hx, -hy, hz, 1.0));
        this.rightFace.push(new vec4(-hx, -hy, hz, 1.0));
        this.rightFace.push(new vec4(-hx, hy, hz, 1.0));
        this.rightFace.push(new vec4(-hx, hy, -hz, 1.0));

        this.topFace.push(new vec4(hx, hy, hz, 1.0));
        this.topFace.push(new vec4(hx, hy, -hz, 1.0));
        this.topFace.push(new vec4(-hx, hy, -hz, 1.0));
        this.topFace.push(new vec4(-hx, hy, -hz, 1.0));
        this.topFace.push(new vec4(-hx, hy, hz, 1.0));
        this.topFace.push(new vec4(hx, hy, hz, 1.0));


        this.bottomFace.push(new vec4(hx, -hy, -hz, 1.0));
        this.bottomFace.push(new vec4(hx, -hy, hz, 1.0));
        this.bottomFace.push(new vec4(-hx, -hy, hz, 1.0));
        this.bottomFace.push(new vec4(-hx, -hy, hz, 1.0));
        this.bottomFace.push(new vec4(-hx, -hy, -hz, 1.0));
        this.bottomFace.push(new vec4(hx, -hy, -hz, 1.0));
    }

    public setFrontFaceColor(color: vec4) {
        this.frontFace.push(color);
    }

    public setBackFaceColor(color: vec4) {
        this.backFace.push(color);
    }

    public setLeftFaceColor(color: vec4) {
        this.leftFace.push(color);
    }

    public setRightFaceColor(color: vec4) {
        this.rightFace.push(color);
    }

    public setTopFaceColor(color: vec4) {
        this.topFace.push(color);
    }

    public setBottomFaceColor(color: vec4) {
        this.bottomFace.push(color);
    }

    public setColors(frontColor: vec4, backColor: vec4, topColor: vec4, bottomColor: vec4, rightColor:vec4, leftColor:vec4) {
        this.frontFace.push(frontColor);
        this.backFace.push(backColor);
        this.topFace.push(topColor);
        this.bottomFace.push(bottomColor);
        this.rightFace.push(rightColor);
        this.leftFace.push(leftColor);
    }

    public get objectData():vec4[]{
        let tempArr:vec4[] = [];

        tempArr.push(...this.loadingArrayHelper(this.frontFace));
        tempArr.push(...this.loadingArrayHelper(this.backFace));
        tempArr.push(...this.loadingArrayHelper(this.topFace));
        tempArr.push(...this.loadingArrayHelper(this.bottomFace));
        tempArr.push(...this.loadingArrayHelper(this.leftFace));
        tempArr.push(...this.loadingArrayHelper(this.rightFace));

        return tempArr;

    }

    private loadingArrayHelper(face:vec4[]):vec4[]{
        let tempArr:vec4[] = [];
        //we dont go all the way through the array.
        for (let i = 0; i < face.length-1; i++) {
            tempArr.push(face.frontFace[i]);
            tempArr.push(face.frontFace[face.frontFace.length-1]);
        }

        return tempArr;

    }



}