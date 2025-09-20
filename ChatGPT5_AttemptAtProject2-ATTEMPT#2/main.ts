import {
    mat4, vec4,
    lookAt, perspective, translate, rotateY, scalem,
    flatten, toradians, initShaders
} from "./helperfunctions.js";
import { Ground } from "./ground.js";
import { Car } from "./car.js";

/** WebGL globals */
let gl: WebGL2RenderingContext;
let canvas: HTMLCanvasElement;
let program: WebGLProgram;

/** Locations */
let aPosLoc: number;
let aColLoc: number;
let uMVLoc: WebGLUniformLocation;
let uProjLoc: WebGLUniformLocation;

/** Scene objects */
let ground: Ground;
let car: Car;

/** Camera & proj */
let projection: mat4;
let view: mat4;

/** Input state */
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

/** Timing */
let lastTime = 0;


window.onload = init;

function init(): void {
    canvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
    const glMaybe = canvas.getContext("webgl2");
    if (!glMaybe) throw new Error("WebGL2 not supported");
    gl = glMaybe;

    // Compile & link shaders
    program = initShaders(gl, "vertex-shader", "fragment-shader") as WebGLProgram;
    gl.useProgram(program);

    // Attribute / uniform lookups (names match the shaders)
    aPosLoc = gl.getAttribLocation(program, "vPosition");
    aColLoc = gl.getAttribLocation(program, "vColor");
    uMVLoc  = gl.getUniformLocation(program, "modelViewMatrix")!;
    uProjLoc = gl.getUniformLocation(program, "projectionMatrix")!;

    // GL state
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.06, 0.07, 0.1, 1.0);
    gl.enable(gl.DEPTH_TEST); // depth buffering per notes :contentReference[oaicite:5]{index=5}

    // Camera (slight perspective so the “3D-ness” reads)
    const aspect = canvas.clientWidth / canvas.clientHeight;
    projection = perspective(60.0, aspect, 0.1, 100.0);
    // Slightly above and back, looking at origin, Y-up
    view = lookAt(
        new vec4(0.0, 0.8, 2.2, 1.0),
        new vec4(0.0, 0.0, 0.0, 1.0),
        new vec4(0.0, 1.0, 0.0, 0.0)
    );

    // Scene
    ground = new Ground(gl, aPosLoc, aColLoc);
    car = new Car(gl, aPosLoc, aColLoc);

    // Input listeners (mutate state; draw in render) :contentReference[oaicite:6]{index=6}
    window.addEventListener("keydown", (e) => {
        if (e.key in keys) (keys as any)[e.key] = true;
        if (e.key === " ") car.stop(); // Space stops immediately
    });

    window.addEventListener("keyup", (e) => {
        if (e.key in keys) (keys as any)[e.key] = false;
    });

    // Kick off loop
    lastTime = performance.now();
    requestAnimationFrame(render);
}

function update(dt: number): void {
    // Steering: hold to accumulate steering angle (front wheels)
    const steerSpeed = toradians(60); // deg/sec converted to radians/sec
    if (keys.ArrowLeft)  car.adjustSteer(+steerSpeed * dt);
    if (keys.ArrowRight) car.adjustSteer(-steerSpeed * dt);
    if (!keys.ArrowLeft && !keys.ArrowRight) car.dampenSteer(dt);

    // Throttle / brake
    if (keys.ArrowUp)   car.accelerate(+1.0, dt);
    if (keys.ArrowDown) car.accelerate(-1.0, dt);
    if (!keys.ArrowUp && !keys.ArrowDown) car.applyFriction(dt);

    // Integrate motion, stop at boundary
    car.integrate(dt, () => isInsideBounds(car.nextAABB()));
}

function isInsideBounds(aabb: {minX:number,maxX:number,minZ:number,maxZ:number}): boolean {
    // Keep inside a square play area on XZ plane
    const limit = 0.9; // stay within (-0.9..0.9)
    return (
        aabb.minX >= -limit &&
        aabb.maxX <=  limit &&
        aabb.minZ >= -limit &&
        aabb.maxZ <=  limit
    );
}

function render(now: number): void {
    const dt = Math.min((now - lastTime) / 1000, 0.033); // clamp big frames
    lastTime = now;

    update(dt);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

// After
    gl.uniformMatrix4fv(uProjLoc, false, new Float32Array(projection.flatten()));

    const mv = view.mult(translate(0, 0, 0));
    gl.uniformMatrix4fv(uMVLoc, false, new Float32Array(mv.flatten()));

    const mvCar = view.mult(car.modelMatrix());
    gl.uniformMatrix4fv(uMVLoc, false, new Float32Array(mvCar.flatten()));

    car.draw(gl, (childMV) => {
        const mvChild = view.mult(childMV);
        gl.uniformMatrix4fv(uMVLoc, false, new Float32Array(mvChild.flatten()));
    });


    requestAnimationFrame(render);
}

