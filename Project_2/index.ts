import * as util from "./util.js";
import { Cube } from "./Cube.js";
import { DataObject } from "./DataObject.js";
import { TriangleObject } from "./TriangleObject.js";
import {initShaders, rotateY, vec4} from "./helperfunctions.js";
import {flatten} from "./helperfunctions.js";
import {lookAt, mat4, perspective, rotateX, translate} from "./helperfunctions.js";


"use strict";

let gl: WebGLRenderingContext;
let canvas: HTMLCanvasElement;
let program: WebGLProgram;
let bufferId: WebGLBuffer;
let objectArr:Cube[];


let umv:WebGLUniformLocation; // index of model_view in shader program
let uproj:WebGLUniformLocation; // index of projection in shader program
let vPosition:GLint; // remember where this shader attribute is
let vColor:GLint; // remember where the color shader attribute is

// we need to keep track of our current offsets
let xoffset:number;
let yoffset:number;
let zoffset:number;
let theta:number;


window.onload = init;


function init() {
    //Link up global vars
    canvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
    // the canvas already has a webgl rendering context
    gl = canvas.getContext("webgl2") as WebGLRenderingContext;
    if (!gl) {
        alert("WebGL isn't available");
    }
    // Use the helper function to turn vertex and fragment shader into program
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    // init the objectarr
    objectArr = [];
    // tel the webglcontext what shader and fragment program to use
    gl.useProgram(program);
    // when we clear the screen what color should it go to
    gl.clearColor(0.0,0.0,0.0,1.0);

    //What part of the canvas should we use (all of it here)
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    umv = gl.getUniformLocation(program, "modelViewMatrix");
    uproj = gl.getUniformLocation(program, "projectionMatrix");

    xoffset = yoffset = zoffset = theta = 0;


    setupKeyboardMouseBindings();

    initView();

    //we need to do this to avoid having objects that are behind other objects show up anyway
    gl.enable(gl.DEPTH_TEST);
    //start the loop
    window.setInterval(update,util.FramesPerMS);
}

function setupKeyboardMouseBindings() {
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup",keyUp);
}

/*
  The keydown function handles all key down presses,

  @param event the keyboard event
 */
function keyDown(event:KeyboardEvent) {
    switch(event.key) {
        case "w":
            console.log("w");
            objectArr[1].addZ(-util.Velocity)
            break;
        case "a":
            console.log("a");
            // xoffset -= util.Velocity;
            objectArr[1].addTheta(util.Rotation)
            break;
        case "s":
            console.log("s");
            objectArr[1].addZ(util.Velocity)
            break;
        case "d":
            console.log("d");
            // xoffset += util.Velocity;
            objectArr[1].addTheta(-util.Rotation)
            break;
        case " ":
            console.log("space");
            objectArr[2].addTheta(util.Rotation)
            break;
    }
}

/*
  The keydown function handles all key up let go,

  @param event the keyboard event
 */
function keyUp(event:KeyboardEvent) {
    switch(event.key) {
        default:
            console.log("stop");
    }
}

function initView() {

    //We'll split this off to its own function for clarity, but we need something to make a picture of
    makeCubeAndBuffer();
}

//Make a cube and send it over to the graphics card
function makeCubeAndBuffer(){

    let ground:Cube = new Cube(gl,program, 50, .01, 100);
    ground.setAllColor(util.DARKGREEN);
    ground.setY(-1);
    ground.bufferCube();
    objectArr.push(ground);


    //front face = 6 verts, position then color
    let testCube = new Cube(gl,program,1,.5,3);

    testCube.setColors(util.BEIGE,util.GOLD,util.RED,util.BLUE,util.GREEN,util.MAROON);

    testCube.bufferCube();

    objectArr.push(testCube);

    let testCube2 = new Cube(gl,program,1,.5,3);

    testCube2.setColors(util.BEIGE,util.GOLD,util.CYAN,util.BLUE,util.GREEN,util.MAROON);

    testCube2.bufferCube();

    objectArr.push(testCube2);



    //front face = 6 verts, position then color
    // let testCube2 = new Cube(gl,program,1,.5,3);
    //
    // testCube2.setColors(util.CYAN,util.LIGHTBLUE,util.PINK,util.PURPLE,util.GREEN,util.SILVER);
    //
    // testCube2.bufferCube();

}


function update() {

    //request a frame be drawn pls
    requestAnimationFrame(render);
}

//draw a new frame
function render(){
    //start by clearing any previous data for both color and depth
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    let p:mat4 = perspective(45.0, canvas.clientWidth / canvas.clientHeight, 1.0, 100.0);
    gl.uniformMatrix4fv(uproj, false, p.flatten());

    //we'll discuss projection matrices in a couple of days, but use this for now

    //now set up the model view matrix and send it over as a uniform
    //the inputs to this lookAt are to move back 20 units, point at the origin, and the positive y axis is up
    //TODO construct a model view matrix and send it as a uniform to the vertex shader

    for (let i = 0; i < objectArr.length; i++) {
        objectArr[i].updateAndRender();
    }


}
