/**
 * Simple texture-unit allocator/binder for a single draw/pass.
 *
 * Usage pattern:
 * 1) call {@link reset} at the start of a pass,
 * 2) call {@link bind} for each texture+sampler uniform pair you need.
 *
 * Each {@link bind} call consumes the next available texture unit (TEXTURE0, TEXTURE1, ...),
 * binds the texture to TEXTURE_2D, and sets the sampler uniform to that unit index.
 */
export class BindTexture {
    /** WebGL2 context used to bind textures and set sampler uniforms. */
    private gl: WebGL2RenderingContext;

    /**
     * Next available texture unit index.
     * (Named `nextHose` in your code; conceptually this is the next texture "slot".)
     */
    private nextHose = 0;

    /**
     * @param gl - WebGL2 rendering context.
     */
    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
    }

    /**
     * Resets the internal texture-unit counter back to zero.
     * Call this once per pass/frame before binding that pass's textures.
     */
    public reset(): void {
        this.nextHose = 0;
    }

    /**
     * Binds a 2D texture to the next available texture unit and assigns that unit
     * to the provided sampler uniform location.
     *
     * @param texture - The WebGL texture to bind.
     * @param uniformLoc - The sampler uniform location (e.g., from `getUniformLocation`).
     */
    public bind(texture: WebGLTexture, uniformLoc: WebGLUniformLocation): void {
        // If the shader doesn't have this uniform (or it was optimized out), do nothing.
        if (!uniformLoc) return;

        const hose = this.nextHose++;

        // Activate the texture unit and bind the texture there.
        this.gl.activeTexture(this.gl.TEXTURE0 + hose);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);


        // Point the sampler uniform at the chosen texture unit index.
        this.gl.uniform1i(uniformLoc, hose);
    }
}
