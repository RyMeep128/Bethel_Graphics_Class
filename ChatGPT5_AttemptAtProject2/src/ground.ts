import type { GL } from "./gl.js";
import { RenderObject, DrawContext } from "./renderObject.js";
import { Mesh } from "./mesh.js";

export class Ground extends RenderObject {
    private mesh: Mesh;
    constructor(gl: GL, width = 1.8, height = 1.2) {
        super("ground");
        // Muted grid-ish color; car stops at boundaries inside this rectangle.
        this.mesh = Mesh.rect(gl, width, height, [0.18,0.22,0.25,1]);
    }
    drawSelf(ctx: DrawContext): void {
        const { gl, attribs, uniforms, stack } = ctx;
        gl.uniformMatrix4fv(uniforms.modelViewMatrix, false, stack.top());
        this.mesh.bindAttributes(attribs.vPosition, attribs.vColor);
        this.mesh.draw();
    }
}
