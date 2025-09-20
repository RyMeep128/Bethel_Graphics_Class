import { vec4 } from "./helperfunctions.js";

/**
 * Big square ground on the XZ plane (y = 0), colored checker so motion is readable.
 * Drawn as two triangles.
 */
export class Ground {
    private vao: WebGLVertexArrayObject;
    private vboPos: WebGLBuffer;
    private vboCol: WebGLBuffer;
    private vertexCount = 6;

    constructor(gl: WebGL2RenderingContext, aPosLoc: number, aColLoc: number) {
        const size = 2.0; // covers -1..1 with a hair of margin
        const y = 0.0;

        // Positions: two triangles (counter-clockwise)
        const positions = new Float32Array([
            -size, y, -size, 1,   size, y, -size, 1,   size, y,  size, 1,
            -size, y, -size, 1,   size, y,  size, 1,  -size, y,  size, 1,
        ]);

        // Colors: alternate to create a simple 2x3 checker
        const c1 = [0.12, 0.32, 0.18, 1];
        const c2 = [0.08, 0.25, 0.14, 1];
        const colors = new Float32Array([
            ...c1, ...c2, ...c1,
            ...c2, ...c1, ...c2
        ]);

        // VAO
        this.vao = gl.createVertexArray()!;
        gl.bindVertexArray(this.vao);

        // Position VBO
        this.vboPos = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboPos);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(aPosLoc);
        gl.vertexAttribPointer(aPosLoc, 4, gl.FLOAT, false, 0, 0);

        // Color VBO
        this.vboCol = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboCol);
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(aColLoc);
        gl.vertexAttribPointer(aColLoc, 4, gl.FLOAT, false, 0, 0);

        gl.bindVertexArray(null);
    }

    draw(gl: WebGL2RenderingContext): void {
        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
        gl.bindVertexArray(null);
    }
}
