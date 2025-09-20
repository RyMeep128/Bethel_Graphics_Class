import type { GL } from "./gl.js";
import { MatrixStack, I4, rotateZ, translate } from "./math.js";
import { Mesh } from "./mesh.js";
import { RenderObject, DrawContext, RectNode } from "./renderObject.js";
import { Wheel } from "./wheel.js";

/**
 * Car is a hierarchy:
 * - Car root (position + heading)
 *   - Body (colored faces: top, bottom, left, right, front/back stylized as 2D)
 *   - Wheel FL (steer + spin)
 *   - Wheel FR (steer + spin)
 *   - Wheel RL (spin only)
 *   - Wheel RR (spin only)
 */
export class Car extends RenderObject {
    // Kinematics
    public x = 0;
    public y = -0.35;
    public heading = 0;     // radians, 0 = facing +x
    public speed = 0;       // world units / second, sign indicates forward/backward
    public steer = 0;       // radians (front wheel steering), limited
    private maxSteer = Math.PI / 6;     // ~30 degrees
    private steerRate = Math.PI * 0.6;  // rad/s when holding left/right

    // Dimensions
    private bodyW = 0.42;
    private bodyH = 0.16;
    private axleOffsetX = 0.135;
    private axleOffsetY = 0.08;

    // Wheels
    private wFL: Wheel;
    private wFR: Wheel;
    private wRL: Wheel;
    private wRR: Wheel;

    // Body meshes (distinct colors per side so orientation is visible)
    private bodyBase: Mesh;
    private bodyTop: Mesh;
    private bodyFront: Mesh;
    private bodyRear: Mesh;
    private bodyLeft: Mesh;
    private bodyRight: Mesh;

    // Controls
    public input = {
        turnLeft: false,
        turnRight: false,
        driveFwd: false,
        driveBack: false
    };

    constructor(gl: GL) {
        super("car");

        // Colored rectangles as “sides” in 2D (no lighting yet)
        this.bodyBase  = Mesh.rect(gl, this.bodyW, this.bodyH, [0.85, 0.20, 0.25, 1]); // base
        this.bodyTop   = Mesh.rect(gl, this.bodyW*0.55, this.bodyH*0.65, [0.20, 0.65, 0.85, 1]);
        this.bodyFront = Mesh.rect(gl, 0.06, this.bodyH*0.82, [0.90, 0.80, 0.25, 1]); // "front face"
        this.bodyRear  = Mesh.rect(gl, 0.06, this.bodyH*0.82, [0.40, 0.90, 0.35, 1]); // "rear face"
        this.bodyLeft  = Mesh.rect(gl, this.bodyW, 0.02, [0.85, 0.55, 0.30, 1]);
        this.bodyRight = Mesh.rect(gl, this.bodyW, 0.02, [0.25, 0.80, 0.55, 1]);

        // Wheels
        const wheelR = 0.055;
        this.wFL = new Wheel(gl, wheelR);
        this.wFR = new Wheel(gl, wheelR);
        this.wRL = new Wheel(gl, wheelR);
        this.wRR = new Wheel(gl, wheelR);
    }

    update(dt: number) {
        // Steering integration
        if (this.input.turnLeft)  this.steer -= this.steerRate * dt;
        if (this.input.turnRight) this.steer += this.steerRate * dt;
        this.steer = Math.max(-this.maxSteer, Math.min(this.maxSteer, this.steer));

        // Acceleration model: instant “set” speed when key pressed (simple for this assignment)
        const targetSpeed = (this.input.driveFwd ? 0.45 : 0) + (this.input.driveBack ? -0.45 : 0);
        const accel = 2.4;
        this.speed += (targetSpeed - this.speed) * Math.min(1, accel * dt);

        // Effective heading changes with front-steer (simple bicycle model)
        const wheelBase = 0.24;
        const angularVel = (this.speed / wheelBase) * Math.tan(this.steer);
        this.heading += angularVel * dt;

        // Move forward in current heading
        this.x += Math.cos(this.heading) * this.speed * dt;
        this.y += Math.sin(this.heading) * this.speed * dt;

        // Wheel spin: angle = distance / radius
        const dist = Math.abs(this.speed * dt);
        const wheelR = this.wFL.radius;
        const dTheta = (dist / wheelR) * (this.speed >= 0 ? 1 : -1);
        const spinDelta = dTheta;

        // Only spin when moving
        if (Math.abs(this.speed) > 1e-4) {
            this.wFL.spinAngle += spinDelta;
            this.wFR.spinAngle += spinDelta;
            this.wRL.spinAngle += spinDelta;
            this.wRR.spinAngle += spinDelta;
        }

        // Front wheel steering visually
        this.wFL.steerAngle = this.steer;
        this.wFR.steerAngle = this.steer;
    }

    stop() {
        this.speed = 0;
    }

    /** axis-aligned boundary stop within given half extents */
    clampToStage(stageHalfW: number, stageHalfH: number) {
        // Car footprint radius approximation
        const r = Math.max(this.bodyW, this.bodyH) * 0.6;
        let hitEdge = false;

        if (this.x < -stageHalfW + r) { this.x = -stageHalfW + r; hitEdge = true; }
        if (this.x >  stageHalfW - r) { this.x =  stageHalfW - r; hitEdge = true; }
        if (this.y < -stageHalfH + r) { this.y = -stageHalfH + r; hitEdge = true; }
        if (this.y >  stageHalfH - r) { this.y =  stageHalfH - r; hitEdge = true; }

        if (hitEdge) this.stop();
    }

    drawSelf(ctx: DrawContext): void {
        const { gl, attribs, uniforms, stack } = ctx;

        // Root transform: position + heading
        stack.translate(this.x, this.y, 0);
        stack.rotateZ(this.heading);

        // BODY: base
        const drawMesh = (mesh: Mesh, s: (ms: MatrixStack)=>void) => {
            ctx.stack.push();
            s(ctx.stack);
            gl.uniformMatrix4fv(uniforms.modelViewMatrix, false, ctx.stack.top());
            mesh.bindAttributes(attribs.vPosition, attribs.vColor);
            mesh.draw();
            ctx.stack.pop();
        };

        drawMesh(this.bodyBase, ms => {}); // centered
        drawMesh(this.bodyTop, ms => ms.translate(0.02, 0.07, 0));
        drawMesh(this.bodyFront, ms => ms.translate(this.bodyW/2 + 0.03, 0, 0));
        drawMesh(this.bodyRear,  ms => ms.translate(-this.bodyW/2 - 0.03, 0, 0));
        drawMesh(this.bodyLeft,  ms => ms.translate(0, -this.bodyH/2 - 0.012, 0));
        drawMesh(this.bodyRight, ms => ms.translate(0,  this.bodyH/2 + 0.012, 0));

        // WHEELS: positions relative to body
        const placeWheel = (w: Wheel, x: number, y: number) => {
            ctx.stack.push();
            ctx.stack.translate(x, y, 0);
            gl.uniformMatrix4fv(uniforms.modelViewMatrix, false, ctx.stack.top());
            w.draw(ctx);
            ctx.stack.pop();
        };

        // Front axle (steering)
        placeWheel(this.wFL,  this.axleOffsetX,  this.axleOffsetY);
        placeWheel(this.wFR,  this.axleOffsetX, -this.axleOffsetY);

        // Rear axle
        placeWheel(this.wRL, -this.axleOffsetX,  this.axleOffsetY);
        placeWheel(this.wRR, -this.axleOffsetX, -this.axleOffsetY);
    }
}
