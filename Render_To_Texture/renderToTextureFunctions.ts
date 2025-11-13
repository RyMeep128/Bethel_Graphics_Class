
import {initShaders, vec2, vec4, mat4, flatten, perspective, translate, lookAt, rotateX, rotateY} from './helperfunctions.js';
"use strict";
//it will be handy to have references to some of our WebGL related objects
let gl:WebGLRenderingContext;
let canvas:HTMLCanvasElement;
////////////////////////////////////////////////

//-- RYANCOMMENT --
// TWO DIFFERENT SHADERS

//Note that we're going to have two different shader programs:
// cubeprogram will be a duplicate of our transformations exercise
// square program will just render a texturemapped square
let cubeprogram:WebGLProgram;
let squareprogram:WebGLProgram;
///////////////////////////////////////////////
//TODO note that locations for attributes or uniforms that exist in multiple shader program
//TODO can be stored in arrays so we have a correct reference for each separate program
let umv:WebGLUniformLocation[]; //index of the shader uniform for modelview matrix
let uproj:WebGLUniformLocation[]; //index of the shader uniform for projection matrix

let cubeBufferId:WebGLBuffer; //The actual geometry
// The TV screen
let squareBufferId:WebGLBuffer; //the second pass square to cover the screen

let rotateAngle:number; //keep track of how many degrees to rotate by
////////////////////////////
// note that the two shader programs will have separate attribute lists, so be safe about
// how we reference any attributes that have the same name (might not be in the same index for both)
let vPositionCube:GLint; //remember the location of shader attributes
let vColor:GLint; //remember the location of shader attributes

//attribs and uniform for second pass program
let uTextureSampler:WebGLUniformLocation; //our eventual texture sampler uniform (only in square program)
let vPositionSquare:GLint; // and the other shader program might have a different attribute location
let vTexCoord:GLint; //our square will have texture coordinates

//******************************
// we will need color and depth buffers to render to, plus a separate framebuffer off screen
// For more details, see:
// https://webglfundamentals.org/webgl/lessons/webgl-render-to-texture.html
//
const texSize:number = 512;
let targetTexture:WebGLTexture;
let fb:WebGLFramebuffer;
let depthTexture:WebGLRenderbuffer;

//*******************************
//interaction and rotation state
let xAngle:number = 0;
let yAngle:number = 0;
let mouse_button_down:boolean = false;
let prevMouseX:number = 0;
let prevMouseY:number = 0;

//We want some set up to happen immediately when the page loads
window.onload = function init() {

    //fetch reference to the canvas element we defined in the html file
    canvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
    //grab the WebGL 2 context for that canvas.  This is what we'll use to do our drawing
    gl = canvas.getContext('webgl2') as WebGLRenderingContext;
    if (!gl) {
        alert("WebGL isn't available");
    }

    //Take the vertex and fragment shaders we provided and compile them into a shader program
    cubeprogram = initShaders(gl, "vertex-shader-cube", "fragment-shader-cube");
    gl.useProgram(cubeprogram); //and we want to use that program for our rendering

    umv = [];
    umv.push(gl.getUniformLocation(cubeprogram, "model_view"));


    uproj = [];
    uproj.push(gl.getUniformLocation(cubeprogram, "projection"));


        //Take the vertex and fragment shaders we provided and compile them into a shader program
    squareprogram = initShaders(gl, "vertex-shader-square", "fragment-shader-square");
    gl.useProgram(squareprogram);
    umv.push(gl.getUniformLocation(squareprogram, "model_view"));
    uTextureSampler = gl.getUniformLocation(squareprogram, "textureSampler");
    uproj.push(gl.getUniformLocation(squareprogram, "projection"));

    //initialize various animation parameters
    rotateAngle = 0;

    //We'll split this off to its own function for clarity, but we need something to make a picture of
    makeCubeAndBuffer();
    makeSquareAndBuffer();

    //we need to do this to avoid having objects that are behind other objects show up anyway
    gl.enable(gl.DEPTH_TEST);

    //*************************************
    // setting up a texture we can render to

    targetTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);

    // Last parameter null for now, there is nothing there yet.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); //null data for now
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    // set up our framebuffer
    fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    //and make this texture the color attachment of our framebuffer
    const attachmentPoint:GLint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, 0);

    // and if we want the visibility order to be correct we'll need a depth component as well
    depthTexture = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthTexture);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, texSize, texSize);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthTexture);
    //**************************************

    //allow the user to rotate mesh with the mouse
    canvas.addEventListener("mousedown", mouse_down);
    canvas.addEventListener("mousemove", mouse_drag);
    canvas.addEventListener("mouseup", mouse_up);

    window.setInterval(update, 16); //target 60 frames per second
};

//update rotation angles based on mouse movement
function mouse_drag(event:MouseEvent){
    let thetaY:number, thetaX:number;
    if (mouse_button_down) {
        thetaY = 360.0 *(event.clientX-prevMouseX)/canvas.clientWidth;
        thetaX = 360.0 *(event.clientY-prevMouseY)/canvas.clientHeight;
        prevMouseX = event.clientX;
        prevMouseY = event.clientY;
        xAngle += thetaX;
        yAngle += thetaY;
    }
    requestAnimationFrame(render);
}

//record that the mouse button is now down
function mouse_down(event:MouseEvent) {
    //establish point of reference for dragging mouse in window
    mouse_button_down = true;
    prevMouseX= event.clientX;
    prevMouseY = event.clientY;
    requestAnimationFrame(render);
}

//record that the mouse button is now up, so don't respond to mouse movements
function mouse_up(){
    mouse_button_down = false;
    requestAnimationFrame(render);
}

//Make a cube and send it over to the graphics card
function makeCubeAndBuffer(){
    let cubepoints:vec4[] = []; //empty array

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
    cubepoints.push(new vec4(1.0, 0.0, 1.0, 1.0));//magenta
    cubepoints.push(new vec4(1.0, 1.0, -1.0, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 1.0, 1.0));//magenta
    cubepoints.push(new vec4(1.0, 1.0, -1.0, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 1.0, 1.0));//magenta
    cubepoints.push(new vec4(1.0, -1.0, -1.0, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 1.0, 1.0));//magenta
    cubepoints.push(new vec4(-1.0, -1.0, -1.0, 1.0));
    cubepoints.push(new vec4(1.0, 0.0, 1.0, 1.0));//magenta

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
    cubeBufferId = gl.createBuffer();
    //tell WebGL that the buffer we just created is the one we want to work with right now
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBufferId);
    //send the local data over to this buffer on the graphics card.  Note our use of Angel's "flatten" function
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cubepoints), gl.STATIC_DRAW);

    //Data is packed in groups of 4 floats which are 4 bytes each, 32 bytes total for position and color
    // position            color
    //  x   y   z     w       r    g     b    a
    // 0-3 4-7 8-11 12-15  16-19 20-23 24-27 28-31

    //What is this data going to be used for?
    //The vertex shader has an attribute named "vPosition".  Let's associate part of this data to that attribute
    vPositionCube = gl.getAttribLocation(cubeprogram, "vPosition");
    //attribute location we just fetched, 4 elements in each vector, data type float, don't normalize this data,
    //each position starts 32 bytes after the start of the previous one, and starts right away at index 0
    gl.vertexAttribPointer(vPositionCube, 4, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(vPositionCube);

    //The vertex shader also has an attribute named "vColor".  Let's associate the other part of this data to that attribute
    vColor = gl.getAttribLocation(cubeprogram, "vColor");
    //attribute location we just fetched, 4 elements in each vector, data type float, don't normalize this data,
    //each color starts 32 bytes after the start of the previous one, and the first color starts 16 bytes into the data
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 32, 16);
    gl.enableVertexAttribArray(vColor);
}

//Make a square and send it over to the graphics card
function makeSquareAndBuffer(){
    let squarePoints:any[] = []; //empty array

    //create 4 vertices and add them to the array
    //usually we would fill the whole canvas, but for this example we'll target a smaller coverage so we can see it
    squarePoints.push(new vec4(-0.5, -0.5, 0, 1));
    squarePoints.push(new vec2(0,0)); //texture coordinates, bottom left
    squarePoints.push(new vec4(0.5, -0.5, 0, 1));
    squarePoints.push(new vec2(1,0)); //texture coordinates, bottom right
    squarePoints.push(new vec4(0.5, 0.5, 0, 1));
    squarePoints.push(new vec2(1,1)); //texture coordinates, top right
    squarePoints.push(new vec4(-0.5, 0.5, 0, 1));
    squarePoints.push(new vec2(0,1)); //texture coordinates, top left

    //we need some graphics memory for this information
    squareBufferId = gl.createBuffer();
    //tell WebGL that the buffer we just created is the one we want to work with right now
    gl.bindBuffer(gl.ARRAY_BUFFER, squareBufferId);
    //send the local data over to this buffer on the graphics card.  Note our use of Angel's "flatten" function
    gl.bufferData(gl.ARRAY_BUFFER, flatten(squarePoints), gl.STATIC_DRAW);

    gl.useProgram(squareprogram);

    vPositionSquare = gl.getAttribLocation(squareprogram, "vPosition");
    gl.vertexAttribPointer(vPositionSquare, 4, gl.FLOAT, false, 24, 0); //stride is 24 bytes total for position, texcoord
    gl.enableVertexAttribArray(vPositionSquare);

    vTexCoord = gl.getAttribLocation(squareprogram, "texCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 24, 16); //stride is 24 bytes total for position, texcoord
    gl.enableVertexAttribArray(vTexCoord);

}


//increase rotation angle and request new frame
function update(){
    //alter the rotation angle
    rotateAngle += 1;
    while (rotateAngle >= 360){
        rotateAngle -= 360;
    }

    requestAnimationFrame(render);
}

//draw a new frame
function render(){
    //***********************************
    // PART 1: RENDER THE SCENE TO OUR TEXTURE

    gl.useProgram(cubeprogram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    //setting background color to white for render to texture
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    //start by clearing any previous data for both color and depth
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.viewport(0, 0, texSize, texSize);
    let p:mat4 = perspective(45.0, 1, 1.0, 100.0);
    gl.uniformMatrix4fv(uproj[0], false, p.flatten());

    let mv:mat4 = lookAt(new vec4(0, 0, 10, 1), new vec4(0, 0, 0, 1), new vec4(0, 1, 0, 0));
    mv = mv.mult(rotateY(rotateAngle));

    gl.uniformMatrix4fv(umv[0], false, mv.flatten());

    //-- RYANCOMMENT --
    // DONT FORGET THIS

    //when we switch shader programs and/or buffers, watch out for vertexAttribPointers to get invalidated
    //better re-establish them to be safe
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBufferId);
    gl.vertexAttribPointer(vPositionCube, 4, gl.FLOAT, false, 32, 0);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 32, 16);

    //draw the geometry we previously sent over.  It's a list of 12 triangle(s),
    //we want to start at index 0, and there will be a total of 36 vertices (6 faces with 6 vertices each)
    gl.drawArrays(gl.TRIANGLES, 0, 36);    // draw the cube

    // END PART 1
    //*****************************************

    //*****************************************
    // PART 2: RENDER A QUAD MAPPED WITH THIS TEXTURE

    gl.useProgram(squareprogram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); //use framebuffer that will draw to screen

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    //setting background color to black for render to screen
    gl.clearColor(0, 0, 0, 1.0);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //make sure the appropriate texture is sitting on texture unit 0
    //we could do this once since we only have one texture, but eventually you'll have multiple textures
    //so you'll be swapping them in and out for each object
    gl.activeTexture(gl.TEXTURE0); //we're using texture unit 0
    gl.bindTexture(gl.TEXTURE_2D, targetTexture); //note this is the texture that was our output in pass 1
    //when the shader runs, the sampler2D will want to know what texture unit the texture is on
    //It's on texture unit 0, so send over the value 0
    gl.uniform1i(uTextureSampler, 0);

    mv = lookAt(new vec4(0, 0, 2, 1), new vec4(0, 0, 0, 1), new vec4(0, 1, 0, 0));
    //rotate if the user has been dragging the mouse around
    mv = mv.mult(rotateY(yAngle).mult(rotateX(xAngle)));

    gl.uniformMatrix4fv(umv[1], false, mv.flatten());
    gl.uniformMatrix4fv(uproj[1], false, p.flatten());


    gl.bindBuffer(gl.ARRAY_BUFFER, squareBufferId);
    gl.vertexAttribPointer(vPositionSquare, 4, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 24, 16);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

}
