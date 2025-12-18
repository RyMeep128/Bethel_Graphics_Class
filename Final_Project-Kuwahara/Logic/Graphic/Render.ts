/**
 * @file Render
 * @author Ryan Shafer
 * @remarks Comments by ChatGPT model 5.2.
 */

/**
 * A lightweight render target wrapper (texture + framebuffer) used for offscreen rendering.
 *
 * Creates:
 * - a floating-point color texture (RGBA16F) sized to {@link Render.width} x {@link Render.height}
 * - a framebuffer with that texture attached as COLOR_ATTACHMENT0
 *
 * Typical usage:
 * - bind {@link Render.buffer} as the active framebuffer,
 * - render your pass,
 * - then sample {@link Render.texture} in a later pass.
 */
export class Render {
    /**
     * Color texture attached to the framebuffer.
     *
     * Format details are established in {@link Render.initbuffer()}:
     * internalFormat = RGBA16F, format = RGBA, type = FLOAT.
     */
    public readonly texture: WebGLTexture;

    /**
     * Framebuffer object that renders into {@link Render.texture}.
     */
    public readonly buffer: WebGLFramebuffer;

    /**
     * Current width of the render target in pixels.
     *
     * If you change this after construction, you must reallocate the texture
     * storage (e.g., by calling {@link Render.initbuffer} again or having a resize method).
     */
    public width: number;

    /**
     * Current height of the render target in pixels.
     *
     * If you change this after construction, you must reallocate the texture
     * storage (e.g., by calling {@link Render.initbuffer} again or having a resize method).
     */
    public height: number;

    /**
     * WebGL2 context used to allocate textures/framebuffers and attach resources.
     */
    private gl: WebGL2RenderingContext;

    /**
     * Constructs a new offscreen render target sized to `width` x `height`.
     *
     * @param gl - WebGL2 rendering context.
     * @param width - Initial render target width (pixels).
     * @param height - Initial render target height (pixels).
     */
    constructor(gl: WebGL2RenderingContext, width: number, height: number) {
        this.gl = gl;
        this.width = width;
        this.height = height;

        /**
         * Note:
         * In WebGL, `createTexture()` / `createFramebuffer()` can return `null`.
         * This code assumes success; if you want hard safety, add null checks and throw.
         */
        this.texture = gl.createTexture();
        this.buffer = gl.createFramebuffer();

        this.initbuffer();
    }

    /**
     * Allocates/initializes the texture storage and attaches it to the framebuffer.
     *
     * Texture storage:
     * - target: TEXTURE_2D
     * - internalFormat: RGBA16F (half-float)
     * - format: RGBA
     * - type: FLOAT
     *
     * Sampling parameters:
     * - MIN/MAG filter: NEAREST (common for G-Buffers / non-interpolated data)
     * - WRAP_S/WRAP_T: CLAMP_TO_EDGE (safe for screen-space sampling)
     *
     * Framebuffer:
     * - attaches {@link Render.texture} to COLOR_ATTACHMENT0
     * - sets draw buffers to [COLOR_ATTACHMENT0] (handy if you later add MRT)
     *
     * @private
     */
    private initbuffer(): void {
        // Allocate texture storage.
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA16F,
            this.width,
            this.height,
            0,
            this.gl.RGBA,
            this.gl.FLOAT,
            null
        );

        // Configure sampling behavior.
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        // Attach the texture as the framebuffer's color output.
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.buffer);
        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,
            this.gl.COLOR_ATTACHMENT0,
            this.gl.TEXTURE_2D,
            this.texture,
            0
        );

        // Explicitly declare draw buffers (useful if you later expand to MRT).
        this.gl.drawBuffers([this.gl.COLOR_ATTACHMENT0]);

        // Cleanup binds to reduce accidental state leakage.
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }
}
