import type { GL } from "./gl.js";
import { MatrixStack } from "./math";
import { Mesh } from "./mesh.js";
import { RenderObject, DrawContext } from "./renderObject.js";

export class Wheel extends RenderObject {
    private rim: Mesh;
    private tire: Mesh;
    private spokeStrip: Mesh;

    public spinAngle = 0;         // radians, updated by car motion
    public steerAngle = 0;        // radians, for front wheels only
    public readonly radius: number;

    constructor(gl: GL, radius = 0.07) {
        super("wheel");
        this.radius = radius;
        // Tire: darker ring color; rim: brighter
        this.tire = Mesh.circle(gl, radius, 48, () => [0.08,0.08,0.10,1]);
        this.rim  = Mesh.circle(gl, radius*0.68, 48, () => [0.75,0.75,0.80,1]);
        // Spokes mesh (we will rotate it per spoke via matrix stack drawing)
        this.spokeStrip = Mesh.spokes(gl, radius*0.9, 6, [0.95,0.95,0.98,1]);
    }

    drawSelf(ctx: DrawContext): void {
        const { gl, attribs, uniforms, stack } = ctx;

        // Apply steering and spin (spin rotates spokes/rim visually)
        stack.rotateZ(this.steerAngle);
        // Tire
        gl.uniformMatrix4fv(uniforms.modelViewMatrix, false, stack.top());
        this.tire.bindAttributes(attribs.vPosition, attribs.vColor);
        this.tire.draw();

        // Rim
        gl.uniformMatrix4fv(uniforms.modelViewMatrix, false, stack.top());
        this.rim.bindAttributes(attribs.vPosition, attribs.vColor);
        this.rim.draw();

        // Spokes: rotate the whole spoke strip by spinAngle, and then fan multiple times
        stack.push();
        stack.rotateZ(this.spinAngle);
        gl.uniformMatrix4fv(uniforms.modelViewMatrix, false, stack.top());
        this.spokeStrip.bindAttributes(attribs.vPosition, attribs.vColor);
        this.spokeStrip.draw();
        stack.pop();
    }
}
