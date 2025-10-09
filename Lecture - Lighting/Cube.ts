import { flatten, lookAt, mat4, rotateY, translate, vec4 } from "./helperfunctions.js";
import { RenderableObject } from "./RenderableObject.js";
import * as Color from "./Color.js";

/**
 * Renderable, transformable cube with per-face colors and interleaved position/color streams.
 *
 * Geometry for each face is stored as six triangle vertices (two triangles) with a
 * separate per-vertex color array computed from a single face color. Buffer data is
 * emitted interleaved as `[position vec4][color vec4]` per vertex.
 *
 * Rendering expectations:
 * - Projection & view are scene-wide; this class composes a model-view internally.
 * - Caller must have executed `gl.useProgram(program)` before drawing.
 * - Set face colors via the setters (or {@link setColors} / {@link setAllColor})
 *   before invoking the data upload path that consumes {@link getObjectData}.
 *
 * @extends RenderableObject
 * @author
 *   - Ryan Shafer
 *   - Some Comments by ChatGPT Model 5
 */
export class Cube extends RenderableObject {
    /** Front face vertices (6). */
    private frontFace: vec4[] = [];
    /** Back face vertices (6). */
    private backFace: vec4[] = [];
    /** Left face vertices (6). */
    private leftFace: vec4[] = [];
    /** Right face vertices (6). */
    private rightFace: vec4[] = [];
    /** Top face vertices (6). */
    private topFace: vec4[] = [];
    /** Bottom face vertices (6). */
    private bottomFace: vec4[] = [];

    /** Per-vertex colors for the front face. */
    private frontFaceColor: vec4[] = [];
    /** Per-vertex colors for the back face. */
    private backFaceColor: vec4[] = [];
    /** Per-vertex colors for the left face. */
    private leftFaceColor: vec4[] = [];
    /** Per-vertex colors for the right face. */
    private rightFaceColor: vec4[] = [];
    /** Per-vertex colors for the top face. */
    private topFaceColor: vec4[] = [];
    /** Per-vertex colors for the bottom face. */
    private bottomFaceColor: vec4[] = [];

    /** Cube width (X span). */
    private width: number;
    /** Cube height (Y span). */
    private height: number;
    /** Cube depth (Z span). */
    private depth: number;

    /**
     * Constructs a cube centered at the origin in model space.
     *
     * @param gl - WebGL rendering context
     * @param program - Compiled & linked shader program
     * @param objectArr - Existing renderables (used to compute draw offset)
     * @param width - Cube width along X
     * @param height - Cube height along Y
     * @param depth - Cube depth along Z
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
        width: number,
        height: number,
        depth: number,
        x: number = 0,
        y: number = 0,
        z: number = 0,
        pitch: number = 0,
        yaw: number = 0,
        roll: number = 0
    ) {
        super(gl, program, objectArr, 6, x, y, z, yaw, pitch, roll);

        const hx = width / 2;
        const hy = height / 2;
        const hz = depth / 2;
        this.width = width;
        this.height = height;
        this.depth = depth;

        // Build 6 faces as two triangles each (6 vertices per face).
        this.frontFace.push(new vec4(hx, -hy, hz, 1.0));
        this.frontFace.push(new vec4(hx, hy, hz, 1.0));
        this.frontFace.push(new vec4(-hx, hy, hz, 1.0));
        this.frontFace.push(new vec4(-hx, hy, hz, 1.0));
        this.frontFace.push(new vec4(-hx, -hy, hz, 1.0));
        this.frontFace.push(new vec4(hx, -hy, hz, 1.0));
        this.vertexCount += 6;

        this.backFace.push(new vec4(-hx, -hy, -hz, 1.0));
        this.backFace.push(new vec4(-hx, hy, -hz, 1.0));
        this.backFace.push(new vec4(hx, hy, -hz, 1.0));
        this.backFace.push(new vec4(hx, hy, -hz, 1.0));
        this.backFace.push(new vec4(hx, -hy, -hz, 1.0));
        this.backFace.push(new vec4(-hx, -hy, -hz, 1.0));
        this.vertexCount += 6;

        this.leftFace.push(new vec4(hx, hy, hz, 1.0));
        this.leftFace.push(new vec4(hx, -hy, hz, 1.0));
        this.leftFace.push(new vec4(hx, -hy, -hz, 1.0));
        this.leftFace.push(new vec4(hx, -hy, -hz, 1.0));
        this.leftFace.push(new vec4(hx, hy, -hz, 1.0));
        this.leftFace.push(new vec4(hx, hy, hz, 1.0));
        this.vertexCount += 6;

        this.rightFace.push(new vec4(-hx, hy, -hz, 1.0));
        this.rightFace.push(new vec4(-hx, -hy, -hz, 1.0));
        this.rightFace.push(new vec4(-hx, -hy, hz, 1.0));
        this.rightFace.push(new vec4(-hx, -hy, hz, 1.0));
        this.rightFace.push(new vec4(-hx, hy, hz, 1.0));
        this.rightFace.push(new vec4(-hx, hy, -hz, 1.0));
        this.vertexCount += 6;

        this.topFace.push(new vec4(hx, hy, hz, 1.0));
        this.topFace.push(new vec4(hx, hy, -hz, 1.0));
        this.topFace.push(new vec4(-hx, hy, -hz, 1.0));
        this.topFace.push(new vec4(-hx, hy, -hz, 1.0));
        this.topFace.push(new vec4(-hx, hy, hz, 1.0));
        this.topFace.push(new vec4(hx, hy, hz, 1.0));
        this.vertexCount += 6;

        this.bottomFace.push(new vec4(hx, -hy, -hz, 1.0));
        this.bottomFace.push(new vec4(hx, -hy, hz, 1.0));
        this.bottomFace.push(new vec4(-hx, -hy, hz, 1.0));
        this.bottomFace.push(new vec4(-hx, -hy, hz, 1.0));
        this.bottomFace.push(new vec4(-hx, -hy, -hz, 1.0));
        this.bottomFace.push(new vec4(hx, -hy, -hz, 1.0));
        this.vertexCount += 6;

        this.setColors(Color.PURPLE,Color.BLACK,Color.PURPLE,Color.BLACK,Color.PURPLE,Color.BLACK);
    }

    /**
     * Sets per-vertex colors for the front face from a single color.
     * @param color - RGBA color (0..1) as {@link vec4}
     */
    public setFrontFaceColor(color: vec4): void {
        this.frontFaceColor = this.helperColor(color, this.frontFace);
    }

    /**
     * Sets per-vertex colors for the back face from a single color.
     * @param color - RGBA color (0..1) as {@link vec4}
     */
    public setBackFaceColor(color: vec4): void {
        this.backFaceColor = this.helperColor(color, this.backFace);
    }

    /**
     * Sets per-vertex colors for the left face from a single color.
     * @param color - RGBA color (0..1) as {@link vec4}
     */
    public setLeftFaceColor(color: vec4): void {
        this.leftFaceColor = this.helperColor(color, this.leftFace);
    }

    /**
     * Sets per-vertex colors for the right face from a single color.
     * @param color - RGBA color (0..1) as {@link vec4}
     */
    public setRightFaceColor(color: vec4): void {
        // Note: see small correction note after the code block.
        this.rightFaceColor = this.helperColor(color, this.rightFace);
    }

    /**
     * Sets per-vertex colors for the top face from a single color.
     * @param color - RGBA color (0..1) as {@link vec4}
     */
    public setTopFaceColor(color: vec4): void {
        this.topFaceColor = this.helperColor(color, this.topFace);
    }

    /**
     * Sets per-vertex colors for the bottom face from a single color.
     * @param color - RGBA color (0..1) as {@link vec4}
     */
    public setBottomFaceColor(color: vec4): void {
        this.bottomFaceColor = this.helperColor(color, this.bottomFace);
    }

    /**
     * Assigns distinct colors to all six faces.
     *
     * @param frontColor - Front face color
     * @param backColor - Back face color
     * @param topColor - Top face color
     * @param bottomColor - Bottom face color
     * @param rightColor - Right face color
     * @param leftColor - Left face color
     */
    public setColors(
        frontColor: vec4,
        backColor: vec4,
        topColor: vec4,
        bottomColor: vec4,
        rightColor: vec4,
        leftColor: vec4
    ): void {
        this.setFrontFaceColor(frontColor);
        this.setBackFaceColor(backColor);
        this.setLeftFaceColor(leftColor);
        this.setRightFaceColor(rightColor);
        this.setTopFaceColor(topColor);
        this.setBottomFaceColor(bottomColor);
    }

    /**
     * Assigns a single color to all faces.
     * @param color - Color applied to all six faces
     */
    public setAllColor(color: vec4): void {
        this.setFrontFaceColor(color);
        this.setBackFaceColor(color);
        this.setLeftFaceColor(color);
        this.setRightFaceColor(color);
        this.setTopFaceColor(color);
        this.setBottomFaceColor(color);
    }

    /**
     * Builds the interleaved vertex stream for this cube:
     * `[pos, color, pos, color, ...]` per vertex, per face.
     *
     * @override
     * @returns Flat array of {@link vec4} pairs in draw order
     */
    public override getObjectData(): vec4[] {
        const tempArr: vec4[] = [];

        tempArr.push(...this.loadingArrayHelper(this.frontFace, this.frontFaceColor));
        tempArr.push(...this.loadingArrayHelper(this.backFace, this.backFaceColor));
        tempArr.push(...this.loadingArrayHelper(this.topFace, this.topFaceColor));
        tempArr.push(...this.loadingArrayHelper(this.bottomFace, this.bottomFaceColor));
        tempArr.push(...this.loadingArrayHelper(this.leftFace, this.leftFaceColor));
        tempArr.push(...this.loadingArrayHelper(this.rightFace, this.rightFaceColor));

        return tempArr;
    }

    /** @returns Depth (Z span). */
    public getDepth(): number {
        return this.depth;
    }

    /** @returns Height (Y span). */
    public getHeight(): number {
        return this.height;
    }

    /** @returns Width (X span). */
    public getWidth(): number {
        return this.width;
    }
}
