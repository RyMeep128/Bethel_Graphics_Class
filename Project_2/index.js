import * as util from "./util.js";
import { TriangleObject } from "./TriangleObject.js";
import { initShaders } from "./helperfunctions.js";
"use strict";
let gl;
let canvas;
let program;
let bufferId;
let objectArr;
window.onload = init;
function init() {
    //Link up global vars
    canvas = document.getElementById("gl-canvas");
    // the canvas already has a webgl rendering context
    gl = canvas.getContext("webgl2");
    // Use the helper function to turn vertex and fragment shader into program
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    // init the objectarr
    objectArr = [];
    // tel the webglcontext what shader and fragment program to use
    gl.useProgram(program);
    // when we clear the screen what color should it go to
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    //What part of the canvas should we use (all of it here)
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    setupKeyboardMouseBindings();
    initView();
    //start the loop
    window.setInterval(update, util.FramesPerMS);
}
function setupKeyboardMouseBindings() {
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
}
/*
  The keydown function handles all key down presses,

  @param event the keyboard event
 */
function keyDown(event) {
    switch (event.key) {
        case "w":
            console.log("w");
            break;
        case "a":
            console.log("a");
            break;
        case "s":
            console.log("s");
            break;
        case "d":
            console.log("d");
            break;
        case " ":
            console.log("space");
            break;
    }
}
/*
  The keydown function handles all key up let go,

  @param event the keyboard event
 */
function keyUp(event) {
    switch (event.key) {
        default:
            console.log("stop");
    }
}
function initView() {
    let test = new TriangleObject(.5, .5, .01);
    objectArr.push(test);
    let points = [];
    for (let i = 0; i < objectArr.length; i++) {
        for (let j = 0; j < objectArr[i].getInfo().length; j++) {
            points.push(objectArr[i][j]);
        }
    }
}
function update() {
    //request a frame be drawn pls
    requestAnimationFrame(render);
}
function render() {
    //Let us begin by clearing the screen
    gl.clear(gl.COLOR_BUFFER_BIT);
    //let us bind and become stronger
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.drawArrays(gl.TRIANGLES, 0, objectArr.length);
}
