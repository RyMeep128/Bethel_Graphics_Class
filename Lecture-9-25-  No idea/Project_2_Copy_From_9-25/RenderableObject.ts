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
    vec4
} from "./helperfunctions.js";
import * as util from "./util.js"
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
    protected gl: WebGLRenderingContext;
    /** Shader program whose attributes/uniforms are used by this object. */
    protected program: WebGLProgram;
    /** GPU buffer for this object's interleaved vertex + color data. */
    private bufferId:WebGLBuffer;
    /** index of model_view in shader program */
    protected umv:WebGLUniformLocation;

    /** Model translation on X (world units). */
    protected x: number;
    /** Model translation on Y (world units). */
    protected y: number;
    /** Model translation on Z (world units). */
    protected z: number;
    /** Yaw (degrees) for rotation about the +Y axis. */
    protected yaw: number;
    protected pitch: number;
    protected roll:number;

    /** Total number of vertices to draw for this object. */
    protected vertexCount:number;
    /** Number of faces; used by subclasses for invariants in color handling. */
    protected sides:number;

    private bindingGroup:number;

    protected color:vec4[];

    protected startDrawing:number;


    /**
     * Constructs a renderable object with initial identity transform
     * and default vertex bookkeeping.
     *
     * @param gl      WebGL context
     * @param program Compiled + linked shader program
     * @param objectArr
     * @param sides   Number of faces in the object (e.g., 6 for a cube)
     * @param x
     * @param y
     * @param z
     * @param yaw
     * @param pitch
     * @param roll
     */
    protected constructor(gl: WebGLRenderingContext,program: WebGLProgram, objectArr:RenderableObject[], sides:number, x:number = 0, y:number = 0, z:number = 0, yaw:number = 0, pitch:number = 0, roll:number = 0) {
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
     * Updates the model-view transform.
     * <p>Uses a fixed camera lookAt for now (positioned at (0,10,20)).</p>
     */
    public update(parent?: mat4):mat4{


        let mv:mat4 = this.view(parent);

        mv = this.translate(mv);

        mv = this.rotate(mv);

        this.updateGPUBuffer(mv);

        return mv;
    }

    public updateGPUBuffer(mv:mat4){
        this.gl.uniformMatrix4fv(this.umv, false, mv.flatten());
    }

    public view(parent?:mat4):mat4 {
        let mv: mat4 = parent ?? lookAt(new vec4(0, 10, 20, 1), new vec4(0, 0, 0, 1), new vec4(0, 1, 0, 0));
        return mv;

    }

    public translate(parent?: mat4):mat4{
        let mv:mat4;
        if(parent){
            mv = parent;
        }
        mv = mv.mult(translate(this.x,this.y,this.z));
        return mv;
    }

    public rotate(parent?: mat4):mat4{
        let mv:mat4;
        if(parent){
            mv = parent;
        }

        mv = mv.mult(rotateY(this.yaw));
        mv = mv.mult(rotateX(this.pitch));
        mv = mv.mult(rotateZ(this.roll));

        return mv;
    }






    protected helperColor(color:vec4, face:vec4[]):vec4[]{
        let tempArr:vec4[] = [];
        for (let i = 0; i < face.length; i++) {
            tempArr.push(color);
        }
        return tempArr;
    }

    protected helperGradientColor(colors:vec4[], face:vec4[]):vec4[]{
        let tempArr:vec4[] = [];
        for (let i = 0; i < face.length; i++) {
            tempArr.push(colors[i % colors.length])
        }
        return tempArr;
    }


    /**
     * Issues the draw call for this object.
     * <p><b>Ordering:</b> Must have already bound this object's buffer and uploaded attributes.</p>
     */
    public draw():void{
        this.gl.drawArrays(this.gl.TRIANGLES, this.startDrawing, this.vertexCount);
    }

    public getX():number{return this.x;}
    public getY():number{return this.y;}
    public getZ():number{return this.z;}

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

    public getVertexCount():number{ return this.vertexCount;}

    public getPointInWorld():vec4{ return new vec4(this.x,this.y,this.z)}

    public addVerticesStartCount(count:number):void{this.startDrawing +=count;}

    /**
     * Must be implemented by subclasses:
     * Return the full interleaved object data (positions + colors).
     */
    public abstract getObjectData():vec4[];

    protected loadingArrayHelper(face:vec4[],color:vec4[]):vec4[]{
        let tempArr:vec4[] = [];

        for (let i = 0; i < face.length; i++) {
            tempArr.push(face[i]);
            tempArr.push(color[i]);
        }

        return tempArr;

    }
}
