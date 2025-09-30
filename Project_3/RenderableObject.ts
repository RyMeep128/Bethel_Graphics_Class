import {
    flatten,
    lookAt,
    mat4,
    rotate,
    rotateX,
    rotateY,
    rotateZ,
    todegrees,
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
 * @author Ryan Shafer
 */
export abstract class RenderableObject {
    /** WebGL context used for buffer management and drawing. */
    protected gl: WebGLRenderingContext;

    /** Linked shader program whose attributes/uniforms are consumed by this object. */
    protected program: WebGLProgram;

    /** GPU buffer for this object's interleaved vertex + color data. */
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

    /**
     * Constructs a renderable object with initial transform and draw bookkeeping.
     *
     * @param gl - WebGL context
     * @param program - Compiled & linked shader program
     * @param objectArr - Already-constructed renderables; used to compute this object's starting draw offset
     * @param sides - Number of faces in the object (e.g., 6 for a cube)
     * @param x - Initial world X translation (default 0)
     * @param y - Initial world Y translation (default 0)
     * @param z - Initial world Z translation (default 0)
     * @param yaw - Initial yaw in degrees (default 0)
     * @param pitch - Initial pitch in degrees (default 0)
     * @param roll - Initial roll in degrees (default 0)
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
        this.umv = gl.getUniformLocation(program, "modelViewMatrix");
        this.startDrawing = 0;
        for (let i = 0; i < objectArr.length; i++) {
            this.startDrawing += objectArr[i].getVertexCount();
        }
    }

    /**
     * Updates the model-view transform and pushes it to the GPU.
     *
     * @remarks
     * If a parent matrix is provided, it is used as the incoming model-view;
     * otherwise a default camera lookAt is used.
     *
     * @param parent - Optional parent model-view matrix
     * @returns The final model-view matrix after translate/rotate
     */
    public update(parent?: mat4): mat4 {
        let mv: mat4 = this.view(parent);
        mv = this.translate(mv);
        mv = this.rotate(mv);
        this.updateGPUBuffer(mv);
        return mv;
    }

    /**
     * Uploads the model-view matrix to the shader uniform.
     *
     * @param mv - Model-view matrix to upload
     */
    public updateGPUBuffer(mv: mat4): void {
        this.gl.uniformMatrix4fv(this.umv, false, mv.flatten());
    }

    /**
     * Computes the base model-view.
     *
     * @param parent - Optional parent model-view matrix
     * @returns The parent matrix if provided; otherwise a default lookAt
     */
    public view(parent?: mat4): mat4 {
        const mv: mat4 =
            parent ??
            lookAt(new vec4(0, 10+this.fovz, 20+this.fovz, 1), new vec4(0, 0, 0, 1), new vec4(0, 1, 0, 0));
        return mv;
    }

    /**
     * Applies translation to the provided matrix or to an expected parent.
     *
     * @param parent - Incoming model-view matrix (required for composition)
     * @returns The translated model-view matrix
     */
    public translate(parent?: mat4): mat4 {
        let mv: mat4;
        if (parent) {
            mv = parent;
        }
        mv = mv.mult(translate(this.x, this.y, this.z));
        return mv;
    }

    /**
     * Applies yaw, pitch, and roll (Y → X → Z) to the provided matrix.
     *
     * @param parent - Incoming model-view matrix (required for composition)
     * @returns The rotated model-view matrix
     */
    public rotate(parent: mat4): mat4 {
        let mv: mat4;
        if (parent) {
            mv = parent;
        }
        mv = mv.mult(rotateY(this.yaw));
        mv = mv.mult(rotateX(this.pitch));
        mv = mv.mult(rotateZ(this.roll));
        return mv;
    }

    /**
     * Expands a single color to a per-vertex color array for a face.
     *
     * @param color - The color to repeat
     * @param face - The face vertex array used to match the length
     * @returns A color array aligned to the number of vertices in the face
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
     * @param colors - Palette used cyclically
     * @param face - The face vertex array used to match the length
     * @returns A color array cycling through the provided palette
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
     */
    public draw(): void {
        this.gl.drawArrays(this.gl.TRIANGLES, this.startDrawing, this.vertexCount);
    }

    /** @returns Current world X translation. */
    public getX(): number {
        return this.x;
    }

    /** @returns Current world Y translation. */
    public getY(): number {
        return this.y;
    }

    /** @returns Current world Z translation. */
    public getZ(): number {
        return this.z;
    }

    /**
     * Sets absolute X translation.
     * @param nx - New X in world units
     */
    public setX(nx: number): void {
        this.x = nx;
    }

    /**
     * Sets absolute Y translation.
     * @param ny - New Y in world units
     */
    public setY(ny: number): void {
        this.y = ny;
    }

    /**
     * Sets absolute Z translation.
     * @param nz - New Z in world units
     */
    public setZ(nz: number): void {
        this.z = nz;
    }

    /**
     * Sets absolute yaw angle in degrees (rotation about +Y).
     * @param nt - New yaw in degrees
     */
    public setYaw(nt: number): void {
        this.yaw = nt;
    }

    /**
     * Adds to X translation.
     * @param nx - Delta X in world units
     */
    public addX(nx: number): void {
        this.x += nx;
    }

    /**
     * Adds to Y translation.
     * @param ny - Delta Y in world units
     */
    public addY(ny: number): void {
        this.y += ny;
    }

    /**
     * Adds to Z translation.
     * @param nz - Delta Z in world units
     */
    public addZ(nz: number): void {
        this.z += nz;
    }

    /**
     * Adds to yaw angle.
     * @param nt - Delta yaw in degrees
     */
    public addYaw(nt: number): void {
        this.yaw += nt;
    }

    /**
     * Adds to pitch angle.
     * @param np - Delta pitch in degrees
     */
    public addPitch(np: number): void {
        this.pitch += np;
    }

    /**
     * Adds to roll angle.
     * @param nr - Delta roll in degrees
     */
    public addRoll(nr: number): void {
        this.roll += nr;
    }

    /**
     * Sets the binding group identifier for this object.
     * @param bind - Group ID
     */
    public bind(bind: number): void {
        this.bindingGroup = bind;
    }

    /** @returns Current binding group identifier. */
    public getBinding(): number {
        return this.bindingGroup;
    }

    /** @returns Current yaw in degrees. */
    public getYaw(): number {
        return this.yaw;
    }

    /** @returns The number of vertices this object will draw. */
    public getVertexCount(): number {
        return this.vertexCount;
    }

    /**
     * Returns the object's world-space position as a homogeneous coordinate.
     * @returns `[x, y, z, 1]` as a {@link vec4}
     */
    public getPointInWorld(): vec4 {
        return new vec4(this.x, this.y, this.z);
    }

    private fovz:number = 0;
    private fovy:number = 0;
    private fovx:number = 0;

    public getFOVZ(): number {
        return this.fovz;
    }

    public getFOVY():number{
        return this.fovy;
    }

    public getFOVX():number{
        return this.fovx;
    }

    public setFOVZ(nv:number){
        this.fovz = nv;
    }

    public setFOVY(nf:number){
        this.fovy = nf;
    }

    public setFOVX(nv:number){
        this.fovx = nv;
    }



    /**
     * Advances the starting draw offset by `count` vertices.
     * Useful when appending geometry into a shared buffer.
     *
     * @param count - Number of vertices appended before this object
     */
    public addVerticesStartCount(count: number): void {
        this.startDrawing += count;
    }

    public getVerticesStartingPoint():number{
        return this.startDrawing;
    }

    /**
     * Must be implemented by subclasses to provide interleaved object data.
     *
     * @abstract
     * @returns Interleaved array in the form:
     * `[pos0, color0, pos1, color1, ...]` where each element is a {@link vec4}
     */
    public abstract getObjectData(): vec4[];

    /**
     * Interleaves position and color arrays for a single face.
     *
     * @param face - Array of vertex positions (vec4) for the face
     * @param color - Array of vertex colors (vec4) aligned with {@link face}
     * @returns Interleaved `[pos, color]` array suitable for VBO uploads
     * @protected
     */
    protected loadingArrayHelper(face: vec4[], color: vec4[]): vec4[] {
        const tempArr: vec4[] = [];
        for (let i = 0; i < face.length; i++) {
            tempArr.push(face[i]);
            tempArr.push(color[i]);
        }
        return tempArr;
    }
}