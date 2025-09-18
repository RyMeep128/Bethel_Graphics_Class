export class DataObject {
    //three points Triangle :)
    constructor(position, color) {
        this._position = position;
        this._color = color;
    }
    get position() {
        return this._position;
    }
    set position(value) {
        this._position = value;
    }
    get color() {
        return this._color;
    }
    set color(value) {
        this._color = value;
    }
    getInfo() {
        let resultArr = [];
        for (let i = 0; i < this.position.length; i++) {
            resultArr.push(this.position[i]);
            resultArr.push(this.color[i]);
        }
        return resultArr;
    }
}
