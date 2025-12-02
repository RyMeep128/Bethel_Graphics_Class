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

    private frontNormal:vec4[] = [];
    private backNormal:vec4[] = [];
    private leftNormal:vec4[] = [];
    private rightNormal:vec4[] = [];
    private bottomNormal:vec4[] = [];
    private topNormal:vec4[] = [];


    /** Per-vertex texture coordinates for each face (u, v in .x, .y). */
    private frontTex: vec4[] = [];
    private backTex: vec4[] = [];
    private leftTex: vec4[] = [];
    private rightTex: vec4[] = [];
    private topTex: vec4[] = [];
    private bottomTex: vec4[] = [];

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

        this.frontTex.push(
            new vec4(1, 0, 0, 0), // bottom-right
            new vec4(1, 1, 0, 0), // top-right
            new vec4(0, 1, 0, 0), // top-left
            new vec4(0, 1, 0, 0), // top-left
            new vec4(0, 0, 0, 0), // bottom-left
            new vec4(1, 0, 0, 0)  // bottom-right
        );


        this.backFace.push(new vec4(-hx, -hy, -hz, 1.0));
        this.backFace.push(new vec4(-hx, hy, -hz, 1.0));
        this.backFace.push(new vec4(hx, hy, -hz, 1.0));
        this.backFace.push(new vec4(hx, hy, -hz, 1.0));
        this.backFace.push(new vec4(hx, -hy, -hz, 1.0));
        this.backFace.push(new vec4(-hx, -hy, -hz, 1.0));
        this.vertexCount += 6;

        this.backTex.push(
            new vec4(0, 0, 0, 0), // bottom-left
            new vec4(0, 1, 0, 0), // top-left
            new vec4(1, 1, 0, 0), // top-right
            new vec4(1, 1, 0, 0), // top-right
            new vec4(1, 0, 0, 0), // bottom-right
            new vec4(0, 0, 0, 0)  // bottom-left
        );


        this.leftFace.push(new vec4(hx, hy, hz, 1.0));
        this.leftFace.push(new vec4(hx, -hy, hz, 1.0));
        this.leftFace.push(new vec4(hx, -hy, -hz, 1.0));
        this.leftFace.push(new vec4(hx, -hy, -hz, 1.0));
        this.leftFace.push(new vec4(hx, hy, -hz, 1.0));
        this.leftFace.push(new vec4(hx, hy, hz, 1.0));
        this.vertexCount += 6;

        this.leftTex.push(
            new vec4(1, 1, 0, 0), // top-front
            new vec4(1, 0, 0, 0), // bottom-front
            new vec4(0, 0, 0, 0), // bottom-back
            new vec4(0, 0, 0, 0), // bottom-back
            new vec4(0, 1, 0, 0), // top-back
            new vec4(1, 1, 0, 0)  // top-front
        );

        this.rightFace.push(new vec4(-hx, hy, -hz, 1.0));
        this.rightFace.push(new vec4(-hx, -hy, -hz, 1.0));
        this.rightFace.push(new vec4(-hx, -hy, hz, 1.0));
        this.rightFace.push(new vec4(-hx, -hy, hz, 1.0));
        this.rightFace.push(new vec4(-hx, hy, hz, 1.0));
        this.rightFace.push(new vec4(-hx, hy, -hz, 1.0));
        this.vertexCount += 6;

        this.rightTex.push(
            new vec4(0, 1, 0, 0), // top-back
            new vec4(0, 0, 0, 0), // bottom-back
            new vec4(1, 0, 0, 0), // bottom-front
            new vec4(1, 0, 0, 0), // bottom-front
            new vec4(1, 1, 0, 0), // top-front
            new vec4(0, 1, 0, 0)  // top-back
        );

        this.topFace.push(new vec4(hx, hy, hz, 1.0));
        this.topFace.push(new vec4(hx, hy, -hz, 1.0));
        this.topFace.push(new vec4(-hx, hy, -hz, 1.0));
        this.topFace.push(new vec4(-hx, hy, -hz, 1.0));
        this.topFace.push(new vec4(-hx, hy, hz, 1.0));
        this.topFace.push(new vec4(hx, hy, hz, 1.0));
        this.vertexCount += 6;

        this.topTex.push(
            new vec4(1, 0, 0, 0), // front-right
            new vec4(1, 1, 0, 0), // back-right
            new vec4(0, 1, 0, 0), // back-left
            new vec4(0, 1, 0, 0), // back-left
            new vec4(0, 0, 0, 0), // front-left
            new vec4(1, 0, 0, 0)  // front-right
        );

        this.bottomFace.push(new vec4(hx, -hy, -hz, 1.0));
        this.bottomFace.push(new vec4(hx, -hy, hz, 1.0));
        this.bottomFace.push(new vec4(-hx, -hy, hz, 1.0));
        this.bottomFace.push(new vec4(-hx, -hy, hz, 1.0));
        this.bottomFace.push(new vec4(-hx, -hy, -hz, 1.0));
        this.bottomFace.push(new vec4(hx, -hy, -hz, 1.0));
        this.vertexCount += 6;

        this.bottomTex.push(
            new vec4(1, 1, 0, 0), // back-right
            new vec4(1, 0, 0, 0), // front-right
            new vec4(0, 0, 0, 0), // front-left
            new vec4(0, 0, 0, 0), // front-left
            new vec4(0, 1, 0, 0), // back-left
            new vec4(1, 1, 0, 0)  // back-right
        );


        for (let i = 0; i < this.frontFace.length; i++) {
            this.frontNormal.push( new vec4(0,0,1,0));
            this.backNormal.push(new vec4(0,0,-1,0));
            this.rightNormal .push(new vec4(-1,0,0,0));
            this.leftNormal .push(new vec4(1,0,0,0));
            this.topNormal .push(new vec4(0,1,0,0));
            this.bottomNormal .push( new vec4(0,-1,0,0));
        }



    }


    public override getObjectData(): vec4[] {
        const tempArr: vec4[] = [];

        tempArr.push(...this.loadingArrayHelper(this.frontFace,  this.frontNormal, this.frontTex));
        tempArr.push(...this.loadingArrayHelper(this.backFace,   this.backNormal, this.backTex));
        tempArr.push(...this.loadingArrayHelper(this.topFace,    this.topNormal,    this.topTex));
        tempArr.push(...this.loadingArrayHelper(this.bottomFace, this.bottomNormal,  this.bottomTex));
        tempArr.push(...this.loadingArrayHelper(this.leftFace,   this.leftNormal,      this.leftTex));
        tempArr.push(...this.loadingArrayHelper(this.rightFace,  this.rightNormal,    this.rightTex));

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
