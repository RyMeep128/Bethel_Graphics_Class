import * as util from "../Utility/util.js";
import {Light} from "../Objects/CameraObjects/Light.js";
import {flatten, initFileShaders, mat4, perspective, vec4} from "../Utility/helperfunctions.js";
import {uploadLightsForProgram} from "./index.js";
import {RenderSettings} from "../Utility/RenderSettings.js";
import {Camera} from "../Objects/CameraObjects/Camera";

export class GraphicPipeline {

    private gl: WebGL2RenderingContext;
    private canvas: HTMLCanvasElement;
    private lightShader: WebGLProgram;
    private diffuseShader: WebGLProgram;
    private shadowShader: WebGLProgram;
    private midtoneShader: WebGLProgram;
    private textureShader: WebGLProgram;
    private blurShader: WebGLProgram;

    private gWaterColorBaseFBO: WebGLFramebuffer;
    private gShadowFBO: WebGLFramebuffer;
    private gMidtoneFBO: WebGLFramebuffer;
    private gWaterColorTextureFBO: WebGLFramebuffer;
    private gWaterColorBlurFBO: WebGLFramebuffer;

    private gWaterColorBaseTex: WebGLTexture;
    private gShadowTex: WebGLTexture;
    private gMidtoneTex: WebGLTexture;
    private gWaterColorTexure: WebGLTexture;
    private gWaterColorBlurTex: WebGLTexture;

    private paperTexture: WebGLTexture;
    private paperImg: HTMLImageElement;

    private screenRectangle: WebGLVertexArrayObject;

    private gAlbedoTex: WebGLTexture;
    private gSpecularTex: WebGLTexture;
    private gNormalTex: WebGLTexture;
    private gPositionTex: WebGLTexture;

    private camera: Camera;

    /** Width of the G-buffer textures (in pixels). */
    private gTexWidth: number;
    /** Height of the G-buffer textures (in pixels). */
    private gTexHeight: number;

    private waterColorSettings: RenderSettings;

    constructor(
        gl: WebGL2RenderingContext,
        gAlbedoTex: WebGLTexture,
        gSpecularTex: WebGLTexture,
        gNormalTex: WebGLTexture,
        gPositionTex: WebGLTexture,
        canvas: HTMLCanvasElement,
        waterColorSettings: RenderSettings,
    ) {
        this.gl = gl;
        this.gAlbedoTex = gAlbedoTex;
        this.gSpecularTex = gSpecularTex;
        this.gNormalTex = gNormalTex;
        this.gPositionTex = gPositionTex;
        this.canvas = canvas;
        this.waterColorSettings = waterColorSettings;

        this.gTexWidth = canvas.clientWidth;
        this.gTexHeight = canvas.clientHeight;

        this.loadShaders();

        this.screenRectangle = this.createRectangle();

        this.paperTexture = gl.createTexture();
        let tmpPaperTex = this.paperTexture
        let paperImg= new Image();
        paperImg.onload = function() { util.handleTextureLoaded(paperImg, tmpPaperTex,gl); };
        paperImg.src = '../assets/paper.jpg';
    }


    private loadShaders(): void {
        this.lightShader = initFileShaders(
            this.gl,
            "../Shaders/LightPass/LightVertexShader.glsl",
            "../Shaders/LightPass/LightFragmentShader.glsl"
        );
        this.diffuseShader = initFileShaders(
            this.gl,
            "../Shaders/DiffusePass/DiffuseVertexShader.glsl",
            "../Shaders/DiffusePass/DiffuseFragmentShader.glsl"
        );
        this.shadowShader = initFileShaders(
            this.gl,
            "../Shaders/DiffusePass/DiffuseVertexShader.glsl",
            "../Shaders/ShadowPass/ShadowFragmentShader.glsl"
        );
        this.midtoneShader = initFileShaders(
            this.gl,
            "../Shaders/DiffusePass/DiffuseVertexShader.glsl",
            "../Shaders/MidTonePass/MidtoneFragmentShader.glsl"
        );
        this.textureShader = initFileShaders(
            this.gl,
            "../Shaders/TexturePass/TextureVertexShader.glsl",
            "../Shaders/TexturePass/TextureFragmentShader.glsl"
        );
        this.blurShader = initFileShaders(
            this.gl,
            "../Shaders/BlurPass/BlurVertexShader.glsl",
            "../Shaders/BlurPass/BlurFragmentShader.glsl"
        );

        this.initWatercolorBaseBuffer();
        this.initShadowBuffer();
        [this.gMidtoneTex,this.gMidtoneFBO] = this.initBuffer(this.gMidtoneTex,this.gMidtoneFBO);
        this.initWatercolorTextureBuffer();
        this.initBlurBuffer();
    }


    /**
     *
     * This pass paints the first light layer of color. It uses lighting, paper texture, and pigment color to
     * produce a soft base wash. Alpha is computed to describe how thick the paint appears
     *
     * Combines three things
     * 1. The paper texture (giving tone and roughness)
     * 2. Pigment color
     * 3. A brightness–to–alpha function: α = 1 − (0.8R + 0.2G + 0.7B)
     * @constructor
     */
    public DiffusePass(): void {
        this.gl.useProgram(this.diffuseShader);

        // Render into the watercolor base texture
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gWaterColorBaseFBO);
        this.gl.viewport(0, 0, this.gTexWidth, this.gTexHeight);

        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Bind G-buffer textures as inputs (samplers)
        // Albedo
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gAlbedoTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(this.diffuseShader, "gAlbedo"),
            0
        );

        // Specular
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gSpecularTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(this.diffuseShader, "gSpecular"),
            1
        );

        // Normal
        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gNormalTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(this.diffuseShader, "gNormalTex"),
            2
        );

        // Position
        this.gl.activeTexture(this.gl.TEXTURE3);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gPositionTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(this.diffuseShader, "gPosition"),
            3
        );

        uploadLightsForProgram(this.diffuseShader);

        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gNormalTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(this.diffuseShader, "gNormalTex"),
            2
        );

        this.gl.uniform3f(
            this.gl.getUniformLocation(this.diffuseShader, "cameraPos"),
            this.camera.getCamerax(),
            this.camera.getCameray(),
            this.camera.getCameraz(),
        );

        this.gl.uniform1f(
            this.gl.getUniformLocation(this.diffuseShader, "k_ambient"),
            this.waterColorSettings.k_ambient,
        );
        this.gl.uniform1f(
            this.gl.getUniformLocation(this.diffuseShader, "k_diffuse"),
            this.waterColorSettings.k_diffuse,
        );
        this.gl.uniform1f(
            this.gl.getUniformLocation(this.diffuseShader, "k_specular"),
            this.waterColorSettings.k_specular,
        );
        this.gl.uniform1f(
            this.gl.getUniformLocation(this.diffuseShader, "p"),
            this.waterColorSettings.p,
        );






        this.drawRectangle();
    }

    /**
     *
     *
     * This pass finds the parts of the scene facing away from the light and paints them with darker
     * pigment. Only the shadowy regions survive; bright pixels are discarded. The result is a watercolor
     * shadow.
     *
     *
     * inputs:
     *  gnormal, gposition
     *  Light direction
     *  Base pigment color(gAlbedo)
     *
     * output:
     *  watercolorShadowTex
     *
     * Step 1: Check how much the surface faces the light
     * Step 2: Smoothstep
     * Step 3: Discard anything that's NOT a shadow
     * Step 4: Apply pigment color to the shadow bits
     * @constructor
     */
    public ShadowPass(): void {
        const shader:WebGLProgram = this.shadowShader;
        this.gl.useProgram(shader);

        // Render into the watercolor base texture
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gShadowFBO);
        this.gl.viewport(0, 0, this.gTexWidth, this.gTexHeight);

        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Bind G-buffer textures as inputs (samplers)
        // Albedo
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gAlbedoTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(shader, "gAlbedo"),
            0
        );

        // Specular
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gSpecularTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(shader, "gSpecular"),
            1
        );

        // Normal
        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gNormalTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(shader, "gNormalTex"),
            2
        );

        // Position
        this.gl.activeTexture(this.gl.TEXTURE3);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gPositionTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(shader, "gPosition"),
            3
        );

        uploadLightsForProgram(shader);

        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gNormalTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(shader, "gNormalTex"),
            2
        );

        this.gl.uniform3f(
            this.gl.getUniformLocation(shader, "cameraPos"),
            this.camera.getCamerax(),
            this.camera.getCameray(),
            this.camera.getCameraz(),
        );

        this.gl.uniform1f(
            this.gl.getUniformLocation(shader, "k_ambient"),
            this.waterColorSettings.k_ambient,
        );
        this.gl.uniform1f(
            this.gl.getUniformLocation(shader, "k_diffuse"),
            this.waterColorSettings.k_diffuse,
        );
        this.gl.uniform1f(
            this.gl.getUniformLocation(shader, "k_specular"),
            this.waterColorSettings.k_specular,
        );
        this.gl.uniform1f(
            this.gl.getUniformLocation(shader, "p"),
            this.waterColorSettings.p,
        );

        this.drawRectangle();
    }

    /**
     *
     * This pass keeps only medium–brightness pixels aka, the only thing left from the last two
     * These form a soft midtone wash that lives between the base and the shadow .
     *
     * inputs
     *  gnormal, gposition
     * Output
     * watercolor MidtoneTex
     *
     * Step 1: How much is this spot facing the light?
     * Step 2: Smoothstep
     * Step 3:Throw away the bright pixels
     * Step 4: Color the surviving pixels with pigment + paper
     *
     *
     * End Result
     * Has color only on the mid-brightness parts of the scene
     * Has no shadows
     * Has no highlights
     *
     *
     * @constructor
     */
    public MidtonePass(): void {
        const shader:WebGLProgram = this.midtoneShader;
        this.gl.useProgram(shader);

        // Render into the watercolor base texture
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gMidtoneFBO);
        this.gl.viewport(0, 0, this.gTexWidth, this.gTexHeight);

        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Bind G-buffer textures as inputs (samplers)
        // Albedo
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gAlbedoTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(shader, "gAlbedo"),
            0
        );

        // Specular
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gSpecularTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(shader, "gSpecular"),
            1
        );

        // Normal
        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gNormalTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(shader, "gNormalTex"),
            2
        );

        // Position
        this.gl.activeTexture(this.gl.TEXTURE3);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gPositionTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(shader, "gPosition"),
            3
        );

        uploadLightsForProgram(shader);

        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gNormalTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(shader, "gNormalTex"),
            2
        );

        this.gl.uniform3f(
            this.gl.getUniformLocation(shader, "cameraPos"),
            this.camera.getCamerax(),
            this.camera.getCameray(),
            this.camera.getCameraz(),
        );

        this.gl.uniform1f(
            this.gl.getUniformLocation(shader, "k_ambient"),
            this.waterColorSettings.k_ambient,
        );
        this.gl.uniform1f(
            this.gl.getUniformLocation(shader, "k_diffuse"),
            this.waterColorSettings.k_diffuse,
        );
        this.gl.uniform1f(
            this.gl.getUniformLocation(shader, "k_specular"),
            this.waterColorSettings.k_specular,
        );
        this.gl.uniform1f(
            this.gl.getUniformLocation(shader, "p"),
            this.waterColorSettings.p,
        );

        this.drawRectangle();
    }

    /**
     * Watersparklyingness
     *
     * This should find the small bright flecks where light reflects strongly from the surface. All other pixels are
     * discarded. What remains is a sparkle map resembling glistening wet paint
     *
     * Inputs
     *  gnormal, gposition, light data.
     * Output
     *  specularTex
     *
     *  Step 1: Compute the Specular Shine (H · N)
     *      H is a vector halfway between gpos and the lightsource
     *  Step 2: Smoothstep - catching only the shiny parts
     *  Step 3: Throw away non-shiny pixels
     *  Step 4: Output the sparkles :)  <3   0>
     *
     *
     * @constructor
     */
    public SpecularPass(): void {

    }


    /**
     *
     * This pass adds the *sparkle* map back onto the painting using additive blending, creating subtle,
     * shimmering highlights
     *
     *
     * Inputs
     *  watercolorBaseTex
     *  specularTex
     * Output
     *  Updated base texture with highlights added
     *
     * C_out = C_base + k_s * C_Specular where k_s is a tuned varibale
     *
     * Step 1: Read the base color
     * Step 2: Read the specular shine texture
     * Step 3: Add the sparkles to the color
     * Step 4: Write the new color out
     *
     *
     * @constructor
     */
    public SpecularAddPass(): void {

    }

    /**
     * Inputs
     *  watercolorBaseTex
     *  Pigment colors color0, color1
     * Output
     *  watercolorCMYKTex
     *
     *  Step 1: Convert pigments from RGB to CMYK
     *  Step 2: How bright is this pixel?
     *  Step 3: Mix the two pigments in CMYK space
     *  Step 4: Convert CMYK back to RGB
     *
     * @constructor
     */
    public CMYKBlendingPass(): void {

    }

    /**
     * Inputs
     *  Previous output texture
     *  Paper texture
     * Output
     *  watercolorTexturedTex
     *
     * Step 1: Keep the colors the same
     * Step 2: Sample the paper texture
     * Step 3: Increase alpha based on darker paper areas
     * Step 4: Output the new pixel
     *
     * @constructor
     */
    public TexturePass(): void {
        this.gl.useProgram(this.textureShader);


        this.drawRectangle();
    }

    /**
     * The most complicated? Ryan: Note from your past self, do this one first <3
     * Inputs
     *  watercolorTexturedTex
     * Outputs
     *  blurH+V
     *
     *  Gaussian blur
     *  They seperate it out so that way its run time is faster
     *  Proabbly do a 9 x 9 pass
     *
     *  Step 1: Horizontal Blur
     *  Step 2: Vertical Blur
     *
     *
     *
     * @constructor
     */
    public BlurPass(): void {
        this.gl.useProgram(this.blurShader);


        this.drawRectangle();
    }

    /**
     * Input
     *  blurB
     * Output
     *  steppedTex
     *
     *  Step 1: Look at alpha
     *  Step 2: Use smoothstep to create patches
     *
     */
    public stepPass(): void {

    }


    /**
     * inputs
     *  Intensity texture p
     *  Previous output λ <- Look how fancy I am future Ryan
     * Output
     *  edgeDarkenedTex
     *
     *  Step 1: Start with the old alpha:
     *  Step 2: Check how strong the edge is:
     *  Step 3: Scale edge strength by k where k is a magic number
     *  Step 4: Add it to transparency
     *  Step 5: Multiply it with original alpha
     *
     * @constructor
     */
    public EdgeDarkenPass(): void {
    }


    /**
     * Inputs
     *  Previous output
     *  Paper texture
     * Output
     *  Final composited watercolor image
     *
     *  Step 1: Measure how dark the paper is
     *  Step 2: Convert paper darkness into a subtle darkening effect
     *  Step 3: Final Output
     *
     * @constructor
     */
    public EdgeModulationPass(): void {
    }

    /**
     * Final Pass
     *
     * Either does phong lighting, or just outputs the last texture
     */
    public LightingPass(): void {
        this.gl.useProgram(this.lightShader);
        this.gl.disable(this.gl.BLEND);

        // Render to the default framebuffer (the canvas)
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        this.gl.disable(this.gl.DEPTH_TEST);
        const mode = this.gl.getUniformLocation(this.lightShader, "mode");
        this.gl.uniform1i(mode, this.waterColorSettings.waterColorEnabled ? 1 : 0);

        if (!this.waterColorSettings.waterColorEnabled) {
            // Albedo
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gAlbedoTex);
            this.gl.uniform1i(
                this.gl.getUniformLocation(this.lightShader, "gAlbedo"),
                0
            );

            // Specular
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gSpecularTex);
            this.gl.uniform1i(
                this.gl.getUniformLocation(this.lightShader, "gSpecular"),
                1
            );

            // Normal
            this.gl.activeTexture(this.gl.TEXTURE2);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gNormalTex);
            this.gl.uniform1i(
                this.gl.getUniformLocation(this.lightShader, "gNormalTex"),
                2
            );

            // Position
            this.gl.activeTexture(this.gl.TEXTURE3);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gPositionTex);
            this.gl.uniform1i(
                this.gl.getUniformLocation(this.lightShader, "gPosition"),
                3
            );

        } else {
            // Testing
            this.gl.activeTexture(this.gl.TEXTURE4);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gMidtoneTex);
            this.gl.uniform1i(
                this.gl.getUniformLocation(this.lightShader, "test"),
                4
            );
        }

        uploadLightsForProgram(this.lightShader);

        this.drawRectangle();

        this.gl.enable(this.gl.DEPTH_TEST);
    }

    // ─────────────────────────────────────────────
    // Helpers (kept at the very bottom)
    // ─────────────────────────────────────────────

    private drawRectangle(): void {
        this.gl.bindVertexArray(this.screenRectangle);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.bindVertexArray(null);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null); // leave clean for next passes
    }

    private initShadowBuffer(): void {
        this.gShadowTex = this.gl.createTexture() as WebGLTexture;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gShadowTex);

        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA16F,
            this.gTexWidth,
            this.gTexHeight,
            0,
            this.gl.RGBA,
            this.gl.FLOAT,
            null
        );

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.gShadowFBO = this.gl.createFramebuffer() as WebGLFramebuffer;
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gShadowFBO);

        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,
            this.gl.COLOR_ATTACHMENT0,
            this.gl.TEXTURE_2D,
            this.gShadowTex,
            0
        );

        this.gl.drawBuffers([this.gl.COLOR_ATTACHMENT0]);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }

    private initBuffer(texture, buffer) {
        texture = this.gl.createTexture() as WebGLTexture;
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA16F,
            this.gTexWidth,
            this.gTexHeight,
            0,
            this.gl.RGBA,
            this.gl.FLOAT,
            null
        );

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        buffer = this.gl.createFramebuffer() as WebGLFramebuffer;
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, buffer);

        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,
            this.gl.COLOR_ATTACHMENT0,
            this.gl.TEXTURE_2D,
            texture,
            0
        );

        this.gl.drawBuffers([this.gl.COLOR_ATTACHMENT0]);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);

        return [texture, buffer];
    }

    private initWatercolorBaseBuffer(): void {
        this.gWaterColorBaseTex = this.gl.createTexture() as WebGLTexture;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gWaterColorBaseTex);

        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA16F,
            this.gTexWidth,
            this.gTexHeight,
            0,
            this.gl.RGBA,
            this.gl.FLOAT,
            null
        );

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.gWaterColorBaseFBO = this.gl.createFramebuffer() as WebGLFramebuffer;
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gWaterColorBaseFBO);

        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,
            this.gl.COLOR_ATTACHMENT0,
            this.gl.TEXTURE_2D,
            this.gWaterColorBaseTex,
            0
        );

        this.gl.drawBuffers([this.gl.COLOR_ATTACHMENT0]);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }

    private initBlurBuffer() {


    }

    private initWatercolorTextureBuffer(): void {
    }

    private createRectangle(): WebGLVertexArrayObject {
        const returnObject = this.gl.createVertexArray() as WebGLVertexArrayObject;
        this.gl.bindVertexArray(returnObject);

        const quadData = new Float32Array([
            // x,  y,   u, v
            -1, -1, 0, 0,
            1, -1, 1, 0,
            -1, 1, 0, 1,
            1, 1, 1, 1,
        ]);

        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, quadData, this.gl.STATIC_DRAW);

        // aPosition → location 0
        this.gl.enableVertexAttribArray(0);
        this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 4 * 4, 0);

        // aTexCoord → location 1
        this.gl.enableVertexAttribArray(1);
        this.gl.vertexAttribPointer(1, 2, this.gl.FLOAT, false, 4 * 4, 2 * 4);

        this.gl.bindVertexArray(null);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        return returnObject;
    }

    public updateCamera(camera: Camera): void {
        this.camera = camera;
    }

    private sendOverPaper(program){
        this.gl.activeTexture(this.gl.TEXTURE6);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.paperTexture);
        this.gl.uniform1i(
            this.gl.getUniformLocation(program, "paperTex"),
            6
        );
    }


}
