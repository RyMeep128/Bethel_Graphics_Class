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
import {GraphicPipeline} from "./GraphicPipeline.js";
import {RenderSettings} from "../Utility/RenderSettings.js";
import {CustomMesh} from "../Objects/ComplexObjects/CustomMesh.js";
import {AxisGizmo} from "../Objects/Primitives/AxisGizmo.js";
import {Cylinder} from "../Objects/Primitives/Cylinder.js";

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

/** Scene graph list; draw order is array order. */
let objectArr: RenderableObject[];

/** Directional/sun light. */
let sun: Light;

// A simple “grouping” map: base object -> attached gizmos
const attachedAxes = new Map<RenderableObject, AxisGizmo>();

let worldAxes: AxisGizmo;


let duck:CustomMesh;

/** Location of `projection` uniform in the geometry shader. */
let uproj: WebGLUniformLocation;

/** Primary and secondary cameras; index selects active. */
let cameraOne: Camera;
/** Active camera selector (1, 2, or 3 for special view). */
let cameraIndex = 1;

/** Field-of-view in degrees for perspective projection. */
let fovy: number = 45.0;


/** Light uniform locations for the geometry shader. */


/** Framebuffer object for the G-buffer. */
let gBufferFBO: WebGLFramebuffer;


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

let watercolorSettings:RenderSettings;

//Watercolor buffer
let pipeline: GraphicPipeline;

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


    geoShader = initFileShaders(gl, "../Shaders/GeoPass/GeoVertexShader.glsl", "../Shaders/GeoPass/GeoFragmentShader.glsl");
    initGBuffer();
    watercolorSettings = new RenderSettings();
    watercolorSettings.waterColorEnabled = false;
    pipeline = new GraphicPipeline(gl, gAlbedoTex, gSpecularTex, gNormalTex, gPositionTex,canvas, watercolorSettings);

    objectArr = [];

    gl.useProgram(geoShader);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    uproj = gl.getUniformLocation(geoShader, "projection");

    setupKeyboardMouseBindings();
    initView();

    // Uncomment this Ryan, dont be an idiot
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

/**
 * Key-down handler for movement/input controls.
 * @param {KeyboardEvent} event - The keyboard event.
 * @returns {void}
 */
function keyDown(event: KeyboardEvent): void {
    switch (event.key) {
        case "p":
            setDuckAxes(true);
            break;
        case "o":
            setDuckAxes(false);
            break;
        default:
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

        default:
            break;
    }
}


/**
 * Initializes scene objects and uploads their buffers.
 * Adds ground, a set of buildings, and the player car.
 * @returns {void}
 */
function initView(): void {
    cameraOne = new Camera();

    makeDuck();

    let cube= new Cube(gl,geoShader,objectArr,1,1,1,)
    cube.setColor(Color.WHITE)
    objectArr.push(cube);
    makeAxis(cube);

    sun = new Light(0, 1000, 0, Color.GHOSTWHITE, Ambient.AMBIENT_WARM, -1);

    sun.setDirection(new vec4(0, -1, 0, 0));

    // Upload interleaved geometry to GPU and set attribute pointers
    bufferData();
}

async function makeDuck(): Promise<void> {
    const stlBuffer = await util.loadSTL("../Assets/Models/Rubber_Duck.stl");

    duck = new CustomMesh(
        gl,
        geoShader,
        objectArr,
        stlBuffer,
        10.0,    // target size
        0,      // x
        0,      // y
        0,      // z
        0,-90
    );

    duck.setColor(Color.YELLOW); // yellow duck 🦆
    objectArr.push(duck);

    // after duck is created and pushed

    const xAxis = new Cylinder(gl, geoShader, objectArr, 1, 50);
    const yAxis = new Cylinder(gl, geoShader, objectArr, 1, 50);
    const zAxis = new Cylinder(gl, geoShader, objectArr, 1, 50);

    xAxis.setColor(Color.RED);
    yAxis.setColor(Color.GREEN);
    zAxis.setColor(Color.BLUE);

    // objectArr.push(xAxis, yAxis, zAxis);

    duckAxes = new AxisGizmo(xAxis, yAxis, zAxis);
    // attachedAxes.set(duck, duckAxes);


    setupSliders();
    bufferData();
}

function makeAxis(object:RenderableObject){
    const wxAxis = new Cylinder(gl, geoShader, objectArr, 1, 50);
    const wyAxis = new Cylinder(gl, geoShader, objectArr, 1, 50);
    const wzAxis = new Cylinder(gl, geoShader, objectArr, 1, 50);

    wxAxis.setColor(Color.RED);
    wyAxis.setColor(Color.GREEN);
    wzAxis.setColor(Color.BLUE);

    // objectArr.push(wxAxis, wyAxis, wzAxis);

    // const wduckAxes = new AxisGizmo(wxAxis, wyAxis, wzAxis);
    // attachedAxes.set(object, wduckAxes);
}

let duckAxes:AxisGizmo;

function setDuckAxes(bool){
    if(bool){
        duckAxes.enableAxes()
    }else{
        duckAxes.disableAxes()
    }
}

function setupSliders(): void {
    const container = document.getElementById("slider-container");
    if (!container) {
        console.warn("slider-container div not found.");
        return;
    }
    if (!duck) {
        console.warn("Duck not initialized yet.");
        return;
    }
    if (!cameraOne) {
        console.warn("cameraOne not initialized yet.");
        return;
    }

    // Initial camera values – use current cameraOne position if available
    let camX = (cameraOne as any).getCamerax ? cameraOne.getCamerax() : 0;
    let camY = (cameraOne as any).getCameray ? cameraOne.getCameray() : 30;
    let camZ = (cameraOne as any).getCameraz ? cameraOne.getCameraz() : 50;

    // Initial duck values – matches how you constructed it
    let duckX = duck.getX();
    let duckY = duck.getY();
    let duckZ = duck.getZ();
    let duckYaw = duck.getYaw();
    let duckPitch = duck.getPitch();
    let duckRoll = duck.getRoll();

    // Initial orbit values (start at 0 unless you track them elsewhere)
    let duckOrbitYaw = 0;
    let duckOrbitPitch = 0;
    let duckOrbitRoll = 0;

    const defaults = {
        duckX, duckY, duckZ,
        duckYaw, duckPitch, duckRoll,
        duckOrbitYaw, duckOrbitPitch, duckOrbitRoll,
        camX, camY, camZ
    };


    container.innerHTML = `
        <div class="panel">
            <h3>Duck Transform</h3>

            <label>
                Duck X
                <input id="duck-x" type="range" min="-50" max="50" step="0.1" value="${duckX}">
            </label>
            <span id="duck-x-value">${duckX.toFixed(1)}</span>
            <br/>

            <label>
                Duck Y
                <input id="duck-y" type="range" min="-10" max="10" step="0.1" value="${duckY}">
            </label>
            <span id="duck-y-value">${duckY.toFixed(1)}</span>
            <br/>

            <label>
                Duck Z
                <input id="duck-z" type="range" min="-50" max="50" step="0.1" value="${duckZ}">
            </label>
            <span id="duck-z-value">${duckZ.toFixed(1)}</span>
            <br/>

            <label>
                Yaw
                <input id="duck-yaw" type="range" min="-180" max="180" step="1" value="${duckYaw}">
            </label>
            <span id="duck-yaw-value">${duckYaw}</span>
            <br/>

            <label>
                Pitch
                <input id="duck-pitch" type="range" min="-180" max="180" step="1" value="${duckPitch}">
            </label>
            <span id="duck-pitch-value">${duckPitch}</span>
            <br/>

            <label>
                Roll
                <input id="duck-roll" type="range" min="-180" max="180" step="1" value="${duckRoll}">
            </label>
            <span id="duck-roll-value">${duckRoll}</span>
        </div>

        <div class="panel">
            <h3>Duck Orbit (World Space)</h3>

            <label>
                Orbit Yaw
                <input id="duck-orbit-yaw" type="range" min="-180" max="180" step="1" value="${duckOrbitYaw}">
            </label>
            <span id="duck-orbit-yaw-value">${duckOrbitYaw}</span>
            <br/>

            <label>
                Orbit Pitch
                <input id="duck-orbit-pitch" type="range" min="-180" max="180" step="1" value="${duckOrbitPitch}">
            </label>
            <span id="duck-orbit-pitch-value">${duckOrbitPitch}</span>
            <br/>

            <label>
                Orbit Roll
                <input id="duck-orbit-roll" type="range" min="-180" max="180" step="1" value="${duckOrbitRoll}">
            </label>
            <span id="duck-orbit-roll-value">${duckOrbitRoll}</span>
        </div>

        <div class="panel">
            <h3>Camera Position (Camera 1)</h3>

            <label>
                Cam X
                <input id="cam-x" type="range" min="-100" max="100" step="0.5" value="${camX}">
            </label>
            <span id="cam-x-value">${camX.toFixed(1)}</span>
            <br/>

            <label>
                Cam Y
                <input id="cam-y" type="range" min="0" max="100" step="0.5" value="${camY}">
            </label>
            <span id="cam-y-value">${camY.toFixed(1)}</span>
            <br/>

            <label>
                Cam Z
                <input id="cam-z" type="range" min="0" max="150" step="0.5" value="${camZ}">
            </label>
            <span id="cam-z-value">${camZ.toFixed(1)}</span>
        </div>
        <div class="panel">
            <button id="reset-sliders">Reset All</button>
        </div>

    `;

    // ─────────────────────────────────────
    // Grab slider elements
    // ─────────────────────────────────────
    const duckXSlider = document.getElementById("duck-x") as HTMLInputElement;
    const duckYSlider = document.getElementById("duck-y") as HTMLInputElement;
    const duckZSlider = document.getElementById("duck-z") as HTMLInputElement;
    const duckYawSlider = document.getElementById("duck-yaw") as HTMLInputElement;
    const duckPitchSlider = document.getElementById("duck-pitch") as HTMLInputElement;
    const duckRollSlider = document.getElementById("duck-roll") as HTMLInputElement;

    const duckXValue = document.getElementById("duck-x-value") as HTMLElement;
    const duckYValue = document.getElementById("duck-y-value") as HTMLElement;
    const duckZValue = document.getElementById("duck-z-value") as HTMLElement;
    const duckYawValue = document.getElementById("duck-yaw-value") as HTMLElement;
    const duckPitchValue = document.getElementById("duck-pitch-value") as HTMLElement;
    const duckRollValue = document.getElementById("duck-roll-value") as HTMLElement;

    const duckOrbitYawSlider = document.getElementById("duck-orbit-yaw") as HTMLInputElement;
    const duckOrbitPitchSlider = document.getElementById("duck-orbit-pitch") as HTMLInputElement;
    const duckOrbitRollSlider = document.getElementById("duck-orbit-roll") as HTMLInputElement;

    const duckOrbitYawValue = document.getElementById("duck-orbit-yaw-value") as HTMLElement;
    const duckOrbitPitchValue = document.getElementById("duck-orbit-pitch-value") as HTMLElement;
    const duckOrbitRollValue = document.getElementById("duck-orbit-roll-value") as HTMLElement;

    const camXSlider = document.getElementById("cam-x") as HTMLInputElement;
    const camYSlider = document.getElementById("cam-y") as HTMLInputElement;
    const camZSlider = document.getElementById("cam-z") as HTMLInputElement;

    const camXValue = document.getElementById("cam-x-value") as HTMLElement;
    const camYValue = document.getElementById("cam-y-value") as HTMLElement;
    const camZValue = document.getElementById("cam-z-value") as HTMLElement;

    // ─────────────────────────────────────
    // Duck slider handlers
    // ─────────────────────────────────────
    duckXSlider.addEventListener("input", () => {
        duckX = parseFloat(duckXSlider.value);
        duck.setX(duckX);
        duckXValue.textContent = duckX.toFixed(1);
    });

    duckYSlider.addEventListener("input", () => {
        duckY = parseFloat(duckYSlider.value);
        duck.setY(duckY);
        duckYValue.textContent = duckY.toFixed(1);
    });

    duckZSlider.addEventListener("input", () => {
        duckZ = parseFloat(duckZSlider.value);
        duck.setZ(duckZ);
        duckZValue.textContent = duckZ.toFixed(1);
    });

    duckYawSlider.addEventListener("input", () => {
        duckYaw = parseFloat(duckYawSlider.value);
        duck.setYaw(duckYaw);
        duckYawValue.textContent = duckYaw.toFixed(0);
    });

    duckPitchSlider.addEventListener("input", () => {
        duckPitch = parseFloat(duckPitchSlider.value);
        duck.setPitch(duckPitch);
        duckPitchValue.textContent = duckPitch.toFixed(0);
    });

    duckRollSlider.addEventListener("input", () => {
        duckRoll = parseFloat(duckRollSlider.value);
        duck.setRoll(duckRoll);
        duckRollValue.textContent = duckRoll.toFixed(0);
    });

    // ─────────────────────────────────────
    // Duck orbit slider handlers
    // ─────────────────────────────────────
    duckOrbitYawSlider.addEventListener("input", () => {
        duckOrbitYaw = parseFloat(duckOrbitYawSlider.value);
        duck.setOrbitYaw(duckOrbitYaw);
        duckOrbitYawValue.textContent = duckOrbitYaw.toFixed(0);
    });

    duckOrbitPitchSlider.addEventListener("input", () => {
        duckOrbitPitch = parseFloat(duckOrbitPitchSlider.value);
        duck.setOrbitPitch(duckOrbitPitch);
        duckOrbitPitchValue.textContent = duckOrbitPitch.toFixed(0);
    });

    duckOrbitRollSlider.addEventListener("input", () => {
        duckOrbitRoll = parseFloat(duckOrbitRollSlider.value);
        duck.setOrbitRoll(duckOrbitRoll);
        duckOrbitRollValue.textContent = duckOrbitRoll.toFixed(0);
    });

    // ─────────────────────────────────────
    // Camera slider handlers (Camera 1)
    // ─────────────────────────────────────
    camXSlider.addEventListener("input", () => {
        camX = parseFloat(camXSlider.value);
        camXValue.textContent = camX.toFixed(1);
        cameraOne.setCameraPos(camX, camY, camZ);
    });

    camYSlider.addEventListener("input", () => {
        camY = parseFloat(camYSlider.value);
        camYValue.textContent = camY.toFixed(1);
        cameraOne.setCameraPos(camX, camY, camZ);
    });

    camZSlider.addEventListener("input", () => {
        camZ = parseFloat(camZSlider.value);
        camZValue.textContent = camZ.toFixed(1);
        cameraOne.setCameraPos(camX, camY, camZ);
    });

    const resetButton = document.getElementById("reset-sliders") as HTMLButtonElement;

    resetButton.addEventListener("click", () => {
        // ───────── Duck Transform ─────────
        duckX = defaults.duckX;
        duckY = defaults.duckY;
        duckZ = defaults.duckZ;
        duckYaw = defaults.duckYaw;
        duckPitch = defaults.duckPitch;
        duckRoll = defaults.duckRoll;

        duck.setX(duckX);
        duck.setY(duckY);
        duck.setZ(duckZ);
        duck.setYaw(duckYaw);
        duck.setPitch(duckPitch);
        duck.setRoll(duckRoll);

        duckXSlider.value = String(duckX);
        duckYSlider.value = String(duckY);
        duckZSlider.value = String(duckZ);
        duckYawSlider.value = String(duckYaw);
        duckPitchSlider.value = String(duckPitch);
        duckRollSlider.value = String(duckRoll);

        duckXValue.textContent = duckX.toFixed(1);
        duckYValue.textContent = duckY.toFixed(1);
        duckZValue.textContent = duckZ.toFixed(1);
        duckYawValue.textContent = duckYaw.toFixed(0);
        duckPitchValue.textContent = duckPitch.toFixed(0);
        duckRollValue.textContent = duckRoll.toFixed(0);

        // ───────── Orbit ─────────
        duckOrbitYaw = defaults.duckOrbitYaw;
        duckOrbitPitch = defaults.duckOrbitPitch;
        duckOrbitRoll = defaults.duckOrbitRoll;

        duck.setOrbitYaw(duckOrbitYaw);
        duck.setOrbitPitch(duckOrbitPitch);
        duck.setOrbitRoll(duckOrbitRoll);

        duckOrbitYawSlider.value = String(duckOrbitYaw);
        duckOrbitPitchSlider.value = String(duckOrbitPitch);
        duckOrbitRollSlider.value = String(duckOrbitRoll);

        duckOrbitYawValue.textContent = duckOrbitYaw.toFixed(0);
        duckOrbitPitchValue.textContent = duckOrbitPitch.toFixed(0);
        duckOrbitRollValue.textContent = duckOrbitRoll.toFixed(0);

        // ───────── Camera ─────────
        camX = defaults.camX;
        camY = defaults.camY;
        camZ = defaults.camZ;

        camXSlider.value = String(camX);
        camYSlider.value = String(camY);
        camZSlider.value = String(camZ);

        camXValue.textContent = camX.toFixed(1);
        camYValue.textContent = camY.toFixed(1);
        camZValue.textContent = camZ.toFixed(1);

        cameraOne.setCameraPos(camX, camY, camZ);
    });

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
    pipeline.updateCamera(getCamera());
    // 1) Populate G-buffer: gAlbedoTex, gSpecularTex, gNormalTex, gPositionTex, gDepthTex
    GeomertyPass();

    // 2) Build watercolor *color* from G-buffer + lights
    //    - DiffusePass: base wash from lighting
    //    - ShadowPass: deepen dark areas
    //    - MidtonePass: optional toon-ish midtone layer
    if (diffuseEnabled) {
        pipeline.DiffusePass();    // uses G-buffer, writes watercolorBaseTex
    }


    if (shadowEnabled) {
        pipeline.ShadowPass();     // uses watercolorBaseTex (+ G-buffer), writes watercolorShadowTex
    }

    if (midtoneEnabled) {
        pipeline.MidtonePass();    // uses watercolorShadowTex, writes watercolorMidtoneTex
    }

    // 3) Apply paper color/pattern to the painted result
    if (textureEnabled) {
        // pipeline.TexturePass();    // uses watercolorMidtoneTex + paperTex, writes watercolorTexturedTex
    }

    // 4) Blur to simulate pigment bleeding on wet paper
    if (blurEnabled) {
        // pipeline.BlurPass();       // uses watercolorTexturedTex, writes watercolorBlurTexB
    }

    // 5) Modulate alpha with paper grain (pigment pooling)
    if (edgeModuleEnabled) {
        // pipeline.EdgeModulationPass(); // uses watercolorBlurTexB + paperTex, writes watercolorEdgesTex
    }

    // 6) Darken / thicken edges for that inked-outline feel
    if (edgeDarkenEnabled) {
        // pipeline.EdgeDarkenPass(); // uses watercolorEdgesTex (+ intensity/edge info), writes watercolorFinalTex
    }

    // 7) Final composite:
    //    - In watercolor mode: sample watercolorFinalTex and draw to the screen.
    //    - In normal deferred mode: sample G-buffer and do standard lighting.
    if (lightingEnabled) {
        pipeline.LightingPass();
    }
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

    syncAttachedAxes();

    // Update + draw in array order
    for (let i: number = 0; i < objectArr.length; i++) {
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
            cameraOne.setCameraLook(0, 0, 0);
            objectArr[i].update(cameraOne.getCameraMV());
            break;
        }


    }
}

function syncAttachedAxes(): void {
    for (const [base, gizmo] of attachedAxes.entries()) {
        gizmo.attachTo(base);
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
    //Nothing here :)
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


export function uploadLightsForProgram(program: WebGLProgram): void {
    const lights: Light[] = [];
    lights.push(sun);

    const ambients: vec4[] = [];
    const colors: vec4[] = [];
    const directions: vec4[] = [];
    const positions: vec4[] = [];
    const enabled: vec4[] = [];
    const cutOffAngles: number[] = [];

    const cameraMV = getCamera().getCameraMV();

    for (let i = 0; i < 1; i++) {
        ambients.push(lights[i].getAmbient());
        colors.push(lights[i].getColor());


        directions.push(lights[i].getDirection(cameraMV));
        positions.push(lights[i].getPosition(cameraMV));


        enabled.push(lights[i].getEnabled());
        cutOffAngles.push(lights[i].getCutOffAngle());
    }

    const uLightColorLoc = gl.getUniformLocation(program, "uLightColor");
    const uAmbientLoc = gl.getUniformLocation(program, "uLightAmbient");
    const uLightPosLoc =gl.getUniformLocation(program, "uLightPos");
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
