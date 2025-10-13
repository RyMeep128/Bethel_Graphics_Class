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

    /** (Reserved) vertices per face; not currently used. */
    private vertexPerFace: number;

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
        for (let i = 0; i < util.Detail; i++) {
            // Top fan
            this.topCircle.push(topCenter);
            this.topCircleNormal.push(new vec4(0, 1, 0, 0))
            this.topCircle.push(topRing[i]);
            this.topCircleNormal.push(new vec4(0, 1, 0, 0))
            this.topCircle.push(topRing[i + 1]);
            this.topCircleNormal.push(new vec4(0, 1, 0, 0))
            this.vertexCount += 3;

            // Bottom fan (winding to face outward)
            this.bottomCircle.push(bottomCenter);
            this.bottomCircleNormal.push(new vec4(0, -1, 0, 0))
            this.bottomCircle.push(bottomRing[i + 1]);
            this.bottomCircleNormal.push(new vec4(0, -1, 0, 0))
            this.bottomCircle.push(bottomRing[i]);
            this.bottomCircleNormal.push(new vec4(0, -1, 0, 0))
            this.vertexCount += 3;

            // Sidewall (two triangles per segment)
            this.middleBits.push(topRing[i]);
            this.middleBits.push(bottomRing[i]);
            this.middleBits.push(bottomRing[i + 1]);
            this.middleBits.push(topRing[i]);
            this.middleBits.push(bottomRing[i + 1]);
            this.middleBits.push(topRing[i + 1]);
            this.vertexCount += 6;
        }

        this.buildMiddleNormal();

        this.setAllColor(Color.PURPLE,Color.BLACK,Color.PURPLE);
    }

    private buildMiddleNormal(){
        for (let i = 0; i < this.middleBits.length; i++) {
            this.middleBitsNormal.push((new vec4(this.middleBits[i][0],0,this.middleBits[i][2])).normalize());
        }
    }


    /**
     * Sets a solid color for the top cap (per-vertex expansion).
     * @param color - RGBA vec4 in [0, 1]
     */
    public setTopColor(color: vec4): void {
        this.topCircleColor = this.helperColor(color, this.topCircle);
    }

    /**
     * Sets a solid color for the bottom cap (per-vertex expansion).
     * @param color - RGBA vec4 in [0, 1]
     */
    public setBottomColor(color: vec4): void {
        this.bottomCircleColor = this.helperColor(color, this.bottomCircle);
    }

    /**
     * Sets a solid color for the sidewall (per-vertex expansion).
     * @param color - RGBA vec4 in [0, 1]
     */
    public setMiddleBitsColor(color: vec4): void {
        this.middleBitsColor = this.helperColor(color, this.middleBits);
    }

    /**
     * Sets a repeating gradient across the sidewall vertices.
     * @param colors - Palette cycled across side vertices
     */
    public setMiddleBitsColors(colors: vec4[]): void {
        this.middleBitsColor = this.helperGradientColor(colors, this.middleBits);
    }

    /**
     * Sets a repeating gradient across the top cap vertices.
     * @param colors - Palette cycled across top vertices
     */
    public setTopColors(colors: vec4[]): void {
        this.topCircleColor = this.helperGradientColor(colors, this.topCircle);
    }

    /**
     * Sets a repeating gradient across the bottom cap vertices.
     * @param colors - Palette cycled across bottom vertices
     */
    public setBottomColors(colors: vec4[]): void {
        this.bottomCircleColor = this.helperGradientColor(colors, this.bottomCircle);
    }

    /**
     * Convenience: sets solid colors for top, bottom, and sidewall.
     * @param topColor - Color for top cap
     * @param bottomColor - Color for bottom cap
     * @param middleBitsColor - Color for sidewall
     */
    public setAllColor(topColor: vec4, bottomColor: vec4, middleBitsColor: vec4): void {
        this.setTopColor(topColor);
        this.setBottomColor(bottomColor);
        this.setMiddleBitsColor(middleBitsColor);
    }

    /**
     * Builds the interleaved vertex stream:
     * `[pos, color, pos, color, ...]` for top, bottom, and sidewall, in that order.
     *
     * @override
     * @returns Flat {@link vec4} array suitable for buffer uploads
     */
    public override getObjectData(): vec4[] {
        const tempArr: vec4[] = [];

        tempArr.push(...this.loadingArrayHelper(this.topCircle, this.topCircleColor,this.topCircleNormal));
        tempArr.push(...this.loadingArrayHelper(this.bottomCircle, this.bottomCircleColor,this.bottomCircleNormal));
        tempArr.push(...this.loadingArrayHelper(this.middleBits, this.middleBitsColor,this.middleBitsNormal));

        return tempArr;
    }
}
