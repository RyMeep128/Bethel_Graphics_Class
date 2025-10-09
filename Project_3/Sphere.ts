import {RenderableObject} from "./RenderableObject.js";
import {vec4} from "./helperfunctions.js";
import * as Util from "./util.js";

/**
 * Triangulated UV sphere built from latitude bands and longitude segments.
 *
 * - Geometry is generated in the constructor using two triangles per quad patch.
 * - Color can be assigned uniformly via {@link setColor} or as a repeating gradient via {@link setGradientColor}.
 * - Call {@link getObjectData} to retrieve the interleaved `[position, color]` stream for VBO upload.
 *
 * @class Sphere
 * @extends RenderableObject
 * @author Ryan Shafer
 * @author Some comments by ChatGPT Model 5
 */
export class Sphere extends RenderableObject {

    /** Sphere radius in world units. */
    private radius:number;

    /**
     * Number of latitude divisions ("bands").
     * @remarks Initialized from {@link Util.Detail}.
     */
    private bands:number;

    /**
     * Number of longitude divisions ("segments").
     * @remarks Computed as `bands / 2`.
     */
    private segments:number;

    /** Flat list of triangle vertex positions (vec4). */
    private vertices:vec4[] = [];

    /** Flat list of per-vertex colors (vec4), same length as {@link vertices}. */
    private colorArray:vec4[] = [];

    /**
     * Creates a new UV sphere and procedurally generates its triangle mesh.
     *
     * @param {WebGLRenderingContext} gl - WebGL context.
     * @param {WebGLProgram} program - Linked shader program.
     * @param {RenderableObject[]} objectArr - Existing objects; used to compute this object's starting draw offset.
     * @param {number} radius - Sphere radius.
     * @param {number} [x=0] - Initial world X translation.
     * @param {number} [y=0] - Initial world Y translation.
     * @param {number} [z=0] - Initial world Z translation.
     * @param {number} [yaw=0] - Initial yaw in degrees.
     * @param {number} [pitch=0] - Initial pitch in degrees.
     * @param {number} [roll=0] - Initial roll in degrees.
     */
    constructor(
        gl: WebGLRenderingContext,
        program: WebGLProgram,
        objectArr: RenderableObject[],
        radius:number,
        x: number = 0,
        y: number = 0,
        z: number = 0,
        yaw: number = 0,
        pitch: number = 0,
        roll: number = 0
    ) {
        super(gl,program, objectArr, 1, x, y, z,yaw,pitch,roll);
        this.radius = radius;
        this.bands = Util.Detail;
        this.segments = this.bands/2;

        // Build quads as two triangles (tl-bl-tr) and (tr-bl-br) for each lat/long cell.
        for (let i = 0; i < this.bands; i++) {
            for (let j = 0; j < this.segments ; j++) {
                const jRight = (j + 1) % this.segments;

                const tl:vec4 = this.stupidTrigMath(i,j);
                const tr:vec4 = this.stupidTrigMath(i,jRight);
                const bl:vec4 = this.stupidTrigMath(i+1,j);
                const br:vec4 = this.stupidTrigMath(i+1,jRight);

                // Triangle 1
                this.vertices.push(tl); this.vertexCount++;
                this.vertices.push(bl); this.vertexCount++;
                this.vertices.push(tr); this.vertexCount++;

                // Triangle 2
                this.vertices.push(tr); this.vertexCount++;
                this.vertices.push(bl); this.vertexCount++;
                this.vertices.push(br); this.vertexCount++;
            }
        }
    }

    /**
     * Converts UV sphere grid indices to a Cartesian position on the sphere surface.
     *
     * @param {number} i - Latitude band index in [0, bands].
     * @param {number} j - Longitude segment index in [0, segments).
     * @returns {vec4} Vertex position `[x, y, z, 1]`.
     * @private
     *
     * @remarks
     * Uses spherical coordinates with:
     * - φ (phi) ∈ [-π/2, +π/2] for latitude
     * - θ (theta) ∈ [0, 2π) for longitude
     * Mapping:
     * ```
     * x = r * cosφ * cosθ
     * y = r * sinφ
     * z = r * cosφ * sinθ
     * ```
     */
    private stupidTrigMath(i:number,j:number):vec4{
        const phi:number = (-Math.PI/2) + i * Math.PI/this.bands;
        const theta:number = j * 2*Math.PI/this.segments;
        return new vec4(
            this.radius*Math.cos(phi)*Math.cos(theta),
            this.radius*Math.sin(phi),
            this.radius*Math.cos(phi)*Math.sin(theta),
            1
        );
    }

    /**
     * Assigns a uniform color to all vertices of the sphere.
     *
     * @param {vec4} color - The RGBA color to apply to every vertex.
     * @returns {void}
     */
    public setColor(color:vec4):void{
        this.colorArray = [];
        for (let i=0; i<this.vertexCount; i++) {
            this.colorArray.push(color);
        }
    }

    /**
     * Assigns a repeating gradient palette across all vertices.
     *
     * @param {vec4[]} color - Palette cycled across the vertex list.
     * @returns {void}
     */
    public setGradientColor(color:vec4[]):void{
        this.colorArray = [];
        this.colorArray = this.helperGradientColor(color,this.vertices);
    }

    /**
     * Supplies interleaved vertex data for rendering.
     *
     * @returns {vec4[]} Interleaved `[position, color, position, color, ...]`.
     * @remarks Ensure {@link setColor} or {@link setGradientColor} is called before first upload.
     */
    public getObjectData(): vec4[] {
        return this.loadingArrayHelper(this.vertices,this.colorArray);
    }

}
