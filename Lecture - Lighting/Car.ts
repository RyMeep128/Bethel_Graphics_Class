import { RenderableObject } from "./RenderableObject.js";
import { lookAt, mat4, rotateX, rotateY, rotateZ, toradians, translate, vec4 } from "./helperfunctions.js";
import { Cube } from "./Cube.js";
import { Cylinder } from "./Cylinder.js";
import * as Color from "./Color.js";
import * as util from "./util.js";
import {Sphere} from "./Sphere.js";

/**
 * Renderable car composed of a body ({@link Cube}) and a single wheel geometry ({@link Cylinder})
 * that is repositioned and drawn four times (front-left, front-right, back-right, back-left).
 *
 * Movement model:
 * - Forward/backward integrates along heading `yaw + wheelTheta`.
 * - Front wheels steer by `wheelTheta`; rear wheels remain aligned with the body (yaw only).
 * - Wheel spin uses cylinder pitch for a simple rolling animation.
 *
 * Drawing model:
 * - The body and wheel share a global vertex stream; `startDrawing` offsets are handled internally.
 * - A single wheel instance is translated/rotated for each corner before drawing.
 *
 * @extends RenderableObject
 */
export class Car extends RenderableObject {
    /** Car body geometry. */
    private body: Cube;
    /** Wheel geometry (reused for all four corners). */
    private wheel: Cylinder;

    private head:Sphere;

    private eye:Sphere;
    private eyeOffset = { x: 0, y: 0, z: -0.4 };


    /** Internal steering flags (not currently used for logic). */
    private turningRight: boolean = false;
    private turningLeft: boolean = false;

    /**
     * Constructs a car at (x, y, z) with the given dimensions.
     *
     * @param gl - WebGL rendering context
     * @param program - Compiled & linked shader program
     * @param objectArr - Existing renderables (to compute draw offset)
     * @param width - Body width (X span)
     * @param height - Body height (Y span)
     * @param depth - Body depth (Z span)
     * @param x - Initial world X (default 0)
     * @param y - Initial world Y (default 0)
     * @param z - Initial world Z (default 0)
     * @param yaw - Initial yaw in degrees (default 0)
     * @param pitch - Initial pitch in degrees (default 0)
     * @param roll - Initial roll in degrees (default 0)
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
        this.head = new Sphere(gl,program,objectArr,.5,0,.5,-depth/2);
        this.eye = new Sphere(gl,program,objectArr,.2)


        // Ensure wheel draws after body in the shared stream
        this.wheel.addVerticesStartCount(this.body.getVertexCount());

        this.head.addVerticesStartCount(this.body.getVertexCount()+this.wheel.getVertexCount());
        this.eye.addVerticesStartCount(this.body.getVertexCount() + this.wheel.getVertexCount() + this.head.getVertexCount());


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
        this.eye.setColor(Color.GHOSTWHITE);

        this.vertexCount = this.body.getVertexCount() + this.wheel.getVertexCount() + this.head.getVertexCount() + this.eye.getVertexCount();
    }

    /**
     * Overridden update hook (no-op for {@link Car}).
     *
     * @remarks
     * This class performs per-part updates inside {@link draw} to ensure
     * correct sequencing with reused wheel transforms.
     *
     * @override
     * @param parent - Optional parent model-view (ignored)
     * @returns `null` (by design)
     */
    public override update(parent?: mat4): mat4 {
        return super.update(parent);
    }

    /** Internal steering angle for front wheels (degrees). */
    private wheelTheta = 0;

    /**
     * Draws the car body and wheels.
     *
     * Steps:
     * 1) Compute car model-view via {@link RenderableObject.update}.
     * 2) Draw body with that transform.
     * 3) Reposition & draw the same wheel geometry at each corner:
     *    - Front wheels use {@link wheelTheta} for steering.
     *    - Rear wheels use 0 yaw offset (aligned with body).
     *
     * @override
     */
    public updateAndDraw(camera:mat4): void {
        const carMV: mat4 = this.update(camera);

        // Body
        this.body.update(carMV);
        this.body.draw();

        let headMV:mat4 = this.head.update(carMV);
        this.head.draw();

        const eyeMV:mat4 =headMV.mult(translate(this.eyeOffset.x, this.eyeOffset.y, this.eyeOffset.z));
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
     */
    public turnRight(): void {
        this.wheelTheta += -util.Rotation;
        if (this.wheelTheta <= -util.maxWheelTurn) {
            this.wheelTheta = -util.maxWheelTurn;
        }
    }

    /**
     * Increases left turn (positive steering) up to {@link util.maxWheelTurn}.
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
     * @param color - RGBA color as {@link vec4}
     */
    public setBodyColor(color: vec4): void {
        this.body.setAllColor(color);
    }

    /**
     * Sets wheel colors (top, bottom, sidewall).
     * @param color - Base color applied to both caps; sidewall defaults to black
     */
    public setWheelColor(color: vec4): void {
        this.wheel.setAllColor(color, color, Color.BLACK);
    }

    /**
     * Aggregates interleaved object data for body and wheel.
     *
     * @returns `[pos, color, ...]` vec4 stream combining body then wheel
     */
    public getObjectData(): vec4[] {
        const objectPoints: vec4[] = [];
        objectPoints.push(...this.body.getObjectData());
        objectPoints.push(...this.wheel.getObjectData());
        objectPoints.push(...this.head.getObjectData());
        objectPoints.push(...this.eye.getObjectData());
        return objectPoints;
    }

    public getWidth():number{
        return this.body.getWidth();
    }

    public getHeight():number{
        return this.body.getHeight();
    }

    public getDepth():number{
        return this.body.getDepth();
    }

    public rotateHead(theta:number){
        this.head.addYaw(theta);
    }

    public getEye():Sphere{
        return this.eye;
    }

    public getHead():Sphere{
        return this.head;
    }

    public getEyeWorldPos(): vec4 {
        const carM = this.getModelMatrix();

        const headLocal = this.head.getModelMatrix();
        const headWorld = carM.mult(headLocal);

        const eyeM = headWorld.mult(translate(this.eyeOffset.x, this.eyeOffset.y, this.eyeOffset.z));

        const p = eyeM.mult(new vec4(0, 0, 0, 1));
        return p;
    }


    /**
     * Triggers an immediate hard-brake behavior.
     * @remarks Placeholder for future slide/drift effects.
     */
    public applyHardBrake(): void {
        // Maybe put some cool slide in here?
    }
}
