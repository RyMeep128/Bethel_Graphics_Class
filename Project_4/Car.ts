import { RenderableObject } from "./RenderableObject.js";
import { mat4, toradians, translate, vec4 } from "./helperfunctions.js";
import { Cube } from "./Cube.js";
import { Cylinder } from "./Cylinder.js";
import * as Color from "./Color.js";
import * as util from "./util.js";
import { Sphere } from "./Sphere.js";

/**
 * Renderable car composed of a body ({@link Cube}), four re-positioned wheel draws
 * from a single wheel geometry ({@link Cylinder}), and a simple "head" with an "eye"
 * (both {@link Sphere}) mounted on the front.
 *
 * Movement model:
 * - Forward/backward integrates along heading `yaw + wheelTheta`.
 * - Front wheels steer by `wheelTheta`; rear wheels remain aligned with the body (yaw only).
 * - Wheel spin uses cylinder pitch for a simple rolling animation.
 *
 * Drawing model:
 * - The body and wheel/head share a global vertex stream; `startDrawing` offsets are handled internally.
 * - A single wheel instance is translated/rotated for each corner before drawing.
 *
 * @class Car
 * @extends RenderableObject
 * @author Ryan Shafer
 * @author Some comments by ChatGPT Model 5
 */
export class Car extends RenderableObject {
    /** Car body geometry box. */
    private body: Cube;

    /** Wheel geometry (reused for all four corners). */
    private wheel: Cylinder;

    /** Spherical head mounted near the front. */
    private head: Sphere;

    /** Spherical eye placed relative to {@link head} using {@link eyeOffset}. */
    private eye: Sphere;

    /**
     * Local offset for the eye relative to the head transform.
     * Negative Z moves the eye forward if -Z is forward in your convention.
     */
    private eyeOffset = { x: 0, y: 0, z: -0.4 };

    /** Internal steering flags (not currently used for logic). */
    private turningRight: boolean = false;
    private turningLeft: boolean = false;

    /** Steering angle for front wheels (degrees). Positive = left, Negative = right. */
    private wheelTheta = 0;

    /**
     * Constructs a car at (x, y, z) with the given dimensions.
     *
     * @param {WebGLRenderingContext} gl - WebGL rendering context
     * @param {WebGLProgram} program - Compiled & linked shader program
     * @param {RenderableObject[]} objectArr - Existing renderables (to compute draw offset)
     * @param {number} width - Body width (X span)
     * @param {number} height - Body height (Y span)
     * @param {number} depth - Body depth (Z span)
     * @param {number} [x=0] - Initial world X
     * @param {number} [y=0] - Initial world Y
     * @param {number} [z=0] - Initial world Z
     * @param {number} [yaw=0] - Initial yaw in degrees
     * @param {number} [pitch=0] - Initial pitch in degrees
     * @param {number} [roll=0] - Initial roll in degrees
     */
    constructor(
        gl: WebGLRenderingContext,
        program: WebGLProgram,
        objectArr: RenderableObject[],
        width: number,
        height: number,
        depth: number,
        x: number = 0,
        y: number = 0,
        z: number = 0,
        yaw: number = 0,
        pitch: number = 0,
        roll: number = 0
    ) {
        super(gl, program, objectArr, -1, x, y, z, yaw, pitch, roll);

        const halfHeight: number = height / 2;

        // Body & wheel setup (wheel positioned/colored per draw-call)
        this.body = new Cube(gl, program, objectArr, width, halfHeight, depth);
        this.wheel = new Cylinder(gl, program, objectArr, halfHeight, height / 3);
        this.head = new Sphere(gl, program, objectArr, 0.5, 0, 0.5, -depth / 2);
        this.eye = new Sphere(gl, program, objectArr, 0.2);

        // Ensure wheel and head/eye draw after body in the shared stream
        this.wheel.addVerticesStartCount(this.body.getVertexCount());
        this.head.addVerticesStartCount(this.body.getVertexCount() + this.wheel.getVertexCount());
        this.eye.addVerticesStartCount(
            this.body.getVertexCount() + this.wheel.getVertexCount() + this.head.getVertexCount()
        );

        // Wheels roll about +X (use cylinder pitch), so orient their local axes first.
        this.wheel.addRoll(90);

        // Default paint job
        this.body.setColors(
            Color.DEEPPINK,
            Color.BLUE,
            Color.YELLOW,
            Color.RED,
            Color.LIGHTGREEN,
            Color.BROWN
        );
        this.wheel.setMiddleBitsColor(Color.SILVER);
        this.wheel.setTopColors(Color.RAINBOW32);
        this.wheel.setBottomColors(Color.RAINBOW32);
        this.head.setColor(Color.BLACK);
        // this.head.setGradientColor(Color.RAINBOW32);
        this.eye.setColor(Color.GHOSTWHITE);

        // Total vertex count (for consumers that need it)
        this.vertexCount =
            this.body.getVertexCount() +
            this.wheel.getVertexCount() +
            this.head.getVertexCount() +
            this.eye.getVertexCount();
    }

    /**
     * Updates the car's model-view from the parent and writes the uniform.
     * Delegates to {@link RenderableObject.update}.
     *
     * @param {mat4} [parent] - Parent model-view matrix.
     * @returns {mat4} The composed model-view matrix for the car body.
     */
    public override update(parent?: mat4): mat4 {
        return super.update(parent);
    }

    /**
     * Draws the car body, head/eye, and wheels with appropriate per-part transforms.
     *
     * Steps:
     * 1) Compute car model-view via {@link RenderableObject.update}.
     * 2) Draw body and head/eye with that transform.
     * 3) Reposition & draw the same wheel geometry at each corner:
     *    - Front wheels use {@link wheelTheta} for steering.
     *    - Rear wheels use 0 yaw offset (aligned with body).
     *
     * @param {mat4} camera - View matrix from the active camera.
     * @returns {void}
     */
    public updateAndDraw(camera: mat4): void {
        const carMV: mat4 = this.update(camera);

        // Body
        this.body.update(carMV);
        this.body.draw();

        // Head
        const headMV: mat4 = this.head.update(carMV);
        this.head.draw();

        // Eye (relative to head)
        const eyeMV: mat4 = headMV.mult(translate(this.eyeOffset.x, this.eyeOffset.y, this.eyeOffset.z));
        this.eye.update(eyeMV);
        this.eye.draw();

        // FRONT LEFT WHEEL
        this.wheel.setYaw(this.wheelTheta);
        this.wheel.setZ(this.body.getDepth() / -2);
        this.wheel.setX(this.body.getWidth() / -2);
        this.wheel.update(carMV);
        this.wheel.draw();

        // FRONT RIGHT WHEEL
        this.wheel.setYaw(this.wheelTheta);
        this.wheel.setZ(this.body.getDepth() / -2);
        this.wheel.setX(this.body.getWidth() / 2);
        this.wheel.update(carMV);
        this.wheel.draw();

        // BACK RIGHT WHEEL
        this.wheel.setYaw(0);
        this.wheel.setZ(this.body.getDepth() / 2);
        this.wheel.setX(this.body.getWidth() / 2);
        this.wheel.update(carMV);
        this.wheel.draw();

        // BACK LEFT WHEEL
        this.wheel.setYaw(0);
        this.wheel.setZ(this.body.getDepth() / 2);
        this.wheel.setX(this.body.getWidth() / -2);
        this.wheel.update(carMV);
        this.wheel.draw();
    }

    /**
     * Moves the car forward along heading `yaw + wheelTheta`,
     * spins wheels for a rolling effect, and yaws the body slightly to turn.
     * @returns {void}
     */
    public moveCarForward(): void {
        const phi = this.yaw + this.wheelTheta;
        this.addX(-util.Velocity * Math.sin(toradians(phi)));
        this.addZ(-util.Velocity * Math.cos(toradians(phi)));
        this.wheel.addPitch(-util.Rotation * 10);
        this.yaw = this.yaw + this.wheelTheta * 0.05;
    }

    /**
     * Moves the car backward along heading `yaw + wheelTheta`,
     * spins wheels, and yaws the body slightly (opposite sign).
     * @returns {void}
     */
    public moveCarBackward(): void {
        const phi = this.yaw + this.wheelTheta;
        this.addX(util.Velocity * Math.sin(toradians(phi)));
        this.addZ(util.Velocity * Math.cos(toradians(phi)));
        this.wheel.addPitch(util.Rotation * 10);
        this.yaw = this.yaw - this.wheelTheta * 0.05;
    }

    /**
     * Increases right turn (negative steering) up to {@link util.maxWheelTurn}.
     * @returns {void}
     */
    public turnRight(): void {
        this.wheelTheta += -util.Rotation;
        if (this.wheelTheta <= -util.maxWheelTurn) {
            this.wheelTheta = -util.maxWheelTurn;
        }
    }

    /**
     * Increases left turn (positive steering) up to {@link util.maxWheelTurn}.
     * @returns {void}
     */
    public turnLeft(): void {
        this.wheelTheta += util.Rotation;
        if (this.wheelTheta >= util.maxWheelTurn) {
            this.wheelTheta = util.maxWheelTurn;
        }
    }

    /** Stops left-turn input (flag only; not used elsewhere). */
    public stopTurningLeft(): void {
        this.turningLeft = false;
    }

    /** Stops right-turn input (flag only; not used elsewhere). */
    public stopTurningRight(): void {
        this.turningRight = false;
    }

    /**
     * Sets a uniform color on all body faces.
     * @param {vec4} color - RGBA color as {@link vec4}
     * @returns {void}
     */
    public setBodyColor(color: vec4): void {
        this.body.setAllColor(color);
    }

    /**
     * Sets wheel colors (top, bottom, sidewall).
     * @param {vec4} color - Base color applied to both caps; sidewall defaults to black
     * @returns {void}
     */
    public setWheelColor(color: vec4): void {
        this.wheel.setAllColor(color, color, Color.BLACK);
    }

    /**
     * Aggregates interleaved object data for the car's parts (body, wheels, head, eye).
     *
     * @returns {vec4[]} `[pos, color, ...]` vec4 stream combining body → wheel → head → eye
     */
    public getObjectData(): vec4[] {
        const objectPoints: vec4[] = [];
        objectPoints.push(...this.body.getObjectData());
        objectPoints.push(...this.wheel.getObjectData());
        objectPoints.push(...this.head.getObjectData());
        objectPoints.push(...this.eye.getObjectData());
        return objectPoints;
    }

    /** @returns {number} Body width in world units. */
    public getWidth(): number {
        return this.body.getWidth();
    }

    /** @returns {number} Body height in world units. */
    public getHeight(): number {
        return this.body.getHeight();
    }

    /** @returns {number} Body depth in world units. */
    public getDepth(): number {
        return this.body.getDepth();
    }

    /**
     * Rotates the head around Y (yaw) by {@code theta} degrees.
     * @param {number} theta - Delta yaw in degrees.
     * @returns {void}
     */
    public rotateHead(theta: number): void {
        this.head.addYaw(theta);
    }

    /** @returns {Sphere} Reference to the eye sphere (for external tweaks). */
    public getEye(): Sphere {
        return this.eye;
    }

    /** @returns {Sphere} Reference to the head sphere (for external tweaks). */
    public getHead(): Sphere {
        return this.head;
    }

    /**
     * Computes the eye's world-space position using the car→head→eye transforms.
     * @returns {vec4} World-space position `[x, y, z, 1]`.
     */
    public getEyeWorldPos(): vec4 {
        const carM = this.getModelMatrix();

        const headLocal = this.head.getModelMatrix();
        const headWorld = carM.mult(headLocal);

        const eyeM = headWorld.mult(translate(this.eyeOffset.x, this.eyeOffset.y, this.eyeOffset.z));

        const p = eyeM.mult(new vec4(0, 0, 0, 1));
        return p;
    }

    /**
     * Returns the car's origin in world space (the local [0,0,0,1] transformed by the model matrix).
     * @returns {vec4} World-space position `[x, y, z, 1]`.
     */
    public getWorldPos(): vec4 {
        const carM = this.getModelMatrix();
        const p = carM.mult(new vec4(0, 0, 0, 1));
        return p;
    }

    /**
     * Triggers an immediate hard-brake behavior.
     * @remarks Placeholder for future slide/drift effects.
     * @returns {void}
     */
    public applyHardBrake(): void {
        // Maybe put some cool slide in here?
    }
}
