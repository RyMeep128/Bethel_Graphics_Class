import {RenderableObject} from "./RenderableObject.js";
import {vec4} from "./helperfunctions.js";
import * as Util from "./util.js";

/**
 * Triangulated UV sphere built from latitude latitude and longitude longitude.
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
     * Number of latitude divisions ("latitude").
     * @remarks Initialized from {@link Util.Detail}.
     */
    private latitude:number;

    /**
     * Number of longitude divisions ("longitude").
     * @remarks Computed as `latitude / 2`.
     */
    private longitude:number;

    /** Flat list of triangle vertex positions (vec4). */
    private vertices:vec4[] = [];


    private normals:vec4[] = [];

    private tangents: vec4[] = [];

    private texCoords: vec4[] = [];


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
        this.latitude = Util.Detail;
        this.longitude = this.latitude/2;

        // Build quads as two triangles (tl-bl-tr) and (tr-bl-br) for each lat/long cell.
        for (let i = 0; i < this.latitude; i++) {
            for (let j = 0; j < this.longitude; j++) {
                // NOTE: no modulo, we allow j+1 up to this.segments
                const tl = this.stupidTrigMath(i,     j);
                const tr = this.stupidTrigMath(i,     j + 1);
                const bl = this.stupidTrigMath(i + 1, j);
                const br = this.stupidTrigMath(i + 1, j + 1);

                // Triangle 1: tl, bl, tr
                this.vertices.push(tl.pos); this.vertexCount++;
                this.normals.push(tl.normal);
                this.tangents.push(tl.tangent);
                this.texCoords.push(tl.tex);

                this.vertices.push(bl.pos); this.vertexCount++;
                this.normals.push(bl.normal);
                this.tangents.push(bl.tangent);
                this.texCoords.push(bl.tex);

                this.vertices.push(tr.pos); this.vertexCount++;
                this.normals.push(tr.normal);
                this.tangents.push(tr.tangent);
                this.texCoords.push(tr.tex);

                // Triangle 2: tr, bl, br
                this.vertices.push(tr.pos); this.vertexCount++;
                this.normals.push(tr.normal);
                this.tangents.push(tr.tangent);
                this.texCoords.push(tr.tex);

                this.vertices.push(bl.pos); this.vertexCount++;
                this.normals.push(bl.normal);
                this.tangents.push(bl.tangent);
                this.texCoords.push(bl.tex);

                this.vertices.push(br.pos); this.vertexCount++;
                this.normals.push(br.normal);
                this.tangents.push(br.tangent);
                this.texCoords.push(br.tex);
            }
        }


    }

    /**
     * Computes position, normal, tangent, and texcoord for a given grid point (i, j).
     *
     * @param {number} i - Latitude band index in [0, latitude]
     * @param {number} j - Longitude segment index in [0, longitude)
     */
    private stupidTrigMath(i: number, j: number) {
        // Make j wrap geometrically but NOT in UV
        const wrappedJ = j % this.longitude;

        const phi   = (-Math.PI / 2) + (i * Math.PI / this.latitude);
        const theta = wrappedJ * 2 * Math.PI / this.longitude;

        const cosPhi   = Math.cos(phi);
        const sinPhi   = Math.sin(phi);
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        const x = this.radius * cosPhi * cosTheta;
        const y = this.radius * sinPhi;
        const z = this.radius * cosPhi * sinTheta;

        const pos = new vec4(x, y, z, 1);
        const normal = new vec4(
            cosPhi * cosTheta,
            sinPhi,
            cosPhi * sinTheta,
            0
        );

        let tx = -cosPhi * sinTheta;
        let ty = 0;
        let tz =  cosPhi * cosTheta;
        const tLen = Math.hypot(tx, tz);
        if (tLen > 0.0) {
            tx /= tLen;
            tz /= tLen;
        } else {
            tx = 1; ty = 0; tz = 0;
        }
        const tangent = new vec4(tx, ty, tz, 0);

        // UVs: j runs 0..segments, so u runs 0..1
        const u = 1- (j / this.longitude);
        const v = i / this.latitude;

        const tex = new vec4(u, v, 0, 0);
        return { pos, normal, tangent, tex };
    }


    public getRadius():number{
        return this.radius;
    }




    /**
     * Supplies interleaved vertex data for rendering.
     *
     * @returns {vec4[]} Interleaved `[position, color, position, color, ...]`.
     * @remarks Ensure {@link setColor} or {@link setGradientColor} is called before first upload.
     */
    public getObjectData(): vec4[] {
        return this.loadingArrayHelper(this.vertices,this.normals,this.tangents,this.texCoords);
    }

}
