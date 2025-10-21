import * as util from "./util.js";
import * as Color from "./Color.js";
import * as Ambient from "./AmbientColors.js"
import { Cube } from "./Cube.js";
import { flatten, initShaders, lookAt, vec4 } from "./helperfunctions.js";
import { mat4, perspective,initFileShaders } from "./helperfunctions.js";
import { Cylinder } from "./Cylinder.js";
import { RenderableObject } from "./RenderableObject.js";
import { Car } from "./Car.js";
import { Camera } from "./Camera.js";
import {Sphere} from "./Sphere.js";
import {Light} from "./Light.js";

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
 * - Interleaved VBO layout: [pos vec4][color vec4][normal vec4], stride 48 bytes (offsets 0/32)
 * - Object-specific transforms handled via each object's `update()` method
 * - Objects with `binding === 0` receive movement input in {@link moveObjects}
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
let sun:Light;
let day:boolean;

/** Ground plane. */
let ground: Cube;

/** Location of `projectionMatrix` uniform. */
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

let UNLIT:GLint = 0;
let GOURAUD:GLint = 1;
let PHONG:GLint = 2;
let CEL:GLint = 3;
let RYAN:GLint = 4;
let umode:WebGLUniformLocation; //lighting mode



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

    program = initFileShaders(gl, "vshader-combined.glsl", "fshader-combined.glsl");
    objectArr = [];

    gl.useProgram(program);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    uproj = gl.getUniformLocation(program, "projection");

     umode = gl.getUniformLocation(program, "mode");


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
            break
        case "8":
            car.toggleSirens();
            break
        case "0":
            day = !day;
            if(day){
                sun.setColor(Color.YELLOW);
                sun.setAmbient(Ambient.AMBIENT_WARM)
            }else{
                sun.setColor(new vec4(0.4,0.4,0.4,1))
                sun.setAmbient(Ambient.AMBIENT_DIM)
            }
            break

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
                cameraOne.setCameraPos(0, 10, 20);
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


    // Random buildings
    for (let i = 0; i < 10; i++) {
        const x = Math.random() * 50 - 25;
        const y = Math.random() * 50 - 25;
        makeBuilding(x, y, Color.RAINBOW32[i % Color.RAINBOW32.length]);
    }

    // Upload interleaved geometry to GPU and set attribute pointers
    bufferData();
}


function makeDefaultScene(): void {
    ground = new Cube(gl, program, objectArr, 50, 0.01, 100, 0, -1, 0);
    ground.setAllColor(Color.DARKGREEN);
    objectArr.push(ground);
    makeCar();

    sun = new Light(gl,program,0,1000,0);
    sun.setColor(new vec4(0.4,0.4,0.4,1))
    sun.setAmbient(Ambient.AMBIENT_DIM)

}

/**
 * Constructs the car and appends it to {@link objectArr}.
 * @returns {void}
 */
function makeCar(): void {
    car = new Car(gl, program, objectArr, 2, 1, 3);
    car.bind(0);
    objectArr.push(car);
}

/**
 * Creates a building cube at (x, 0, z) with the given color and adds it to the scene.
 * @param {number} x - World X position.
 * @param {number} z - World Z position.
 * @param {vec4} color - Building color.
 * @returns {void}
 */
function makeBuilding(x: number, z: number, color: vec4): void {
    // const cube: Cube = new Cube(gl, program, objectArr, 5, 4, 5, x, 0, z);
    // cube.setAllColor(color);
    // objectArr.push(cube);
    const rock = new Sphere(gl, program, objectArr,3, x, 0 , z);
    rock.setColor(color);
    objectArr.push(rock);
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

    // ──────────────────────────────────────────────────────────────
    // Perspective Projection
    // ──────────────────────────────────────────────────────────────
    // The perspective projection defines the viewing frustum:
    // - `fovy` is the vertical field of view in degrees (adjustable via zoom controls).
    // - The aspect ratio uses canvas width/height to avoid stretching.
    // - Near plane = 1.0 → close enough to show ground-level detail but avoids depth precision loss.
    // - Far plane = 100.0 → far enough to include all buildings and ground.
    // These parameters together define a lens-like effect, simulating realistic depth.
    const p: mat4 = perspective(fovy, canvas.clientWidth / canvas.clientHeight, 1.0, 100.0);

    gl.uniformMatrix4fv(uproj, false, p.flatten());


    // Update + draw in array order
    for (let i:number = 0; i < objectArr.length; i++) {
        if (objectArr[i].getBinding() === 0) {
            moveObjects();
            checkBounds(ground, car);
            continue;
        }
        zoomAndDolly(i);
        camera(i);
        objectArr[i].draw();
    }


    lights();


}

function lights(): void {

    sun.sendLightDataWorld(getCamera().getCameraMV());

    //Note: In theory if I just skip multiplying and brining it into eyespace it should work for headlights?

}

function getCamera():Camera{
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
function camera(i: number): void {
    switch (cameraIndex) {

        // ──────────────────────────────────────────────────────────────
        // CAMERA 1: Free-roaming camera
        // ──────────────────────────────────────────────────────────────
        // "Free-center" mode:
        //   Eye = (0,10,20)
        //   Target = (0,0,0)
        //   Y=10 provides a raised, stage-view height above the ground.
        //
        // "Free-follow" mode:
        //   Same eye position, but target = car position.
        //   This mode tracks the car in real time, automatically updating
        //   the target every frame without user input, creating a follow effect.
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

        // ──────────────────────────────────────────────────────────────
        // CAMERA 2: Viewpoint (First-person) camera
        // ──────────────────────────────────────────────────────────────
        // Eye position:
        //   Derived from the car’s head + eye world position.
        //   (Eye = head’s local offset converted to world space)
        //
        // Target:
        //   A point d units forward along the head’s local -Z axis,
        //   transformed to world space by (carM * headLocal * [0,0,-d,1]).
        //   This aligns the camera’s forward direction with the rider’s gaze.
        //   `d` is the look distance, defined by util.MagicNumber.
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

        // ──────────────────────────────────────────────────────────────
        // CAMERA 3: Chase camera
        // ──────────────────────────────────────────────────────────────
        // The chase camera rides behind and above the car:
        // - Eye = carM * (0.5, 2d, +3d, 1) → slightly right, above, and behind.
        // - Target = carM * (0, 0, -3d, 1) → a point forward from the car.
        // This gives a cinematic trailing shot that follows car movement and rotation.
        // Signs are chosen assuming the car’s forward axis is -Z.
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
 * @param {number} i - Index of the object in {@link objectArr} (unused for now. Set to null).
 * @returns {void}
 */
function moveObjects(i:number = null): void {
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

    // Attribute setup assumes interleaved layout: [pos vec4][color vec4][normal vec4]

    const vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 48, 0);
    gl.enableVertexAttribArray(vPosition);

    const vColor = gl.getAttribLocation(program, "vAmbientDiffuseColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 48, 16);
    gl.enableVertexAttribArray(vColor);

    const vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 48, 32);
    gl.enableVertexAttribArray(vNormal);



}
