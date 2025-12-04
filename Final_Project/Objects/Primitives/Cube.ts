import { flatten, lookAt, mat4, rotateY, translate, vec4 } from "../../Utility/helperfunctions.js";
import { RenderableObject } from "./Base/RenderableObject.js";
import * as Color from "../../Utility/Color.js";

/**
 * Axis-aligned, renderable cube with per-face geometry, normals, and UVs.
 *
 * Geometry:
 * - Each face is stored as 6 vertices (2 triangles).
 * - Positions are modeled as {@link vec4} with `w = 1.0`.
 * - Per-face normals are modeled as {@link vec4} with `w = 0.0`.
 * - Texture coordinates are stored as {@link vec4}, using `.x` and `.y` for (u, v).
 *
 * Rendering expectations:
 * - Projection & view are handled at the scene level; this cube provides only model data.
 * - Caller is responsible for binding VBOs and attributes using the data from {@link getObjectData}.
 * - This class reports its `vertexCount` via the inherited {@link RenderableObject} API.
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

    /** Front face normals (6). */
    private frontNormal: vec4[] = [];
    /** Back face normals (6). */
    private backNormal: vec4[] = [];
    /** Left face normals (6). */
    private leftNormal: vec4[] = [];
    /** Right face normals (6). */
    private rightNormal: vec4[] = [];
    /** Bottom face normals (6). */
    private bottomNormal: vec4[] = [];
    /** Top face normals (6). */
    private topNormal: vec4[] = [];

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
     * @param {WebGL2RenderingContext} gl - WebGL2 rendering context.
     * @param {WebGLProgram} program - Compiled & linked shader program.
     * @param {RenderableObject[]} objectArr - Existing renderables (used to compute draw offset).
     * @param {number} width - Cube width along X.
     * @param {number} height - Cube height along Y.
     * @param {number} depth - Cube depth along Z.
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

        // ─────────────────────────────────────────────
        // Geometry + UVs
        // ─────────────────────────────────────────────

        // Front face (Z+)
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

        // Back face (Z-)
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

        // Left face (X+)
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

        // Right face (X-)
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

        // Top face (Y+)
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

        // Bottom face (Y-)
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

        // ─────────────────────────────────────────────
        // Normals per vertex (all faces sized as frontFace)
        // ─────────────────────────────────────────────
        for (let i = 0; i < this.frontFace.length; i++) {
            this.frontNormal.push(new vec4(0, 0, 1, 0));
            this.backNormal.push(new vec4(0, 0, -1, 0));
            this.rightNormal.push(new vec4(-1, 0, 0, 0));
            this.leftNormal.push(new vec4(1, 0, 0, 0));
            this.topNormal.push(new vec4(0, 1, 0, 0));
            this.bottomNormal.push(new vec4(0, -1, 0, 0));
        }
    }

    /**
     * Supplies interleaved vertex data for rendering.
     *
     * Layout per-vertex:
     *   [ position(vec4), normal(vec4), texCoord(vec4) ]
     *
     * Faces are appended in the order:
     *   front, back, top, bottom, left, right.
     *
     * @override
     * @returns {vec4[]} Interleaved
     *   `[pos0, n0, uv0, pos1, n1, uv1, ...]` for the entire cube.
     */
    public override getObjectData(): vec4[] {
        const tempArr: vec4[] = [];

        tempArr.push(...this.loadingArrayHelper(this.frontFace,  this.frontNormal,  this.frontTex));
        tempArr.push(...this.loadingArrayHelper(this.backFace,   this.backNormal,   this.backTex));
        tempArr.push(...this.loadingArrayHelper(this.topFace,    this.topNormal,    this.topTex));
        tempArr.push(...this.loadingArrayHelper(this.bottomFace, this.bottomNormal, this.bottomTex));
        tempArr.push(...this.loadingArrayHelper(this.leftFace,   this.leftNormal,   this.leftTex));
        tempArr.push(...this.loadingArrayHelper(this.rightFace,  this.rightNormal,  this.rightTex));

        return tempArr;
    }

    /**
     * Returns the cube's depth (Z span).
     *
     * @returns {number} Depth along the Z axis.
     */
    public getDepth(): number {
        return this.depth;
    }

    /**
     * Returns the cube's height (Y span).
     *
     * @returns {number} Height along the Y axis.
     */
    public getHeight(): number {
        return this.height;
    }

    /**
     * Returns the cube's width (X span).
     *
     * @returns {number} Width along the X axis.
     */
    public getWidth(): number {
        return this.width;
    }
}
