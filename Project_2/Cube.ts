import {flatten, lookAt, mat4, rotateY, translate, vec4} from "./helperfunctions.js";

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
export class Cube {

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

    /** WebGL context used for buffer management and drawing. */
    private gl: WebGLRenderingContext;
    /** Shader program whose attributes/uniforms are used by this cube. */
    private program: WebGLProgram;

    /** Model translation on X (world units). */
    private x: number;
    /** Model translation on Y (world units). */
    private y: number;
    /** Model translation on Z (world units). */
    private z: number;
    /** Yaw (degrees) for rotation about the +Y axis. */
    private theta: number;

    /** GPU buffer for this cube's interleaved vertex + color data. */
    private bufferId:WebGLBuffer;

    /** index of model_view in shader program */
    private umv:WebGLUniformLocation;

    /** Total number of vertices (positions) to draw for this cube. (6 per face × 6 faces = 36) */
    private vertexCount:number;

    /** Number of faces (always 6 for a cube); used for small invariants in color handling. */
    private sides:number;

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
    constructor(gl:WebGLRenderingContext, program: WebGLProgram,width: number, height: number, depth: number) {
        let hx = width / 2;
        let hy = height / 2;
        let hz = depth / 2;
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.theta = 0;
        this.gl = gl;
        this.program = program;
        this.vertexCount = 0;
        this.sides = 6;

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

        this.umv = gl.getUniformLocation(program, "modelViewMatrix");
    }

    /**
     * Uploads interleaved position/color data to the GPU and wires shader attributes to this cube's buffer.
     * <p><b>Order matters:</b> bind this buffer <i>before</i> calling vertexAttribPointer so attribute pointers latch this buffer.</p>
     * <p><b>Precondition:</b> call the face color setters (or {@link setColors}/{@link setAllColor}) prior to this method,
     * so each face array ends with its color sentinel.</p>
     */
    public bufferCube():void{
        //Lets gather all of our data into one spot
        const cubepoints:vec4[] = []
        cubepoints.push(...this.getObjectData());

        //we need some graphics memory for this information!
        this.bufferId = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bufferId);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(cubepoints), this.gl.STATIC_DRAW);

        // Attribute setup assumes interleaved layout: [pos vec4][color vec4], stride 32 bytes, offsets 0 and 16.
        let vColor = this.gl.getAttribLocation(this.program, "vColor");
        this.gl.vertexAttribPointer(vColor, 4, this.gl.FLOAT, false, 32, 16);
        this.gl.enableVertexAttribArray(vColor);

        let vPosition = this.gl.getAttribLocation(this.program, "vPosition");
        this.gl.vertexAttribPointer(vPosition, 4, this.gl.FLOAT, false, 32, 0);
        this.gl.enableVertexAttribArray(vPosition);
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
    public getObjectData():vec4[]{
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
    private loadingArrayHelper(face:vec4[]):vec4[]{
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

    /** Sets absolute X translation (world units). */
    public setX(nx:number):void{
        this.x = nx;
    }

    /** Sets absolute Y translation (world units). */
    public setY(ny:number):void{
        this.y = ny;
    }

    /** Sets absolute Z translation (world units). */
    public setZ(nz:number):void{
        this.z = nz;
    }

    /** Sets absolute yaw angle in degrees (rotation about +Y). */
    public setTheta(nt:number):void{
        this.theta = nt;
    }

    /** Adds to X translation (world units). */
    public addX(nx:number):void{
        this.x += nx;
    }

    /** Adds to Y translation (world units). */
    public addY(ny:number):void{
        this.y += ny;
    }

    /** Adds to Z translation (world units). */
    public addZ(nz:number):void{
        this.z += nz;
    }

    /** Adds to yaw angle in degrees (rotation about +Y). */
    public addTheta(nt:number):void{
        this.theta += nt;
    }

    /**
     * Builds model-view matrix from current pose and renders this cube.
     * <p><b>Note:</b> This method currently computes its own view via lookAt for convenience.
     * In a larger scene, prefer passing a shared view matrix from the main render loop.</p>
     */
    public updateAndRender():void{
        //Before we do anything lets double check we are using the right buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bufferId);

        let mv:mat4 = lookAt(new vec4(0,10,20,1), new vec4(0,0,0,1), new vec4(0,1,0,0));

        //multiplay translate matrix to the right of lookat Matrix
        mv = mv.mult(translate(this.x,this.y,this.z));
        mv = mv.mult(rotateY(this.theta));

        this.gl.uniformMatrix4fv(this.umv, false, mv.flatten());

        this.draw();
    }

    /**
     * Issues the draw call for this cube using its currently bound buffer and attribute setup.
     * <p><b>Ordering:</b> bind buffer → draw. Attribute pointers must already be wired to this buffer.</p>
     */
    private draw():void{
        //Before we do anything lets double check we are using the right buffer!
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bufferId);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertexCount);    // draw the cube
    }

}
