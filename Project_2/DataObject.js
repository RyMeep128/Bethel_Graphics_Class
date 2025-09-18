"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataObject = void 0;
var DataObject = /** @class */ (function () {
    //three points Triangle :)
    function DataObject(position, color) {
        this._position = position;
        this._color = color;
    }
    Object.defineProperty(DataObject.prototype, "position", {
        get: function () {
            return this._position;
        },
        set: function (value) {
            this._position = value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DataObject.prototype, "color", {
        get: function () {
            return this._color;
        },
        set: function (value) {
            this._color = value;
        },
        enumerable: false,
        configurable: true
    });
    DataObject.prototype.getInfo = function () {
        var resultArr = [];
        for (var i = 0; i < this.position.length; i++) {
            resultArr.push(this.position[i]);
            resultArr.push(this.color[i]);
        }
        return resultArr;
    };
    return DataObject;
}());
exports.DataObject = DataObject;
