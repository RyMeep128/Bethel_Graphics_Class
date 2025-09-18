import {vec4} from "./helperfunctions";

export class DataObject {
    private _position:vec4[];
    private _color: vec4[];

    //three points Triangle :)
    constructor(position: vec4[3], color:vec4) {
        this._position = position;
        this._color = color;
    }


    get position(): vec4[] {
        return this._position;
    }

    set position(value: vec4[]) {
        this._position = value;
    }

    get color(): vec4[] {
        return this._color;
    }

    set color(value: vec4[]) {
        this._color = value;
    }

    public getInfo():vec4[]{
        let resultArr:vec4[] = [];
        for (let i:number = 0; i < this.position.length; i++) {
            resultArr.push(this.position[i]);
            resultArr.push(this.color[i]);
        }
        return resultArr;
    }



}