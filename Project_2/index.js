import * as util from "./util.js";
import { initShaders, vec4 } from "./helperfunctions.js";
import { flatten } from "./helperfunctions.js";
import { lookAt, perspective, rotateX, translate } from "./helperfunctions.js";
"use strict";
let gl;
let canvas;
let program;
let bufferId;
let objectArr;
let umv; // index of model_view in shader program
let uproj; // index of projection in shader program
let vPosition; // remember where this shader attribute is
let vColor; // remember where the color shader attribute is
// we need to keep track of our current offsets
let xoffset;
let yoffset;
let zoffset;
let theta;
window.onload = init;
function init() {
    //Link up global vars
    canvas = document.getElementById("gl-canvas");
    // the canvas already has a webgl rendering context
    gl = canvas.getContext("webgl2");
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
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
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
    //We'll split this off to its own function for clarity, but we need something to make a picture of
    makeCubeAndBuffer();
}
//Make a cube and send it over to the graphics card
function makeCubeAndBuffer() {
    let cubepoints = []; //empty array
    //front face = 6 verts, position then color
    cubepoints.push(new vec4(1.0, -1.0, 1.0, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 1.0, 1.0)); //cyan
    cubepoints.push(new vec4(1.0, 1.0, 1.0, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 1.0, 1.0)); //cyan
    cubepoints.push(new vec4(-1.0, 1.0, 1.0, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 1.0, 1.0)); //cyan
    cubepoints.push(new vec4(-1.0, 1.0, 1.0, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 1.0, 1.0)); //cyan
    cubepoints.push(new vec4(-1.0, -1.0, 1.0, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 1.0, 1.0)); //cyan
    cubepoints.push(new vec4(1.0, -1.0, 1.0, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 1.0, 1.0)); //cyan
    //back face
    cubepoints.push(new vec4(-1.0, -1.0, -1.0, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 1.0, 1.0)); //magenta
    cubepoints.push(new vec4(-1.0, 1.0, -1.0, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 1.0, 1.0)); //magenta
    cubepoints.push(new vec4(1.0, 1.0, -1.0, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 1.0, 1.0)); //magenta
    cubepoints.push(new vec4(1.0, 1.0, -1.0, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 1.0, 1.0)); //magenta
    cubepoints.push(new vec4(1.0, -1.0, -1.0, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 1.0, 1.0)); //magenta
    cubepoints.push(new vec4(-1.0, -1.0, -1.0, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 1.0, 1.0)); //magenta
    //left face
    cubepoints.push(new vec4(1.0, 1.0, 1.0, 1.0));
    cubepoints.push(new vec4(1.0, 1.0, 0.0, 1.0)); //yellow
    cubepoints.push(new vec4(1.0, -1.0, 1.0, 1.0));
    cubepoints.push(new vec4(1.0, 1.0, 0.0, 1.0)); //yellow
    cubepoints.push(new vec4(1.0, -1.0, -1.0, 1.0));
    cubepoints.push(new vec4(1.0, 1.0, 0.0, 1.0)); //yellow
    cubepoints.push(new vec4(1.0, -1.0, -1.0, 1.0));
    cubepoints.push(new vec4(1.0, 1.0, 0.0, 1.0)); //yellow
    cubepoints.push(new vec4(1.0, 1.0, -1.0, 1.0));
    cubepoints.push(new vec4(1.0, 1.0, 0.0, 1.0)); //yellow
    cubepoints.push(new vec4(1.0, 1.0, 1.0, 1.0));
    cubepoints.push(new vec4(1.0, 1.0, 0.0, 1.0)); //yellow
    //right face
    cubepoints.push(new vec4(-1.0, 1.0, -1.0, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 0.0, 1.0)); //red
    cubepoints.push(new vec4(-1.0, -1.0, -1.0, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 0.0, 1.0)); //red
    cubepoints.push(new vec4(-1.0, -1.0, 1.0, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 0.0, 1.0)); //red
    cubepoints.push(new vec4(-1.0, -1.0, 1.0, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 0.0, 1.0)); //red
    cubepoints.push(new vec4(-1.0, 1.0, 1.0, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 0.0, 1.0)); //red
    cubepoints.push(new vec4(-1.0, 1.0, -1.0, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 0.0, 1.0)); //red
    //top
    cubepoints.push(new vec4(1.0, 1.0, 1.0, 1.0));
    cubepoints.push(new vec4(0.0, 0.0, 1.0, 1.0)); //blue
    cubepoints.push(new vec4(1.0, 1.0, -1.0, 1.0));
    cubepoints.push(new vec4(0.0, 0.0, 1.0, 1.0)); //blue
    cubepoints.push(new vec4(-1.0, 1.0, -1.0, 1.0));
    cubepoints.push(new vec4(0.0, 0.0, 1.0, 1.0)); //blue
    cubepoints.push(new vec4(-1.0, 1.0, -1.0, 1.0));
    cubepoints.push(new vec4(0.0, 0.0, 1.0, 1.0)); //blue
    cubepoints.push(new vec4(-1.0, 1.0, 1.0, 1.0));
    cubepoints.push(new vec4(0.0, 0.0, 1.0, 1.0)); //blue
    cubepoints.push(new vec4(1.0, 1.0, 1.0, 1.0));
    cubepoints.push(new vec4(0.0, 0.0, 1.0, 1.0)); //blue
    //bottom
    cubepoints.push(new vec4(1.0, -1.0, -1.0, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 0.0, 1.0)); //green
    cubepoints.push(new vec4(1.0, -1.0, 1.0, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 0.0, 1.0)); //green
    cubepoints.push(new vec4(-1.0, -1.0, 1.0, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 0.0, 1.0)); //green
    cubepoints.push(new vec4(-1.0, -1.0, 1.0, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 0.0, 1.0)); //green
    cubepoints.push(new vec4(-1.0, -1.0, -1.0, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 0.0, 1.0)); //green
    cubepoints.push(new vec4(1.0, -1.0, -1.0, 1.0));
    cubepoints.push(new vec4(0.0, 1.0, 0.0, 1.0)); //green
    //we need some graphics memory for this information
    bufferId = gl.createBuffer();
    //tell WebGL that the buffer we just created is the one we want to work with right now
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    //send the local data over to this buffer on the graphics card.  Note our use of Angel's "flatten" function
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cubepoints), gl.STATIC_DRAW);
    //Data is packed in groups of 4 floats which are 4 bytes each, 32 bytes total for position and color
    // position            color
    //  x   y   z     w       r    g     b    a
    // 0-3 4-7 8-11 12-15  16-19 20-23 24-27 28-31
    //What is this data going to be used for?
    //The vertex shader has an attribute named "vPosition".  Let's associate part of this data to that attribute
    //TODO Uncomment this
    vPosition = gl.getAttribLocation(program, "vPosition");
    //attribute location we just fetched, 4 elements in each vector, data type float, don't normalize this data,
    //each position starts 32 bytes after the start of the previous one, and starts right away at index 0
    //TODO uncomment these
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(vPosition);
    //The vertex shader also has an attribute named "vColor".  Let's associate the other part of this data to that attribute
    //TODO uncomment
    vColor = gl.getAttribLocation(program, "vColor");
    //attribute location we just fetched, 4 elements in each vector, data type float, don't normalize this data,
    //each color starts 32 bytes after the start of the previous one, and the first color starts 16 bytes into the data
    //TODO uncomment these
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 32, 16);
    gl.enableVertexAttribArray(vColor);
}
function update() {
    //request a frame be drawn pls
    requestAnimationFrame(render);
}
//draw a new frame
function render() {
    //start by clearing any previous data for both color and depth
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    //we'll discuss projection matrices in a couple of days, but use this for now:
    let p = perspective(45.0, canvas.clientWidth / canvas.clientHeight, 1.0, 100.0);
    gl.uniformMatrix4fv(uproj, false, p.flatten());
    //now set up the model view matrix and send it over as a uniform
    //the inputs to this lookAt are to move back 20 units, point at the origin, and the positive y axis is up
    //TODO construct a model view matrix and send it as a uniform to the vertex shader
    //look at params: where is the camera? what is a location the camera is lookng at? what direction is up?
    let mv = lookAt(new vec4(0, 10, 20, 1), new vec4(0, 0, 0, 1), new vec4(0, 1, 0, 0));
    //multiplay translate matrix to the right of lookat Matrix
    mv = mv.mult(translate(xoffset, yoffset, zoffset));
    mv = mv.mult(rotateX(theta));
    gl.uniformMatrix4fv(umv, false, mv.flatten());
    //we only have one object at the moment, but just so we don't forget this step later...
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    //draw the geometry we previously sent over.  It's a list of 12 triangle(s),
    //we want to start at index 0, and there will be a total of 36 vertices (6 faces with 6 vertices each)
    gl.drawArrays(gl.TRIANGLES, 0, 36); // draw the cube
}
