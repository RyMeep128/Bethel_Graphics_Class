import {
    mat4,
    rotateX,
    rotateY,
    rotateZ,
    translate,
    vec4,
} from "../../../Utility/helperfunctions.js";

/**
 * Abstract base class for renderable WebGL objects.
 *
 * Provides:
 * - GPU uniform updates for the model-view matrix
 * - Basic model transforms (translate + yaw/pitch/roll)
 * - A common update/draw lifecycle
 *
 * Subclasses (e.g., {@link Sphere}) must:
 * - Supply geometry/color data via {@link getObjectData}
 * - Use {@link loadingArrayHelper} to interleave [position, normal, texCoord] streams
 *
 * @abstract
 * @class RenderableObject
 * @author Ryan Shafer
 * @author Some comments by ChatGPT Model 5
 */
export abstract class RenderableObject {
    /** WebGL2 context used for buffer management and drawing. */
    protected gl: WebGL2RenderingContext;

    /** Linked shader program whose attributes/uniforms are consumed by this object. */
    protected shader: WebGLProgram;

    /**
     * GPU buffer for this object's interleaved vertex data.
     * @remarks Declared for potential VBO management by subclasses.
     */
    private bufferId: WebGLBuffer;

    /** Location of the `model_view` uniform in the shader program. */
    protected umv: WebGLUniformLocation;

    /** Location of the per-object color uniform `uColor` in the shader program. */
    protected uColor: WebGLUniformLocation;

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

    /** World-space orbit rotation (applied before local translate/rotate). */
    protected orbitYaw: number = 0;    // rotate about +Y in world
    protected orbitPitch: number = 0;  // rotate about +X in world
    protected orbitRoll: number = 0;   // rotate about +Z in world


    /** Total number of vertices to draw for this object. */
    protected vertexCount: number;

    /**
     * Number of faces; used by subclasses for invariants in color handling
     * (e.g., 6 for a cube).
     */
    protected sides: number;

    /** Optional binding group identifier (e.g., for batched binding). */
    private bindingGroup: number;

    /**
     * Per-object RGBA color used when rendering.
     * Typically sent to the shader via `uColor`.
     */
    protected color: vec4;

    /**
     * Starting vertex offset into the global draw stream.
     * Useful when multiple objects share a single VBO and are drawn with offsets.
     */
    protected startDrawing: number;

    /**
     * Attribute location for the per-vertex specular color (`vSpecularColor`).
     * Used to override the shader attribute with a constant per-object value.
     */
    protected aSpecColor: GLint;

    /**
     * Attribute location for the per-vertex specular exponent (`vSpecularExponent`).
     * Used to override the shader attribute with a constant shininess value.
     */
    protected aSpecExp: GLint;

    protected udrawEnabled: WebGLUniformLocation;

    /**
     * Constructs a renderable object with initial transform and draw bookkeeping.
     *
     * @param {WebGL2RenderingContext} gl - WebGL2 context.
     * @param {WebGLProgram} shader - Compiled & linked shader program.
     * @param {RenderableObject[]} objectArr - Already-constructed renderables; used to compute this object's starting draw offset.
     * @param {number} sides - Number of faces in the object (e.g., 6 for a cube).
     * @param {number} [x=0] - Initial world X translation.
     * @param {number} [y=0] - Initial world Y translation.
     * @param {number} [z=0] - Initial world Z translation.
     * @param {number} [yaw=0] - Initial yaw in degrees.
     * @param {number} [pitch=0] - Initial pitch in degrees.
     * @param {number} [roll=0] - Initial roll in degrees.
     * @protected
     */
    protected constructor(
        gl: WebGL2RenderingContext,
        shader: WebGLProgram,
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
        this.shader = shader;
        this.sides = sides;
        this.umv = gl.getUniformLocation(shader, "model_view");
        this.aSpecColor = gl.getAttribLocation(shader, "vSpecularColor");
        this.aSpecExp = gl.getAttribLocation(shader, "vSpecularExponent");
        this.uColor = gl.getUniformLocation(shader, "uColor");
        this.udrawEnabled = gl.getUniformLocation(shader,"drawEnabled");

        // Compute starting vertex offset by summing all previous objects' vertex counts.
        this.startDrawing = 0;
        for (let i = 0; i < objectArr.length; i++) {
            this.startDrawing += objectArr[i].getVertexCount();
        }
    }

    /**
     * Sets the per-object RGBA color used for rendering.
     *
     * @param {vec4} color - New color as a vec4 `[r, g, b, a]`.
     * @returns {void}
     */
    public setColor(color: vec4): void {
        this.color = color;
    }

    /**
     * Updates the model-view transform and pushes it to the GPU.
     *
     * @remarks
     * Assumes the caller supplies a valid incoming parent model-view matrix.
     *
     * @param {mat4} parent - Parent model-view matrix.
     * @returns {mat4} The final model-view matrix after translate/rotate.
     */
    public update(parent: mat4): mat4 {
        // World-space orbit rotation first
        let mv = this.applyOrbit(parent);

        // Then local transform (position + local spin)
        mv = this.translate(mv);
        mv = this.rotate(mv);

        this.updateGPUBuffer(mv);
        return mv;
    }


    /**
     * Uploads the model-view matrix to the `model_view` shader uniform.
     *
     * @param {mat4} mv - Model-view matrix to upload.
     * @returns {void}
     */
    public updateGPUBuffer(mv: mat4): void {
        this.gl.useProgram(this.shader);
        const current = this.gl.getParameter(this.gl.CURRENT_PROGRAM) as WebGLProgram;

        if (current !== this.shader) {
            console.error("Program mismatch in updateGPUBuffer",
                { current, objectProgram: this.shader, umv: this.umv });
        }

        if (!this.umv) {
            console.error("model_view uniform location is null for this.program");
            return;
        }

        this.gl.uniformMatrix4fv(this.umv, false, mv.flatten());
    }

    /**
     * Applies translation to the provided matrix.
     *
     * @param {mat4} [parent] - Incoming model-view matrix (required in normal usage).
     * @returns {mat4} The translated model-view matrix.
     *
     * @remarks
     * This method expects a valid `parent` matrix to be provided by the caller.
     */
    public translate(parent?: mat4): mat4 {
        let mv: mat4;
        if (parent) {
            mv = parent;
        }
        // mv is expected to be provided by caller; see remark above.
        mv = mv.mult(translate(this.x, this.y, this.z));
        return mv;
    }

    /**
     * Applies yaw, pitch, and roll (Y → X → Z) to the provided matrix.
     *
     * @param {mat4} parent - Incoming model-view matrix (required for composition).
     * @returns {mat4} The rotated model-view matrix.
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
     * @param {vec4} color - The color to repeat.
     * @param {vec4[]} face - The face vertex array used to match the length.
     * @returns {vec4[]} A color array aligned to the number of vertices in the face.
     * @protected
     */
    protected helperColor(color: vec4, face: vec4[]): vec4[] {
        const tempArr: vec4[] = [];
        for (let i = 0; i < face.length; i++) {
            tempArr.push(color);
        }
        return tempArr;
    }

    protected drawEnabled:number;

    public setDrawEnabled(bool):void {
        if(bool){
            this.drawEnabled = 1;
        }else{
            this.drawEnabled = 0;
        }
    }


    /**
     * Issues the draw call for this object.
     *
     * @remarks
     * - Assumes buffers/attributes are already bound and populated elsewhere.
     * - Sets constant specular color and exponent via vertex attribute overrides.
     *
     * @returns {void}
     */
    public draw(): void {
        this.gl.uniform4f(this.uColor, this.color[0], this.color[1], this.color[2], this.color[3]);
        this.gl.uniform1i(this.udrawEnabled,this.drawEnabled)
        // if (this.texture) {
        //     this.gl.bindTexture(gl.TEXTURE_2D, this.texture);
        // } else {
        //     this.gl.bindTexture(gl.TEXTURE_2D, whiteTexture);
        // }

        const specularColor = new vec4(1, 1, 1, 1);
        const specularExp = 10;

        if (this.aSpecColor !== -1) {
            this.gl.disableVertexAttribArray(this.aSpecColor);
            this.gl.vertexAttrib4f(
                this.aSpecColor,
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

    /**
     * Resets all rotation components (yaw, pitch, roll) back to zero.
     *
     * @returns {void}
     */
    public resetRotation(): void {
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
     * @param {number} nx - New X in world units.
     * @returns {void}
     */
    public setX(nx: number): void {
        this.x = nx;
    }

    /**
     * Sets absolute Y translation.
     * @param {number} ny - New Y in world units.
     * @returns {void}
     */
    public setY(ny: number): void {
        this.y = ny;
    }

    /**
     * Sets absolute Z translation.
     * @param {number} nz - New Z in world units.
     * @returns {void}
     */
    public setZ(nz: number): void {
        this.z = nz;
    }

    /**
     * Sets absolute yaw angle in degrees (rotation about +Y).
     * @param {number} nt - New yaw in degrees.
     * @returns {void}
     */
    public setYaw(nt: number): void {
        this.yaw = nt;
    }

    /**
     * Sets absolute pitch angle in degrees (rotation about +X).
     *
     * @param {number} pitch - New pitch in degrees.
     * @returns {void}
     */
    public setPitch(pitch: number): void {
        this.pitch = pitch;
    }

    /**
     * Adds to X translation.
     * @param {number} nx - Delta X in world units.
     * @returns {void}
     */
    public addX(nx: number): void {
        this.x += nx;
    }

    /**
     * Adds to Y translation.
     * @param {number} ny - Delta Y in world units.
     * @returns {void}
     */
    public addY(ny: number): void {
        this.y += ny;
    }

    /**
     * Adds to Z translation.
     * @param {number} nz - Delta Z in world units.
     * @returns {void}
     */
    public addZ(nz: number): void {
        this.z += nz;
    }

    /**
     * Adds to yaw angle.
     * @param {number} nt - Delta yaw in degrees.
     * @returns {void}
     */
    public addYaw(nt: number): void {
        this.yaw += nt;
    }

    /**
     * Adds to pitch angle.
     * @param {number} np - Delta pitch in degrees.
     * @returns {void}
     */
    public addPitch(np: number): void {
        this.pitch += np;
    }

    /**
     * Adds to roll angle.
     * @param {number} nr - Delta roll in degrees.
     * @returns {void}
     */
    public addRoll(nr: number): void {
        this.roll += nr;
    }

    /**
     * Sets the binding group identifier for this object.
     * @param {number} bind - Group ID.
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
     * @returns {vec4} `[x, y, z, 1]` as a {@link vec4}.
     */
    public getPointInWorld(): vec4 {
        return new vec4(this.x, this.y, this.z);
    }

    /**
     * Advances the starting draw offset by `count` vertices.
     * Useful when appending geometry into a shared buffer.
     *
     * @param {number} count - Number of vertices appended before this object.
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
     * Sets world-space orbit yaw in degrees (rotation about +Y *before* local translate).
     * @param {number} angle - New orbit yaw in degrees.
     */
    public setOrbitYaw(angle: number): void {
        this.orbitYaw = angle;
    }

    /**
     * Sets world-space orbit pitch in degrees (rotation about +X *before* local translate).
     * @param {number} angle - New orbit pitch in degrees.
     */
    public setOrbitPitch(angle: number): void {
        this.orbitPitch = angle;
    }

    /**
     * Sets world-space orbit roll in degrees (rotation about +Z *before* local translate).
     * @param {number} angle - New orbit roll in degrees.
     */
    public setOrbitRoll(angle: number): void {
        this.orbitRoll = angle;
    }

    /** Adds to world-space orbit yaw. */
    public addOrbitYaw(delta: number): void {
        this.orbitYaw += delta;
    }

    /** Adds to world-space orbit pitch. */
    public addOrbitPitch(delta: number): void {
        this.orbitPitch += delta;
    }

    /** Adds to world-space orbit roll. */
    public addOrbitRoll(delta: number): void {
        this.orbitRoll += delta;
    }


    /**
     * Applies world-space orbit rotation (Y → X → Z) to the parent matrix.
     *
     * @remarks
     * This is done BEFORE local translation/rotation, so changing orbit angles
     * makes the object move in a circular path around the world origin.
     *
     * @param {mat4} parent - Incoming model-view matrix.
     * @returns {mat4} The rotated matrix.
     */
    protected applyOrbit(parent: mat4): mat4 {
        let mv: mat4 = parent;

        // If all orbit angles are zero, this is essentially a no-op.
        if (this.orbitYaw === 0 && this.orbitPitch === 0 && this.orbitRoll === 0) {
            return mv;
        }

        mv = mv.mult(rotateY(this.orbitYaw));
        mv = mv.mult(rotateX(this.orbitPitch));
        mv = mv.mult(rotateZ(this.orbitRoll));

        return mv;
    }

    /** Absolute orbit yaw in degrees (rotation in world space before local yaw). */
    public getOrbitYaw(): number {
        return this.orbitYaw;
    }

    /** Absolute orbit pitch in degrees (rotation in world space before local pitch). */
    public getOrbitPitch(): number {
        return this.orbitPitch;
    }

    /** Absolute orbit roll in degrees (rotation in world space before local roll). */
    public getOrbitRoll(): number {
        return this.orbitRoll;
    }



    /**
     * Must be implemented by subclasses to provide interleaved object data.
     *
     * @abstract
     * @returns {vec4[]} Interleaved array in the form:
     *   [pos0, normal0, tex0,
     *    pos1, normal1, tex1,
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

        // World-space orbit first
        m = this.applyOrbit(m);

        // Then local transform
        m = m.mult(translate(this.x, this.y, this.z));
        m = m.mult(rotateY(this.yaw));
        m = m.mult(rotateX(this.pitch));
        m = m.mult(rotateZ(this.roll));
        return m;
    }


    /**
     * Helper that interleaves per-vertex attributes into a single array:
     * position, normal, and texture coordinates.
     *
     * Layout per vertex:
     * - `face[i]`     → position
     * - `normals[i]`  → normal
     * - `texcoords[i]`→ texture coordinates (uv, stored in a vec4)
     *
     * @param {vec4[]} face - Array of position vectors.
     * @param {vec4[]} normals - Array of normal vectors corresponding to `face`.
     * @param {vec4[]} texcoords - Array of texture coordinates corresponding to `face`.
     * @returns {vec4[]} Interleaved array `[pos, normal, texcoord, ...]`.
     * @protected
     */
    protected loadingArrayHelper(
        face: vec4[],
        normals: vec4[],
        texcoords: vec4[]
    ): vec4[] {
        const temp: vec4[] = [];
        for (let i = 0; i < face.length; i++) {
            temp.push(face[i]);       // pos
            temp.push(normals[i]);    // normal
            temp.push(texcoords[i]);  // uv (xy only)
        }
        return temp;
    }

    /**
     * Sets absolute roll angle in degrees (rotation about +Z).
     *
     * @param {number} roll - New roll in degrees.
     * @returns {void}
     */
    public setRoll(roll: number): void {
        this.roll = roll;
    }


}
