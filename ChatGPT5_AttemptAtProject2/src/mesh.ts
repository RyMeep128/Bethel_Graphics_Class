import type { GL } from "./gl.js";

/** Interleaved position (x,y,z,w) and color (r,g,b,a) */
export class Mesh {
    private gl: GL;
    private vao: WebGLVertexArrayObject;
    private vbo: WebGLBuffer;
    private count: number;
    private mode: number;

    constructor(
        gl: GL,
        interleaved: Float32Array,
        public positionOffsetFloats: number,
        public colorOffsetFloats: number,
        public strideFloats: number,
        count: number,
        mode: number = gl.TRIANGLES
    ) {
        this.gl = gl;
        this.count = count;
        this.mode = mode;

        this.vao = gl.createVertexArray()!;
        this.vbo = gl.createBuffer()!;
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, interleaved, gl.STATIC_DRAW);
    }

    bindAttributes(posLoc: number, colLoc: number) {
        const gl = this.gl;
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        const stride = this.strideFloats * 4;
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 4, gl.FLOAT, false, stride, this.positionOffsetFloats * 4);

        gl.enableVertexAttribArray(colLoc);
        gl.vertexAttribPointer(colLoc, 4, gl.FLOAT, false, stride, this.colorOffsetFloats * 4);
    }

    draw() {
        this.gl.drawArrays(this.mode, 0, this.count);
    }

    static rect(gl: GL, w: number, h: number, color: [number,number,number,number]): Mesh {
        // Centered rectangle in XY plane at z=0
        const x = w/2, y = h/2;
        const verts = [
            // triangle 1
            -x, -y, 0, 1,  color[0],color[1],color[2],color[3],
            x, -y, 0, 1,  color[0],color[1],color[2],color[3],
            x,  y, 0, 1,  color[0],color[1],color[2],color[3],
            // triangle 2
            -x, -y, 0, 1,  color[0],color[1],color[2],color[3],
            x,  y, 0, 1,  color[0],color[1],color[2],color[3],
            -x,  y, 0, 1,  color[0],color[1],color[2],color[3],
        ];
        return new Mesh(gl, new Float32Array(verts), 0, 4, 8, 6);
    }

    static circle(
        gl: GL,
        radius: number,
        segments: number,
        colorFn: (i: number) => [number,number,number,number]
    ): Mesh {
        const verts: number[] = [];
        for (let i=0; i<segments; ++i) {
            const a0 = (i / segments) * Math.PI * 2;
            const a1 = ((i+1) / segments) * Math.PI * 2;
            const c0 = colorFn(i);
            const c1 = colorFn(i);
            const c2 = colorFn(i);

            // triangle fan center at origin
            verts.push(
                0,0,0,1,  c0[0],c0[1],c0[2],c0[3],
                Math.cos(a0)*radius, Math.sin(a0)*radius, 0,1, c1[0],c1[1],c1[2],c1[3],
                Math.cos(a1)*radius, Math.sin(a1)*radius, 0,1, c2[0],c2[1],c2[2],c2[3]
            );
        }
        return new Mesh(gl, new Float32Array(verts), 0, 4, 8, segments * 3);
    }

    static spokes(gl: GL, radius: number, spokes: number, color: [number,number,number,number]): Mesh {
        // Spokes rendered as thin rectangles around center
        const verts: number[] = [];
        const spokeW = radius * 0.06;
        const half = spokeW / 2;
        const len = radius * 0.92;

        const addRect = (angle: number) => {
            // Make a thin axis-aligned rect then rotate in MV, so here we just build once:
            const c = color;
            const x = half, y = len / 2;
            const rect = [
                -x,-y,0,1, c[0],c[1],c[2],c[3],
                x,-y,0,1, c[0],c[1],c[2],c[3],
                x, y,0,1, c[0],c[1],c[2],c[3],

                -x,-y,0,1, c[0],c[1],c[2],c[3],
                x, y,0,1, c[0],c[1],c[2],c[3],
                -x, y,0,1, c[0],c[1],c[2],c[3],
            ];
            verts.push(...rect);
        };

        for (let i=0; i<spokes; ++i) addRect(0);
        // We'll rotate each spoke via per-spoke draw in object code (using matrix stack), not via single mesh.
        return new Mesh(gl, new Float32Array(verts), 0, 4, 8, spokes * 6);
    }
}
