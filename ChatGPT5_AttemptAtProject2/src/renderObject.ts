import type { GL } from "./gl.js";
import { MatrixStack, Mat4, I4 } from "./math.js";
import { Mesh } from "./mesh.js";

export interface DrawContext {
    gl: GL;
    attribs: { vPosition: number; vColor: number; };
    uniforms: { modelViewMatrix: WebGLUniformLocation; projectionMatrix: WebGLUniformLocation; };
    stack: MatrixStack;
}

export abstract class RenderObject {
    protected children: RenderObject[] = [];
    constructor(public name: string = "object") {}

    add(child: RenderObject) { this.children.push(child); return this; }

    abstract drawSelf(ctx: DrawContext): void;

    draw(ctx: DrawContext) {
        ctx.stack.push();
        this.drawSelf(ctx);
        for (const c of this.children) c.draw(ctx);
        ctx.stack.pop();
    }
}

/** A simple colored rectangle piece (used for car sides, ground, etc.) */
export class RectNode extends RenderObject {
    constructor(name: string, private mesh: Mesh, private xf: (s: MatrixStack)=>void) {
        super(name);
    }
    drawSelf(ctx: DrawContext): void {
        const { gl, attribs, uniforms, stack } = ctx;
        stack.push();
        this.xf(stack);
        gl.uniformMatrix4fv(uniforms.modelViewMatrix, false, stack.top());
        this.mesh.bindAttributes(attribs.vPosition, attribs.vColor);
        this.mesh.draw();
        stack.pop();
    }
}
