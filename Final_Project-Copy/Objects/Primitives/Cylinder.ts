import { RenderableObject } from "./Base/RenderableObject.js";
import { vec4 } from "../../Utility/helperfunctions.js";
import * as util from "../../Utility/util.js";
import * as Color from "../../Utility/Color.js";

/**
 * Renderable right circular cylinder with textured caps and sidewall.
 *
 * Geometry layout (all triangles):
 * - Top cap: triangle fan (center + ring) → `3 * Detail` vertices.
 * - Bottom cap: triangle fan (center + ring) → `3 * Detail` vertices.
 * - Sidewall: two triangles per segment → `6 * Detail` vertices.
 *
 * Attribute layout per vertex (for {@link getObjectData}):
 * - Position: `vec4` (x, y, z, 1)
 * - Normal:   `vec4` (nx, ny, nz, 0)
 * - TexCoord: `vec4` (u, v, 0, 0) – shader uses `.x`, `.y`.
 *
 * @extends RenderableObject
 */
export class Cylinder extends RenderableObject {
    /** Top cap vertices (triangle fan, length = `3 * Detail`). */
    private topCircle: vec4[];

    /** Bottom cap vertices (triangle fan, length = `3 * Detail`). */
    private bottomCircle: vec4[];

    /** Sidewall triangles (length = `6 * Detail`). */
    private middleBits: vec4[];

    /**
     * Per-vertex colors for the top cap.
     * @remarks Reserved from earlier color-based pipeline; not currently used.
     */
    private topCircleColor: vec4[];

    /**
     * Per-vertex colors for the bottom cap.
     * @remarks Reserved from earlier color-based pipeline; not currently used.
     */
    private bottomCircleColor: vec4[];

    /**
     * Per-vertex colors for the sidewall.
     * @remarks Reserved from earlier color-based pipeline; not currently used.
     */
    private middleBitsColor: vec4[];

    /** Normals for the top cap (pointing +Y). */
    private topCircleNormal: vec4[] = [];
    /** Normals for the bottom cap (pointing -Y). */
    private bottomCircleNormal: vec4[] = [];
    /** Normals for the sidewall (radial, outward). */
    private middleBitsNormal: vec4[] = [];

    /** UVs for the top cap (circular mapping). */
    private topCircleTex: vec4[] = [];
    /** UVs for the bottom cap (circular mapping). */
    private bottomCircleTex: vec4[] = [];
    /** UVs for the sidewall (unwrapped cylindrical mapping). */
    private middleBitsTex: vec4[] = [];

    /** Cylinder height along the Y axis. */
    private height: number;

    /** (Reserved) vertices per face; not currently used. */
    private vertexPerFace: number;

    /** Cylinder radius in model/world units. */
    private radius: number;

    /**
     * Constructs a cylinder centered at the origin in model space.
     *
     * @param {WebGL2RenderingContext} gl - WebGL2 rendering context.
     * @param {WebGLProgram} program - Compiled & linked shader program.
     * @param {RenderableObject[]} objectArr - Existing renderables (used to compute draw offset).
     * @param {number} radius - Cylinder radius.
     * @param {number} height - Cylinder height along the Y axis.
     * @param {number} [x=0] - Initial world X translation.
     * @param {number} [y=0] - Initial world Y translation.
     * @param {number} [z=0] - Initial world Z translation.
     * @param {number} [pitch=0] - Initial pitch in degrees.
     * @param {number} [yaw=0] - Initial yaw in degrees.
     * @param {number} [roll=0] - Initial roll in degrees.
     */
    constructor(
        gl: WebGL2RenderingContext,
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
        // `sides = 3` here: top, bottom, and sidewall.
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

        // Generate ring vertices on top and bottom circles.
        for (let i = 0; i < util.Detail; i++) {
            const theta = i * angle;
            const x = radius * Math.cos(theta);
            const z: number = radius * Math.sin(theta);

            topRing.push(new vec4(x, hy, z, 1));
            bottomRing.push(new vec4(x, -hy, z, 1));
        }

        // Close the rings by repeating the first vertex.
        topRing.push(topRing[0]);
        bottomRing.push(bottomRing[0]);

        // Build caps and sidewall.
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
            this.topCircleTex.push(this.capUV(topA));

            this.topCircle.push(topB);
            this.topCircleNormal.push(new vec4(0, 1, 0, 0));
            this.topCircleTex.push(this.capUV(topB));

            this.vertexCount += 3;

            // ---------- BOTTOM FAN ----------
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

            // ---------- SIDEWALL ----------
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

    /**
     * Computes UV coordinates for a cap vertex.
     *
     * Maps the circular top/bottom into a [0,1]x[0,1] square:
     * - Center of the cap → (0.5, 0.5)
     * - Rim points scaled by radius into the unit square.
     *
     * @param {vec4} vx - Vertex on the top or bottom ring.
     * @returns {vec4} UV as `(u, v, 0, 0)`.
     * @private
     */
    private capUV(vx: vec4): vec4 {
        const x = vx[0];
        const z = vx[2];
        const u = 0.5 + (x / (2 * this.radius));
        const v = 0.5 + (z / (2 * this.radius));
        return new vec4(u, v, 0, 0);
    }

    /**
     * Builds per-vertex normals for the sidewall triangles.
     *
     * For each vertex in {@link middleBits}, computes a radial outward
     * normal in the XZ-plane:
     * - `(x, 0, z)` normalized, with `w = 0`.
     *
     * @returns {void}
     * @private
     */
    private buildMiddleNormal(): void {
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

    /**
     * Returns the cylinder's height along the Y axis.
     *
     * @returns {number} Cylinder height.
     */
    public getHeight(): number {
        return this.height;
    }

    /**
     * Supplies interleaved vertex data for rendering.
     *
     * Layout per-vertex:
     *   [ position(vec4), normal(vec4), texCoord(vec4) ]
     *
     * Sections are appended in the order:
     *   top cap, bottom cap, sidewall.
     *
     * @override
     * @returns {vec4[]} Interleaved
     *   `[pos0, n0, uv0, pos1, n1, uv1, ...]` for the entire cylinder.
     */
    public override getObjectData(): vec4[] {
        const tempArr: vec4[] = [];

        tempArr.push(...this.loadingArrayHelper(this.topCircle,    this.topCircleNormal,    this.topCircleTex));
        tempArr.push(...this.loadingArrayHelper(this.bottomCircle, this.bottomCircleNormal, this.bottomCircleTex));
        tempArr.push(...this.loadingArrayHelper(this.middleBits,   this.middleBitsNormal,   this.middleBitsTex));

        return tempArr;
    }

}
