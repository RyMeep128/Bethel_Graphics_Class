/**
 * @file BindTexture
 * @author Ryan Shafer
 * @remarks Comments by ChatGPT model 5.2.
 */

/**
 * Simple texture-unit allocator/binder for a single draw/pass.
 *
 * Typical usage:
 * 1) call {@link BindTexture.reset} at the start of a pass,
 * 2) call {@link BindTexture.bind} once per texture + sampler-uniform pair.
 *
 * Each {@link BindTexture.bind} call:
 * - consumes the next available texture unit (TEXTURE0, TEXTURE1, ...),
 * - binds the texture to TEXTURE_2D on that unit,
 * - and sets the sampler uniform to the unit index.
 */
export class BindTexture {
    /**
     * WebGL2 context used to activate texture units, bind textures,
     * and assign sampler uniforms.
     */
    private gl: WebGL2RenderingContext;

    /**
     * Next available texture unit index for this pass.
     *
     * Implementation note:
     * This is effectively the next texture "slot" (0 => TEXTURE0, 1 => TEXTURE1, ...).
     * Your original variable name `nextHose` is preserved.
     */
    private nextHose = 0;

    /**
     * Creates a binder bound to a specific WebGL2 context.
     *
     * @param gl - WebGL2 rendering context.
     */
    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
    }

    /**
     * Resets the internal texture-unit counter back to zero.
     *
     * Call once per pass (or per draw group) before binding that pass's textures,
     * so unit allocation is deterministic and stable within that pass.
     */
    public reset(): void {
        this.nextHose = 0;
    }

    /**
     * Binds a 2D texture to the next available texture unit and assigns that unit
     * to the provided sampler uniform.
     *
     * If the uniform location is null/invalid (e.g., optimized out), this is a no-op.
     *
     * @param texture - The WebGL texture to bind.
     * @param uniformLoc - Sampler uniform location (from `getUniformLocation`).
     */
    public bind(texture: WebGLTexture, uniformLoc: WebGLUniformLocation): void {
        // If the shader doesn't have this uniform (or it was optimized out), do nothing.
        if (!uniformLoc) return;

        // Allocate the next texture unit index, then advance for the next bind().
        const hose = this.nextHose++;

        // Activate the unit and bind the texture to TEXTURE_2D on that unit.
        this.gl.activeTexture(this.gl.TEXTURE0 + hose);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

        // Point the sampler uniform at the chosen texture unit index.
        this.gl.uniform1i(uniformLoc, hose);
    }
}
