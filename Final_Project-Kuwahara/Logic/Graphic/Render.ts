/**
 * A single color render target (texture + FBO).
 */
export class Render{
    public readonly texture: WebGLTexture;
    public readonly buffer: WebGLFramebuffer;
    public width: number;
    public height: number;

    private gl: WebGL2RenderingContext;

    constructor(gl: WebGL2RenderingContext, width: number, height: number) {
        this.gl = gl;
        this.width = width;
        this.height = height;

        this.texture = gl.createTexture();
        this.buffer = gl.createFramebuffer();

        this.initbuffer();
    }

    // /**
    //  * (Re)allocates GPU storage for this render target.
    //  */
    // public resize(width: number, height: number): void {
    //     if (width === this.width && height === this.height) return;
    //     this.width = width;
    //     this.height = height;
    //     this.initbuffer();
    // }

    private initbuffer(): void {

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

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.buffer);
        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,
            this.gl.COLOR_ATTACHMENT0,
            this.gl.TEXTURE_2D,
            this.texture,
            0
        );
        this.gl.drawBuffers([this.gl.COLOR_ATTACHMENT0]);


        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }
}
