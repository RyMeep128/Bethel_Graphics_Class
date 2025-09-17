"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLACK = exports.TRANSPARENT = exports.ORANGE = exports.YELLOW = exports.GREEN = exports.BLUE = exports.RED = void 0;
var helperfunctions_js_1 = require("./helperfunctions.js");
/**
 * Simple UTIL class for magic numbers and colors
 */
exports.RED = new helperfunctions_js_1.vec4(1, 0, 0, 1);
exports.BLUE = new helperfunctions_js_1.vec4(0, 0, 1, 1);
exports.GREEN = new helperfunctions_js_1.vec4(0, 1, 0, 1);
exports.YELLOW = new helperfunctions_js_1.vec4(1, 0, 1, 1);
exports.ORANGE = new helperfunctions_js_1.vec4(.7, .3, .2, 1);
exports.TRANSPARENT = new helperfunctions_js_1.vec4(0, 0, 0, 0);
exports.BLACK = new helperfunctions_js_1.vec4(0, 0, 0, 1);
