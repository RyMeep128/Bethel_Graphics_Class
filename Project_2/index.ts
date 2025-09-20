import * as util from "./util.js";
import { Cube } from "./Cube.js";
import {initShaders} from "./helperfunctions.js";
import {mat4, perspective} from "./helperfunctions.js";

/**
 * @file main.ts
 * @author Ryan Shafer
 * @author Some comments by ChatGPT Model 5
 *
 * Entry point for the WebGL cube rendering project.
 * <p>
 * This file sets up the WebGL2 rendering context, compiles and links
 * shaders, initializes cube objects, and drives the main render loop.
 * It also handles basic keyboard controls to translate and rotate
 * scene objects in real time.
 * </p>
 *
 * <h4>Responsibilities</h4>
 * <ul>
 *   <li>Configure WebGL context state (clear color, viewport, depth test)</li>
 *   <li>Compile shader program via {@code initShaders}</li>
 *   <li>Build scene geometry (ground plane + cubes)</li>
 *   <li>Bind keyboard controls to manipulate cube transforms</li>
 *   <li>Manage update/render loop (update → requestAnimationFrame → render)</li>
 *   <li>Upload projection matrix each frame and call {@code updateAndRender()} for each cube</li>
 * </ul>
 */

"use strict";

let gl: WebGLRenderingContext;
let canvas: HTMLCanvasElement;
let program: WebGLProgram;
let objectArr:Cube[];

let uproj:WebGLUniformLocation; // index of projection in shader program

window.onload = init;

/**
 * Initializes the WebGL rendering context, shader program,
 * and the scene. Sets up global state such as clear color,
 * viewport, depth test, input bindings, and starts the update loop.
 */
function init() {
    //Link up global vars
    canvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
    gl = canvas.getContext("webgl2") as WebGLRenderingContext;
    if (!gl) {
        alert("WebGL isn't available");
    }
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    // init the objectarr
    objectArr = [];

    gl.useProgram(program);

    gl.clearColor(0.0,0.0,0.0,1.0);

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    uproj = gl.getUniformLocation(program, "projectionMatrix");

    setupKeyboardMouseBindings();

    initView();

    gl.enable(gl.DEPTH_TEST);

    window.setInterval(update,util.FramesPerMS);
}

/**
 * Registers keyboard listeners for movement and rotation controls.
 */
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
  The keyup function handles all key up let go,

  @param event the keyboard event
 */
function keyUp(event:KeyboardEvent) {
    switch(event.key) {
        default:
            console.log("stop");
    }
}

/**
 * Initializes scene objects such as ground and test cubes.
 * Adds them to the global object array for update/render cycle.
 */
function initView() {

    let ground:Cube = new Cube(gl,program, 50, .01, 100);
    ground.setAllColor(util.DARKGREEN);
    ground.setY(-1);
    ground.bufferCube();
    objectArr.push(ground);

    //We'll split this off to its own function for clarity, but we need something to make a picture of
    makeCubeAndBuffer();
}

/**
 * Constructs two colored cubes, assigns face colors,
 * uploads their data to the GPU, and pushes them into the object array.
 */
function makeCubeAndBuffer(){

    //front face = 6 verts, position then color
    let testCube = new Cube(gl,program,1,.5,3);
    testCube.setColors(util.BEIGE,util.GOLD,util.RED,util.BLUE,util.GREEN,util.MAROON);
    testCube.bufferCube();
    objectArr.push(testCube);

    let testCube2 = new Cube(gl,program,1,.5,3);
    testCube2.setColors(util.CYAN,util.LIGHTBLUE,util.PINK,util.PURPLE,util.GREEN,util.SILVER);
    testCube2.bufferCube();
    objectArr.push(testCube2);

}

/**
 * Game loop update function; requests the next render frame.
 */
function update() {
    //request a frame be drawn pls
    requestAnimationFrame(render);
}

/**
 * Clears the frame and renders the full scene.
 * <p>
 * Sets up the projection matrix, uploads it as a uniform,
 * and calls {@code updateAndRender()} on each cube in the object array.
 * </p>
 */
function render(){
    //start by clearing any previous data for both color and depth
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let p:mat4 = perspective(45.0, canvas.clientWidth / canvas.clientHeight, 1.0, 100.0);
    gl.uniformMatrix4fv(uproj, false, p.flatten());

    for (let i = 0; i < objectArr.length; i++) {
        objectArr[i].updateAndRender();
    }
}
