import {
    mat4,
    rotateX,
    rotateY,
    rotateZ,
    translate,
    vec4,
} from "./helperfunctions.js";

/**
 * Abstract base class for renderable WebGL objects.
 *
 * Provides:
 * - GPU uniform updates for the model-view matrix
 * - Basic model transforms (translate + yaw/pitch/roll)
 * - A common update/draw lifecycle
 *
 * Subclasses (e.g., {@link Cube}) must:
 * - Supply geometry/color data via {@link getObjectData}
 * - Use {@link loadingArrayHelper} to interleave [position, color] streams
 *
 * @abstract
 * @class RenderableObject
 * @author Ryan Shafer
 * @author Some comments by ChatGPT Model 5
 *
 */
export abstract class RenderableObject {
    /** WebGL context used for buffer management and drawing. */
    protected gl: WebGLRenderingContext;

    /** Linked shader program whose attributes/uniforms are consumed by this object. */
    protected program: WebGLProgram;

    /**
     * GPU buffer for this object's interleaved vertex + color data.
     * @remarks Declared for potential VBO management by subclasses.
     */
    private bufferId: WebGLBuffer;

    /** Location of the `modelViewMatrix` uniform in the shader program. */
    protected umv: WebGLUniformLocation;

    /** Model translation on X (world units). */
    protected x: number;

    /** Model translation on Y (world units). */
    protected y: number;

    /** Model translation on Z (world units). */
    protected z: number;

    /** Yaw (degrees) for rotation about the +Y axis. */
    protected yaw: number;

    /** Pitch (degrees) for rotation about the +X axis. */
    protected pitch: number;

    /** Roll (degrees) for rotation about the +Z axis. */
    protected roll: number;

    /** Total number of vertices to draw for this object. */
    protected vertexCount: number;

    /**
     * Number of faces; used by subclasses for invariants in color handling
     * (e.g., 6 for a cube).
     */
    protected sides: number;

    /** Optional binding group identifier (e.g., for batched binding). */
    private bindingGroup: number;

    /** Optional color palette per-vertex or per-face (implementation-defined). */
    protected color: vec4[];

    /**
     * Starting vertex offset into the global draw stream.
     * Useful when multiple objects share a single VBO and are drawn with offsets.
     */
    protected startDrawing: number;

    protected aSpecColor: GLint;
    protected aSpecExp: GLint;


    /**
     * Constructs a renderable object with initial transform and draw bookkeeping.
     *
     * @param {WebGLRenderingContext} gl - WebGL context
     * @param {WebGLProgram} program - Compiled & linked shader program
     * @param {RenderableObject[]} objectArr - Already-constructed renderables; used to compute this object's starting draw offset
     * @param {number} sides - Number of faces in the object (e.g., 6 for a cube)
     * @param {number} [x=0] - Initial world X translation (default 0)
     * @param {number} [y=0] - Initial world Y translation (default 0)
     * @param {number} [z=0] - Initial world Z translation (default 0)
     * @param {number} [yaw=0] - Initial yaw in degrees (default 0)
     * @param {number} [pitch=0] - Initial pitch in degrees (default 0)
     * @param {number} [roll=0] - Initial roll in degrees (default 0)
     * @protected
     */
    protected constructor(
        gl: WebGLRenderingContext,
        program: WebGLProgram,
        objectArr: RenderableObject[],
        sides: number,
        x: number = 0,
        y: number = 0,
        z: number = 0,
        yaw: number = 0,
        pitch: number = 0,
        roll: number = 0
    ) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.yaw = yaw;
        this.pitch = pitch;
        this.roll = roll;
        this.vertexCount = 0;
        this.gl = gl;
        this.program = program;
        this.sides = sides;
        this.umv = gl.getUniformLocation(program, "model_view");
        this.aSpecColor = gl.getAttribLocation(program, "vSpecularColor");
        this.aSpecExp = gl.getAttribLocation(program, "vSpecularExponent");

        this.startDrawing = 0;
        for (let i = 0; i < objectArr.length; i++) {
            this.startDrawing += objectArr[i].getVertexCount();
        }

    }

    /**
     * Updates the model-view transform and pushes it to the GPU.
     *
     * @remarks
     * Assumes the caller supplies a valid incoming **parent** model-view matrix.
     *
     * @param {mat4} parent - Parent model-view matrix
     * @returns {mat4} The final model-view matrix after translate/rotate
     */
    public update(parent: mat4): mat4 {
        let mv = this.translate(parent);
        mv = this.rotate(mv);
        this.updateGPUBuffer(mv);
        return mv;
    }

    /**
     * Uploads the model-view matrix to the shader uniform.
     *
     * @param {mat4} mv - Model-view matrix to upload
     * @returns {void}
     */
    public updateGPUBuffer(mv: mat4): void {
        this.gl.uniformMatrix4fv(this.umv, false, mv.flatten());
    }

    /**
     * Applies translation to the provided matrix.
     *
     * @param {mat4} [parent] - Incoming model-view matrix (required for composition)
     * @returns {mat4} The translated model-view matrix
     * @throws {Error} If `parent` is undefined at the call site
     */
    public translate(parent?: mat4): mat4 {
        let mv: mat4;
        if (parent) {
            mv = parent;
        }
        // mv is expected to be provided by caller; document requirement above.
        mv = mv.mult(translate(this.x, this.y, this.z));
        return mv;
    }

    /**
     * Applies yaw, pitch, and roll (Y → X → Z) to the provided matrix.
     *
     * @param {mat4} parent - Incoming model-view matrix (required for composition)
     * @returns {mat4} The rotated model-view matrix
     * @throws {Error} If `parent` is undefined at the call site
     */
    public rotate(parent: mat4): mat4 {
        let mv: mat4;
        if (parent) {
            mv = parent;
        }
        // Rotation order matches getModelMatrix()
        mv = mv.mult(rotateY(this.yaw));
        mv = mv.mult(rotateX(this.pitch));
        mv = mv.mult(rotateZ(this.roll));
        return mv;
    }

    /**
     * Expands a single color to a per-vertex color array for a face.
     *
     * @param {vec4} color - The color to repeat
     * @param {vec4[]} face - The face vertex array used to match the length
     * @returns {vec4[]} A color array aligned to the number of vertices in the face
     * @protected
     */
    protected helperColor(color: vec4, face: vec4[]): vec4[] {
        const tempArr: vec4[] = [];
        for (let i = 0; i < face.length; i++) {
            tempArr.push(color);
        }
        return tempArr;
    }

    /**
     * Generates a repeating gradient color array to match a face's vertex count.
     *
     * @param {vec4[]} colors - Palette used cyclically
     * @param {vec4[]} face - The face vertex array used to match the length
     * @returns {vec4[]} A color array cycling through the provided palette
     * @protected
     */
    protected helperGradientColor(colors: vec4[], face: vec4[]): vec4[] {
        const tempArr: vec4[] = [];
        for (let i = 0; i < face.length; i++) {
            tempArr.push(colors[i % colors.length]);
        }
        return tempArr;
    }

    /**
     * Issues the draw call for this object.
     *
     * @remarks
     * Assumes buffers/attributes are already bound and populated elsewhere.
     * @returns {void}
     */
    public draw(): void {
        // per-object material fields with setters
        const specularColor = new vec4(1, 1, 1, 1); // default
        const specularExp = 1000;


        if (this.aSpecColor !== -1) {
            this.gl.disableVertexAttribArray(this.aSpecColor);
            this.gl.vertexAttrib4f(this.aSpecColor,
                specularColor[0],
                specularColor[1],
                specularColor[2],
                specularColor[3]
            );
        }
        if (this.aSpecExp !== -1) {
            this.gl.disableVertexAttribArray(this.aSpecExp);
            this.gl.vertexAttrib1f(this.aSpecExp, specularExp);
        }

        this.gl.drawArrays(this.gl.TRIANGLES, this.startDrawing, this.vertexCount);
    }

    public resetRotation(){
        this.pitch = 0;
        this.roll = 0;
        this.yaw = 0;
    }

    /** @returns {number} Current world X translation. */
    public getX(): number {
        return this.x;
    }

    /** @returns {number} Current world Y translation. */
    public getY(): number {
        return this.y;
    }

    /** @returns {number} Current world Z translation. */
    public getZ(): number {
        return this.z;
    }

    /** @returns {number} Current pitch in degrees. */
    public getPitch(): number {
        return this.pitch;
    }

    /** @returns {number} Current roll in degrees. */
    public getRoll(): number {
        return this.roll;
    }

    /**
     * Sets absolute X translation.
     * @param {number} nx - New X in world units
     * @returns {void}
     */
    public setX(nx: number): void {
        this.x = nx;
    }

    /**
     * Sets absolute Y translation.
     * @param {number} ny - New Y in world units
     * @returns {void}
     */
    public setY(ny: number): void {
        this.y = ny;
    }

    /**
     * Sets absolute Z translation.
     * @param {number} nz - New Z in world units
     * @returns {void}
     */
    public setZ(nz: number): void {
        this.z = nz;
    }

    /**
     * Sets absolute yaw angle in degrees (rotation about +Y).
     * @param {number} nt - New yaw in degrees
     * @returns {void}
     */
    public setYaw(nt: number): void {
        this.yaw = nt;
    }

    public setPitch(pitch: number): void {
        this.pitch = pitch;
    }

    /**
     * Adds to X translation.
     * @param {number} nx - Delta X in world units
     * @returns {void}
     */
    public addX(nx: number): void {
        this.x += nx;
    }

    /**
     * Adds to Y translation.
     * @param {number} ny - Delta Y in world units
     * @returns {void}
     */
    public addY(ny: number): void {
        this.y += ny;
    }

    /**
     * Adds to Z translation.
     * @param {number} nz - Delta Z in world units
     * @returns {void}
     */
    public addZ(nz: number): void {
        this.z += nz;
    }

    /**
     * Adds to yaw angle.
     * @param {number} nt - Delta yaw in degrees
     * @returns {void}
     */
    public addYaw(nt: number): void {
        this.yaw += nt;
    }

    /**
     * Adds to pitch angle.
     * @param {number} np - Delta pitch in degrees
     * @returns {void}
     */
    public addPitch(np: number): void {
        this.pitch += np;
    }

    /**
     * Adds to roll angle.
     * @param {number} nr - Delta roll in degrees
     * @returns {void}
     */
    public addRoll(nr: number): void {
        this.roll += nr;
    }

    /**
     * Sets the binding group identifier for this object.
     * @param {number} bind - Group ID
     * @returns {void}
     */
    public bind(bind: number): void {
        this.bindingGroup = bind;
    }

    /** @returns {number} Current binding group identifier. */
    public getBinding(): number {
        return this.bindingGroup;
    }

    /** @returns {number} Current yaw in degrees. */
    public getYaw(): number {
        return this.yaw;
    }

    /** @returns {number} The number of vertices this object will draw. */
    public getVertexCount(): number {
        return this.vertexCount;
    }

    /**
     * Returns the object's world-space position as a homogeneous coordinate.
     * @returns {vec4} `[x, y, z, 1]` as a {@link vec4}
     */
    public getPointInWorld(): vec4 {
        return new vec4(this.x, this.y, this.z);
    }

    /**
     * Advances the starting draw offset by `count` vertices.
     * Useful when appending geometry into a shared buffer.
     *
     * @param {number} count - Number of vertices appended before this object
     * @returns {void}
     */
    public addVerticesStartCount(count: number): void {
        this.startDrawing += count;
    }

    /**
     * Gets the starting vertex offset for this object's draw call.
     * @returns {number} Starting vertex index in the shared stream.
     */
    public getVerticesStartingPoint(): number {
        return this.startDrawing;
    }

    /**
     * Must be implemented by subclasses to provide interleaved object data.
     *
     * @abstract
     * @returns {vec4[]} Interleaved array in the form:
     *   [pos0, normal0, tangent0, tex0,
     *    pos1, normal1, tangent1, tex1,
     *    ...]
     * where each entry is a {@link vec4}.
     */
    public abstract getObjectData(): vec4[];


    /**
     * Computes the local model matrix for this object (no parent composition).
     *
     * @remarks
     * Order: identity → translate → yaw → pitch → roll (matches {@link rotate} order).
     *
     * @returns {mat4} Model matrix representing this object's local transform.
     */
    public getModelMatrix(): mat4 {
        let m: mat4 = new mat4();
        m = m.mult(translate(this.x, this.y, this.z));
        m = m.mult(rotateY(this.yaw));
        m = m.mult(rotateX(this.pitch));
        m = m.mult(rotateZ(this.roll));
        return m;
    }

    /**
     * Interleaves position, normal, tangent, and texcoord arrays for a single face.
     *
     * Per-vertex layout (in this order):
     *   [ position(vec4), normal(vec4), tangent(vec4), texCoord(vec4) ]
     *
     * This corresponds to 16 floats per vertex (64 bytes when using 4-byte floats).
     *
     * @param {vec4[]} face      - Vertex positions for the face
     * @param {vec4[]} normal    - Vertex normals aligned with {@link face}
     * @param {vec4[]} tangent   - Vertex tangents aligned with {@link face}
     * @param {vec4[]} texCoord  - Vertex texcoords (use .x, .y in shader) aligned with {@link face}
     * @returns {vec4[]} Interleaved array: [pos0, n0, t0, uv0, pos1, n1, t1, uv1, ...]
     * @protected
     */
    protected loadingArrayHelper(
        face: vec4[],
        normal: vec4[],
        tangent: vec4[],
        texCoord: vec4[]
    ): vec4[] {
        const tempArr: vec4[] = [];
        for (let i = 0; i < face.length; i++) {
            tempArr.push(face[i]);      // position
            tempArr.push(normal[i]);    // normal
            tempArr.push(tangent[i]);   // tangent
            tempArr.push(texCoord[i]);  // texcoord (use .x, .y)
        }
        return tempArr;


    }
}
