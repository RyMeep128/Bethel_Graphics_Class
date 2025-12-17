import { Render } from "./Render.js";
import { UniformMap } from "./UniformMap.js";
import { PassTypes } from "./PassTypes.js";
import { BindTexture } from "./BindTexture.js";

/**
 * A fullscreen post-process pass.
 *
 * A {@link Pass} is responsible for:
 * - binding a shader program,
 * - selecting a render target (screen or an offscreen {@link Render}),
 * - binding common input textures (G-Buffers, paper texture, optional chained input),
 * - uploading common per-frame uniforms (camera position, offsets),
 * - delegating additional uniform uploads (lights/settings) to the caller via {@link PassTypes.uploadCommonUniforms},
 * - and finally drawing a fullscreen quad via the provided `drawRectangle` callback.
 */
export class Pass {
    /** Compiled and linked WebGL program for this pass. */
    public readonly program: WebGLProgram;

    /** Cached uniform lookup helper for {@link program}. */
    public readonly uniforms: UniformMap;

    /**
     * Optional output render target.
     * If present, this pass renders into {@link Render.buffer} and returns {@link Render.texture}.
     * If absent, this pass renders directly to the default framebuffer (the screen).
     */
    public readonly output?: Render;

    /** WebGL2 context used for rendering and state changes. */
    private gl: WebGL2RenderingContext;

    /**
     * Callback that draws a fullscreen quad/rectangle.
     * This pass assumes the VAO/VBO state required for drawing is handled inside this callback.
     */
    private drawRectangle: () => void;

    /**
     * @param gl - WebGL2 rendering context.
     * @param program - Shader program used for this pass.
     * @param drawRectangle - Callback that renders a fullscreen quad.
     * @param output - Optional offscreen render target. If omitted, renders to screen.
     */
    constructor(
        gl: WebGL2RenderingContext,
        program: WebGLProgram,
        drawRectangle: () => void,
        output?: Render
    ) {
        this.gl = gl;
        this.program = program;
        this.uniforms = new UniformMap(gl, program);
        this.output = output;
        this.drawRectangle = drawRectangle;
    }

    /**
     * Executes the pass and optionally returns the output texture if rendering offscreen.
     *
     * Uniforms/textures are only bound if the corresponding uniform exists in the shader,
     * allowing multiple shaders with different inputs to share this same pass logic.
     *
     * @param val - Pass input payload (textures, dimensions, camera values, and uniform-upload hook).
     * @returns The output texture if {@link output} is provided; otherwise `undefined`.
     */
    public render(val: PassTypes): WebGLTexture | undefined {
        const gl = this.gl;
        gl.useProgram(this.program);

        // Output target selection:
        // - If an offscreen Render target exists, bind it and use its size.
        // - Otherwise, draw to the default framebuffer (screen) using the supplied dimensions.
        if (this.output) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.output.buffer);
            gl.viewport(0, 0, this.output.width, this.output.height);
        } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, val.width, val.height);
        }

        // Fullscreen passes typically don't need depth/blending.
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);

        // Clear target before drawing. (White background by default.)
        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Texture binding helper: assigns consecutive texture units and sets sampler uniforms.
        const binder = new BindTexture(gl);
        binder.reset();

        // Bind common textures only if the uniform exists in this shader.
        // (This avoids errors and can reduce wasted work when shaders don't use certain inputs.)
        binder.bind(val.gAlbedoTex, this.uniforms.get("gAlbedo"));
        binder.bind(val.gSpecularTex, this.uniforms.get("gSpecular"));
        binder.bind(val.gNormalTex, this.uniforms.get("gNormalTex"));
        binder.bind(val.gPositionTex, this.uniforms.get("gPosition"));
        binder.bind(val.paperTex, this.uniforms.get("paperTex"));

        // Optional chained input from a previous pass.
        if (val.inputTex) {
            binder.bind(val.inputTex, this.uniforms.get("prevOutput"));
        }
        if (val.originalOutputTex) {
            binder.bind(val.originalOutputTex, this.uniforms.get("originalOutput"));
        }

        // Allow caller/pipeline to upload shared uniforms (e.g., lights, feature toggles).
        if (val.uploadCommonUniforms){
            val.uploadCommonUniforms(this.program, this.uniforms, binder);
        }

        // Draw the fullscreen geometry for this pass.
        this.drawRectangle();

        // Unbind to reduce state leakage into subsequent rendering.
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // If offscreen, expose the resulting texture for chaining.
        return this.output?.texture;
    }
}
