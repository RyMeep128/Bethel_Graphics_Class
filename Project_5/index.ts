"use strict";

import {
    initFileShaders,
    perspective,
    vec2,
    vec4,
    mat4,
    flatten,
    lookAt,
    translate,
    rotateX,
    rotateY
} from "./helperfunctions.js";
import { Sphere } from "./Sphere.js";

/**
 * Global WebGL rendering context.
 * Initialized in {@link init}.
 */
let gl: WebGLRenderingContext;

/** Primary shader program used for the Earth sphere (color/normal/spec/night). */
let program: WebGLProgram;

/** VBO handle for the Earth sphere's interleaved vertex data. */
let sphereBufferId: WebGLBuffer;

/** Toggles use of the color (albedo) texture in the fragment shader. */
let colorEnabled: boolean = false;

/** Toggles use of the normal map in the fragment shader. */
let normalEnabled: boolean = false;

/** Toggles use of the specular map in the fragment shader. */
let specEnabled: boolean = false;

/** Toggles use of the night/emissive map in the fragment shader. */
let nightEnabled: boolean = false;

/** Toggles rendering of the cloud layer. */
let cloudEnabled: boolean = false;

/** When true, locks the Earth's automatic spin in place. */
let earthFreeze: boolean = false;

// === Uniform locations for primary program ===

/** Projection matrix uniform (`projection`) for the Earth shader. */
let uproj: WebGLUniformLocation;

// === Matrices ===

/** Current projection matrix. */
let p: mat4;

// === Shader attribute locations for main Earth program ===

/** Vertex position attribute location (`vPosition`). */
let vPosition: GLint;

/** Normal attribute location (`vNormal`). */
let vNormal: GLint;

/** Tangent attribute location (`vTangent`). */
let vTangent: GLint;

/** Color map sampler uniform (`colorMap`). */
let uColormapsampler: WebGLUniformLocation;

/** Normal map sampler uniform (`normalMap`). */
let unormalmapsampler: WebGLUniformLocation;

/** Specular map sampler uniform (`specMap`). */
let uSpecmapsampler: WebGLUniformLocation;

/** Night map sampler uniform (`nightMap`). */
let uNightmapsampler: WebGLUniformLocation;

/** World/eye-space light position uniform (`light_position`). */
let uLightPosition: WebGLUniformLocation;

/** Ambient light color uniform (`ambient_light`). */
let uAmbienLight: WebGLUniformLocation;

/** Light color uniform (`light_color`). */
let uLightColor: WebGLUniformLocation;

// === Cloud shader uniform locations ===

/** Cloud shader light position uniform. */
let uLightPositionClouds: WebGLUniformLocation;

/** Cloud shader ambient light uniform. */
let uAmbienLightClouds: WebGLUniformLocation;

/** Cloud shader light color uniform. */
let uLightColorClouds: WebGLUniformLocation;

/** Texture coordinate attribute for the active program. */
let vTexCoord: GLint;

/** Boolean uniform toggling normal map usage. */
let uUseNormalMap: WebGLUniformLocation;

/** Boolean uniform toggling color map usage. */
let uUseColorMap: WebGLUniformLocation;

/** Boolean uniform toggling spec map usage. */
let uUseSpecMap: WebGLUniformLocation;

/** Boolean uniform toggling night map usage. */
let uUseNightMap: WebGLUniformLocation;

/** Boolean uniform toggling cloud map usage (cloud shader). */
let uUseCloudMap: WebGLUniformLocation;

// === DOM elements ===

/** Canvas element used for WebGL rendering. */
let canvas: HTMLCanvasElement;

// === Interaction and rotation state ===

/** Aggregate pitch rotation from mouse dragging (degrees). */
let xAngle: number;

/** Aggregate yaw rotation from mouse dragging (degrees). */
let yAngle: number;

/** True while the mouse button is held down on the canvas. */
let mouse_button_down: boolean = false;

/** Previous mouse X position in client coordinates. */
let prevMouseX: number = 0;

/** Previous mouse Y position in client coordinates. */
let prevMouseY: number = 0;

/**
 * Current field-of-view angle (in degrees) for the perspective projection.
 * Modified by arrow-key zoom controls.
 */
let zoom: number = 45;

/**
 * Continuous spin angle applied to the Earth and cloud layer
 * to simulate planetary rotation (degrees).
 */
let spinAngle = 0;

/** Interleaved vertex data for the Earth sphere. */
let sphereData: any[] = [];

/** The main Earth sphere renderable. */
let earth: Sphere;

// === Textures and source images for Earth maps ===

/** Color (albedo) texture for Earth. */
let colorTex: WebGLTexture;

/** Normal map texture for Earth. */
let normalTex: WebGLTexture;

/** Source image for the color map. */
let earthColorimage: HTMLImageElement;

/** Source image for the normal map. */
let earthNormalimage: HTMLImageElement;

/** Specular map texture for Earth. */
let specTex: WebGLTexture;

/** Source image for the specular map. */
let earthSpecimage: HTMLImageElement;

/** Night (emissive) map texture for Earth. */
let nightTex: WebGLTexture;

/** Source image for the night map. */
let earthNightimage: HTMLImageElement;

// === Cloud-layer program and data ===

/** Shader program used for rendering the cloud sphere. */
let cloudProgram: WebGLProgram;

/** Cloud model-view matrix uniform (`model_view`). */
let cloudMV: WebGLUniformLocation;

/** Cloud projection matrix uniform (`projection`). */
let cloudProj: WebGLUniformLocation;

/** Cloud sampler uniform (`cloudMap`). */
let cloudSampler: WebGLUniformLocation;

/** Thin spherical shell slightly larger than the Earth, for clouds. */
let cloudSphere: Sphere;

/** VBO handle for the cloud sphere's interleaved vertex data. */
let cloudBufferId: WebGLBuffer;

/** Interleaved vertex data for the cloud sphere. */
let cloudData: any[] = [];

/** Position attribute location for the cloud shader (`vPosition`). */
let cloudPosition: GLint;

/** Texture coordinate attribute location for the cloud shader (`texCoord`). */
let cloudTexCoord: GLint;

/** Texture handle for the cloud map. */
let cloudTex: WebGLTexture;

/** Source image for the cloud texture. */
let cloudImage: HTMLImageElement;

/**
 * Application entry point.
 *
 * - Wires up UI checkboxes.
 * - Initializes WebGL, shader programs, textures, and geometry.
 * - Registers mouse and keyboard handlers.
 * - Starts the render loop via `setInterval`.
 */
window.onload = function init() {
    const colorBox = document.getElementById("color") as HTMLInputElement;
    const normalBox = document.getElementById("normal") as HTMLInputElement;
    const specBox = document.getElementById("spec") as HTMLInputElement;
    const nightBox = document.getElementById("night") as HTMLInputElement;
    const cloudBox = document.getElementById("cloud") as HTMLInputElement;

    // UI toggles for various texture maps
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

    // Canvas and WebGL context
    canvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
    gl = canvas.getContext("webgl2", { antialias: true }) as WebGLRenderingContext;
    if (!gl) {
        alert("WebGL isn't available");
    }

    // Mouse rotation handlers
    canvas.addEventListener("mousedown", mouse_down);
    canvas.addEventListener("mousemove", mouse_drag);
    canvas.addEventListener("mouseup", mouse_up);

    // Clear color and depth testing
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    // Main Earth program
    program = initFileShaders(gl, "vshader-normal.glsl", "fshader-normal.glsl");

    // Cloud program
    cloudProgram = initFileShaders(gl, "vshader-cloud.glsl", "fshader-cloud.glsl");

    // Initialize cloud shader uniforms
    gl.useProgram(cloudProgram);
    cloudMV = gl.getUniformLocation(cloudProgram, "model_view");
    cloudProj = gl.getUniformLocation(cloudProgram, "projection");
    cloudSampler = gl.getUniformLocation(cloudProgram, "cloudMap");
    uUseCloudMap = gl.getUniformLocation(cloudProgram, "useCloudMap");
    uLightColorClouds = gl.getUniformLocation(cloudProgram, "light_color");
    uLightPositionClouds = gl.getUniformLocation(cloudProgram, "light_position");
    uAmbienLightClouds = gl.getUniformLocation(cloudProgram, "ambient_light");
    gl.uniform1i(cloudSampler, 0); // clouds will use texture unit 0 when drawn

    // Initialize main Earth shader uniforms
    gl.useProgram(program);
    uproj = gl.getUniformLocation(program, "projection");
    uLightColor = gl.getUniformLocation(program, "light_color");
    uLightPosition = gl.getUniformLocation(program, "light_position");
    uAmbienLight = gl.getUniformLocation(program, "ambient_light");

    uUseNormalMap = gl.getUniformLocation(program, "useNormalMap");
    uUseColorMap = gl.getUniformLocation(program, "useColorMap");
    uUseSpecMap = gl.getUniformLocation(program, "useSpecMap");
    uUseNightMap = gl.getUniformLocation(program, "useNightMap");

    // Texture unit bindings for the various maps
    uColormapsampler = gl.getUniformLocation(program, "colorMap");
    gl.uniform1i(uColormapsampler, 0); // color map → texture unit 0

    unormalmapsampler = gl.getUniformLocation(program, "normalMap");
    gl.uniform1i(unormalmapsampler, 1); // normal map → texture unit 1

    uSpecmapsampler = gl.getUniformLocation(program, "specMap");
    gl.uniform1i(uSpecmapsampler, 2); // specular map → texture unit 2

    uNightmapsampler = gl.getUniformLocation(program, "nightMap");
    gl.uniform1i(uNightmapsampler, 3); // night map → texture unit 3

    // Initial viewport and projection
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    p = perspective(zoom, canvas.clientWidth / canvas.clientHeight, 1, 20);
    gl.uniformMatrix4fv(uproj, false, p.flatten());

    // Load all textures and build sphere geometry
    initTextures();
    generateSphere();

    // Initialize rotation angles
    xAngle = 0;
    yAngle = 0;

    // Keyboard handlers (zoom + freeze toggle)
    window.addEventListener("keydown", function (event) {
        switch (event.key) {
            case "ArrowDown":
                if (zoom < 170) {
                    zoom += 5;
                }
                break;
            case "ArrowUp":
                if (zoom > 10) {
                    zoom -= 5;
                }
                break;
            case "f":
                earthFreeze = !earthFreeze;
                break;
        }
    });

    // Simple fixed-timestep render loop (~60 FPS)
    window.setInterval(render, 16);
};

/**
 * Generates the Earth and cloud spheres, uploads their geometry into VBOs,
 * and wires up attribute pointers for both shader programs.
 */
function generateSphere() {
    // Earth sphere
    earth = new Sphere(gl, program, [], 5);
    sphereData = earth.getObjectData();

    sphereBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(sphereData), gl.STATIC_DRAW);

    gl.useProgram(program);

    // Interleaved layout: position, normal, tangent, texcoord (4 * vec4 = 64 bytes)
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

    // Cloud sphere (slightly larger radius to avoid z-fighting)
    cloudSphere = new Sphere(gl, cloudProgram, [], 5.01);
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

/**
 * Mouse drag handler: updates yaw/pitch angles based on movement
 * while the mouse button is held down.
 *
 * @param {MouseEvent} event - Mouse move event over the canvas.
 */
function mouse_drag(event: MouseEvent) {
    let thetaY, thetaX;
    if (mouse_button_down) {
        thetaY = (360.0 * (event.clientX - prevMouseX)) / canvas.clientWidth;
        thetaX = (360.0 * (event.clientY - prevMouseY)) / canvas.clientHeight;
        prevMouseX = event.clientX;
        prevMouseY = event.clientY;
        xAngle += thetaX;
        yAngle += thetaY;
    }
}

/**
 * Mouse down handler: records initial mouse position and
 * enables drag-based rotation.
 *
 * @param {MouseEvent} event - Mouse down event.
 */
function mouse_down(event: MouseEvent) {
    mouse_button_down = true;
    prevMouseX = event.clientX;
    prevMouseY = event.clientY;
}

/**
 * Mouse up handler: stops tracking drag-based rotation.
 */
function mouse_up() {
    mouse_button_down = false;
}

/**
 * Initializes all textures (color, normal, spec, night, cloud)
 * and begins asynchronous image loading.
 *
 * Texture parameters and mipmaps are configured in {@link handleTextureLoaded}.
 */
function initTextures() {
    colorTex = gl.createTexture();
    earthColorimage = new Image();
    earthColorimage.onload = function () {
        handleTextureLoaded(earthColorimage, colorTex);
    };
    earthColorimage.src = "./assets/earth.png";

    normalTex = gl.createTexture();
    earthNormalimage = new Image();
    earthNormalimage.onload = function () {
        handleTextureLoaded(earthNormalimage, normalTex);
    };
    earthNormalimage.src = "./assets/earthNormal.png";

    specTex = gl.createTexture();
    earthSpecimage = new Image();
    earthSpecimage.onload = function () {
        handleTextureLoaded(earthSpecimage, specTex);
    };
    earthSpecimage.src = "./assets/earthSpec.png";

    nightTex = gl.createTexture();
    earthNightimage = new Image();
    earthNightimage.onload = function () {
        handleTextureLoaded(earthNightimage, nightTex);
    };
    earthNightimage.src = "./assets/EarthNight.png";

    cloudTex = gl.createTexture();
    cloudImage = new Image();
    cloudImage.onload = function () {
        handleTextureLoaded(cloudImage, cloudTex);
    };
    cloudImage.src = "./assets/earthcloudmap-visness.png";
}

/**
 * Common texture setup callback.
 *
 * - Binds the given texture.
 * - Uploads the image into the currently bound TEXTURE_2D.
 * - Sets wrapping, filtering, anisotropic filtering, and generates mipmaps.
 *
 * @param {HTMLImageElement} image - Loaded image data.
 * @param {WebGLTexture} texture - Texture object to initialize.
 */
function handleTextureLoaded(image: HTMLImageElement, texture: WebGLTexture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);

    const anisotropic_ext: EXT_texture_filter_anisotropic =
        gl.getExtension("EXT_texture_filter_anisotropic");
    if (anisotropic_ext) {
        gl.texParameterf(
            gl.TEXTURE_2D,
            anisotropic_ext.TEXTURE_MAX_ANISOTROPY_EXT,
            8
        );
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
}

/**
 * Main render loop:
 *
 * - Updates the projection matrix and camera.
 * - Spins the Earth (unless frozen) and computes a light position in eye space.
 * - Draws the Earth sphere with color/normal/spec/night maps.
 * - Draws a slightly larger, blended cloud sphere on top.
 */
function render() {
    // === Earth pass ===
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBufferId);

    // Clear the frame
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Recompute projection in case zoom changed
    p = perspective(zoom, canvas.clientWidth / canvas.clientHeight, 1, 20);
    gl.uniformMatrix4fv(uproj, false, p.flatten());

    // Camera at z=20 looking at origin
    const camera: mat4 = lookAt(
        new vec4(0, 0, 20, 1),
        new vec4(0, 0, 0, 1),
        new vec4(0, 1, 0, 0)
    );

    // Advance spin if not frozen
    if (!earthFreeze) {
        spinAngle += 0.2;
        if (spinAngle > 360) {
            spinAngle -= 360;
        }
    }

    // Apply user-controlled orientation (mouse)
    earth.resetRotation();
    earth.addPitch(xAngle);
    earth.addYaw(yAngle);

    // First update: used to transform the light into eye space
    const earthMV: mat4 = earth.update(camera);

    // Local light position relative to the Earth (in model space)
    const localLightPos = new vec4(0, 0, 10 * earth.getRadius(), 0);

    // Transform light into eye coordinates using the current model-view
    const lightEye = earthMV.mult(localLightPos);

    // Then apply planetary spin for the final rendered orientation
    earth.addYaw(spinAngle);
    earth.update(camera);

    // Set light uniforms for the main Earth shader
    gl.uniform4fv(uLightPosition, [
        lightEye[0],
        lightEye[1],
        lightEye[2],
        lightEye[3]
    ]);
    gl.uniform4fv(uLightColor, [1, 0, 1, 1]);
    gl.uniform4fv(uAmbienLight, [0.1, 0.1, 0.1, 1]);

    // Bind Earth textures and map toggles
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, colorTex);

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

    earth.draw();

    // === Cloud pass ===
    gl.bindBuffer(gl.ARRAY_BUFFER, cloudBufferId);
    gl.useProgram(cloudProgram);
    gl.disable(gl.DEPTH_TEST); // avoid z-fighting; clouds are drawn on top

    gl.uniform1i(uUseCloudMap, cloudEnabled ? 1 : 0);

    cloudSphere.resetRotation();
    cloudSphere.addPitch(xAngle);
    cloudSphere.addYaw(yAngle);
    cloudSphere.addYaw(spinAngle);
    const cloudMVMat: mat4 = cloudSphere.update(camera);

    gl.uniformMatrix4fv(cloudProj, false, p.flatten());
    gl.uniformMatrix4fv(cloudMV, false, cloudMVMat.flatten());
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

    // Enable alpha blending so the clouds are translucent
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    cloudSphere.draw();

    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
}
