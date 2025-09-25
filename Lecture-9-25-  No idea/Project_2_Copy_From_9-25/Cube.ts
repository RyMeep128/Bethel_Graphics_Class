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
    
    private frontFaceColor: vec4[] = [];
    private backFaceColor: vec4[] = [];
    private leftFaceColor: vec4[] = [];
    private rightFaceColor: vec4[] = [];
    private topFaceColor: vec4[] = [];
    private bottomFaceColor: vec4[] = [];

    private width:number;
    private height:number;
    private depth:number;



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
    constructor(gl:WebGLRenderingContext, program: WebGLProgram,objectArr:RenderableObject[] ,width: number, height: number, depth: number, x:number = 0,y:number = 0 ,z:number = 0, pitch:number = 0, yaw:number = 0, roll:number = 0) {
        super(gl,program,objectArr,6,x,y,z,yaw,pitch,roll);
        let hx = width / 2;
        let hy = height / 2;
        let hz = depth / 2;
        this.width = width;
        this.height = height;
        this.depth = depth;


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
        this.frontFaceColor = this.helperColor(color,this.frontFace);
    }

    /** Sets/overwrites the back face color sentinel. */
    public setBackFaceColor(color: vec4) {
        this.backFaceColor = this.helperColor(color,this.backFace);
    }

    /** Sets/overwrites the left face color sentinel. */
    public setLeftFaceColor(color: vec4) {
        this.leftFaceColor = this.helperColor(color,this.leftFace);
    }

    /** Sets/overwrites the right face color sentinel. */
    public setRightFaceColor(color: vec4) {
        this.rightFaceColor = this.helperColor(color, this.topFace);
    }

    /** Sets/overwrites the top face color sentinel. */
    public setTopFaceColor(color: vec4) {
        this.topFaceColor = this.helperColor(color,this.topFace);
    }

    /** Sets/overwrites the bottom face color sentinel. */
    public setBottomFaceColor(color: vec4) {
        this.bottomFaceColor = this.helperColor(color,this.bottomFace);
    }

    /**
     * Assigns distinct colors to all six faces (sentinels at the end of each face array).
     * If colors had been assigned earlier, the previous sentinels are replaced.
     */
    public setColors(frontColor: vec4, backColor: vec4, topColor: vec4, bottomColor: vec4, rightColor:vec4, leftColor:vec4) {
        this.setFrontFaceColor(frontColor);
        this.setBackFaceColor(backColor);
        this.setLeftFaceColor(leftColor);
        this.setRightFaceColor(rightColor);
        this.setTopFaceColor(topColor);
        this.setBottomFaceColor(bottomColor);
    }

    /**
     * Assigns a single color to all faces (sentinels appended).
     * If colors had been assigned earlier, the previous sentinels are replaced.
     */
    public setAllColor(color:vec4){
        this.setFrontFaceColor(color);
        this.setBackFaceColor(color);
        this.setLeftFaceColor(color);
        this.setRightFaceColor(color);
        this.setTopFaceColor(color);
        this.setBottomFaceColor(color);
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

        tempArr.push(...this.loadingArrayHelper(this.frontFace,this.frontFaceColor));
        tempArr.push(...this.loadingArrayHelper(this.backFace,this.backFaceColor));
        tempArr.push(...this.loadingArrayHelper(this.topFace,this.topFaceColor));
        tempArr.push(...this.loadingArrayHelper(this.bottomFace,this.bottomFaceColor));
        tempArr.push(...this.loadingArrayHelper(this.leftFace,this.leftFaceColor));
        tempArr.push(...this.loadingArrayHelper(this.rightFace,this.rightFaceColor));

        return tempArr;

    }

    public getDepth():number{
        return this.depth;
    }

    public getHeight():number{
        return this.height;
    }

    public getWidth():number{
        return this.width;
    }




}
