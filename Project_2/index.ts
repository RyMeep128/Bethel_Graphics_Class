import * as util from "./util.js";
import { DataObject } from "./DataObject.js";

"use strict";

let gl: WebGLRenderingContext;
let canvas: HTMLCanvasElement;
let program: WebGLProgram;
let bufferId: WebGLBuffer;
let objectArr: DataObject[];

