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

let colorEnabled:boolean = false;
let normalEnabled:boolean = false;
let specEnabled:boolean = false;
let nightEnabled:boolean = false;
let cloudEnabled:boolean = false;

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

let uColormapsampler:WebGLUniformLocation;//this will be a pointer to our sampler2D
let unormalmapsampler:WebGLUniformLocation;
let uSpecmapsampler:WebGLUniformLocation;
let uNightmapsampler:WebGLUniformLocation;

let uLightPosition:WebGLUniformLocation;
let uAmbienLight:WebGLUniformLocation;
let uLightColor:WebGLUniformLocation;

let uLightPositionClouds:WebGLUniformLocation;
let uAmbienLightClouds:WebGLUniformLocation;
let uLightColorClouds:WebGLUniformLocation;

let vTexCoord:GLint;
let uTextureSampler:WebGLUniformLocation;//this will be a pointer to our sampler2D
let uUseNormalMap:WebGLUniformLocation;
let uUseColorMap:WebGLUniformLocation;
let uUseSpecMap:WebGLUniformLocation;
let uUseNightMap:WebGLUniformLocation;
let uUseCloudMap:WebGLUniformLocation;



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

let specTex:WebGLTexture;
let earthSpecimage:HTMLImageElement;

let nightTex:WebGLTexture;
let earthNightimage:HTMLImageElement;

let cloudProgram: WebGLProgram;
let cloudMV: WebGLUniformLocation;
let cloudProj: WebGLUniformLocation;
let cloudSampler: WebGLUniformLocation;

let cloudSphere: Sphere;
let cloudBufferId: WebGLBuffer;
let cloudData: any[] = [];

let cloudPosition: GLint;
let cloudTexCoord: GLint;

let cloudTex: WebGLTexture;
let cloudImage: HTMLImageElement;



window.onload = function init() {

    const colorBox = document.getElementById("color") as HTMLInputElement;
    const normalBox = document.getElementById("normal") as HTMLInputElement;
    const specBox = document.getElementById("spec") as HTMLInputElement;
    const nightBox = document.getElementById("night") as HTMLInputElement;
    const cloudBox = document.getElementById("cloud") as HTMLInputElement;
    const slider = document.getElementById("slider") as HTMLInputElement;



    colorBox.addEventListener("change", () => {
        colorEnabled = colorBox.checked;
        console.log(colorEnabled);
    });

    normalBox.addEventListener("change", () => {
        normalEnabled = normalBox.checked;
        console.log(normalEnabled);
    });

    specBox.addEventListener("change", () => {
        specEnabled = specBox.checked;
        console.log(specEnabled);
    });

    nightBox.addEventListener("change", () => {
        nightEnabled = nightBox.checked;
        console.log(nightEnabled);
    });

    cloudBox.addEventListener("change", () => {
        cloudEnabled = cloudBox.checked;
        console.log(cloudEnabled);
    });


    canvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
    gl = canvas.getContext('webgl2', {antialias:true}) as WebGLRenderingContext;
    if (!gl) {
        alert("WebGL isn't available");
    }
    slider.addEventListener("change", function () {
        canvas.width = Number(slider.value);
        canvas.height = Number(slider.value);
    })



    //allow the user to rotate mesh with the mouse
    canvas.addEventListener("mousedown", mouse_down);
    canvas.addEventListener("mousemove", mouse_drag);
    canvas.addEventListener("mouseup", mouse_up);


    //black background
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);


    program = initFileShaders(gl, "vshader-normal.glsl", "fshader-normal.glsl");

    cloudProgram = initFileShaders(gl, "vshader-cloud.glsl", "fshader-cloud.glsl");

    gl.useProgram(cloudProgram);
    cloudMV   = gl.getUniformLocation(cloudProgram, "model_view");
    cloudProj = gl.getUniformLocation(cloudProgram, "projection");
    cloudSampler = gl.getUniformLocation(cloudProgram, "cloudMap"); // or whatever name you used
    uUseCloudMap = gl.getUniformLocation(cloudProgram, "useCloudMap");
    uLightColorClouds = gl.getUniformLocation(cloudProgram, "light_color");
    uLightPositionClouds = gl.getUniformLocation(cloudProgram, "light_position");
    uAmbienLightClouds = gl.getUniformLocation(cloudProgram, "ambient_light");
    gl.uniform1i(cloudSampler, 0); // clouds will use texture unit 0 when drawn


    gl.useProgram(program);
    umv = gl.getUniformLocation(program, "model_view");
    uproj = gl.getUniformLocation(program, "projection");
    uLightColor = gl.getUniformLocation(program, "light_color");
    uLightPosition = gl.getUniformLocation(program, "light_position");
    uAmbienLight = gl.getUniformLocation(program, "ambient_light");

    uUseNormalMap = gl.getUniformLocation(program, "useNormalMap");
    uUseColorMap = gl.getUniformLocation(program, "useColorMap");
    uUseSpecMap = gl.getUniformLocation(program, "useSpecMap");
    uUseNightMap = gl.getUniformLocation(program, "useNightMap");



    uColormapsampler = gl.getUniformLocation(program, "colorMap");
    gl.uniform1i(uColormapsampler, 0);//assign this one to texture unit 0

    unormalmapsampler = gl.getUniformLocation(program, "normalMap");
    gl.uniform1i(unormalmapsampler, 1);//assign normal map to 2nd texture unit

    uSpecmapsampler = gl.getUniformLocation(program, "specMap");
    gl.uniform1i(uSpecmapsampler, 2);//assign normal map to 2nd texture unit

    uNightmapsampler = gl.getUniformLocation(program, "nightMap");
    gl.uniform1i(uNightmapsampler, 3);//assign normal map to 2nd texture unit


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


        // requestAnimationFrame(render);//and now we need a new frame since we made a change
    });

    window.setInterval(render,16);

};


let sphereData: any[] = [];
let earth:Sphere;

function generateSphere() {

    earth = new Sphere(gl,program,[],5);

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


    cloudSphere = new Sphere(gl, cloudProgram, [], 5.01 ); // or 5 + epsilon
    cloudData = cloudSphere.getObjectData();

    cloudBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cloudBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cloudData), gl.STATIC_DRAW);

    gl.useProgram(cloudProgram);

    cloudPosition = gl.getAttribLocation(cloudProgram, "vPosition");
    gl.vertexAttribPointer(cloudPosition, 4, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(cloudPosition);

    cloudTexCoord = gl.getAttribLocation(cloudProgram, "texCoord");
    gl.vertexAttribPointer(cloudTexCoord, 4, gl.FLOAT, false, stride, 48);
    gl.enableVertexAttribArray(cloudTexCoord);

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

    specTex = gl.createTexture();
    earthSpecimage = new Image();
    earthSpecimage.onload = function() { handleTextureLoaded(earthSpecimage, specTex); }
    earthSpecimage.src = './assets/earthSpec.png';

    nightTex = gl.createTexture();
    earthNightimage = new Image();
    earthNightimage.onload = function() { handleTextureLoaded(earthNightimage, nightTex); }
    earthNightimage.src = './assets/EarthNight.png';

    cloudTex = gl.createTexture();
    cloudImage = new Image();
    cloudImage.onload = function() { handleTextureLoaded(cloudImage, cloudTex); }
    cloudImage.src = './assets/earthcloudmap-visness.png';

}


function handleTextureLoaded(image:HTMLImageElement, texture:WebGLTexture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBufferId);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    p = perspective(zoom, (canvas.clientWidth / canvas.clientHeight), 1, 20);
    gl.uniformMatrix4fv(uproj, false, p.flatten());

// camera at z=5 looking at origin
    const camera: mat4 = lookAt(
        new vec4(0, 0, 20, 1),
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
    //

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
    gl.uniform1i(uUseSpecMap, specEnabled ? 1 : 0);
    gl.uniform1i(uUseColorMap, colorEnabled ? 1 : 0);
    gl.uniform1i(uUseNightMap, nightEnabled ? 1 : 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, normalTex);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, specTex);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, nightTex);


// draw sphere
    earth.draw();


    gl.bindBuffer(gl.ARRAY_BUFFER, cloudBufferId);
    gl.useProgram(cloudProgram);
    gl.disable(gl.DEPTH_TEST);

    gl.uniform1i(uUseCloudMap, cloudEnabled ? 1 : 0);

    cloudSphere.resetRotation();
    cloudSphere.addPitch(xAngle);
    cloudSphere.addYaw(yAngle);
    cloudSphere.addYaw(spinAngle);      // same spin as Earth
    const cloudMVMat: mat4 = cloudSphere.update(camera);

    gl.uniformMatrix4fv(cloudProj, false, p.flatten());
    gl.uniformMatrix4fv(cloudMV,   false, cloudMVMat.flatten());
    gl.uniform4fv(uLightPositionClouds, [
        lightEye[0],
        lightEye[1],
        lightEye[2],
        lightEye[3]
    ]);
    gl.uniform4fv(uLightColorClouds, [1, 1, 1, 1]);
    gl.uniform4fv(uAmbienLightClouds, [0.1, 0.1, 0.1, 1]);

    const stride = 64;
    cloudPosition = gl.getAttribLocation(cloudProgram, "vPosition");
    gl.vertexAttribPointer(cloudPosition, 4, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(cloudPosition);

    cloudTexCoord = gl.getAttribLocation(cloudProgram, "texCoord");
    gl.vertexAttribPointer(cloudTexCoord, 4, gl.FLOAT, false, stride, 48);
    gl.enableVertexAttribArray(cloudTexCoord);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, cloudTex);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    cloudSphere.draw();

    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);

}