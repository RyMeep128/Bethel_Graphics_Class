import * as util from "../Utility/util.js";
import * as Color from "../Utility/Color.js";
import * as Ambient from "../Utility/AmbientColors.js";
import {Cube} from "../Objects/Primitives/Cube.js";
import {flatten, initShaders, lookAt, vec3, vec4} from "../Utility/helperfunctions.js";
import {mat4, perspective, initFileShaders} from "../Utility/helperfunctions.js";
import {RenderableObject} from "../Objects/Primitives/Base/RenderableObject.js";
import {Car} from "../Objects/ComplexObjects/Car.js";
import {Camera} from "../Objects/CameraObjects/Camera.js";
import {Sphere} from "../Objects/Primitives/Sphere.js";
import {Light} from "../Objects/CameraObjects/Light.js";

/**
 * @file main.ts
 * @description Entry point and runtime loop for the WebGL scene.
 *
 * Responsibilities:
 * - Initialize WebGL context and shader programs
 * - Build scene objects and upload buffers
 * - Register input handlers
 * - Drive the update/render loop
 *
 * Conventions:
 * - Interleaved VBO layout: [pos vec4][normal vec4][texCoord vec4], stride 48 bytes (offsets 0/16/32)
 * - Object-specific transforms handled via each object's {@link RenderableObject.update} method
 * - Objects with `binding === 0` receive movement input in {@link moveObjects}
 */

"use strict";

/** WebGL rendering context (WebGL2 requested). */
let gl: WebGL2RenderingContext;
/** Canvas element hosting the GL context. */
let canvas: HTMLCanvasElement;

/** Geometry pass shader program (writes to G-buffer). */
let geoShader: WebGLProgram;
/** Lighting pass shader program (full-screen composite). */
let lightShader: WebGLProgram;
let diffuseShader: WebGLProgram;
let textureShader: WebGLProgram;

/** Scene graph list; draw order is array order. */
let objectArr: RenderableObject[];

/** Player-controlled car instance. */
let car: Car;

/** Directional/sun light. */
let sun: Light;
/** Day/night toggle flag. */
let day: boolean;

/** Ground plane. */
let ground: Cube;

/** Location of `projection` uniform in the geometry shader. */
let uproj: WebGLUniformLocation;

/** Primary and secondary cameras; index selects active. */
let cameraOne: Camera;
let cameraTwo: Camera;
/** Active camera selector (1, 2, or 3 for special view). */
let cameraIndex = 1;

/** True when forward input active. */
let movingForwardBool: boolean = false;
/** True when backward input active. */
let movingBackwardBool: boolean = false;
/** True when right turn input active. */
let turningRightBool: boolean = false;
/** True when left turn input active. */
let turningLeftBool: boolean = false;

/** Zoom (FOV) controls. */
let zoomInBool: boolean = false;
let zoomOutBool: boolean = false;
/** Field-of-view in degrees for perspective projection. */
let fovy: number = 45.0;

/** Camera dolly controls (move camera along its view direction). */
let dollyInBool: boolean = false;
let dollyOutBool: boolean = false;

/** Toggle: have camera one look at the car or the origin. */
let followCar: boolean = false;

/** Head (sphere) rotation controls on the car. */
let turnHeadLeft: boolean = false;
let turnHeadRight: boolean = false;

/** Light uniform locations for the geometry shader. */
let uLightPos: WebGLUniformLocation;
let uLightColor: WebGLUniformLocation;
let uAmbient: WebGLUniformLocation;
let uDirection: WebGLUniformLocation;
let uEnabled: WebGLUniformLocation;
let uLightCutoff: WebGLUniformLocation;

/** Framebuffer object for the G-buffer. */
let gBufferFBO: WebGLFramebuffer;
let gWaterColorBaseFBO: WebGLFramebuffer;
let gWaterColorTextureFBO: WebGLFramebuffer;

/** Depth texture attached to the G-buffer. */
let gDepthTex: WebGLTexture;
/** Width of the G-buffer textures (in pixels). */
let gTexWidth: number;
/** Height of the G-buffer textures (in pixels). */
let gTexHeight: number;

// G-buffer (filled in GeometryPass / init)
let gAlbedoTex: WebGLTexture;
let gSpecularTex: WebGLTexture;
let gNormalTex: WebGLTexture;
let gPositionTex: WebGLTexture;

//Watercolor buffer
let gWaterColorBaseTex: WebGLTexture;

let gWaterColorTexure: WebGLTexture;

let paperTexture:WebGLTexture;

//and we need a main memory location to load the files into
let paperImg:HTMLImageElement;




/** VAO for the full-screen rectangle used in the lighting pass. */
let screenRectangle: WebGLVertexArrayObject;

window.onload = init;

/**
 * Initializes GL, shaders, scene objects, input bindings, and starts the loop.
 * @returns {void}
 */
function init(): void {
    // Link up global vars
    canvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
    gl = canvas.getContext("webgl2") as unknown as WebGL2RenderingContext;
    if (!gl) {
        alert("WebGL isn't available");
    }

    screenRectangle = createRectangle();

    loadShaders();

    objectArr = [];

    gl.useProgram(geoShader);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    uproj = gl.getUniformLocation(geoShader, "projection");

    uLightPos = gl.getUniformLocation(geoShader, "uLightPos");
    uLightColor = gl.getUniformLocation(geoShader, "uLightColor");
    uAmbient = gl.getUniformLocation(geoShader, "uLightAmbient");
    uDirection = gl.getUniformLocation(geoShader, "uLightDirection");
    uEnabled = gl.getUniformLocation(geoShader, "uLightEnabled");
    uLightCutoff = gl.getUniformLocation(geoShader, "uLightCutoff");

    setupKeyboardMouseBindings();
    initView();

    // Uncomment this Ryan, dont be an idiot
    gl.enable(gl.DEPTH_TEST);

    // Fixed-timestep update; render is scheduled via requestAnimationFrame.
    window.setInterval(update, util.FramesPerMS);
}

function loadShaders() {
    geoShader = initFileShaders(gl, "../Shaders/GeoPass/GeoVertexShader.glsl", "../Shaders/GeoPass/GeoFragmentShader.glsl");
    lightShader = initFileShaders(gl, "../Shaders/LightPass/LightVertexShader.glsl", "../Shaders/LightPass/LightFragmentShader.glsl");
    diffuseShader = initFileShaders(gl, "../Shaders/DiffusePass/DiffuseVertexShader.glsl", "../Shaders/DiffusePass/DiffuseFragmentShader.glsl");
    textureShader =initFileShaders(gl, "../Shaders/TexturePass/TextureVertexShader.glsl", "../Shaders/TexturePass/TextureFragmentShader.glsl");
    initGBuffer();
    initWatercolorBaseBuffer();
    initWatercolorTextureBuffer();
}

/**
 * Creates a full-screen rectangle VAO for the lighting pass.
 *
 * Layout per-vertex:
 * - `aPosition` (location 0): vec2 clip-space position
 * - `aTexCoord` (location 1): vec2 UV in [0,1]
 *
 * @returns {WebGLVertexArrayObject} The configured VAO handle.
 */
function createRectangle(): WebGLVertexArrayObject {
    const returnObject = gl.createVertexArray();
    gl.bindVertexArray(returnObject);

    const quadData = new Float32Array([
        // x,  y,   u, v
        -1, -1, 0, 0,
        1, -1, 1, 0,
        -1, 1, 0, 1,
        1, 1, 1, 1,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadData, gl.STATIC_DRAW);

    // aPosition → location 0
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4 * 4, 0);

    // aTexCoord → location 1
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 4 * 4, 2 * 4);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return returnObject;
}

/**
 * Registers keyboard listeners for movement and rotation controls.
 * @returns {void}
 */
function setupKeyboardMouseBindings(): void {
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
}

/**
 * Key-down handler for movement/input controls.
 * @param {KeyboardEvent} event - The keyboard event.
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
            if (cameraIndex == 1) {
                zoomInBool = true;
                zoomOutBool = false;
            }
            break;
        case "w":
            if (cameraIndex == 1) {
                zoomInBool = false;
                zoomOutBool = true;
            }
            break;
        case "s":
            if (cameraIndex == 1) {
                dollyInBool = true;
                dollyOutBool = false;
            }
            break;
        case "a":
            if (cameraIndex == 1) {
                dollyInBool = false;
                dollyOutBool = true;
            }
            break;
        case "f":
            if (cameraIndex == 1) {
                followCar = !followCar;
            }
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
        case "9":
            car.toggleHeadlights();
            break;
        case "8":
            car.toggleSirens();
            break;
        case "0":
            day = !day;
            if (day) {
                sun.setColor(Color.GHOSTWHITE);
                sun.setAmbient(Ambient.AMBIENT_WARM);
                sun.enable();
            } else {
                sun.setColor(new vec4(0.4, 0.4, 0.4, 1));
                sun.setAmbient(Ambient.AMBIENT_DIM);
                sun.disable();
                sun.enableAmbient();
            }
            break;
    }
}

/**
 * Key-up handler for movement/input controls.
 * @param {KeyboardEvent} event - The keyboard event.
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
            if (cameraIndex == 1) {
                zoomInBool = false;
                zoomOutBool = false;
            }
            break;
        case "s":
        case "a":
            if (cameraIndex == 1) {
                dollyInBool = false;
                dollyOutBool = false;
            }
            break;
        case "z":
            turnHeadLeft = false;
            break;
        case "x":
            turnHeadRight = false;
            break;
        case "r":
            if (cameraIndex == 1) {
                fovy = 45.0;
                cameraOne.setCameraPos(0, 30, 50);
                cameraOne.setCameraLook(0, 0, 0);
                followCar = false;
            }
            break;
        default:
            break;
    }
}

/**
 * Checks if the car's bounding box lies within the ground's extents.
 * Disables forward/backward movement when leaving bounds.
 *
 * @param {Cube} ground - The ground object (provides world extents).
 * @param {Car} car - The player car whose position is validated.
 * @returns {void}
 */
function checkBounds(ground: Cube, car: Car): void {
    if (
        car.getX() - car.getDepth() < ground.getX() - ground.getWidth() / 2 ||
        car.getX() + car.getDepth() > ground.getX() + ground.getWidth() / 2 ||
        car.getZ() + car.getDepth() > ground.getZ() + ground.getDepth() / 2 ||
        car.getZ() - car.getDepth() < ground.getZ() - ground.getDepth() / 2
    ) {
        movingForwardBool = false;
        movingBackwardBool = false;
    }
}

/**
 * Initializes scene objects and uploads their buffers.
 * Adds ground, a set of buildings, and the player car.
 * @returns {void}
 */
function initView(): void {
    cameraOne = new Camera();
    cameraTwo = new Camera();

    // Scene contents (car + example geometry)
    makeDefaultScene();

    // Random buildings / rocks
    for (let i = 0; i < 10; i++) {
        const x = Math.random() * 50 - 25;
        const y = Math.random() * 50 - 25;
        makeBuilding(x, y, Color.RAINBOW32[i % Color.RAINBOW32.length]);
    }

    // Upload interleaved geometry to GPU and set attribute pointers
    bufferData();
}

/**
 * Creates the baseline scene: ground plane, car, and sun light.
 * @returns {void}
 */
function makeDefaultScene(): void {
    ground = new Cube(gl, geoShader, objectArr, 50, 0.01, 100, 0, -1, 0);
    ground.setColor(Color.DARKGREEN);
    objectArr.push(ground);
    makeCar();

    sun = new Light(0, 1000, 0, Color.GHOSTWHITE, Ambient.AMBIENT_WARM, -1);
    day = true;
    sun.setDirection(new vec4(0, -1, 0, 0));
}

/**
 * Constructs the car and appends it to {@link objectArr}.
 * @returns {void}
 */
function makeCar(): void {
    car = new Car(gl, geoShader, objectArr, 2, 1, 3);
    car.bind(0);
    objectArr.push(car);
}

/**
 * Creates a building (currently a textured sphere "rock") at (x, 0, z)
 * with the given color and adds it to the scene.
 *
 * @param {number} x - World X position.
 * @param {number} z - World Z position.
 * @param {vec4} color - Building/rock color.
 * @returns {void}
 */
function makeBuilding(x: number, z: number, color: vec4): void {
    // const cube: Cube = new Cube(gl, program, objectArr, 5, 4, 5, x, 0, z);
    // cube.setAllColor(color);
    // objectArr.push(cube);
    const rock = new Sphere(gl, geoShader, objectArr, 3, x, 0, z);
    rock.setColor(color);
    objectArr.push(rock);
}

/**
 * Configures a single G-buffer texture (albedo/spec/normal/position).
 *
 * Uses `RGBA16F` as internal format so that values can exceed [0,1],
 * and clamps/wraps to edge with NEAREST sampling.
 *
 * @param {WebGLTexture} tex - The texture handle to configure.
 * @param {number} width - Texture width in pixels.
 * @param {number} height - Texture height in pixels.
 * @returns {void}
 */
function setupGBufferTexture(tex: WebGLTexture, width: number, height: number): void {
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // Use RGBA16F so positions/normals can go outside [0,1]
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,         // internal format
        width,
        height,
        0,
        gl.RGBA,            // format
        gl.FLOAT,           // type
        null                // no initial data
    );

    // G-buffer textures are usually sampled 1:1 → NEAREST is fine
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

/**
 * Initializes the watercolor base buffer.
 * This is a single RGBA16F texture that stores the
 * "painted" base color from the DiffusePass.
 *
 * @returns {void}
 */
function initWatercolorBaseBuffer(): void {
    gWaterColorBaseTex = gl.createTexture() as WebGLTexture;
    gl.bindTexture(gl.TEXTURE_2D, gWaterColorBaseTex);

    // Same size as G-buffer, RGBA16F so we can keep nice gradients
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        gTexWidth,
        gTexHeight,
        0,
        gl.RGBA,
        gl.FLOAT,
        null
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Create FBO and attach the watercolor base as COLOR_ATTACHMENT0
    gWaterColorBaseFBO = gl.createFramebuffer() as WebGLFramebuffer;
    gl.bindFramebuffer(gl.FRAMEBUFFER, gWaterColorBaseFBO);

    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        gWaterColorBaseTex,
        0
    );

    // We only draw to COLOR_ATTACHMENT0 in this FBO
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);


    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

/**
 * Initializes the watercolor base buffer.
 * This is a single RGBA16F texture that stores the
 * "painted" base color from the DiffusePass.
 *
 * @returns {void}
 */
function initWatercolorTextureBuffer(): void {
    gWaterColorTexure = gl.createTexture() as WebGLTexture;
    gl.bindTexture(gl.TEXTURE_2D, gWaterColorTexure);

    // Same size as G-buffer, RGBA16F so we can keep nice gradients
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        gTexWidth,
        gTexHeight,
        0,
        gl.RGBA,
        gl.FLOAT,
        null
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Create FBO and attach the watercolor base as COLOR_ATTACHMENT0
    gWaterColorTextureFBO = gl.createFramebuffer() as WebGLFramebuffer;
    gl.bindFramebuffer(gl.FRAMEBUFFER, gWaterColorTextureFBO);

    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        gWaterColorTexure,
        0
    );

    paperTexture = gl.createTexture();
    paperImg = new Image();
    paperImg.onload = function() { util.handleTextureLoaded(paperImg, paperTexture,gl); };
    paperImg.src = '../Assets/paper.jpg';

    // We only draw to COLOR_ATTACHMENT0 in this FBO
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
}




/**
 * Initializes the G-buffer framebuffer and all attached textures
 * (albedo, specular, normal, position, and depth).
 *
 * - Uses `EXT_color_buffer_float` to allow rendering to RGBA16F.
 * - Attaches four color textures to `COLOR_ATTACHMENT0..3`.
 * - Attaches a depth texture to `DEPTH_ATTACHMENT`.
 * - Calls `gl.drawBuffers` to enable MRT.
 *
 * @returns {void}
 */
function initGBuffer(): void {
    const ext = gl.getExtension("EXT_color_buffer_float");
    if (!ext) {
        console.warn("EXT_color_buffer_float not supported; deferred shading precision may be limited.");
    }

    gTexWidth = canvas.clientWidth;
    gTexHeight = canvas.clientHeight;

    gAlbedoTex = gl.createTexture() as WebGLTexture;
    gSpecularTex = gl.createTexture() as WebGLTexture;
    gNormalTex = gl.createTexture() as WebGLTexture;
    gPositionTex = gl.createTexture() as WebGLTexture;

    setupGBufferTexture(gAlbedoTex, gTexWidth, gTexHeight);
    setupGBufferTexture(gSpecularTex, gTexWidth, gTexHeight);
    setupGBufferTexture(gNormalTex, gTexWidth, gTexHeight);
    setupGBufferTexture(gPositionTex, gTexWidth, gTexHeight);

    gDepthTex = gl.createTexture() as WebGLTexture;
    gl.bindTexture(gl.TEXTURE_2D, gDepthTex);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.DEPTH_COMPONENT32F,      // internal format
        gTexWidth,
        gTexHeight,
        0,
        gl.DEPTH_COMPONENT,         // format
        gl.FLOAT,                   // type
        null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


    gBufferFBO = gl.createFramebuffer() as WebGLFramebuffer;
    gl.bindFramebuffer(gl.FRAMEBUFFER, gBufferFBO);

    // Attach color textures to COLOR_ATTACHMENT0..3
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, gAlbedoTex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, gSpecularTex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, gNormalTex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT3, gl.TEXTURE_2D, gPositionTex, 0);

    // Attach depth texture
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, gDepthTex, 0);

    // Tell WebGL which color attachments we are drawing into
    gl.drawBuffers([
        gl.COLOR_ATTACHMENT0,   // albedo
        gl.COLOR_ATTACHMENT1,   // specular
        gl.COLOR_ATTACHMENT2,   // normal
        gl.COLOR_ATTACHMENT3    // position
    ]);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

/**
 * Fixed-timestep update hook; schedules the next render frame.
 * @returns {void}
 */
function update(): void {
    requestAnimationFrame(render);
}

let blurEnabled: boolean = true;
let edgeDarkenEnabled: boolean = true;
let edgeModuleEnabled: boolean = true;
let diffuseEnabled: boolean = true;
let midtoneEnabled: boolean = true;
let textureEnabled: boolean = true;
let shadowEnabled: boolean = true;
let lightingEnabled: boolean = true;

/**
 * High-level render entry point.
 *
 * Performs:
 * 1. Geometry pass into the G-buffer.
 * 2. Lighting pass using the G-buffer and screen quad.
 *
 * @returns {void}
 */
function render(): void {
    // 1) Populate G-buffer: gAlbedoTex, gSpecularTex, gNormalTex, gPositionTex, gDepthTex
    GeomertyPass();

    // 2) Build watercolor *color* from G-buffer + lights
    //    - DiffusePass: base wash from lighting
    //    - ShadowPass: deepen dark areas
    //    - MidtonePass: optional toon-ish midtone layer
    if (diffuseEnabled) {
        DiffusePass();    // uses G-buffer, writes watercolorBaseTex
    }

    if (shadowEnabled) {
        ShadowPass();     // uses watercolorBaseTex (+ G-buffer), writes watercolorShadowTex
    }

    if (midtoneEnabled) {
        MidtonePass();    // uses watercolorShadowTex, writes watercolorMidtoneTex
    }

    // 3) Apply paper color/pattern to the painted result
    if (textureEnabled) {
        TexturePass();    // uses watercolorMidtoneTex + paperTex, writes watercolorTexturedTex
    }

    // 4) Blur to simulate pigment bleeding on wet paper
    if (blurEnabled) {
        BlurPass();       // uses watercolorTexturedTex, writes watercolorBlurTexB
    }

    // 5) Modulate alpha with paper grain (pigment pooling)
    if (edgeModuleEnabled) {
        EdgeModulationPass(); // uses watercolorBlurTexB + paperTex, writes watercolorEdgesTex
    }

    // 6) Darken / thicken edges for that inked-outline feel
    if (edgeDarkenEnabled) {
        EdgeDarkenPass(); // uses watercolorEdgesTex (+ intensity/edge info), writes watercolorFinalTex
    }

    // 7) Final composite:
    //    - In watercolor mode: sample watercolorFinalTex and draw to the screen.
    //    - In normal deferred mode: sample G-buffer and do standard lighting.
    if (lightingEnabled) {
        LightingPass();
    }
}


function BlurPass(): void {
}

function EdgeDarkenPass(): void {
}

function EdgeModulationPass(): void {
}

function DiffusePass(): void {

    gl.useProgram(diffuseShader);

    // Render into the watercolor base texture
    gl.bindFramebuffer(gl.FRAMEBUFFER, gWaterColorBaseFBO);
    gl.viewport(0, 0, gTexWidth, gTexHeight);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Bind G-buffer textures as inputs (samplers)
    // Albedo
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, gAlbedoTex);
    gl.uniform1i(gl.getUniformLocation(diffuseShader, "gAlbedo"), 0);

    // Specular
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, gSpecularTex);
    gl.uniform1i(gl.getUniformLocation(diffuseShader, "gSpecular"), 1);

    // Normal
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, gNormalTex);
    gl.uniform1i(gl.getUniformLocation(diffuseShader, "gNormalTex"), 2);

    // Position
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, gPositionTex);
    gl.uniform1i(gl.getUniformLocation(diffuseShader, "gPosition"), 3);

    uploadLightsForProgram(diffuseShader);

    // Set palette colors as uniforms (paper-ish warm tones)
    const color0 = gl.getUniformLocation(diffuseShader, "color0");
    const color1 = gl.getUniformLocation(diffuseShader, "color1");

    gl.uniform4f(color0, 0.92, 0.88, 0.78, 1.0);

    // darker warm pigment
    gl.uniform4f(color1, 0.45, 0.28, 0.18, 1.0);

    drawRectangle();
}


function MidtonePass(): void {
}

function TexturePass(): void {

    gl.useProgram(textureShader);

    // Render into the watercolor base texture
    gl.bindFramebuffer(gl.FRAMEBUFFER, gWaterColorTextureFBO);
    gl.viewport(0, 0, gTexWidth, gTexHeight);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Bind G-buffer textures as inputs (samplers)
    // Albedo
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, gWaterColorBaseTex);
    gl.uniform1i(gl.getUniformLocation(textureShader, "waterColorMidtoneTex"), 0);

    // Specular
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, paperTexture);
    gl.uniform1i(gl.getUniformLocation(textureShader, "paperTex"), 1);

    drawRectangle();
}


function ShadowPass(): void {
}


/**
 * Performs the lighting pass for deferred shading.
 *
 * - Binds the default framebuffer (canvas).
 * - Samples from G-buffer textures (albedo, specular, normal, position).
 * - Uploads light data to the lighting shader.
 * - Renders a full-screen quad that computes final shaded color per-fragment.
 *
 * Depth testing is disabled for this pass.
 *
 * @returns {void}
 */
function LightingPass(): void {
    gl.useProgram(lightShader);
    gl.disable(gl.BLEND);

    // Render to the default framebuffer (the canvas)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.disable(gl.DEPTH_TEST);

    // Albedo
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, gAlbedoTex);
    gl.uniform1i(gl.getUniformLocation(lightShader, "gAlbedo"), 0);

    // Specular
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, gSpecularTex);
    gl.uniform1i(gl.getUniformLocation(lightShader, "gSpecular"), 1);

    // Normal
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, gNormalTex);
    gl.uniform1i(gl.getUniformLocation(lightShader, "gNormalTex"), 2);

    // Position
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, gPositionTex);
    gl.uniform1i(gl.getUniformLocation(lightShader, "gPosition"), 3);

    //Testing
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, gWaterColorTexure);
    gl.uniform1i(gl.getUniformLocation(lightShader, "test"), 4);

    // --- Upload light uniforms for the lighting shader ---
    uploadLightsForProgram(lightShader);

    // --- Draw full-screen quad ---
    drawRectangle();

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
}

/**
 * Uploads current light data (sun + car lights) to a given shader program.
 *
 * Populates:
 * - `uLightColor`   (vec4[5])
 * - `uLightAmbient` (vec4[5])
 * - `uLightPos`     (vec4[5])  in view space
 * - `uLightDirection` (vec4[5]) in view space
 * - `uLightEnabled` (vec4[5])  as on/off flags
 * - `uLightCutoff`  (float[5]) for spotlights
 *
 * Positions and directions are computed in the current camera's view space.
 *
 * @param {WebGLProgram} program - The shader program to receive the uniforms.
 * @returns {void}
 */
function uploadLightsForProgram(program: WebGLProgram): void {
    const lights: Light[] = [];
    lights.push(sun);
    lights.push(...car.getLightData());

    const ambients: vec4[] = [];
    const colors: vec4[] = [];
    const directions: vec4[] = [];
    const positions: vec4[] = [];
    const enabled: vec4[] = [];
    const cutOffAngles: number[] = [];

    const cameraMV = getCamera().getCameraMV();

    for (let i = 0; i < 5; i++) {
        ambients.push(lights[i].getAmbient());
        colors.push(lights[i].getColor());

        if (lights[i] !== sun) {
            directions.push(lights[i].getDirection(car.getCarMV(cameraMV)));
            positions.push(lights[i].getPosition(car.getCarMV(cameraMV)));
        } else {
            directions.push(lights[i].getDirection(cameraMV));
            positions.push(lights[i].getPosition(cameraMV));
        }

        enabled.push(lights[i].getEnabled());
        cutOffAngles.push(lights[i].getCutOffAngle());
    }

    const uLightColorLoc = gl.getUniformLocation(program, "uLightColor");
    const uAmbientLoc = gl.getUniformLocation(program, "uLightAmbient");
    const uLightPosLoc = gl.getUniformLocation(program, "uLightPos");
    const uDirectionLoc = gl.getUniformLocation(program, "uLightDirection");
    const uEnabledLoc = gl.getUniformLocation(program, "uLightEnabled");
    const uLightCutoffLoc = gl.getUniformLocation(program, "uLightCutoff");

    if (uLightColorLoc)
        gl.uniform4fv(uLightColorLoc, flatten(colors));
    if (uAmbientLoc)
        gl.uniform4fv(uAmbientLoc, flatten(ambients));
    if (uLightPosLoc)
        gl.uniform4fv(uLightPosLoc, flatten(positions));
    if (uDirectionLoc)
        gl.uniform4fv(uDirectionLoc, flatten(directions));
    if (uEnabledLoc)
        gl.uniform4fv(uEnabledLoc, flatten(enabled));
    if (uLightCutoffLoc)
        gl.uniform1fv(uLightCutoffLoc, cutOffAngles);
}

/**
 * Geometry pass for deferred shading:
 *
 * - Binds the G-buffer FBO.
 * - Clears color + depth.
 * - Uploads the projection matrix.
 * - Updates cameras / car / objects.
 * - Draws all scene geometry into the MRT textures.
 *
 * After completion, the default framebuffer is re-bound.
 *
 * @returns {void}
 */
function GeomertyPass(): void {
    gl.useProgram(geoShader);
    gl.bindFramebuffer(gl.FRAMEBUFFER, gBufferFBO);
    gl.viewport(0, 0, gTexWidth, gTexHeight);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);

    // ──────────────────────────────────────────────────────────────
    // Perspective Projection
    // ──────────────────────────────────────────────────────────────
    const p: mat4 = perspective(fovy, canvas.clientWidth / canvas.clientHeight, 1.0, 100.0);
    gl.uniformMatrix4fv(uproj, false, p.flatten());


    moveObjects();
    checkBounds(ground, car);

    // Update + draw in array order
    for (let i: number = 0; i < objectArr.length; i++) {
        if (objectArr[i] == car) {
            continue;
        }
        zoomAndDolly(i);
        updateObjects(i);
        objectArr[i].draw();
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null); // IMPORTANT: unbind before lighting
}



/**
 * Returns the currently active camera instance, based on {@link cameraIndex}.
 *
 * @throws {Error} If an unsupported camera index is encountered.
 * @returns {Camera} The active camera.
 */
function getCamera(): Camera {
    switch (cameraIndex) {
        case 1:
            return cameraOne;
        case 2:
        case 3:
            return cameraTwo;
        default:
            throw new Error("Unsupported camera index");
    }
}

/**
 * Applies active camera logic based on {@link cameraIndex}.
 * - 1: Orbit/static cam with optional follow of the car (looks at origin or car).
 * - 2: Head-mounted camera (eye position → look forward from head).
 * - 3: External chase-like camera using car model matrix.
 *
 * @param {number} i - Current object index being iterated in the render loop (used to update per-object MV).
 * @returns {void}
 */
function updateObjects(i: number): void {
    switch (cameraIndex) {

        // CAMERA 1: Free-roaming / orbit camera
        case 1: {
            if (followCar) {
                cameraOne.setCameraLook(car.getX(), car.getY(), car.getZ());
            } else {
                cameraOne.setCameraLook(0, 0, 0);
            }
            car.updateAndDraw(cameraOne.getCameraMV());
            objectArr[i].update(cameraOne.getCameraMV());
            break;
        }

        // CAMERA 2: First-person / head-mounted camera
        case 2: {
            const eye = car.getEyeWorldPos();

            // Build the head’s world matrix: carM * headLocal
            const carM = car.getModelMatrix();
            const headLocal = car.getHead().getModelMatrix();
            const headWorld = carM.mult(headLocal);

            // A point d units forward in the head's local -Z, expressed in world space:
            const d = util.MagicNumber;
            const target = headWorld.mult(new vec4(0, 0, -d, 1));

            cameraTwo.setCameraPos(eye[0], eye[1], eye[2]);
            cameraTwo.setCameraLook(target[0], target[1], target[2]);
            car.updateAndDraw(cameraTwo.getCameraMV());
            objectArr[i].update(cameraTwo.getCameraMV());
            break;
        }

        // CAMERA 3: Chase camera
        case 3: {
            const carM = car.getModelMatrix();
            const d = util.MagicNumber;

            const targetLook = carM.mult(new vec4(0, 0, -3 * d, 1));
            const targetPos = carM.mult(new vec4(0.5, 2 * d, +3 * d, 1));

            cameraTwo.setCameraPos(targetPos[0], targetPos[1], targetPos[2]);
            cameraTwo.setCameraLook(targetLook[0], targetLook[1], targetLook[2]);
            car.updateAndDraw(cameraTwo.getCameraMV());
            objectArr[i].update(cameraTwo.getCameraMV());
            break;
        }
    }
}

/**
 * Applies zoom (FOV) and dolly (camera Z) changes based on current input flags.
 * Clamps against configured limits in {@link util}.
 *
 * @param {number} i - Current object index (unused, preserved for symmetry with render loop).
 * @returns {void}
 */
function zoomAndDolly(i: number): void {
    if (zoomOutBool) {
        fovy--;
        if (fovy <= util.zoomMax) {
            fovy = fovy + util.ZoomAmt;
        }
    }
    if (zoomInBool) {
        fovy++;
        if (fovy >= util.zoomMin) {
            fovy = fovy - util.ZoomAmt;
        }
    }
    if (dollyInBool) {
        cameraOne.updateCameraz(-util.DollyAmt);
        if (cameraOne.getCameraz() <= util.dollyMin) {
            cameraOne.updateCameraz(util.DollyAmt);
        }
    }
    if (dollyOutBool) {
        cameraOne.updateCameraz(util.DollyAmt);
        if (cameraOne.getCameraz() >= util.dollyMax) {
            cameraOne.updateCameraz(-util.DollyAmt);
        }
    }
}

/**
 * Applies input-driven motion to controlled objects (binding group 0).
 * Currently routes inputs to the single {@link car} instance.
 *
 * @param {number} [i=null] - Index of the object in {@link objectArr} (unused).
 * @returns {void}
 */
function moveObjects(i: number = null): void {
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
    if (turnHeadRight) {
        car.rotateHead(-util.Rotation);
    }
    if (turnHeadLeft) {
        car.rotateHead(util.Rotation);
    }
}

/**
 * Uploads all scene geometry into a single interleaved VBO and
 * configures the vertex attribute pointers for the geometry shader.
 *
 * Layout per vertex (stride = 48 bytes):
 * - `vPosition` (location from shader): vec4 @ offset 0
 * - `vNormal`   (location from shader): vec4 @ offset 16
 * - `vTex`      (location from shader): vec4 @ offset 32
 *
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

    const vPosition = gl.getAttribLocation(geoShader, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 48, 0);
    gl.enableVertexAttribArray(vPosition);

    const vNormal = gl.getAttribLocation(geoShader, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 48, 16);
    gl.enableVertexAttribArray(vNormal);

    const vTex = gl.getAttribLocation(geoShader, "vTex");
    gl.vertexAttribPointer(vTex, 4, gl.FLOAT, false, 48, 32);
    gl.enableVertexAttribArray(vTex);
}
