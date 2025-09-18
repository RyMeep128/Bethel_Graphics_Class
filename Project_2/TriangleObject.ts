import {DataObject} from "./DataObject.js";
import {vec4} from "./helperfunctions.js";
import * as util from "./util.js";

export class TriangleObject extends DataObject{

    constructor(x:number, y:number, size:number) {
        let pointA:vec4 = new vec4(x-size,y -size, 0, 1);
        let pointB:vec4 = new vec4(x+size,y -size, 0, 1);
        let pointC:vec4 = new vec4(x,y+size, 0, 1);
        let tempArray:vec4[] = [];
        tempArray.push(pointA);
        tempArray.push(pointB);
        tempArray.push(pointC);
        super(tempArray,util.RED);
    }

}