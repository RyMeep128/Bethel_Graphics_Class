import { RenderableObject } from "./RenderableObject.js";
import { vec4 } from "./helperfunctions.js";
import * as util from "./util.js";
import * as Color from "./Color.js";

/**
 * Renderable right circular cylinder with colored caps and sidewall.
 *
 * Geometry layout:
 * - Top cap: triangle fan (center + ring) → 3 * Detail vertices
 * - Bottom cap: triangle fan (center + ring) → 3 * Detail vertices
 * - Sidewall: two triangles per segment → 6 * Detail vertices
 *
 * Color model:
 * - Each section (top/bottom/middle) stores a per-vertex color array
 *   computed by {@link setTopColor}, {@link setBottomColor}, {@link setMiddleBitsColor}
 *   or their gradient variants.
 *
 * @extends RenderableObject
 */
export class Cylinder extends RenderableObject {
    /** Top cap vertices (triangle fan, length = 3 * Detail). */
    private topCircle: vec4[];

    /** Bottom cap vertices (triangle fan, length = 3 * Detail). */
    private bottomCircle: vec4[];

    /** Sidewall triangles (length = 6 * Detail). */
    private middleBits: vec4[];

    /** Per-vertex colors for the top cap. */
    private topCircleColor: vec4[];

    /** Per-vertex colors for the bottom cap. */
    private bottomCircleColor: vec4[];

    /** Per-vertex colors for the sidewall. */
    private middleBitsColor: vec4[];

    private topCircleNormal: vec4[] = [];
    private bottomCircleNormal: vec4[] =[];
    private middleBitsNormal: vec4[] = [];

    private topCircleTex: vec4[] = [];
    private bottomCircleTex: vec4[] = [];
    private middleBitsTex: vec4[] = [];

    private height:number;

    /** (Reserved) vertices per face; not currently used. */
    private vertexPerFace: number;
    private radius: number;

    /**
     * Constructs a cylinder centered at the origin in model space.
     *
     * @param gl - WebGL rendering context
     * @param program - Compiled & linked shader program
     * @param objectArr - Existing renderables (used to compute draw offset)
     * @param radius - Cylinder radius
     * @param height - Cylinder height (Y axis)
     * @param x - Initial world X translation (default: 0)
     * @param y - Initial world Y translation (default: 0)
     * @param z - Initial world Z translation (default: 0)
     * @param pitch - Initial pitch in degrees (default: 0)
     * @param yaw - Initial yaw in degrees (default: 0)
     * @param roll - Initial roll in degrees (default: 0)
     */
    constructor(
        gl: WebGLRenderingContext,
        program: WebGLProgram,
        objectArr: RenderableObject[],
        radius: number,
        height: number,
        x: number = 0,
        y: number = 0,
        z: number = 0,
        pitch: number = 0,
        yaw: number = 0,
        roll: number = 0
    ) {
        super(gl, program, objectArr, 3, x, y, z, yaw, pitch, roll);

        this.topCircle = [];
        this.bottomCircle = [];
        this.middleBits = [];
        this.height = height;
        this.radius = radius;

        const angle = (2 * Math.PI) / util.Detail;

        const hy = height / 2;
        const topCenter: vec4 = new vec4(0, hy, 0, 1);
        const bottomCenter: vec4 = new vec4(0, -hy, 0, 1);

        const topRing: vec4[] = [];
        const bottomRing: vec4[] = [];
        for (let i = 0; i < util.Detail; i++) {
            const theta = i * angle;
            const x = radius * Math.cos(theta);
            const z: number = radius * Math.sin(theta);

            topRing.push(new vec4(x, hy, z, 1));
            bottomRing.push(new vec4(x, -hy, z, 1));
        }

        // Close the rings
        topRing.push(topRing[0]);
        bottomRing.push(bottomRing[0]);

        // Build caps and sidewall
        // Build caps and sidewall
        for (let i = 0; i < util.Detail; i++) {
            const next = i + 1;

            const topA = topRing[i];
            const topB = topRing[next];
            const botA = bottomRing[i];
            const botB = bottomRing[next];

            // ---------- TOP FAN ----------
            // Triangle: (center, topA, topB)
            this.topCircle.push(topCenter);
            this.topCircleNormal.push(new vec4(0, 1, 0, 0));
            this.topCircleTex.push(new vec4(0.5, 0.5, 0, 0)); // center of texture

            this.topCircle.push(topA);
            this.topCircleNormal.push(new vec4(0, 1, 0, 0));
            {
                // tangent along circle at topA
                const nx = topA[0];
                const nz = topA[2];
                const len = Math.hypot(nx, nz) || 1;
                const rx = nx / len;
                const rz = nz / len;
            }
            this.topCircleTex.push(this.capUV(topA));

            this.topCircle.push(topB);
            this.topCircleNormal.push(new vec4(0, 1, 0, 0));
            {
                const nx = topB[0];
                const nz = topB[2];
                const len = Math.hypot(nx, nz) || 1;
                const rx = nx / len;
                const rz = nz / len;
            }
            this.topCircleTex.push(this.capUV(topB));

            this.vertexCount += 3;

            // Triangle: (center, botB, botA) (note winding)
            this.bottomCircle.push(bottomCenter);
            this.bottomCircleNormal.push(new vec4(0, -1, 0, 0));
            this.bottomCircleTex.push(new vec4(0.5, 0.5, 0, 0));

            this.bottomCircle.push(botB);
            this.bottomCircleNormal.push(new vec4(0, -1, 0, 0));
            this.bottomCircleTex.push(this.capUV(botB));

            this.bottomCircle.push(botA);
            this.bottomCircleNormal.push(new vec4(0, -1, 0, 0));
            this.bottomCircleTex.push(this.capUV(botA));

            this.vertexCount += 3;

            // We unwrap the cylinder: u along angle, v along height [0,1]
            const u0 = i / util.Detail;
            const u1 = (i + 1) / util.Detail;
            const vTop = 1.0;
            const vBot = 0.0;

            // Triangle 1: topA, botA, botB
            this.middleBits.push(topA);
            this.middleBitsTex.push(new vec4(u0, vTop, 0, 0));

            this.middleBits.push(botA);
            this.middleBitsTex.push(new vec4(u0, vBot, 0, 0));

            this.middleBits.push(botB);
            this.middleBitsTex.push(new vec4(u1, vBot, 0, 0));

            // Triangle 2: topA, botB, topB
            this.middleBits.push(topA);
            this.middleBitsTex.push(new vec4(u0, vTop, 0, 0));

            this.middleBits.push(botB);
            this.middleBitsTex.push(new vec4(u1, vBot, 0, 0));

            this.middleBits.push(topB);
            this.middleBitsTex.push(new vec4(u1, vTop, 0, 0));

            this.vertexCount += 6;
        }


        this.buildMiddleNormal();

    }

    private capUV(vx: vec4):vec4{
        const x = vx[0];
        const z = vx[2];
        const u = 0.5 + (x / (2 * this.radius));
        const v = 0.5 + (z / (2 * this.radius));
        return new vec4(u, v, 0, 0);
    };

    private buildMiddleNormal() {
        for (let i = 0; i < this.middleBits.length; i++) {
            const v = this.middleBits[i];
            const x = v[0];
            const z = v[2];

            const len = Math.hypot(x, z) || 1;
            const rx = x / len;
            const rz = z / len;

            // Radial outward normal
            const n = new vec4(rx, 0, rz, 0);
            this.middleBitsNormal.push(n);

        }
    }


    public getHeight():number{
        return this.height;
    }


    public override getObjectData(): vec4[] {
        const tempArr: vec4[] = [];

        tempArr.push(...this.loadingArrayHelper(this.topCircle,this.topCircleNormal,this.topCircleTex));
        tempArr.push(...this.loadingArrayHelper(this.bottomCircle,this.bottomCircleNormal,this.bottomCircleTex));
        tempArr.push(...this.loadingArrayHelper(this.middleBits,this.middleBitsNormal,this.middleBitsTex));

        return tempArr;
    }

}
