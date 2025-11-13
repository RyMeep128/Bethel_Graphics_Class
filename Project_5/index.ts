"use strict";

import {initFileShaders, perspective, vec2, vec4, mat4, flatten, lookAt, translate,rotateX, rotateY} from './helperfunctions.js';
import {Sphere} from "./Sphere.js";
import {RenderableObject} from "./RenderableObject.js";
let gl:WebGLRenderingContext;
let program:WebGLProgram;
let activeProgram:WebGLProgram;
let anisotropic_ext;

let sphereBufferId: WebGLBuffer;
let sphereVertCount: number = 0;

let flatEnabled:boolean = false;
let normalEnabled:boolean = false;

//uniform locations
let umv:WebGLUniformLocation; //uniform for mv matrix
let uproj:WebGLUniformLocation; //uniform for projection matrix

//matrices
let mv:mat4; //local mv
let p:mat4; //local projection

//shader variable indices for material properties
let vPosition:GLint; //
let vNormal:GLint; //actually need a normal vector to modify
let vTangent:GLint; //need a tangent vector as well
let utexmapsampler:WebGLUniformLocation;//this will be a pointer to our sampler2D
let unormalmapsampler:WebGLUniformLocation;
let uLightPosition:WebGLUniformLocation;
let uAmbienLight:WebGLUniformLocation;
let uLightColor:WebGLUniformLocation;
let vTexCoord:GLint;
let uTextureSampler:WebGLUniformLocation;//this will be a pointer to our sampler2D
let uUseNormalMap:WebGLUniformLocation;



//document elements
let canvas:HTMLCanvasElement;

//interaction and rotation state
let xAngle:number;
let yAngle:number;
let mouse_button_down:boolean = false;
let prevMouseX:number = 0;
let prevMouseY:number = 0;
let zoom:number = 45;

let spinAngle = 0;




let flattex:WebGLTexture;
let flatTex:WebGLTexture;
let normalTex:WebGLTexture;

let flatimage:HTMLImageElement;
let brickcolorimage:HTMLImageElement;
let bricknormalimage:HTMLImageElement;

window.onload = function init() {

    const flatBox = document.getElementById("flat") as HTMLInputElement;
    const normalBox = document.getElementById("normal") as HTMLInputElement;

    // flatBox.addEventListener("change", () => {
    //     flatEnabled = flatBox.checked;
    // });

    normalBox.addEventListener("change", () => {
        normalEnabled = normalBox.checked;
        console.log(normalEnabled);
    });


    canvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
    gl = canvas.getContext('webgl2', {antialias:true}) as WebGLRenderingContext;
    if (!gl) {
        alert("WebGL isn't available");
    }


    //allow the user to rotate mesh with the mouse
    canvas.addEventListener("mousedown", mouse_down);
    canvas.addEventListener("mousemove", mouse_drag);
    canvas.addEventListener("mouseup", mouse_up);


    //black background
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);


    program = initFileShaders(gl, "vshader-normal.glsl", "fshader-normal.glsl");

    gl.useProgram(program);
    umv = gl.getUniformLocation(program, "model_view");
    uproj = gl.getUniformLocation(program, "projection");
    uLightColor = gl.getUniformLocation(program, "light_color");
    uLightPosition = gl.getUniformLocation(program, "light_position");
    uAmbienLight = gl.getUniformLocation(program, "ambient_light");

    uUseNormalMap = gl.getUniformLocation(program, "useNormalMap");


    utexmapsampler = gl.getUniformLocation(program, "colorMap");
    gl.uniform1i(utexmapsampler, 0);//assign this one to texture unit 0

    unormalmapsampler = gl.getUniformLocation(program, "normalMap");
    gl.uniform1i(unormalmapsampler, 1);//assign normal map to 2nd texture unit


    //set up basic perspective viewing
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    p = perspective(zoom, (canvas.clientWidth / canvas.clientHeight), 1, 20);
    gl.uniformMatrix4fv(uproj, false, p.flatten());


    initTextures();
    generateSphere();   // or 40/80; higher = smoother sphere

    //initialize rotation angles
    xAngle = 0;
    yAngle = 0;

    window.addEventListener("keydown" ,function(event){
        switch(event.key) {
            case "ArrowDown":
                if(zoom < 170){
                    zoom += 5;
                }
                break;
            case "ArrowUp":
                if(zoom > 10){
                    zoom -= 5;
                }
                break;
        }

        p = perspective(zoom, (canvas.clientWidth / canvas.clientHeight), 1, 20);
        gl.uniformMatrix4fv(uproj, false, p.flatten());
        // requestAnimationFrame(render);//and now we need a new frame since we made a change
    });

    window.setInterval(render,16);

};


let sphereData: any[] = [];
let earth:Sphere;
let objects:RenderableObject[] = [];

function generateSphere() {

    earth = new Sphere(gl,program,objects,1);

    objects.push(earth);

    sphereData = earth.getObjectData();

    sphereBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(sphereData), gl.STATIC_DRAW);

    gl.useProgram(program);

    const stride = 64;

    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(vPosition);

    vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, stride, 16);
    gl.enableVertexAttribArray(vNormal);

    vTangent = gl.getAttribLocation(program, "vTangent");
    gl.vertexAttribPointer(vTangent, 4, gl.FLOAT, false, stride, 32);
    gl.enableVertexAttribArray(vTangent);

    vTexCoord = gl.getAttribLocation(program, "texCoord");
    gl.vertexAttribPointer(vTexCoord, 4, gl.FLOAT, false, stride, 48);
    gl.enableVertexAttribArray(vTexCoord);

}


//update rotation angles based on mouse movement
function mouse_drag(event:MouseEvent){
    var thetaY, thetaX;
    if (mouse_button_down) {
        thetaY = 360.0 *(event.clientX-prevMouseX)/canvas.clientWidth;
        thetaX = 360.0 *(event.clientY-prevMouseY)/canvas.clientHeight;
        prevMouseX = event.clientX;
        prevMouseY = event.clientY;
        xAngle += thetaX;
        yAngle += thetaY;
    }

}

//record that the mouse button is now down
function mouse_down(event:MouseEvent) {
    //establish point of reference for dragging mouse in window
    mouse_button_down = true;
    prevMouseX= event.clientX;
    prevMouseY = event.clientY;
}

//record that the mouse button is now up, so don't respond to mouse movements
function mouse_up(){
    mouse_button_down = false;
}

//https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
function initTextures() {
    flattex = gl.createTexture();
    flatimage = new Image();
    flatimage.onload = function() { handleTextureLoaded(flatimage, flattex); }
    flatimage.src = './assets/earth.png';

    flatTex = gl.createTexture();
    brickcolorimage = new Image();
    brickcolorimage.onload = function() { handleTextureLoaded(brickcolorimage, flatTex); }
    brickcolorimage.src = './assets/earth.png';


    normalTex = gl.createTexture();
    bricknormalimage = new Image();
    bricknormalimage.onload = function() { handleTextureLoaded(bricknormalimage, normalTex); }
    bricknormalimage.src = './assets/earthNormal.png';
}

function handleTextureLoaded(image:HTMLImageElement, texture:WebGLTexture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT); // Maybe here: thoughts from MICAH
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
    let anisotropic_ext:EXT_texture_filter_anisotropic = gl.getExtension('EXT_texture_filter_anisotropic');
    gl.texParameterf(gl.TEXTURE_2D, anisotropic_ext.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    gl.bindTexture(gl.TEXTURE_2D, null);
}


function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

// camera at z=5 looking at origin
    const camera: mat4 = lookAt(
        new vec4(0, 0, 5, 1),
        new vec4(0, 0, 0, 1),
        new vec4(0, 1, 0, 0)
    );

    // advance the automatic spin (tweak speed as you like)
    spinAngle += 0.2;   // degrees per frame (or radians if your API uses radians)
    if (spinAngle > 360) spinAngle -= 360;


    earth.resetRotation();
    earth.addPitch(xAngle);             // mouse vertical
    earth.addYaw(yAngle);               // mouse horizontal


    // Get the full model-view matrix for Earth
    const earthMV: mat4 = earth.update(camera);

    const localLightPos = new vec4(0, 0, 10 * earth.getRadius(), 0);

    // Transform to eye space using the same MV matrix
    const lightEye = earthMV.mult(localLightPos); // assuming mat4.mult(vec4) exists


    earth.addYaw(spinAngle);            // always spinning
    earth.update(camera);

    // lighting uniforms

    gl.uniform4fv(uLightPosition, [
        lightEye[0],
        lightEye[1],
        lightEye[2],
        lightEye[3]
    ]);
    gl.uniform4fv(uLightColor, [1, 1, 1, 1]);
    gl.uniform4fv(uAmbienLight, [0.1, 0.1, 0.1, 1]);

// bind textures

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, flatTex);


    gl.uniform1i(uUseNormalMap, normalEnabled ? 1 : 0);
    gl.activeTexture(gl.TEXTURE1);
    if (normalEnabled) {
        gl.bindTexture(gl.TEXTURE_2D, normalTex);
    } else {
        gl.bindTexture(gl.TEXTURE_2D, null);
    }



// draw sphere
    earth.draw();
}