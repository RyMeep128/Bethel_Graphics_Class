import * as util from "./util.js";
import * as Color from "./Color.js";
import { Cube } from "./Cube.js";
import { flatten, initShaders } from "./helperfunctions.js";
import { perspective } from "./helperfunctions.js";
import { Car } from "./Car.js";
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
let gl;
let canvas;
let program;
let objectArr;
let car;
let uproj; // index of projection in shader program
window.onload = init;
/**
 * Initializes the WebGL rendering context, shader program,
 * and the scene. Sets up global state such as clear color,
 * viewport, depth test, input bindings, and starts the update loop.
 */
function init() {
    //Link up global vars
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("WebGL isn't available");
    }
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    // init the objectarr
    objectArr = [];
    gl.useProgram(program);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    uproj = gl.getUniformLocation(program, "projectionMatrix");
    setupKeyboardMouseBindings();
    initView();
    gl.enable(gl.DEPTH_TEST);
    window.setInterval(update, util.FramesPerMS);
}
/**
 * Registers keyboard listeners for movement and rotation controls.
 */
function setupKeyboardMouseBindings() {
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
}
let movingForwardBool = false;
let movingBackwardBool = false;
let turningRightBool = false;
let turningLeftBool = false;
/*
  The keydown function handles all key down presses,

  @param event the keyboard event
 */
function keyDown(event) {
    switch (event.key) {
        case "w":
            console.log("w");
            movingForwardBool = true;
            break;
        case "a":
            console.log("a");
            // xoffset -= util.Velocity;
            turningLeftBool = true;
            break;
        case "s":
            console.log("s");
            movingBackwardBool = true;
            break;
        case "d":
            console.log("d");
            // xoffset += util.Velocity;
            turningRightBool = true;
            break;
        case " ":
            console.log("space");
            objectArr[3].addYaw(util.Rotation);
            break;
    }
}
/*
  The keyup function handles all key up let go,

  @param event the keyboard event
 */
function keyUp(event) {
    switch (event.key) {
        case "w":
            console.log("w");
            movingForwardBool = false;
            break;
        case "a":
            console.log("a");
            // xoffset -= util.Velocity;
            turningLeftBool = false;
            break;
        case "s":
            console.log("s");
            movingBackwardBool = false;
            break;
        case "d":
            console.log("d");
            // xoffset += util.Velocity;
            turningRightBool = false;
            break;
        default:
            console.log("stop");
            break;
    }
}
/**
 * Initializes scene objects such as ground and test cubes.
 * Adds them to the global object array for update/render cycle.
 */
function initView() {
    let ground = new Cube(gl, program, objectArr, 50, .01, 100, 0, -1, 0);
    ground.setAllColor(Color.DARKGREEN);
    objectArr.push(ground);
    let building = new Cube(gl, program, objectArr, 1, 5, 1, 5, 6, 0);
    building.setAllColor(Color.SILVER);
    objectArr.push(building);
    //We'll split this off to its own function for clarity, but we need something to make a picture of
    makeCubes();
    bufferData();
}
/**
 * Constructs two colored cubes, assigns face colors,
 * uploads their data to the GPU, and pushes them into the object array.
 */
function makeCubes() {
    //front face = 6 verts, position then color
    // let testCube = new Cube(gl,program,objectArr,1,.5,3);
    // testCube.setColors(Color.BEIGE,Color.GOLD,Color.RED,Color.BLUE,Color.GREEN,Color.MAROON);
    // testCube.bind(0);
    // objectArr.push(testCube);
    car = new Car(gl, program, objectArr, 1, 1, 3);
    // car.setBodyColor(Color.DEEPPINK);
    car.bind(0);
    objectArr.push(car);
    let testCube2 = new Cube(gl, program, objectArr, 1, 1, 1);
    testCube2.setColors(Color.CYAN, Color.HONEYDEW, Color.PINK, Color.PURPLE, Color.GREEN, Color.SILVER);
    objectArr.push(testCube2);
    // let testCylinder:Cylinder = new Cylinder(gl,program,objectArr,1,.5);
    // testCylinder.setAllColor(Color.ORANGE,Color.YELLOW,Color.BLUE);
    // testCylinder.bind(0);
    // testCylinder.addPitch(90);
    // testCylinder.addYaw(90);
    // objectArr.push(testCylinder);
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
function render() {
    //start by clearing any previous data for both color and depth
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    let p = perspective(45.0, canvas.clientWidth / canvas.clientHeight, 1.0, 100.0);
    gl.uniformMatrix4fv(uproj, false, p.flatten());
    for (let i = 0; i < objectArr.length; i++) {
        if (objectArr[i].getBinding() == 0) {
            moveObjects(i);
        }
        objectArr[i].update();
        objectArr[i].draw();
    }
}
function moveObjects(i) {
    if (movingForwardBool) {
        car.moveCarFoward();
    }
    if (movingBackwardBool) {
        car.moveCarBackward();
    }
    if (turningRightBool) {
        car.turnRight();
    }
    else {
        car.stopTurningRight();
    }
    if (turningLeftBool) {
        car.turnLeft();
    }
    else {
        car.stopTurningLeft();
    }
}
function bufferData() {
    const objectPoints = [];
    for (let i = 0; i < objectArr.length; i++) {
        objectPoints.push(...objectArr[i].getObjectData());
    }
    let bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(objectPoints), gl.STATIC_DRAW);
    // Attribute setup assumes interleaved layout: [pos vec4][color vec4], stride 32 bytes
    let vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 32, 16);
    gl.enableVertexAttribArray(vColor);
    let vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(vPosition);
}
