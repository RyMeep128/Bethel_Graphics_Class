"use strict";
//////////////////////////////////////////////////////////////////////////////
//
//  Angel.js
//
//////////////////////////////////////////////////////////////////////////////
// adapted liberally from Angel's Interactive Computer Graphics 7th Edition by Nathan Gossett
//----------------------------------------------------------------------------
//
//  Helper functions
//  Version 6/16/2021
//
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.mat4 = exports.vec4 = exports.vec3 = exports.vec2 = void 0;
exports.initShaders = initShaders;
exports.initFileShaders = initFileShaders;
exports.toradians = toradians;
exports.todegrees = todegrees;
exports.flatten = flatten;
exports.translate = translate;
exports.rotate = rotate;
exports.rotateX = rotateX;
exports.rotateY = rotateY;
exports.rotateZ = rotateZ;
exports.scalem = scalem;
exports.lookAt = lookAt;
exports.ortho = ortho;
exports.perspective = perspective;
function initShaders(gl, vertexShaderId, fragmentShaderId) {
    var vertShdr;
    var fragShdr;
    var vertElem = document.getElementById(vertexShaderId);
    if (!vertElem) {
        alert("Unable to load vertex shader " + vertexShaderId);
        return -1;
    }
    else {
        vertShdr = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertShdr, vertElem.textContent);
        gl.compileShader(vertShdr);
        if (!gl.getShaderParameter(vertShdr, gl.COMPILE_STATUS)) {
            var msg = "Vertex shader failed to compile.  The error log is:"
                + "<pre>" + gl.getShaderInfoLog(vertShdr) + "</pre>";
            alert(msg);
            return -1;
        }
    }
    var fragElem = document.getElementById(fragmentShaderId);
    if (!fragElem) {
        alert("Unable to load vertex shader " + fragmentShaderId);
        return -1;
    }
    else {
        fragShdr = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragShdr, fragElem.textContent);
        gl.compileShader(fragShdr);
        if (!gl.getShaderParameter(fragShdr, gl.COMPILE_STATUS)) {
            var msg = "Fragment shader failed to compile.  The error log is:"
                + "<pre>" + gl.getShaderInfoLog(fragShdr) + "</pre>";
            alert(msg);
            return -1;
        }
    }
    var program = gl.createProgram();
    gl.attachShader(program, vertShdr);
    gl.attachShader(program, fragShdr);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        var msg_1 = "Shader program failed to link.  The error log is:"
            + "<pre>" + gl.getProgramInfoLog(program) + "</pre>";
        alert(msg_1);
        return -1;
    }
    return program;
}
// Get a file as a string using  AJAX
function loadFileAJAX(name) {
    var xhr = new XMLHttpRequest(), okStatus = document.location.protocol === "file:" ? 0 : 200;
    xhr.open('GET', name, false);
    xhr.send(null);
    return xhr.status == okStatus ? xhr.responseText : null;
}
function initFileShaders(gl, vShaderName, fShaderName) {
    function getShader(gl, shaderName, type) {
        var shader = gl.createShader(type), shaderScript = loadFileAJAX(shaderName);
        if (!shaderScript) {
            alert("Could not find shader source: " + shaderName);
        }
        gl.shaderSource(shader, shaderScript);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert(gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }
    var vertexShader = getShader(gl, vShaderName, gl.VERTEX_SHADER), fragmentShader = getShader(gl, fShaderName, gl.FRAGMENT_SHADER), program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
        return null;
    }
    return program;
}
//----------------------------------------------------------------------------
function toradians(degrees) {
    return degrees * Math.PI / 180.0;
}
function todegrees(radians) {
    return radians * 180.0 / Math.PI;
}
//----------------------------------------------------------------------------
//
//  Vector Constructors
//
//use for texture coordinates
var vec2 = /** @class */ (function (_super) {
    __extends(vec2, _super);
    function vec2(x, y) {
        if (x === void 0) { x = 0.0; }
        if (y === void 0) { y = 0.0; }
        var _this = _super.call(this) || this;
        _this.push(x);
        _this.push(y);
        return _this;
    }
    return vec2;
}(Array));
exports.vec2 = vec2;
var vec3 = /** @class */ (function (_super) {
    __extends(vec3, _super);
    function vec3(x, y, z) {
        if (x === void 0) { x = 0.0; }
        if (y === void 0) { y = 0.0; }
        if (z === void 0) { z = 0.0; }
        var _this = _super.call(this) || this;
        _this.push(x);
        _this.push(y);
        _this.push(z);
        return _this;
    }
    //dot product
    vec3.prototype.dot = function (other) {
        var sum = 0.0;
        for (var i = 0; i < this.length; ++i) {
            sum += this[i] * other[i];
        }
        return sum;
    };
    //cross product
    vec3.prototype.cross = function (other) {
        return new vec3(this[1] * other[2] - this[2] * other[1], this[2] * other[0] - this[0] * other[2], this[0] * other[1] - this[1] * other[0]);
    };
    return vec3;
}(Array));
exports.vec3 = vec3;
var vec4 = /** @class */ (function (_super) {
    __extends(vec4, _super);
    function vec4(x, y, z, w) {
        if (x === void 0) { x = 0.0; }
        if (y === void 0) { y = 0.0; }
        if (z === void 0) { z = 0.0; }
        if (w === void 0) { w = 0.0; }
        var _this = _super.call(this) || this;
        _this.push(x);
        _this.push(y);
        _this.push(z);
        _this.push(w);
        return _this;
    }
    //dot product
    vec4.prototype.dot = function (other) {
        var sum = 0.0;
        for (var i = 0; i < this.length; ++i) {
            sum += this[i] * other[i];
        }
        return sum;
    };
    //cross product
    vec4.prototype.cross = function (other) {
        return new vec4(this[1] * other[2] - this[2] * other[1], this[2] * other[0] - this[0] * other[2], this[0] * other[1] - this[1] * other[0], 0.0);
    };
    // return a unit length vector pointing in the same direction as this vector
    vec4.prototype.normalize = function () {
        var len = Math.sqrt(this.dot(this));
        if (!isFinite(len)) {
            throw "normalize: vector " + this + " has zero length";
        }
        for (var i = 0; i < this.length; ++i) {
            this[i] /= len;
        }
        return this;
    };
    // is other identical to this vector?
    vec4.prototype.equals = function (other) {
        return this[0] == other[0] &&
            this[1] == other[1] &&
            this[2] == other[2] &&
            this[3] == other[3];
    };
    // return this vector minus other component-wise
    vec4.prototype.subtract = function (other) {
        return new vec4(this[0] - other[0], this[1] - other[1], this[2] - other[2], this[3] - other[3]);
    };
    //add this vector to other component-wise
    vec4.prototype.add = function (other) {
        return new vec4(this[0] + other[0], this[1] + other[1], this[2] + other[2], this[3] + other[3]);
    };
    //convert this vector to a 1D array of floats (which is actually just v)
    vec4.prototype.flatten = function () {
        return this;
    };
    return vec4;
}(Array));
exports.vec4 = vec4;
//----------------------------------------------------------------------------
var mat4 = /** @class */ (function () {
    function mat4(v, n, u, t) {
        if (v === void 0) { v = new vec4(1.0, 0.0, 0.0, 0.0); }
        if (n === void 0) { n = new vec4(0.0, 1.0, 0.0, 0.0); }
        if (u === void 0) { u = new vec4(0.0, 0.0, 1.0, 0.0); }
        if (t === void 0) { t = new vec4(0.0, 0.0, 0.0, 1.0); }
        //use the incoming vectors as rows in this 2D array
        this.m = [v.flatten(), n.flatten(), u.flatten(), t.flatten()];
    }
    mat4.prototype.mult = function (other) {
        if (other instanceof mat4) {
            var result = new mat4();
            for (var i = 0; i < 4; ++i) {
                for (var j = 0; j < 4; ++j) {
                    var sum = 0.0;
                    for (var k = 0; k < 4; ++k) {
                        sum += this.m[i][k] * other.m[k][j];
                    }
                    result.m[i][j] = sum;
                }
            }
            return result;
        }
        else if (other instanceof vec4) {
            var result = new vec4();
            for (var i = 0; i < 4; i++) {
                var sum = 0.0;
                for (var j = 0; j < 4; j++) {
                    sum += this.m[i][j] * other[j];
                }
                result[i] = sum;
            }
            return result;
        }
        else {
            throw "illegal type in multiplication: " + other;
        }
    };
    //convert 4x4 matrix into 1D 16 element array of floats
    mat4.prototype.flatten = function () {
        var t = this.transpose().m;
        var floats = new Array(16);
        var idx = 0;
        for (var i = 0; i < 4; ++i) {
            for (var j = 0; j < 4; ++j) {
                floats[idx++] = t[i][j];
            }
        }
        return floats;
    };
    //return transposed matrix
    mat4.prototype.transpose = function () {
        var result = new mat4();
        for (var i = 0; i < result.m.length; ++i) {
            for (var j = 0; j < this.m[i].length; ++j) {
                result.m[i][j] = (this.m[j][i]);
            }
        }
        return result;
    };
    return mat4;
}());
exports.mat4 = mat4;
//----------------------------------------------------------------------------
//
//  Matrix Functions
//
// convert an array of vec2 or vec4 objects to a 1D array of floats to send to graphics memory
function flatten(vecs) {
    //how many total floats are in this array of vec4s?
    var floats = new Float32Array(vecs.length * 4);
    var idx = 0;
    for (var i = 0; i < vecs.length; ++i) {
        for (var j = 0; j < vecs[i].length; ++j) {
            floats[idx++] = vecs[i][j];
        }
    }
    return floats;
}
//----------------------------------------------------------------------------
//
//  Basic Transformation Matrix Generators
//
//produce a translation matrix
function translate(x, y, z) {
    if (y === void 0) { y = 0; }
    if (z === void 0) { z = 0; }
    if (Array.isArray(x) && x.length == 3) {
        z = x[2];
        y = x[1];
        x = x[0];
    }
    var result = new mat4();
    if (typeof x === "number") { //it is, but make the compiler happy
        result.m[0][3] = x;
        result.m[1][3] = y;
        result.m[2][3] = z;
    }
    return result;
}
//----------------------------------------------------------------------------
//produce a rotation matrix around the supplied axis by the supplied angle in degrees
function rotate(angle, axis) {
    var _a = axis.normalize(), x = _a[0], y = _a[1], z = _a[2];
    var c = Math.cos(toradians(angle));
    var omc = 1.0 - c;
    var s = Math.sin(toradians(angle));
    return new mat4(new vec4(x * x * omc + c, x * y * omc - z * s, x * z * omc + y * s, 0.0), new vec4(x * y * omc + z * s, y * y * omc + c, y * z * omc - x * s, 0.0), new vec4(x * z * omc - y * s, y * z * omc + x * s, z * z * omc + c, 0.0), new vec4(0, 0, 0, 1));
}
//produce a rotation matrix around the x axis by the supplied angle in degrees
function rotateX(theta) {
    var c = Math.cos(toradians(theta));
    var s = Math.sin(toradians(theta));
    return new mat4(new vec4(1.0, 0.0, 0.0, 0.0), new vec4(0.0, c, -s, 0.0), new vec4(0.0, s, c, 0.0), new vec4(0.0, 0.0, 0.0, 1.0));
}
//produce a rotation matrix around the y axis by the supplied angle in degrees
function rotateY(theta) {
    var c = Math.cos(toradians(theta));
    var s = Math.sin(toradians(theta));
    return new mat4(new vec4(c, 0.0, s, 0.0), new vec4(0.0, 1.0, 0.0, 0.0), new vec4(-s, 0.0, c, 0.0), new vec4(0.0, 0.0, 0.0, 1.0));
}
//produce a rotation matrix around the z axis by the supplied angle in degrees
function rotateZ(theta) {
    var c = Math.cos(toradians(theta));
    var s = Math.sin(toradians(theta));
    return new mat4(new vec4(c, -s, 0.0, 0.0), new vec4(s, c, 0.0, 0.0), new vec4(0.0, 0.0, 1.0, 0.0), new vec4(0.0, 0.0, 0.0, 1.0));
}
//----------------------------------------------------------------------------
//produce a scaling matrix by the supplied factors along each axis
function scalem(x, y, z) {
    if (y === void 0) { y = 1; }
    if (z === void 0) { z = 1; }
    if (Array.isArray(x) && x.length == 3) {
        z = x[2];
        y = x[1];
        x = x[0];
    }
    var result = new mat4();
    if (typeof x === "number") { //it is, but make the compiler happy
        result.m[0][0] = x;
        result.m[1][1] = y;
        result.m[2][2] = z;
    }
    return result;
}
//----------------------------------------------------------------------------
//
//  ModelView Matrix Generators
//
//produce a orientation matrix with camera positioned at location "eye", pointed at location "at", and "up" as the up direction
function lookAt(eye, at, up) {
    if (eye.equals(at)) {
        return new mat4();
    }
    var v = eye.subtract(at).normalize(); // view direction vector
    var n = up.cross(v).normalize(); //side vector
    var u = v.cross(n).normalize(); //corrected up vector
    var t = new vec4(0, 0, 0, 1);
    return new mat4(n, u, v, t).mult(translate(-eye[0], -eye[1], -eye[2]));
}
//----------------------------------------------------------------------------
//
//  Projection Matrix Generators
//
//Produce a orthographic projection matrix with the supplied boundary planes
function ortho(left, right, bottom, top, near, far) {
    if (left == right) {
        throw "ortho(): left and right are equal";
    }
    if (bottom == top) {
        throw "ortho(): bottom and top are equal";
    }
    if (near == far) {
        throw "ortho(): near and far are equal";
    }
    var w = right - left;
    var h = top - bottom;
    var d = far - near;
    var result = new mat4();
    result.m[0][0] = 2.0 / w;
    result.m[1][1] = 2.0 / h;
    result.m[2][2] = -2.0 / d;
    result.m[0][3] = -(left + right) / w;
    result.m[1][3] = -(top + bottom) / h;
    result.m[2][3] = -(near + far) / d;
    return result;
}
//----------------------------------------------------------------------------
// produce a perspective projection matrix
// fovy: vertical field of view angle
// aspect: aspect ration (width / height)
// near: distance to near cutting plane
// far: distance to far cutting plane
function perspective(fovy, aspect, near, far) {
    var f = 1.0 / Math.tan(toradians(fovy) / 2);
    var d = far - near;
    var result = new mat4();
    result.m[0][0] = f / aspect;
    result.m[1][1] = f;
    result.m[2][2] = -(near + far) / d;
    result.m[2][3] = -2 * near * far / d;
    result.m[3][2] = -1;
    result.m[3][3] = 0.0;
    return result;
}
