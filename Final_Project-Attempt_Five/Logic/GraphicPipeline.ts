import * as util from "../Utility/util.js";
import {Light} from "../Objects/CameraObjects/Light.js";
import {flatten, initFileShaders, mat4, perspective, vec4,vec3} from "../Utility/helperfunctions.js";
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
    private hBlurShader: WebGLProgram;
    private vBlurShader: WebGLProgram;
    private specularShader: WebGLProgram;
    private combineShader: WebGLProgram;
    private addDiffuseShader: WebGLProgram;
    private edgeShader: WebGLProgram;
    private addSpecShader: WebGLProgram;
    private stepShader: WebGLProgram;
    private edgeDarkenShader: WebGLProgram;
    private testShader: WebGLProgram;

    private gWaterColorBaseFBO: WebGLFramebuffer;
    private gShadowFBO: WebGLFramebuffer;
    private gMidtoneFBO: WebGLFramebuffer;
    private gSpecFBO: WebGLFramebuffer;
    private gCombineFBO: WebGLFramebuffer;
    private gAddDiffuseFBO: WebGLFramebuffer;
    private gWaterColorTextureFBO: WebGLFramebuffer;
    private gHBlurFBO: WebGLFramebuffer;
    private gVBlurFBO: WebGLFramebuffer;
    private gEdgeFBO: WebGLFramebuffer;
    private gAddSpecFBO: WebGLFramebuffer;
    private gStepFBO: WebGLFramebuffer;
    private gEdgeDarkenFBO: WebGLFramebuffer;
    private gTestFBO: WebGLFramebuffer;

    private gPrevInput:WebGLFramebuffer;
    private gNextInput:WebGLFramebuffer;

    private gWaterColorBaseTex: WebGLTexture;
    private gShadowTex: WebGLTexture;
    private gMidtoneTex: WebGLTexture;
    private gSpecTex: WebGLTexture;
    private gCombineTex: WebGLTexture;
    private gAddDiffuseTex: WebGLTexture;
    private gWaterColorTexure: WebGLTexture;
    private gHBlurTex: WebGLTexture;
    private gVBlurTex: WebGLTexture;
    private gEdgeTex: WebGLTexture;
    private gAddSpecTex: WebGLTexture;
    private gStepTex: WebGLTexture;
    private gEdgeDarkenTex: WebGLTexture;
    private gTestTex: WebGLTexture;

    private paperTexture: WebGLTexture;

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
        this.hBlurShader = initFileShaders(
            this.gl,
            "../Shaders/DiffusePass/DiffuseVertexShader.glsl",
            "../Shaders/BlurPass/HBlurFragmentShader.glsl"
        );
        this.vBlurShader = initFileShaders(
            this.gl,
            "../Shaders/DiffusePass/DiffuseVertexShader.glsl",
            "../Shaders/BlurPass/VBlurFragmentShader.glsl"
        );
        this.specularShader = initFileShaders(
            this.gl,
            "../Shaders/DiffusePass/DiffuseVertexShader.glsl",
            "../Shaders/SpecularPass/SpecularFragmentShader.glsl"
        );

        this.combineShader = initFileShaders(
            this.gl,
            "../Shaders/DiffusePass/DiffuseVertexShader.glsl",
            "../Shaders/combin.glsl"
        );
        this.addDiffuseShader = initFileShaders(
            this.gl,
            "../Shaders/DiffusePass/DiffuseVertexShader.glsl",
            "../Shaders/RenderPass/AddDiffuseFragmentShader.glsl"
        );
        this.edgeShader = initFileShaders(
            this.gl,
            "../Shaders/DiffusePass/DiffuseVertexShader.glsl",
            "../Shaders/EdgeModPass/EdgeModFragment.glsl"
        );
        this.addSpecShader = initFileShaders(
            this.gl,
            "../Shaders/DiffusePass/DiffuseVertexShader.glsl",
            "../Shaders/RenderPass/AddSpecular.glsl"
        );
        this.stepShader = initFileShaders(
            this.gl,
            "../Shaders/DiffusePass/DiffuseVertexShader.glsl",
            "../Shaders/RenderPass/StepFragment.glsl"
        );
        this.edgeDarkenShader = initFileShaders(
            this.gl,
            "../Shaders/DiffusePass/DiffuseVertexShader.glsl",
            "../Shaders/RenderPass/EdgeDarkenFragment.glsl"
        );
        this.testShader = initFileShaders(
            this.gl,
            "../Shaders/DiffusePass/DiffuseVertexShader.glsl",
            "../Shaders/test.glsl"
        );

        [this.gShadowTex,this.gShadowFBO] = this.initBuffer(this.gShadowTex,this.gShadowFBO);
        [this.gWaterColorBaseTex,this.gWaterColorBaseFBO] = this.initBuffer(this.gWaterColorBaseTex,this.gWaterColorBaseFBO);
        [this.gMidtoneTex,this.gMidtoneFBO] = this.initBuffer(this.gMidtoneTex,this.gMidtoneFBO);
        [this.gSpecTex,this.gSpecFBO] = this.initBuffer(this.gSpecTex,this.gSpecFBO);
        [this.gCombineTex,this.gCombineFBO] = this.initBuffer(this.gCombineTex,this.gCombineFBO);
        [this.gAddDiffuseTex,this.gAddDiffuseFBO] = this.initBuffer(this.gAddDiffuseTex,this.gAddDiffuseFBO);
        [this.gHBlurTex,this.gHBlurFBO] = this.initBuffer(this.gHBlurTex,this.gHBlurFBO);
        [this.gVBlurTex,this.gVBlurFBO] = this.initBuffer(this.gVBlurTex,this.gVBlurFBO);
        [this.gEdgeTex,this.gEdgeFBO] = this.initBuffer(this.gEdgeTex,this.gEdgeFBO);
        [this.gAddSpecTex,this.gAddSpecFBO] = this.initBuffer(this.gAddSpecTex,this.gAddSpecFBO);
        [this.gStepTex,this.gStepFBO] = this.initBuffer(this.gStepTex,this.gStepFBO);
        [this.gEdgeDarkenTex,this.gEdgeDarkenFBO] = this.initBuffer(this.gEdgeDarkenTex,this.gEdgeDarkenFBO);
        [this.gTestTex,this.gTestFBO] = this.initBuffer(this.gTestTex,this.gTestFBO);

    }

    public runPipeline(camera:Camera, GeomertyPass:Function){
        this.updateCamera(camera);
        // 1) Populate G-buffer: gAlbedoTex, gSpecularTex, gNormalTex, gPositionTex, gDepthTex
        GeomertyPass();

        this.DiffusePass();
        this.ShadowPass();
        this.MidtonePass();
        //What should this be?
        this.CombinePass();

        //Inputs?
        this.AddDiffusePass();

        //Inputs?
        this.BlurPass()

        this.stepPass();

        //Inputs
        this.EdgeDarkenPass();

        this.EdgeModulationPass()

        this.Test();


        this.LightingPass();

        //Ignore these?
        // this.SpecularPass();
        // this.AddSpecPass()
    }

    private Test(){

        const program = this.testShader;
        this.gl.useProgram(program);

        this.outPut(this.gTestFBO);

        this.clear()

        this.uploadGBuffer(program)

        this.uploadDiffuse(program)

        this.uploadIntensity(program)

        this.sendOverPaper(program)

        this.uploadCamera(program)

        this.uploadMagicalConstants(program)

        this.uploadColors(program)

        this.drawRectangle();

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
        const shader = this.diffuseShader;
        this.gl.useProgram(shader);

        this.outPut(this.gWaterColorBaseFBO);

        this.clear()

        this.uploadGBuffer(shader);

        uploadLightsForProgram(shader);

        this.uploadCamera(shader);

        this.uploadMagicalConstants(shader);

        this.sendOverPaper(this.diffuseShader);


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

        this.outPut(this.gShadowFBO);

        this.clear()

        this.uploadGBuffer(shader);

        uploadLightsForProgram(shader);

        this.uploadCamera(shader);

        this.uploadMagicalConstants(shader);

        this.sendOverPaper(shader);

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
        this.outPut(this.gMidtoneFBO);

        this.clear()

        this.uploadGBuffer(shader);

        uploadLightsForProgram(shader);

        this.uploadCamera(shader);

        this.sendOverPaper(shader)

        this.uploadMagicalConstants(shader);

        this.drawRectangle();
    }

    public AddDiffusePass(): void {
        const shader:WebGLProgram = this.addDiffuseShader;
        this.gl.useProgram(shader);

        this.outPut(this.gAddDiffuseFBO);
        this.clear();

        this.uploadCombined(shader);

        this.uploadColors(shader);


        this.drawRectangle();
    }

    public AddSpecPass(): void {
        const shader:WebGLProgram = this.addSpecShader;
        this.gl.useProgram(shader);

        this.outPut(this.gAddSpecFBO);
        this.clear();

        this.uploadPrevious(shader,this.gSpecTex);
        this.uploadIntensity(shader);

        this.uploadMagicalConstants(shader);


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
        const shader:WebGLProgram = this.specularShader;
        this.gl.useProgram(shader);

        // Render into the watercolor base texture
        this.outPut(this.gSpecFBO);

        this.clear()

        this.uploadGBuffer(shader);

        uploadLightsForProgram(shader);
        this.uploadIntensity(shader);


        this.uploadCamera(shader);
        this.uploadMagicalConstants(shader);


        this.drawRectangle();
    }


    public CombinePass(): void {
        const shader:WebGLProgram = this.combineShader;
        this.gl.useProgram(shader);

        // Render into the watercolor base texture
        this.outPut(this.gCombineFBO);

        this.clear();

        this.gl.activeTexture(this.gl.TEXTURE4);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gWaterColorBaseTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(shader, "diffuse"),
            4
        );

        this.gl.activeTexture(this.gl.TEXTURE5);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gShadowTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(shader, "shadow"),
            5
        );

        this.gl.activeTexture(this.gl.TEXTURE6);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gMidtoneTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(shader, "midtone"),
            6
        );


        this.drawRectangle();
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
        //First pass
        let shader:WebGLProgram = this.hBlurShader;
        this.gl.useProgram(shader);

        // Render into the watercolor base texture
        this.outPut(this.gHBlurFBO);
        this.clear()

        this.uploadPrevious(shader, this.gCombineTex)

        this.uploadMagicalConstants(shader);

        this.drawRectangle();

        //SecondPass

        shader = this.vBlurShader;
        this.gl.useProgram(shader);

        // Render into the watercolor base texture
        this.outPut(this.gVBlurFBO);
        this.clear()

        this.uploadPrevious(shader, this.gHBlurTex);

        this.uploadMagicalConstants(shader);

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
        let shader:WebGLProgram = this.stepShader;
        this.gl.useProgram(shader);

        // Render into the watercolor base texture
        this.outPut(this.gStepFBO);
        this.clear()

        this.uploadPrevious(shader, this.gVBlurTex)

        this.uploadMagicalConstants(shader);

        this.drawRectangle();
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
        let shader:WebGLProgram = this.edgeDarkenShader;
        this.gl.useProgram(shader);

        // Render into the watercolor base texture
        this.outPut(this.gEdgeDarkenFBO);
        this.clear()

        this.uploadPrevious(shader, this.gStepTex)

        this.uploadAddDiffuse(shader);

        this.sendOverPaper(shader);

        this.uploadMagicalConstants(shader);

        this.drawRectangle();
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
        let shader:WebGLProgram = this.edgeShader;
        this.gl.useProgram(shader);

        // Render into the watercolor base texture
        this.outPut(this.gEdgeFBO);
        this.clear()

        this.uploadPrevious(shader, this.gEdgeDarkenTex);

        this.uploadMagicalConstants(shader);

        this.sendOverPaper(shader);

        this.drawRectangle();
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
        this.outPut(null);

        this.clear();

        this.gl.disable(this.gl.DEPTH_TEST);
        const mode = this.gl.getUniformLocation(this.lightShader, "mode");
        this.gl.uniform1i(mode, this.waterColorSettings.waterColorEnabled ? 1 : 0);

        if (!this.waterColorSettings.waterColorEnabled) {
            // Albedo
            this.uploadGBuffer(this.lightShader);

        } else {

            //Last output
            this.uploadDiffuse(this.lightShader);

            this.gl.activeTexture(this.gl.TEXTURE5);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gShadowTex);
            this.gl.uniform1i(
                this.gl.getUniformLocation(this.lightShader, "shadow"),
                5
            );

            this.gl.activeTexture(this.gl.TEXTURE6);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gCombineTex);
            this.gl.uniform1i(
                this.gl.getUniformLocation(this.lightShader, "midtone"),
                6
            );

            this.gl.activeTexture(this.gl.TEXTURE7);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gCombineTex);
            this.gl.uniform1i(
                this.gl.getUniformLocation(this.lightShader, "test"),
                7
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
        this.gl.activeTexture(this.gl.TEXTURE9);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.paperTexture);
        this.gl.uniform1i(
            this.gl.getUniformLocation(program, "paperTex"),
            9
        );
    }

    private outPut(buffer:WebGLFramebuffer): void {
        // Render into the watercolor base texture
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, buffer);
        this.gl.viewport(0, 0, this.gTexWidth, this.gTexHeight);
    }

    private clear(): void {
        this.gl.clearColor(1, 1, 1, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }

    private uploadCamera(shader:WebGLProgram):void {
        this.gl.uniform3f(
            this.gl.getUniformLocation(shader, "cameraPos"),
            this.camera.getCamerax(),
            this.camera.getCameray(),
            this.camera.getCameraz(),
        );
    }

    private uploadMagicalConstants(shader: WebGLProgram): void {
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

        this.gl.uniform1f(
            this.gl.getUniformLocation(shader, "h"),
            1.0/this.gTexWidth,
        );

        this.gl.uniform1f(
            this.gl.getUniformLocation(shader, "v"),
            1.0/this.gTexHeight,
        );

        this.gl.uniform1f(
            this.gl.getUniformLocation(shader, "k_theta"),
            this.waterColorSettings.k_theta,
        );

        this.gl.uniform1f(
            this.gl.getUniformLocation(shader, "k_delta"),
            this.waterColorSettings.k_delta,
        );

        this.gl.uniform1f(
            this.gl.getUniformLocation(shader, "k_omega"),
            this.waterColorSettings.k_omega,
        );

        this.gl.uniform1f(
            this.gl.getUniformLocation(shader, "k_r"),
            this.waterColorSettings.k_r,
        );

        this.gl.uniform1f(
            this.gl.getUniformLocation(shader, "alphaScalingFactor"),
            this.waterColorSettings.alphaScalingFactor,
        );

        this.gl.uniform1f(
            this.gl.getUniformLocation(shader, "patchCuttoff"),
            this.waterColorSettings.patchCuttoff,
        );
    }

    private uploadGBuffer(shader){
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
    }

    private uploadIntensity(shader:WebGLProgram): void {
        this.gl.activeTexture(this.gl.TEXTURE5);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gCombineTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(shader, "intensity"),
            5
        );
    }

    private uploadDiffuse(shader:WebGLProgram):void {
        this.gl.activeTexture(this.gl.TEXTURE4);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gWaterColorBaseTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(shader, "diffuse"),
            4
        );
    }

    private uploadColors(shader){
        const color0:vec3 = new vec3(0.000, 0.541, 0.816)
        const color1:vec3 = new vec3(0.035, 0.000, 0.455)

        this.gl.uniform3f(
            this.gl.getUniformLocation(shader, "color0"),
            color0[0],color0[1],color0[2]
        );

        this.gl.uniform3f(
            this.gl.getUniformLocation(shader, "color1"),
            color1[0],color1[1],color1[2]
        );
    }

    private uploadPrevious(shader,prevOutputTex:WebGLTexture ){
        this.gl.activeTexture(this.gl.TEXTURE10);
        this.gl.bindTexture(this.gl.TEXTURE_2D, prevOutputTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(shader, "prevOutput"),
            10
        );
    }

    private uploadCombined(shader){
        this.gl.activeTexture(this.gl.TEXTURE11);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gCombineTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(shader, "combined"),
            11
        );
    }

    private uploadAddDiffuse(shader){
        this.gl.activeTexture(this.gl.TEXTURE12);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gAddDiffuseTex);
        this.gl.uniform1i(
            this.gl.getUniformLocation(shader, "intensity"),
            12
        );
    }


}
