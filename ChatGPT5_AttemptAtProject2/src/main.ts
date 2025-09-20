import { createGL, makeProgram, getLocations } from "./gl.js";
import { MatrixStack, I4, ortho2D } from "./math.js";
import { Mesh } from "./mesh.js";
import { Car } from "./car.js";
import { Ground } from "./ground.js";
import { attachInput } from "./input.js";

function getShaderSource(id: string): string {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Shader not found: ${id}`);
    return (el as HTMLScriptElement).textContent || "";
}

function run() {
    const canvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
    const gl = createGL(canvas);

    const vsSource = getShaderSource("vertex-shader");
    const fsSource = getShaderSource("fragment-shader");
    const program = makeProgram(gl, vsSource, fsSource);
    gl.useProgram(program);

    const { attribs, uniforms } = getLocations(gl, program);

    // Scene graph
    const stack = new MatrixStack();

    // Projection: default orthographic to keep coords in [-1,1]
    const proj = ortho2D(-1, 1, -1, 1);
    gl.uniformMatrix4fv(uniforms.projectionMatrix, false, proj);

    // Create actors
    const ground = new Ground(gl, 1.8, 1.2);
    const car = new Car(gl);

    // Input
    attachInput(car, canvas);

    // Provide attributes to meshes on first draw call (done in their draw)
    // Animation loop
    let last = performance.now();

    const stageHalfW = 1.8/2;
    const stageHalfH = 1.2/2;

    function frame(now: number) {
        const dt = Math.min(0.033, (now - last) / 1000);
        last = now;

        // Update
        car.update(dt);
        car.clampToStage(stageHalfW, stageHalfH);

        // Render
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // reset MV
        stack.load(I4());
        gl.uniformMatrix4fv(uniforms.modelViewMatrix, false, stack.top());

        // Draw ground
        ground.draw({ gl, attribs, uniforms, stack });

        // Draw car
        car.draw({ gl, attribs, uniforms, stack });

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

run();
