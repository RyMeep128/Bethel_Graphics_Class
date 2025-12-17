/**
 * A lightweight render target wrapper (texture + framebuffer) used for offscreen rendering.
 *
 * Creates:
 * - a floating-point color texture (RGBA16F) sized to {@link width} x {@link height}
 * - a framebuffer with that texture attached as COLOR_ATTACHMENT0
 *
 * Typical usage:
 * - bind {@link buffer} as the active framebuffer,
 * - render your pass,
 * - then sample {@link texture} in a later pass.
 */
export class Render {
    /** Color texture attached to the framebuffer (RGBA16F). */
    public readonly texture: WebGLTexture;

    /** Framebuffer object that renders into {@link texture}. */
    public readonly buffer: WebGLFramebuffer;

    /** Current width of the render target in pixels. */
    public width: number;

    /** Current height of the render target in pixels. */
    public height: number;

    /** WebGL2 context used to allocate and attach GPU resources. */
    private gl: WebGL2RenderingContext;

    /**
     * @param gl - WebGL2 rendering context.
     * @param width - Initial render target width (pixels).
     * @param height - Initial render target height (pixels).
     */
    constructor(gl: WebGL2RenderingContext, width: number, height: number) {
        this.gl = gl;
        this.width = width;
        this.height = height;

        // Note: in WebGL, createTexture/createFramebuffer can technically return null.
        // Your code assumes they succeed; keep that assumption consistent across the project.
        this.texture = gl.createTexture();
        this.buffer = gl.createFramebuffer();

        this.initbuffer();
    }

    /**
     * Allocates/initializes the texture storage and attaches it to the framebuffer.
     *
     * Texture format:
     * - internalFormat: RGBA16F (half-float)
     * - format: RGBA
     * - type: FLOAT (allowed in WebGL2 when EXT_color_buffer_float / similar support exists)
     *
     * Sampling params:
     * - NEAREST filtering (common for G-Buffers / non-filtered data)
     * - CLAMP_TO_EDGE wrap (safe for screen-space sampling)
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

        // Cleanup binds to avoid accidental state leakage.
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }
}
