import { DataObject } from "./DataObject.js";
import { vec4 } from "./helperfunctions.js";
import * as util from "./util.js";
export class TriangleObject extends DataObject {
    constructor(x, y, size) {
        let pointA = new vec4(x - size, y - size, 0, 1);
        let pointB = new vec4(x + size, y - size, 0, 1);
        let pointC = new vec4(x, y + size, 0, 1);
        let tempArray = [];
        tempArray.push(pointA);
        tempArray.push(pointB);
        tempArray.push(pointC);
        super(tempArray, util.RED);
    }
}
