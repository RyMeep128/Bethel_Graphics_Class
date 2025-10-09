import * as util from "./util.js";
import * as Color from "./Color.js";
import { Cube } from "./Cube.js";
import {flatten, initShaders, lookAt, vec4} from "./helperfunctions.js";
import { mat4, perspective } from "./helperfunctions.js";
import { Cylinder } from "./Cylinder.js";
import { RenderableObject } from "./RenderableObject.js";
import { Car } from "./Car.js";
import {Camera} from "./Camera.js";

/**
 * @file main.ts
 * @description Entry point and runtime loop for the WebGL scene.
 *
 * Responsibilities:
 * - Initialize WebGL2 context and shader program
 * - Build scene objects and upload buffers
 * - Register input handlers
 * - Drive the update/render loop
 *
 * Conventions:
 * - Interleaved VBO layout: [pos vec4][color vec4], stride 32 bytes (offsets 0/16)
 * - Object-specific transforms handled via each object's `update()` method
 * - Objects with `binding === 0` receive movement input in {@link moveObjects}
 *
 * @author Ryan Shafer
 * @author Some comments by ChatGPT Model 5
 */

"use strict";

/** WebGL rendering context (WebGL2 requested). */
let gl: WebGLRenderingContext;
/** Canvas element hosting the GL context. */
let canvas: HTMLCanvasElement;
/** Linked shader program. */
let program: WebGLProgram;
/** Scene graph list; draw order is array order. */
let objectArr: RenderableObject[];
/** Player-controlled car instance. */
let car: Car;
let ground: Cube

/** Location of `projectionMatrix` uniform. */
let uproj: WebGLUniformLocation;

window.onload = init;

/**
 * Initializes GL, shaders, scene objects, input bindings, and starts the loop.
 * @returns {void}
 */
function init(): void {
    // Link up global vars
    canvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
    gl = canvas.getContext("webgl2") as unknown as WebGLRenderingContext;
    if (!gl) {
        alert("WebGL isn't available");
    }

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    objectArr = [];

    gl.useProgram(program);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    uproj = gl.getUniformLocation(program, "projectionMatrix");

    setupKeyboardMouseBindings();
    initView();

    gl.enable(gl.DEPTH_TEST);

    // Fixed-timestep update; render is scheduled via requestAnimationFrame.
    window.setInterval(update, util.FramesPerMS);
}

/**
 * Registers keyboard listeners for movement and rotation controls.
 * @returns {void}
 */
function setupKeyboardMouseBindings(): void {
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
}

/** True when forward input active. */
let movingForwardBool: boolean = false;
/** True when backward input active. */
let movingBackwardBool: boolean = false;
/** True when right turn input active. */
let turningRightBool: boolean = false;
/** True when left turn input active. */
let turningLeftBool: boolean = false;

let zoomInBool: boolean = false;
let zoomOutBool: boolean = false;
let fovy:number = 45.0;

let dollyInBool: boolean = false;
let dollyOutBool: boolean = false;
let dolly:number = 1;

let followCar:boolean = false;

let turnHeadLeft:boolean = false;
let turnHeadRight:boolean = false;

/**
 * Key-down handler for movement input.
 * @param {KeyboardEvent} event - The keyboard event
 * @returns {void}
 */
function keyDown(event: KeyboardEvent): void {
    switch (event.key) {
        case "ArrowUp":
            movingForwardBool = true;
            movingBackwardBool = false;
            break;
        case "ArrowLeft":
            turningLeftBool = true;
            break;
        case "ArrowDown":
            movingBackwardBool = true;
            movingForwardBool = false;
            break;
        case "ArrowRight":
            turningRightBool = true;
            break;
        case "q":
            zoomInBool = true;
            zoomOutBool = false;
            break;
        case "w":
            zoomInBool = false;
            zoomOutBool = true;
            break;
        case "s":
            dollyInBool = true;
            dollyOutBool = false;
            break;
        case "a":
            dollyInBool = false;
            dollyOutBool = true;
            break;
        case "f":
            followCar = !followCar;
            break;
        case "z":
            turnHeadLeft = true;
            turnHeadRight = false;
            break;
        case "x":
            turnHeadLeft = false;
            turnHeadRight = true;
            break;
        case "1":
            cameraIndex = 1;
            break;
        case "2":
            cameraIndex = 2;
            break;
        case "3":
            cameraIndex = 3;
            break;
        case " ":
            movingForwardBool = false;
            movingBackwardBool = false;
            turningRightBool = false;
            turningLeftBool = false;
            break;
    }
}

/**
 * Key-up handler for movement input.
 * @param {KeyboardEvent} event - The keyboard event
 * @returns {void}
 */
function keyUp(event: KeyboardEvent): void {
    switch (event.key) {
        case "ArrowLeft":
            turningLeftBool = false;
            break;
        case "ArrowRight":
            turningRightBool = false;
            break;
        case "q":
        case "w":
            zoomInBool = false;
            zoomOutBool = false;
            break;
        case "s":
        case "a":
            dollyInBool = false;
            dollyOutBool = false;
            break;
        case "z":
            turnHeadLeft = false;
            break;
        case "x":
            turnHeadRight = false;
            break;
        default:
            break;
    }
}

function checkBounds(ground:Cube, car:Car):void{
    if (car.getX() > ground.getX() + ground.getWidth()
        // ||
        // car.getX() + car.getWidth() < ground.getX() ||
        // car.getZ() > ground.getZ() + ground.getDepth() ||
        // car.getZ() + car.getDepth() < ground.getZ()
        )
    {

        movingForwardBool = false;
        movingBackwardBool = false;
    }


}

let cameraOne:Camera;
let cameraTwo:Camera;

/**
 * Initializes scene objects and uploads their buffers.
 * Adds ground, a building, the player car, and a test cube.
 * @returns {void}
 */
function initView(): void {

    cameraOne = new Camera();
    cameraTwo = new Camera();

    ground = new Cube(gl, program, objectArr, 50, 0.01, 100, 0, -1, 0);
    ground.setAllColor(Color.DARKGREEN);
    objectArr.push(ground);

    const building: Cube = new Cube(gl, program, objectArr, 1, 5, 1, 5, 6, 0);
    building.setAllColor(Color.SILVER);
    objectArr.push(building);

    // Scene contents (car + example geometry)
    makeCubes();

    // Upload interleaved geometry to GPU and set attribute pointers
    bufferData();
}

/**
 * Constructs the car and a sample cube; appends them to {@link objectArr}.
 * @returns {void}
 */
function makeCubes(): void {
    car = new Car(gl, program, objectArr, 1, 1, 3);
    car.bind(0);
    objectArr.push(car);

    const testCube2 = new Cube(gl, program, objectArr, 1, 1, 1);
    testCube2.setColors(
        Color.CYAN,
        Color.HONEYDEW,
        Color.PINK,
        Color.PURPLE,
        Color.GREEN,
        Color.SILVER
    );
    objectArr.push(testCube2);

    // Example cylinder code retained for reference in source.
}

/**
 * Fixed-timestep update hook; schedules the next render frame.
 * @returns {void}
 */
function update(): void {
    requestAnimationFrame(render);
}

/**
 * Clears the frame, uploads projection, advances motion, and draws the scene.
 * @returns {void}
 */
function render(): void {
    // Clear color and depth
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Upload projection
    const p: mat4 = perspective(fovy, canvas.clientWidth / canvas.clientHeight,1.0,100.0);
    gl.uniformMatrix4fv(uproj,false, p.flatten());

    // Update + draw in array order
    for (let i = 0; i < objectArr.length; i++) {
        if (objectArr[i].getBinding() === 0) {
            moveObjects();
            checkBounds(ground,car);
            continue;
        }
        zoomAndDolly(i);
        camera(i);
        objectArr[i].draw();
    }
}

function camera(i:number){
    switch(cameraIndex){
        case 1:{
            if(followCar){
                cameraOne.setCameraLook(car.getX(),car.getY(),car.getZ());
            }else{
                cameraOne.setCameraLook(0,0,0);
            }
            car.updateAndDraw(cameraOne.getCamera());
            objectArr[i].update(cameraOne.getCamera());
            break;
        }
        case 2:{
            //TODO:Currently working in here
            let test:vec4 = car.getEyeWorldPos();
            cameraTwo.lookAtObject(car.getHead(),3,4,3);

            cameraTwo.setCamera(test[0],test[1]+1,test[2]+1,test[0],test[1],test[2]-2);
            car.updateAndDraw(cameraTwo.getCamera());
            objectArr[i].update(cameraTwo.getCamera());
            break;
        }
    }

}

function zoomAndDolly(i:number){
    if(zoomOutBool){
        fovy--;
    }
    if(zoomInBool){
        fovy++;
    }
    if(dollyInBool){
        cameraOne.updateCameraz(-dolly);
    }
    if(dollyOutBool){
        cameraOne.updateCameraz(dolly);
    }
}

let cameraIndex = 1;

/**
 * Applies input-driven motion to controlled objects (binding group 0).
 * Currently routes inputs to the single {@link car} instance.
 *
 * @param {number} i - Index of the object in {@link objectArr} (unused for now)
 * @returns {void}
 */
function moveObjects(): void {
    if (movingForwardBool) {
        car.moveCarForward();
    }
    if (movingBackwardBool) {
        car.moveCarBackward();
    }
    if (turningRightBool) {
        car.turnRight();
    } else {
        car.stopTurningRight();
    }
    if (turningLeftBool) {
        car.turnLeft();
    } else {
        car.stopTurningLeft();
    }
    if(turnHeadRight) {
        car.rotateHead(-util.Rotation)
    }
    if(turnHeadLeft) {
        car.rotateHead(util.Rotation)
    }
}

/**
 * Builds a single interleaved VBO from all renderables and configures attributes.
 * Layout: `[pos vec4][color vec4]`, stride 32 bytes (offsets 0/16).
 * @returns {void}
 */
function bufferData(): void {
    const objectPoints: vec4[] = [];
    for (let i = 0; i < objectArr.length; i++) {
        objectPoints.push(...objectArr[i].getObjectData());
    }

    const bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(objectPoints), gl.STATIC_DRAW);

    // Attribute setup assumes interleaved layout: [pos vec4][color vec4]
    const vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 32, 16);
    gl.enableVertexAttribArray(vColor);

    const vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(vPosition);
}
