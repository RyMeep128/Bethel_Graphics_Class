import {flatten, lookAt, mat4, rotateX, rotateY, rotateZ, translate, vec4} from "./helperfunctions.js";
import {rotate} from "../helperfunctions";

/**
 * @Author {Ryan Shafer}
 * @Author {Some comments added by ChatGPT Model 5}
 *
 * Abstract base class for renderable WebGL objects with:
 * - GPU buffer management
 * - Model transformations (translation + yaw rotation)
 * - A shared rendering pipeline (update + draw)
 *
 * Concrete subclasses (e.g., {@link Cube}) are expected to:
 * - Provide geometry + color data via {@link getObjectData}
 * - Implement {@link loadingArrayHelper} for face expansion into
 *   interleaved [position, color] data streams
 */
export abstract class RenderableObject {
    /** WebGL context used for buffer management and drawing. */
    private gl: WebGLRenderingContext;
    /** Shader program whose attributes/uniforms are used by this object. */
    private program: WebGLProgram;
    /** GPU buffer for this object's interleaved vertex + color data. */
    private bufferId:WebGLBuffer;
    /** index of model_view in shader program */
    private umv:WebGLUniformLocation;

    /** Model translation on X (world units). */
    private x: number;
    /** Model translation on Y (world units). */
    private y: number;
    /** Model translation on Z (world units). */
    private z: number;
    /** Yaw (degrees) for rotation about the +Y axis. */
    private yaw: number;
    private pitch: number;
    private roll:number;

    /** Total number of vertices to draw for this object. */
    protected vertexCount:number;
    /** Number of faces; used by subclasses for invariants in color handling. */
    protected sides:number;

    private bindingGroup:number;

    protected color:vec4[];

    /**
     * Constructs a renderable object with initial identity transform
     * and default vertex bookkeeping.
     *
     * @param gl      WebGL context
     * @param program Compiled + linked shader program
     * @param sides   Number of faces in the object (e.g., 6 for a cube)
     * @param x
     * @param y
     * @param z
     */
    protected constructor(gl: WebGLRenderingContext,program: WebGLProgram, sides:number, x:number = 0, y:number = 0, z:number = 0, yaw:number = 0, pitch:number = 0, roll:number = 0) {
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
    }

    /**
     * Uploads interleaved position/color data to the GPU.
     * <p><b>Note:</b> Subclasses must have appended color data before calling this,
     * so that {@link getObjectData} returns a valid interleaved stream.</p>
     */
    public bufferObject():void{
        const objectPoints:vec4[] = []
        objectPoints.push(...this.getObjectData());

        this.bufferId = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bufferId);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(objectPoints), this.gl.STATIC_DRAW);
    }

    /**
     * Updates the model-view transform.
     * <p>Uses a fixed camera lookAt for now (positioned at (0,10,20)).</p>
     */
    public update():void{
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bufferId);



        let mv:mat4 = lookAt(new vec4(0,10,20,1), new vec4(0,0,0,1), new vec4(0,1,0,0));

        mv = mv.mult(translate(this.x,this.y,this.z));

        mv = mv.mult(rotateY(this.yaw));
        mv = mv.mult(rotateX(this.pitch));
        mv = mv.mult(rotateZ(this.roll));

        // mv = mv.mult(rotate(this.yaw,new vec4(this.x,this.y,this.z)));


        this.gl.uniformMatrix4fv(this.umv, false, mv.flatten());
    }


    /**
     * Issues the draw call for this object.
     * <p><b>Ordering:</b> Must have already bound this object's buffer and uploaded attributes.</p>
     */
    public draw():void{
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bufferId);

        // Attribute setup assumes interleaved layout: [pos vec4][color vec4], stride 32 bytes
        let vColor = this.gl.getAttribLocation(this.program, "vColor");
        this.gl.vertexAttribPointer(vColor, 4, this.gl.FLOAT, false, 32, 16);
        this.gl.enableVertexAttribArray(vColor);

        let vPosition = this.gl.getAttribLocation(this.program, "vPosition");
        this.gl.vertexAttribPointer(vPosition, 4, this.gl.FLOAT, false, 32, 0);
        this.gl.enableVertexAttribArray(vPosition);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertexCount);
    }

    /** Sets absolute X translation (world units). */
    public setX(nx:number):void{ this.x = nx; }

    /** Sets absolute Y translation (world units). */
    public setY(ny:number):void{ this.y = ny; }

    /** Sets absolute Z translation (world units). */
    public setZ(nz:number):void{ this.z = nz; }

    /** Sets absolute yaw angle in degrees (rotation about +Y). */
    public setYaw(nt:number):void{ this.yaw = nt; }

    /** Adds to X translation (world units). */
    public addX(nx:number):void{ this.x += nx; }

    /** Adds to Y translation (world units). */
    public addY(ny:number):void{ this.y += ny; }

    /** Adds to Z translation (world units). */
    public addZ(nz:number):void{ this.z += nz; }

    /** Adds to yaw angle in degrees (rotation about +Y). */
    public addYaw(nt:number):void{ this.yaw += nt; }

    public addPitch(np:number):void {this.pitch += np}

    public addRoll(nr:number):void{ this.roll += nr; }

    public bind(bind:number):void{ this.bindingGroup = bind; }

    public getBinding():number{return this.bindingGroup;}

    public getYaw():number{ return this.yaw; }

    /**
     * Must be implemented by subclasses:
     * Return the full interleaved object data (positions + colors).
     */
    public abstract getObjectData():vec4[];

    /**
     * Must be implemented by subclasses:
     * Expand a face (6 vertices + 1 color sentinel) into interleaved [pos, color] pairs.
     */
    protected abstract loadingArrayHelper(face:vec4[]):vec4[];
}
