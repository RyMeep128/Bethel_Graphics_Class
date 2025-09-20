import {
    mat4, vec4,
    translate, rotateY, rotateX, scalem, toradians
} from "./helperfunctions.js";

/** Simple cube geometry (8 vertices expanded into 12 triangles = 36 verts) with per-face colors */
function makeColoredCube(): { positions: Float32Array, colors: Float32Array } {
    // Unit cube centered at origin (scale in transforms)
    const verts = [
        // Front (z+)
        [-1,-1, 1], [ 1,-1, 1], [ 1, 1, 1],
        [-1,-1, 1], [ 1, 1, 1], [-1, 1, 1],
        // Back (z-)
        [ 1,-1,-1], [-1,-1,-1], [-1, 1,-1],
        [ 1,-1,-1], [-1, 1,-1], [ 1, 1,-1],
        // Left (x-)
        [-1,-1,-1], [-1,-1, 1], [-1, 1, 1],
        [-1,-1,-1], [-1, 1, 1], [-1, 1,-1],
        // Right (x+)
        [ 1,-1, 1], [ 1,-1,-1], [ 1, 1,-1],
        [ 1,-1, 1], [ 1, 1,-1], [ 1, 1, 1],
        // Top (y+)
        [-1, 1, 1], [ 1, 1, 1], [ 1, 1,-1],
        [-1, 1, 1], [ 1, 1,-1], [-1, 1,-1],
        // Bottom (y-)
        [-1,-1,-1], [ 1,-1,-1], [ 1,-1, 1],
        [-1,-1,-1], [ 1,-1, 1], [-1,-1, 1],
    ];
    // Distinct face colors so orientation is obvious (requirement)
    const faceCols = [
        [0.80,0.15,0.15,1], [0.80,0.15,0.15,1], // front
        [0.15,0.80,0.15,1], [0.15,0.80,0.15,1], // back
        [0.15,0.15,0.85,1], [0.15,0.15,0.85,1], // left
        [0.85,0.75,0.15,1], [0.85,0.75,0.15,1], // right
        [0.85,0.35,0.85,1], [0.85,0.35,0.85,1], // top
        [0.25,0.85,0.85,1], [0.25,0.85,0.85,1], // bottom
    ];
    const positions: number[] = [];
    const colors: number[] = [];
    for (let f = 0; f < 6; f++) {
        const col = faceCols[f];
        for (let i = 0; i < 6; i++) {
            const v = verts[f*6 + i];
            positions.push(v[0], v[1], v[2], 1);
            colors.push(col[0], col[1], col[2], col[3]);
        }
    }
    return { positions: new Float32Array(positions), colors: new Float32Array(colors) };
}

/** Disc (triangle fan) with alternating spoke colors so rotation direction is visible */
function makeWheelDisc(segments = 24): { positions: Float32Array, colors: Float32Array, count: number } {
    const pos: number[] = [];
    const col: number[] = [];
    // Center
    pos.push(0,0,0,1); col.push(0.1,0.1,0.1,1);
    for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const x = 0;
        const y = Math.cos(t);
        const z = Math.sin(t);
        pos.push(x, y, z, 1);
        // Alternate color every wedge
        const alt = i % 2 === 0 ? [0.9,0.9,0.95,1] : [0.2,0.2,0.25,1];
        col.push(...alt);
    }
    return { positions: new Float32Array(pos), colors: new Float32Array(col), count: segments + 2 };
}

/** Thin rim (side band) as triangle strip so the wheel reads as a cylinder */
function makeWheelBand(segments = 24, halfWidth = 0.06): { positions: Float32Array, colors: Float32Array, count: number } {
    const pos: number[] = [];
    const col: number[] = [];
    for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const y = Math.cos(t);
        const z = Math.sin(t);
        // two points per step: front/back of band (X is axial for our wheels)
        pos.push(+halfWidth, y, z, 1);
        pos.push(-halfWidth, y, z, 1);
        // dark rubber color
        col.push(0.05,0.05,0.06,1,  0.05,0.05,0.06,1);
    }
    return { positions: new Float32Array(pos), colors: new Float32Array(col), count: (segments + 1) * 2 };
}

class Mesh {
    vao: WebGLVertexArrayObject;
    count: number;
    constructor(gl: WebGL2RenderingContext, aPosLoc: number, aColLoc: number, positions: Float32Array, colors: Float32Array) {
        this.count = positions.length / 4;
        const vboPos = gl.createBuffer()!;
        const vboCol = gl.createBuffer()!;
        this.vao = gl.createVertexArray()!;
        gl.bindVertexArray(this.vao);

        gl.bindBuffer(gl.ARRAY_BUFFER, vboPos);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(aPosLoc);
        gl.vertexAttribPointer(aPosLoc, 4, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, vboCol);
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(aColLoc);
        gl.vertexAttribPointer(aColLoc, 4, gl.FLOAT, false, 0, 0);

        gl.bindVertexArray(null);
    }
    draw(gl: WebGL2RenderingContext, mode: number = gl.TRIANGLES): void {
        gl.bindVertexArray(this.vao);
        gl.drawArrays(mode, 0, this.count);
        gl.bindVertexArray(null);
    }
}

class Wheel {
    /** Local transform relative to car body anchor */
    anchor: mat4 = new mat4();
    /** Steering (Y) and rolling (X) angles */
    steerAngle = 0; // radians, applied to FRONT wheels only
    rollAngle = 0;  // radians, spin around X when moving

    // Geometry
    discFront: Mesh;
    discBack: Mesh;
    band: Mesh;

    // Dimensions for kinematics
    radius = 0.12;
    halfWidth = 0.06;

    constructor(gl: WebGL2RenderingContext, aPosLoc: number, aColLoc: number) {
        const disc = makeWheelDisc(28);
        const band = makeWheelBand(28, this.halfWidth);
        this.discFront = new Mesh(gl, aPosLoc, aColLoc, disc.positions, disc.colors);
        this.discBack  = new Mesh(gl, aPosLoc, aColLoc, disc.positions, disc.colors);
        this.band      = new Mesh(gl, aPosLoc, aColLoc, band.positions, band.colors);
    }

    model(anchorParent: mat4, steeringApplies: boolean): mat4[] {
        // Base at anchor, apply steering (Y) then roll (X), then scale radius
        const steer = steeringApplies ? rotateY(this.steerAngle) : new mat4(); // identity if no steer
        const roll  = rotateX(this.rollAngle);
        const local = this.anchor.mult(steer).mult(roll).mult(scalem(this.halfWidth, this.radius, this.radius));
        const base  = anchorParent.mult(local);
        // Discs are placed at ±1 on X in disc model space
        const mFront = base.mult(translate(+1,0,0)); // outward cap
        const mBack  = base.mult(translate(-1,0,0)); // inward cap
        return [mFront, mBack, base]; // return transforms to draw
    }
}

/** Car with a cube body and four wheels */
export class Car {
    private body: Mesh;
    private wheelFL: Wheel; // front-left  (x-, z-)
    private wheelFR: Wheel; // front-right (x+, z-)
    private wheelBL: Wheel; // back-left   (x-, z+)
    private wheelBR: Wheel; // back-right  (x+, z+)

    // Body dimensions (model space before scaling)
    private bodyDims = { x: 0.5, y: 0.18, z: 0.8 };
    private wheelBaseZ = 0.36;
    private halfTrackX = 0.28;

    // Kinematic state
    private position = { x: 0, z: 0 };         // on ground plane (y=0)
    private heading = 0;                        // radians, 0 = facing -Z
    private speed = 0;                          // world units / sec
    private maxSpeed = 1.1;
    private accelRate = 1.6;                    // units/sec^2
    private brakeRate = 1.8;
    private friction = 1.2;                     // passive slow down
    private maxSteer = toradians(30);
    private steerReturn = toradians(70);          // how fast steering recenters

    // Cached wheel radius for spin
    private readonly wheelRadius: number;

    constructor(gl: WebGL2RenderingContext, aPosLoc: number, aColLoc: number) {
        const cube = makeColoredCube();
        this.body = new Mesh(gl, aPosLoc, aColLoc, cube.positions, cube.colors);

        this.wheelFL = new Wheel(gl, aPosLoc, aColLoc);
        this.wheelFR = new Wheel(gl, aPosLoc, aColLoc);
        this.wheelBL = new Wheel(gl, aPosLoc, aColLoc);
        this.wheelBR = new Wheel(gl, aPosLoc, aColLoc);

        // Place wheel anchors relative to body origin
        this.wheelFL.anchor = translate(-this.halfTrackX, -this.bodyDims.y*0.6, -this.wheelBaseZ);
        this.wheelFR.anchor = translate(+this.halfTrackX, -this.bodyDims.y*0.6, -this.wheelBaseZ);
        this.wheelBL.anchor = translate(-this.halfTrackX, -this.bodyDims.y*0.6, +this.wheelBaseZ);
        this.wheelBR.anchor = translate(+this.halfTrackX, -this.bodyDims.y*0.6, +this.wheelBaseZ);

        this.wheelRadius = this.wheelFL.radius;
    }

    /** External controls */
    stop(): void { this.speed = 0; }
    adjustSteer(delta: number): void {
        // Apply to front wheels (equal and opposite sign is NOT needed here; both turn same direction)
        this.wheelFL.steerAngle = clamp(this.wheelFL.steerAngle + delta, -this.maxSteer, this.maxSteer);
        this.wheelFR.steerAngle = clamp(this.wheelFR.steerAngle + delta, -this.maxSteer, this.maxSteer);
    }
    dampenSteer(dt: number): void {
        // return-to-center when no key held
        const s = this.steerReturn * dt;
        this.wheelFL.steerAngle = approachZero(this.wheelFL.steerAngle, s);
        this.wheelFR.steerAngle = approachZero(this.wheelFR.steerAngle, s);
    }
    accelerate(dir: number, dt: number): void {
        // dir = +1 forward, -1 backward (forward means toward -Z in heading frame)
        const a = (dir > 0 ? this.accelRate : this.brakeRate) * dir;
        this.speed = clamp(this.speed + a * dt, -this.maxSpeed, this.maxSpeed);
    }
    applyFriction(dt: number): void {
        const f = this.friction * dt;
        this.speed = approachZero(this.speed, f);
    }

    /** Physics step + boundary handling */
    integrate(dt: number, inside: () => boolean): void {
        // Heading changes proportionally to front wheel steer and speed (“bicycle model” lite)
        const steer = (this.wheelFL.steerAngle + this.wheelFR.steerAngle) * 0.5;
        const turnGain = 1.3; // tweakable responsiveness
        this.heading += turnGain * steer * this.speed * dt;

        // Forward is car's -Z in local space; convert to world
        const dirX = Math.sin(this.heading) * -1.0;
        const dirZ = Math.cos(this.heading) * -1.0;

        // Integrate position
        const nextX = this.position.x + dirX * this.speed * dt;
        const nextZ = this.position.z + dirZ * this.speed * dt;

        // Predict AABB at next position; stop if outside
        const aabbNext = this.computeAABB(nextX, nextZ);
        // Delegate boundary decision
        if (!inside() || !this.insideAABB(aabbNext)) {
            this.speed = 0;
            return;
        }
        this.position.x = nextX;
        this.position.z = nextZ;

        // Wheel rolling angle from distance traveled: theta = s / r (radians)
        const signedDistance = this.speed * dt;
        const dTheta = signedDistance / this.wheelRadius;
        this.wheelFL.rollAngle += dTheta;
        this.wheelFR.rollAngle += dTheta;
        this.wheelBL.rollAngle += dTheta;
        this.wheelBR.rollAngle += dTheta;
    }

    /** World AABB of body footprint for simple bounds check */
    private computeAABB(px: number, pz: number) {
        // Approximate as a square aligned with world axes (coarse but sufficient for “stop at edge”)
        const halfW = this.bodyDims.x * 0.7;
        const halfL = this.bodyDims.z * 0.7;
        return {
            minX: px - halfW, maxX: px + halfW,
            minZ: pz - halfL, maxZ: pz + halfL
        };
    }
    private insideAABB(a:{minX:number,maxX:number,minZ:number,maxZ:number}) { return true; } // external closure decides bounds

    nextAABB() { return this.computeAABB(this.position.x, this.position.z); }

    /** Model matrix for the car body (placed slightly above ground) */
    modelMatrix(): mat4 {
        const yLift = this.bodyDims.y * 0.6;
        return translate(this.position.x, yLift, this.position.z)
            .mult(rotateY(this.heading))
            .mult(scalem(this.bodyDims.x, this.bodyDims.y, this.bodyDims.z));
    }

    /** Draw the car. childSetter is called with each sub-part’s model matrix in WORLD space. */
    draw(gl: WebGL2RenderingContext, childSetter: (mv: mat4) => void): void {
        // Body is already drawn by caller using modelMatrix()

        // Wheels — front steer + roll; back roll only
        const bodyWorld = this.modelMatrix();

        this.drawWheel(gl, this.wheelFL, bodyWorld, true, childSetter);
        this.drawWheel(gl, this.wheelFR, bodyWorld, true, childSetter);
        this.drawWheel(gl, this.wheelBL, bodyWorld, false, childSetter);
        this.drawWheel(gl, this.wheelBR, bodyWorld, false, childSetter);
    }

    private drawWheel(gl: WebGL2RenderingContext, w: Wheel, carWorld: mat4, steering: boolean, setMV: (m:mat4)=>void) {
        const [mFront, mBack, mBand] = w.model(carWorld, steering);
        // Discs (triangle fan)
        setMV(mFront); w.discFront.draw(gl, gl.TRIANGLE_FAN);
        setMV(mBack);  w.discBack.draw(gl,  gl.TRIANGLE_FAN);
        // Band (strip)
        setMV(mBand);  w.band.draw(gl, gl.TRIANGLE_STRIP);
    }
}

/** Helpers */
function clamp(x: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, x)); }
function approachZero(x: number, delta: number) {
    if (x > 0) return Math.max(0, x - delta);
    if (x < 0) return Math.min(0, x + delta);
    return 0;
}
