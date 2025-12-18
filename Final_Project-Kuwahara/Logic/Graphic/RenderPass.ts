import { Render } from "./Render.js";
import { UniformMap } from "./UniformMap.js";
import { PassTypes } from "./PassTypes.js";
import { BindTexture } from "./BindTexture.js";

/**
 * @file Pass
 * @author Ryan Shafer
 * @remarks Comments by ChatGPT model 5.2.
 */

/**
 * A fullscreen post-process pass.
 *
 * A {@link Pass} is responsible for:
 * - binding a shader program,
 * - selecting a render target (screen or an offscreen {@link Render}),
 * - binding common input textures (G-Buffers, paper texture, optional chained input),
 * - delegating additional uniform uploads (lights/settings) to the caller via {@link PassTypes.uploadCommonUniforms},
 * - and finally drawing a fullscreen quad via the provided `drawRectangle` callback.
 */
export class Pass {
    /**
     * Compiled and linked WebGL program for this pass.
     */
    public readonly program: WebGLProgram;

    /**
     * Cached uniform lookup helper for {@link Pass.program}.
     */
    public readonly uniforms: UniformMap;

    /**
     * Optional output render target.
     *
     * If present, this pass renders into {@link Render.buffer} and returns {@link Render.texture}.
     * If absent, this pass renders directly to the default framebuffer (the screen).
     */
    public readonly output?: Render;

    /**
     * WebGL2 context used for rendering and state changes.
     */
    private gl: WebGL2RenderingContext;

    /**
     * Callback that draws a fullscreen quad/rectangle.
     *
     * This pass assumes any VAO/VBO state required for drawing is handled inside this callback.
     */
    private drawRectangle: () => void;

    /**
     * Creates a new post-process pass wrapper.
     *
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
     * Implementation notes:
     * - Uniforms/textures are only bound if the corresponding uniform exists in the shader.
     *   This allows you to reuse the same {@link Pass} logic across shaders with different inputs.
     * - This method assumes a fullscreen pass: depth test and blending are disabled by default.
     *
     * @param val - Pass input payload (textures, dimensions, and a common-uniform upload hook).
     * @returns The output texture if {@link Pass.output} is provided; otherwise `undefined`.
     */
    public render(val: PassTypes): WebGLTexture | undefined {
        const gl = this.gl;

        // Make this pass's shader active before binding uniforms/textures.
        gl.useProgram(this.program);

        // ---------------------------------------------------------------------
        // Output target selection
        // ---------------------------------------------------------------------
        // - If offscreen output exists, bind its framebuffer and use its size.
        // - Otherwise render directly to the default framebuffer (screen).
        if (this.output) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.output.buffer);
            gl.viewport(0, 0, this.output.width, this.output.height);
        } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, val.width, val.height);
        }

        // Fullscreen post-process passes commonly don't require depth or blending.
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);

        // Clear the target prior to drawing. (White background by default.)
        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // ---------------------------------------------------------------------
        // Texture binding
        // ---------------------------------------------------------------------
        // Allocates consecutive texture units and assigns sampler uniforms.
        const binder = new BindTexture(gl);
        binder.reset();

        // Bind common textures only if the corresponding uniform exists in this shader.
        // (Avoids errors if uniforms are optimized out, and avoids wasted work.)
        binder.bind(val.gAlbedoTex, this.uniforms.get("gAlbedo"));
        binder.bind(val.gSpecularTex, this.uniforms.get("gSpecular"));
        binder.bind(val.gNormalTex, this.uniforms.get("gNormalTex"));
        binder.bind(val.gPositionTex, this.uniforms.get("gPosition"));
        binder.bind(val.paperTex, this.uniforms.get("paperTex"));

        // Optional chained inputs from earlier passes.
        if (val.inputTex) {
            binder.bind(val.inputTex, this.uniforms.get("prevOutput"));
        }
        if (val.originalOutputTex) {
            binder.bind(val.originalOutputTex, this.uniforms.get("originalOutput"));
        }

        // ---------------------------------------------------------------------
        // Cross-cutting uniforms (lights, toggles, global settings)
        // ---------------------------------------------------------------------
        // Let the caller upload shared uniforms after program bind and texture binding.
        if (val.uploadCommonUniforms) {
            val.uploadCommonUniforms(this.program, this.uniforms, binder);
        }

        // ---------------------------------------------------------------------
        // Draw
        // ---------------------------------------------------------------------
        // Render the fullscreen geometry for this pass.
        this.drawRectangle();

        // Unbind to reduce state leakage into subsequent rendering steps.
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // If offscreen, expose the resulting texture for chaining; otherwise undefined.
        return this.output?.texture;
    }
}
