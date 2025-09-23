import {flatten, lookAt, mat4, rotateY, translate, vec4} from "./helperfunctions.js";
import {RenderableObject} from "./RenderableObject.js";

/**
 * @Author{Ryan Shafer}
 * @Author{Some Comments by ChatGPT Model 5}
 *
 * Represents a renderable, transformable cube with per-face colors.
 * <p>
 * Geometry is stored per face as 6 triangle vertices + a single "color sentinel"
 * appended to the end of each face array. Buffer data is uploaded interleaved
 * as [position vec4][color vec4] per vertex (stride 32 bytes; offsets 0/16).
 * </p>
 *
 * <h4>Rendering pipeline expectations</h4>
 * <ul>
 *   <li>Projection & view are scene-wide; this class builds a model-view matrix internally.</li>
 *   <li>Caller must have called <code>gl.useProgram(program)</code> before any draw.</li>
 *   <li>Call a face-color setter (or {@link setColors}/{@link setAllColor}) before {@link bufferCube} so the sentinel exists.</li>
 * </ul>
 */
export class Cube extends RenderableObject{

    /** Accumulates 6 triangle vertices + 1 final color vec4 sentinel (index = length-1). */
    private frontFace: vec4[] = [];
    /** Accumulates 6 triangle vertices + 1 final color vec4 sentinel (index = length-1). */
    private backFace: vec4[] = [];
    /** Accumulates 6 triangle vertices + 1 final color vec4 sentinel (index = length-1). */
    private leftFace: vec4[] = [];
    /** Accumulates 6 triangle vertices + 1 final color vec4 sentinel (index = length-1). */
    private rightFace: vec4[] = [];
    /** Accumulates 6 triangle vertices + 1 final color vec4 sentinel (index = length-1). */
    private topFace: vec4[] = [];
    /** Accumulates 6 triangle vertices + 1 final color vec4 sentinel (index = length-1). */
    private bottomFace: vec4[] = [];




    /**
     * Constructs a cube of dimensions (width, height, depth) centered at the origin in model space.
     * Initializes per-face vertex lists and counts; default pose is identity (no translation/rotation).
     *
     * @param gl      WebGL context
     * @param program Compiled & linked shader program
     * @param width   Cube width (x-span)
     * @param height  Cube height (y-span)
     * @param depth   Cube depth (z-span)
     */
    constructor(gl:WebGLRenderingContext, program: WebGLProgram,width: number, height: number, depth: number, x:number = 0,y:number = 0 ,z:number = 0, pitch:number = 0, yaw:number = 0, roll:number = 0) {
        super(gl,program,6,x,y,z,yaw,pitch,roll);
        let hx = width / 2;
        let hy = height / 2;
        let hz = depth / 2;


        // Build 6 faces as two triangles each (6 vertices per face). Color sentinel pushed later.
        this.frontFace.push(new vec4(hx, -hy, hz, 1.0));
        this.frontFace.push(new vec4(hx, hy, hz, 1.0));
        this.frontFace.push(new vec4(-hx, hy, hz, 1.0));
        this.frontFace.push(new vec4(-hx, hy, hz, 1.0));
        this.frontFace.push(new vec4(-hx, -hy, hz, 1.0));
        this.frontFace.push(new vec4(hx, -hy, hz, 1.0));
        this.vertexCount+=6;

        this.backFace.push(new vec4(-hx, -hy, -hz, 1.0));
        this.backFace.push(new vec4(-hx, hy, -hz, 1.0));
        this.backFace.push(new vec4(hx, hy, -hz, 1.0));
        this.backFace.push(new vec4(hx, hy, -hz, 1.0));
        this.backFace.push(new vec4(hx, -hy, -hz, 1.0));
        this.backFace.push(new vec4(-hx, -hy, -hz, 1.0));
        this.vertexCount+=6;

        this.leftFace.push(new vec4(hx, hy, hz, 1.0));
        this.leftFace.push(new vec4(hx, -hy, hz, 1.0));
        this.leftFace.push(new vec4(hx, -hy, -hz, 1.0));
        this.leftFace.push(new vec4(hx, -hy, -hz, 1.0));
        this.leftFace.push(new vec4(hx, hy, -hz, 1.0));
        this.leftFace.push(new vec4(hx, hy, hz, 1.0));
        this.vertexCount+=6;

        this.rightFace.push(new vec4(-hx, hy, -hz, 1.0));
        this.rightFace.push(new vec4(-hx, -hy, -hz, 1.0));
        this.rightFace.push(new vec4(-hx, -hy, hz, 1.0));
        this.rightFace.push(new vec4(-hx, -hy, hz, 1.0));
        this.rightFace.push(new vec4(-hx, hy, hz, 1.0));
        this.rightFace.push(new vec4(-hx, hy, -hz, 1.0));
        this.vertexCount+=6;

        this.topFace.push(new vec4(hx, hy, hz, 1.0));
        this.topFace.push(new vec4(hx, hy, -hz, 1.0));
        this.topFace.push(new vec4(-hx, hy, -hz, 1.0));
        this.topFace.push(new vec4(-hx, hy, -hz, 1.0));
        this.topFace.push(new vec4(-hx, hy, hz, 1.0));
        this.topFace.push(new vec4(hx, hy, hz, 1.0));
        this.vertexCount+=6;

        this.bottomFace.push(new vec4(hx, -hy, -hz, 1.0));
        this.bottomFace.push(new vec4(hx, -hy, hz, 1.0));
        this.bottomFace.push(new vec4(-hx, -hy, hz, 1.0));
        this.bottomFace.push(new vec4(-hx, -hy, hz, 1.0));
        this.bottomFace.push(new vec4(-hx, -hy, -hz, 1.0));
        this.bottomFace.push(new vec4(hx, -hy, -hz, 1.0));
        this.vertexCount+=6;
    }



    /**
     * Sets/overwrites the color sentinel for the front face.
     * If a color was already assigned, the previous sentinel is replaced.
     * @param color RGBA color as vec4 (0..1)
     */
    public setFrontFaceColor(color: vec4) {
        if(this.frontFace.length == this.vertexCount / this.sides + 1){
            this.frontFace.pop();
            this.frontFace.push(color);
        }else{
            this.frontFace.push(color);
        }
    }

    /** Sets/overwrites the back face color sentinel. */
    public setBackFaceColor(color: vec4) {
        if(this.backFace.length == this.vertexCount / this.sides + 1){
            this.backFace.pop();
            this.backFace.push(color);
        }else{
            this.backFace.push(color);
        }
    }

    /** Sets/overwrites the left face color sentinel. */
    public setLeftFaceColor(color: vec4) {
        if(this.leftFace.length == this.vertexCount / this.sides + 1){
            this.leftFace.pop();
            this.leftFace.push(color);
        }else{
            this.leftFace.push(color);
        }
    }

    /** Sets/overwrites the right face color sentinel. */
    public setRightFaceColor(color: vec4) {
        if(this.rightFace.length == this.vertexCount / this.sides + 1){
            this.rightFace.pop();
            this.rightFace.push(color);
        }else{
            this.rightFace.push(color);
        }
    }

    /** Sets/overwrites the top face color sentinel. */
    public setTopFaceColor(color: vec4) {
        if(this.topFace.length == this.vertexCount / this.sides + 1){
            this.topFace.pop();
            this.topFace.push(color);
        }else{
            this.topFace.push(color);
        }
    }

    /** Sets/overwrites the bottom face color sentinel. */
    public setBottomFaceColor(color: vec4) {
        if(this.bottomFace.length == this.vertexCount / this.sides+ 1){
            this.bottomFace.pop();
            this.bottomFace.push(color);
        }else{
            this.bottomFace.push(color);
        }
    }

    /**
     * Assigns distinct colors to all six faces (sentinels at the end of each face array).
     * If colors had been assigned earlier, the previous sentinels are replaced.
     */
    public setColors(frontColor: vec4, backColor: vec4, topColor: vec4, bottomColor: vec4, rightColor:vec4, leftColor:vec4) {
        if(this.frontFace.length == this.vertexCount / this.sides + 1){
            this.frontFace.pop();
            this.backFace.pop();
            this.topFace.pop();
            this.bottomFace.pop();
            this.rightFace.pop();
            this.leftFace.pop();
        }
        this.frontFace.push(frontColor);
        this.backFace.push(backColor);
        this.topFace.push(topColor);
        this.bottomFace.push(bottomColor);
        this.rightFace.push(rightColor);
        this.leftFace.push(leftColor);

    }

    /**
     * Assigns a single color to all faces (sentinels appended).
     * If colors had been assigned earlier, the previous sentinels are replaced.
     */
    public setAllColor(color:vec4){
        if(this.frontFace.length == this.vertexCount / this.sides + 1) {
            this.frontFace.pop();
            this.backFace.pop();
            this.topFace.pop();
            this.bottomFace.pop();
            this.rightFace.pop();
            this.leftFace.pop();
        }
        this.frontFace.push(color);
        this.backFace.push(color);
        this.topFace.push(color);
        this.bottomFace.push(color);
        this.rightFace.push(color);
        this.leftFace.push(color);
    }

    /**
     * Builds the full interleaved vertex stream for this cube (positions paired with their face color).
     * <p>Implementation detail: each face array ends with a color sentinel; for each of the 6 vertices
     * we pair the position with the sentinel color to form the interleaved stream.</p>
     *
     * @returns A flat array of vec4s, ordered as [pos, color, pos, color, ...] per vertex.
     */
    public override getObjectData():vec4[]{
        let tempArr:vec4[] = [];

        tempArr.push(...this.loadingArrayHelper(this.frontFace));
        tempArr.push(...this.loadingArrayHelper(this.backFace));
        tempArr.push(...this.loadingArrayHelper(this.topFace));
        tempArr.push(...this.loadingArrayHelper(this.bottomFace));
        tempArr.push(...this.loadingArrayHelper(this.leftFace));
        tempArr.push(...this.loadingArrayHelper(this.rightFace));

        return tempArr;

    }

    /**
     * Helper to expand a single face into interleaved [pos, color] vec4 pairs.
     * <p><b>Precondition:</b> face must contain 6 position vec4s followed by exactly 1 color vec4 sentinel
     * (length == vertexCount/sides + 1). The loop intentionally avoids the last element (the color)
     * and pairs each position with that final color.</p>
     *
     * @throws Error if the face is missing its color sentinel.
     */
    protected override loadingArrayHelper(face:vec4[]):vec4[]{
        if(face.length != this.vertexCount / this.sides + 1){
            throw new Error("A color has not been assigned to one of this objects Face's");
        }
        let tempArr:vec4[] = [];
        //we don't go all the way through the array.
        for (let i = 0; i < face.length-1; i++) {
            tempArr.push(face[i]);
            tempArr.push(face[face.length-1]);
        }

        return tempArr;

    }




}
