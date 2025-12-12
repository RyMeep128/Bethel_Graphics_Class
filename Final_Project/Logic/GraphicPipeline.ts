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
    // Additional shader programs for modular passes
    private specularShader: WebGLProgram;
    private specularAddShader: WebGLProgram;
    private cmykShader: WebGLProgram;
    private combineShader: WebGLProgram;
    private stepShader: WebGLProgram;
    private edgeDarkenShader: WebGLProgram;
    private edgeModShader: WebGLProgram;
    private blurShaderH: WebGLProgram;
    private blurShaderV: WebGLProgram;

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

        // Load paper texture
        this.paperTexture = gl.createTexture();
        const tmpPaperTex = this.paperTexture;
        const paperImg = new Image();
        paperImg.onload = function () {
            util.handleTextureLoaded(paperImg, tmpPaperTex, gl);
        };
        paperImg.src = '../assets/paper.jpg';

        // Initialize additional shaders for watercolor passes
        this.initWatercolorShaders();
    }

    private loadShaders(): void {
        // Load base shaders from files (lighting, diffuse, shadow, midtone, texture, blur)
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

        // Initialize watercolor FBOs and textures
        this.initWatercolorBaseBuffer();
        this.initShadowBuffer();
        [this.gMidtoneTex, this.gMidtoneFBO] = this.initBuffer(this.gMidtoneTex, this.gMidtoneFBO);
        this.initWatercolorTextureBuffer();
        this.initBlurBuffer();
    }

    /**
     * Initialize custom shader programs for the modular watercolor pipeline passes.
     */
    private initWatercolorShaders(): void {
        const gl = this.gl;
        // Common fullscreen quad vertex shader (passthrough)
        const vsSource = `#version 300 es
            precision mediump float;
            layout(location = 0) in vec2 aPosition;
            layout(location = 1) in vec2 aTexCoord;
            out vec2 vUv;
            void main() {
                vUv = aTexCoord;
                gl_Position = vec4(aPosition, 0.0, 1.0);
            }`;
        const compileShader = (source: string, type: number): WebGLShader => {
            const shader = gl.createShader(type) as WebGLShader;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error("Shader compile error:", gl.getShaderInfoLog(shader));
            }
            return shader;
        };
        const createProgram = (vs: WebGLShader, fsSource: string): WebGLProgram => {
            const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);
            const program = gl.createProgram() as WebGLProgram;
            gl.attachShader(program, vs);
            gl.attachShader(program, fs);
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                console.error("Program link error:", gl.getProgramInfoLog(program));
            }
            return program;
        };

        // Compile fullscreen vertex shader once
        const fullscreenVS = compileShader(vsSource, gl.VERTEX_SHADER);

        // Specular highlight detection shader: outputs a binary white highlight mask
        const specFragSource = `#version 300 es
            precision highp float;
            in vec2 vUv;
            // G-buffer inputs and lights (same as in Diffuse shader)
            uniform sampler2D gNormalTex;
            uniform sampler2D gPosition;
            uniform vec4 uLightPos[5];
            uniform vec4 uLightColor[5];
            uniform vec4 uLightEnabled[5];
            uniform vec4 uLightDirection[5];
            uniform float uLightCutoff[5];
            uniform vec3 cameraPos;
            uniform float k_specular;
            uniform float p;
            layout(location = 0) out vec4 fragColor;
            void main() {
                vec3 N = normalize(texture(gNormalTex, vUv).xyz);
                vec3 pos = texture(gPosition, vUv).xyz;
                bool isHighlight = false;
                for (int i = 0; i < 5; ++i) {
                    if (uLightEnabled[i].z <= 0.0) { continue; }  // require specular flag
                    vec3 L = normalize(uLightPos[i].xyz - pos);
                    vec3 LD = normalize(uLightDirection[i].xyz);
                    if (dot(LD, L) < uLightCutoff[i]) { continue; }
                    vec3 H = normalize(cameraPos + uLightPos[i].xyz);
                    float rawSpec = k_specular * pow(max(dot(N, H), 0.0), p);
                    // Smooth threshold for specular highlight
                    float highlight = smoothstep(0.01, 0.03, rawSpec);
                    if (highlight > 0.0) { 
                        isHighlight = true; 
                        break; 
                    }
                }
                if (isHighlight) {
                    fragColor = vec4(1.0, 1.0, 1.0, 1.0); // white highlight
                } else {
                    discard;
                }
            }`;
        this.specularShader = createProgram(fullscreenVS, specFragSource);

        // Specular add shader: adds the specular highlight (white) to the base image.
        // C_out = C_base + k_s * C_specular (k_s tuned to saturate highlight):contentReference[oaicite:0]{index=0}
        const specAddFragSource = `#version 300 es
            precision mediump float;
            in vec2 vUv;
            uniform sampler2D baseTex;
            uniform sampler2D specTex;
            uniform float k_s;
            layout(location = 0) out vec4 fragColor;
            void main() {
                vec4 base = texture(baseTex, vUv);
                vec4 spec = texture(specTex, vUv);
                // Add highlight (spec) to base color
                vec3 colorOut = base.rgb + k_s * spec.rgb;
                colorOut = clamp(colorOut, 0.0, 1.0);
                // Ensure highlight regions become opaque (if spec alpha is present)
                float alphaOut = max(base.a, spec.a);
                fragColor = vec4(colorOut, alphaOut);
            }`;
        this.specularAddShader = createProgram(fullscreenVS, specAddFragSource);

        // CMYK pigment blending shader: mixes two pigment colors based on brightness:contentReference[oaicite:1]{index=1}:contentReference[oaicite:2]{index=2}
        const cmykFragSource = `#version 300 es
            precision mediump float;
            in vec2 vUv;
            uniform sampler2D inputTex;
            uniform vec3 pigmentDark;
            uniform vec3 pigmentLight;
            layout(location = 0) out vec4 fragColor;
            // Convert RGB to CMYK:contentReference[oaicite:3]{index=3}:contentReference[oaicite:4]{index=4}
            vec4 RGBtoCMYK(vec3 rgb) {
                float r = rgb.r, g = rgb.g, b = rgb.b;
                float k = min(1.0 - r, min(1.0 - g, 1.0 - b));
                float invK = 1.0 - k;
                float c = 0.0, m = 0.0, y = 0.0;
                if (invK > 0.0) {
                    c = (1.0 - r - k) / invK;
                    m = (1.0 - g - k) / invK;
                    y = (1.0 - b - k) / invK;
                }
                return vec4(c, m, y, k);
            }
            // Convert CMYK to RGB:contentReference[oaicite:5]{index=5}:contentReference[oaicite:6]{index=6}
            vec3 CMYKtoRGB(vec4 cmyk) {
                float c = cmyk.x, m = cmyk.y, y = cmyk.z, k = cmyk.w;
                float invK = 1.0 - k;
                float r = 1.0 - min(1.0, c * invK + k);
                float g = 1.0 - min(1.0, m * invK + k);
                float b = 1.0 - min(1.0, y * invK + k);
                return vec3(r, g, b);
            }
            void main() {
                vec4 base = texture(inputTex, vUv);
                vec3 baseColor = base.rgb;
                // Compute brightness of base color as mixing factor:contentReference[oaicite:7]{index=7}
                float brightness = (baseColor.r + baseColor.g + baseColor.b) / 3.0;
                vec4 cmykDark = RGBtoCMYK(pigmentDark);
                vec4 cmykLight = RGBtoCMYK(pigmentLight);
                vec4 cmykMix = mix(cmykDark, cmykLight, brightness);
                vec3 mixedRGB = CMYKtoRGB(cmykMix);
                fragColor = vec4(mixedRGB, base.a);
            }`;
        this.cmykShader = createProgram(fullscreenVS, cmykFragSource);

        // Combine shader: sums base, shadow, midtone layers and clamps color, sets alpha = max(alpha):contentReference[oaicite:8]{index=8}
        const combineFragSource = `#version 300 es
            precision mediump float;
            in vec2 vUv;
            uniform sampler2D baseTex;
            uniform sampler2D shadowTex;
            uniform sampler2D midTex;
            layout(location = 0) out vec4 fragColor;
            void main() {
                vec4 base = texture(baseTex, vUv);
                vec4 shadow = texture(shadowTex, vUv);
                vec4 mid = texture(midTex, vUv);
                // Each layer contains its own pigment color:contentReference[oaicite:9]{index=9}
                vec3 combinedColor = base.rgb + shadow.rgb + mid.rgb;
                combinedColor = clamp(combinedColor, 0.0, 1.0);
                float combinedAlpha = max(max(base.a, shadow.a), mid.a);
                fragColor = vec4(combinedColor, combinedAlpha);
            }`;
        this.combineShader = createProgram(fullscreenVS, combineFragSource);

        // Step (threshold) shader: create clustered patches by thresholding alpha:contentReference[oaicite:10]{index=10}
        const stepFragSource = `#version 300 es
            precision mediump float;
            in vec2 vUv;
            uniform sampler2D prevTex;
            uniform float threshold;
            uniform float clusterAlpha;
            layout(location = 0) out vec4 fragColor;
            void main() {
                vec4 color = texture(prevTex, vUv);
                // Hard threshold on alpha:contentReference[oaicite:11]{index=11}
                float newAlpha = color.a >= threshold ? clusterAlpha : 0.0;
                fragColor = vec4(color.rgb, newAlpha);
            }`;
        this.stepShader = createProgram(fullscreenVS, stepFragSource);

        // Edge darkening shader: darkens edges by boosting alpha at edges of pigment patches:contentReference[oaicite:12]{index=12}
        const edgeDarkFragSource = `#version 300 es
            precision mediump float;
            in vec2 vUv;
            uniform sampler2D blurredTex;   // intensity texture p (blurred alpha):contentReference[oaicite:13]{index=13}
            uniform sampler2D prevTex;      // previous output λ (thresholded):contentReference[oaicite:14]{index=14}
            uniform float k_edge;          // edge darkening factor
            layout(location = 0) out vec4 fragColor;
            void main() {
                vec4 blurred = texture(blurredTex, vUv);
                vec4 prev = texture(prevTex, vUv);
                float origAlpha = prev.a;
                float edgeStrength = 1.0 - blurred.a;         // strong where blurred alpha is low (edges):contentReference[oaicite:15]{index=15}
                float addedAlpha = k_edge * edgeStrength;
                float newAlpha = clamp(origAlpha + addedAlpha, 0.0, 1.0);
                // Multiply by original alpha to keep shape within original boundaries:contentReference[oaicite:16]{index=16}
                newAlpha *= origAlpha;
                fragColor = vec4(prev.rgb, newAlpha);
            }`;
        this.edgeDarkenShader = createProgram(fullscreenVS, edgeDarkFragSource);

        // Edge modulation (paper granulation) shader: modulates final alpha by paper texture (darker paper -> more pigment):contentReference[oaicite:17]{index=17}:contentReference[oaicite:18]{index=18}
        const edgeModFragSource = `#version 300 es
            precision mediump float;
            in vec2 vUv;
            uniform sampler2D prevTex;
            uniform sampler2D paperTex;
            uniform float grainFactor;
            layout(location = 0) out vec4 fragColor;
            void main() {
                vec4 prev = texture(prevTex, vUv);
                vec3 paperColor = texture(paperTex, vUv).rgb;
                // Convert paper to grayscale (perceived brightness)
                float paperBrightness = dot(paperColor, vec3(0.299, 0.587, 0.114));
                // Darker paper areas -> higher pigment concentration: invert brightness:contentReference[oaicite:19]{index=19}
                float paperDarkness = 1.0 - paperBrightness;
                // Apply a subtle darkening effect to alpha based on paper darkness:contentReference[oaicite:20]{index=20}
                float finalAlpha = clamp(prev.a + grainFactor * paperDarkness, 0.0, 1.0);
                fragColor = vec4(prev.rgb * 1.0, finalAlpha); // keep color same (flat wash already applied):contentReference[oaicite:21]{index=21}
            }`;
        this.edgeModShader = createProgram(fullscreenVS, edgeModFragSource);

        // Horizontal blur shader (9-tap Gaussian):contentReference[oaicite:22]{index=22}:contentReference[oaicite:23]{index=23}
        const blurHFragSource = `#version 300 es
            precision mediump float;
            in vec2 vUv;
            uniform sampler2D tDiffuse;
            uniform float h; // texel offset in horizontal direction
            layout(location = 0) out vec4 fragColor;
            void main() {
                vec4 sum = vec4(0.0);
                sum += texture(tDiffuse, vUv + vec2(-4.0 * h, 0.0)) * 0.051;
                sum += texture(tDiffuse, vUv + vec2(-3.0 * h, 0.0)) * 0.0918;
                sum += texture(tDiffuse, vUv + vec2(-2.0 * h, 0.0)) * 0.12245;
                sum += texture(tDiffuse, vUv + vec2(-1.0 * h, 0.0)) * 0.1531;
                sum += texture(tDiffuse, vUv) * 0.1633;
                sum += texture(tDiffuse, vUv + vec2(1.0 * h, 0.0)) * 0.1531;
                sum += texture(tDiffuse, vUv + vec2(2.0 * h, 0.0)) * 0.12245;
                sum += texture(tDiffuse, vUv + vec2(3.0 * h, 0.0)) * 0.0918;
                sum += texture(tDiffuse, vUv + vec2(4.0 * h, 0.0)) * 0.051;
                fragColor = sum;
            }`;
        // Vertical blur shader (9-tap Gaussian):contentReference[oaicite:24]{index=24}:contentReference[oaicite:25]{index=25}
        const blurVFragSource = `#version 300 es
            precision mediump float;
            in vec2 vUv;
            uniform sampler2D tDiffuse;
            uniform float v; // texel offset in vertical direction
            layout(location = 0) out vec4 fragColor;
            void main() {
                vec4 sum = vec4(0.0);
                sum += texture(tDiffuse, vUv + vec2(0.0, -4.0 * v)) * 0.051;
                sum += texture(tDiffuse, vUv + vec2(0.0, -3.0 * v)) * 0.0918;
                sum += texture(tDiffuse, vUv + vec2(0.0, -2.0 * v)) * 0.12245;
                sum += texture(tDiffuse, vUv + vec2(0.0, -1.0 * v)) * 0.1531;
                sum += texture(tDiffuse, vUv) * 0.1633;
                sum += texture(tDiffuse, vUv + vec2(0.0, 1.0 * v)) * 0.1531;
                sum += texture(tDiffuse, vUv + vec2(0.0, 2.0 * v)) * 0.12245;
                sum += texture(tDiffuse, vUv + vec2(0.0, 3.0 * v)) * 0.0918;
                sum += texture(tDiffuse, vUv + vec2(0.0, 4.0 * v)) * 0.051;
                fragColor = sum;
            }`;
        this.blurShaderH = createProgram(fullscreenVS, blurHFragSource);
        this.blurShaderV = createProgram(fullscreenVS, blurVFragSource);
    }

    /**
     * DiffusePass: Base wash layer using lighting (ambient + diffuse) and paper texture,
     * outputs initial watercolor base texture (color + alpha). Highlights are discarded to create specular mask:contentReference[oaicite:26]{index=26}:contentReference[oaicite:27]{index=27}.
     */
    public DiffusePass(): void {
        this.gl.useProgram(this.diffuseShader);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gWaterColorBaseFBO);
        this.gl.viewport(0, 0, this.gTexWidth, this.gTexHeight);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.disable(this.gl.DEPTH_TEST);

        // Bind G-buffer inputs
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gAlbedoTex);
        this.gl.uniform1i(this.gl.getUniformLocation(this.diffuseShader, "gAlbedo"), 0);
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gSpecularTex);
        this.gl.uniform1i(this.gl.getUniformLocation(this.diffuseShader, "gSpecular"), 1);
        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gNormalTex);
        this.gl.uniform1i(this.gl.getUniformLocation(this.diffuseShader, "gNormalTex"), 2);
        this.gl.activeTexture(this.gl.TEXTURE3);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gPositionTex);
        this.gl.uniform1i(this.gl.getUniformLocation(this.diffuseShader, "gPosition"), 3);

        // Upload lighting uniforms
        uploadLightsForProgram(this.diffuseShader);

        // Camera position for specular half-vector calculation
        this.gl.uniform3f(
            this.gl.getUniformLocation(this.diffuseShader, "cameraPos"),
            this.camera.getCamerax(),
            this.camera.getCameray(),
            this.camera.getCameraz()
        );
        // Phong lighting parameters
        this.gl.uniform1f(this.gl.getUniformLocation(this.diffuseShader, "k_ambient"), this.waterColorSettings.k_ambient);
        this.gl.uniform1f(this.gl.getUniformLocation(this.diffuseShader, "k_diffuse"), this.waterColorSettings.k_diffuse);
        this.gl.uniform1f(this.gl.getUniformLocation(this.diffuseShader, "k_specular"), this.waterColorSettings.k_specular);
        this.gl.uniform1f(this.gl.getUniformLocation(this.diffuseShader, "p"), this.waterColorSettings.p);

        // Bind paper texture (for paperColor in shader)
        this.gl.activeTexture(this.gl.TEXTURE4);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.paperTexture);
        this.gl.uniform1i(this.gl.getUniformLocation(this.diffuseShader, "paperTex"), 4);

        // Draw fullscreen quad
        this.drawRectangle();
    }

    /**
     * ShadowPass: Second wash for shadow regions (surfaces facing away from light), outputs watercolor shadow texture:contentReference[oaicite:28]{index=28}:contentReference[oaicite:29]{index=29}.
     * Bright (lit) areas are discarded, leaving pigment only in darker parts of the scene.
     */
    public ShadowPass(): void {
        const shader = this.shadowShader;
        this.gl.useProgram(shader);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gShadowFBO);
        this.gl.viewport(0, 0, this.gTexWidth, this.gTexHeight);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.disable(this.gl.DEPTH_TEST);

        // Bind G-buffer inputs
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gAlbedoTex);
        this.gl.uniform1i(this.gl.getUniformLocation(shader, "gAlbedo"), 0);
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gSpecularTex);
        this.gl.uniform1i(this.gl.getUniformLocation(shader, "gSpecular"), 1);
        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gNormalTex);
        this.gl.uniform1i(this.gl.getUniformLocation(shader, "gNormalTex"), 2);
        this.gl.activeTexture(this.gl.TEXTURE3);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gPositionTex);
        this.gl.uniform1i(this.gl.getUniformLocation(shader, "gPosition"), 3);

        // Upload light data for shadow calculations
        uploadLightsForProgram(shader);
        this.gl.uniform3f(
            this.gl.getUniformLocation(shader, "cameraPos"),
            this.camera.getCamerax(),
            this.camera.getCameray(),
            this.camera.getCameraz()
        );
        this.gl.uniform1f(this.gl.getUniformLocation(shader, "k_ambient"), this.waterColorSettings.k_ambient);
        this.gl.uniform1f(this.gl.getUniformLocation(shader, "k_diffuse"), this.waterColorSettings.k_diffuse);
        this.gl.uniform1f(this.gl.getUniformLocation(shader, "k_specular"), this.waterColorSettings.k_specular);
        this.gl.uniform1f(this.gl.getUniformLocation(shader, "p"), this.waterColorSettings.p);

        // Bind paper texture for paperColor modulation in shadow pass
        this.gl.activeTexture(this.gl.TEXTURE4);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.paperTexture);
        this.gl.uniform1i(this.gl.getUniformLocation(shader, "paperTex"), 4);

        this.drawRectangle();
    }

    /**
     * MidtonePass: Third wash for mid-brightness regions, outputs watercolor midtone texture:contentReference[oaicite:30]{index=30}:contentReference[oaicite:31]{index=31}.
     * Fragments in bright or very dark regions are discarded, leaving pigment only on medium lighted areas.
     */
    public MidtonePass(): void {
        const shader = this.midtoneShader;
        this.gl.useProgram(shader);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gMidtoneFBO);
        this.gl.viewport(0, 0, this.gTexWidth, this.gTexHeight);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.disable(this.gl.DEPTH_TEST);

        // Bind G-buffer inputs
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gAlbedoTex);
        this.gl.uniform1i(this.gl.getUniformLocation(shader, "gAlbedo"), 0);
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gSpecularTex);
        this.gl.uniform1i(this.gl.getUniformLocation(shader, "gSpecular"), 1);
        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gNormalTex);
        this.gl.uniform1i(this.gl.getUniformLocation(shader, "gNormalTex"), 2);
        this.gl.activeTexture(this.gl.TEXTURE3);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gPositionTex);
        this.gl.uniform1i(this.gl.getUniformLocation(shader, "gPosition"), 3);

        // Upload lights for midtone mask calculations
        uploadLightsForProgram(shader);
        this.gl.uniform3f(
            this.gl.getUniformLocation(shader, "cameraPos"),
            this.camera.getCamerax(),
            this.camera.getCameray(),
            this.camera.getCameraz()
        );
        this.gl.uniform1f(this.gl.getUniformLocation(shader, "k_ambient"), this.waterColorSettings.k_ambient);
        this.gl.uniform1f(this.gl.getUniformLocation(shader, "k_diffuse"), this.waterColorSettings.k_diffuse);
        this.gl.uniform1f(this.gl.getUniformLocation(shader, "k_specular"), this.waterColorSettings.k_specular);
        this.gl.uniform1f(this.gl.getUniformLocation(shader, "p"), this.waterColorSettings.p);

        // Bind paper texture for paperColor modulation in midtone pass
        this.gl.activeTexture(this.gl.TEXTURE4);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.paperTexture);
        this.gl.uniform1i(this.gl.getUniformLocation(shader, "paperTex"), 4);

        this.drawRectangle();
    }

    /**
     * SpecularPass: Isolates bright specular highlights (sparkles) into a mask texture:contentReference[oaicite:32]{index=32}:contentReference[oaicite:33]{index=33}.
     * Outputs a texture with white highlights where specular reflections occur, black (discarded) elsewhere.
     */
    public SpecularPass(): void {
        this.gl.useProgram(this.specularShader);
        // Reuse shadow FBO/texture to store specular highlights (since shadow already used and will be combined)
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gShadowFBO);
        this.gl.viewport(0, 0, this.gTexWidth, this.gTexHeight);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.disable(this.gl.DEPTH_TEST);

        // Bind required G-buffer inputs for specular calculation
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gNormalTex);
        this.gl.uniform1i(this.gl.getUniformLocation(this.specularShader, "gNormalTex"), 0);
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gPositionTex);
        this.gl.uniform1i(this.gl.getUniformLocation(this.specularShader, "gPosition"), 1);

        // Upload light and camera data for specular computations
        uploadLightsForProgram(this.specularShader);
        this.gl.uniform3f(
            this.gl.getUniformLocation(this.specularShader, "cameraPos"),
            this.camera.getCamerax(),
            this.camera.getCameray(),
            this.camera.getCameraz()
        );
        this.gl.uniform1f(this.gl.getUniformLocation(this.specularShader, "k_specular"), this.waterColorSettings.k_specular);
        this.gl.uniform1f(this.gl.getUniformLocation(this.specularShader, "p"), this.waterColorSettings.p);

        this.drawRectangle();
    }

    /**
     * SpecularAddPass: Adds the specular highlight layer back onto the base painting using additive blending:contentReference[oaicite:34]{index=34}:contentReference[oaicite:35]{index=35}.
     * This simulates sparkling highlights by making highlight areas lighter (nearly white) on the painting.
     */
    public SpecularAddPass(): void {
        this.gl.useProgram(this.specularAddShader);
        // Use the watercolor texture FBO or base FBO for output (baseTex will receive highlights)
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gWaterColorBaseFBO);
        this.gl.viewport(0, 0, this.gTexWidth, this.gTexHeight);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.disable(this.gl.DEPTH_TEST);

        // Bind combined base color (from Diffuse+Shadow+Midtone) and specular mask
        // First, combine base, shadow, midtone from previous passes into one texture
        this.gl.useProgram(this.combineShader);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gWaterColorTextureFBO);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        // Base layer (DiffusePass result)
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gWaterColorBaseTex);
        this.gl.uniform1i(this.gl.getUniformLocation(this.combineShader, "baseTex"), 0);
        // Shadow layer
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gShadowTex);
        this.gl.uniform1i(this.gl.getUniformLocation(this.combineShader, "shadowTex"), 1);
        // Midtone layer
        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gMidtoneTex);
        this.gl.uniform1i(this.gl.getUniformLocation(this.combineShader, "midTex"), 2);
        this.drawRectangle();

        // Now use SpecularAdd shader to add highlights to the combined image
        this.gl.useProgram(this.specularAddShader);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gWaterColorBaseFBO);
        // Input base combined texture (from combineShader output)
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gWaterColorTexure);
        this.gl.uniform1i(this.gl.getUniformLocation(this.specularAddShader, "baseTex"), 0);
        // Input specular highlight mask (from SpecularPass output stored in gShadowTex)
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gShadowTex);
        this.gl.uniform1i(this.gl.getUniformLocation(this.specularAddShader, "specTex"), 1);
        // Set highlight intensity factor k_s (tuned for visual effect)
        this.gl.uniform1f(this.gl.getUniformLocation(this.specularAddShader, "k_s"), 1.0);
        this.drawRectangle();
    }

    /**
     * CMYKBlendingPass: Converts the painting colors to a subtractive pigment model and blends between two pigment colors based on brightness:contentReference[oaicite:36]{index=36}.
     * This ensures color mixing mimics real watercolor pigments by performing interpolation in CMYK space:contentReference[oaicite:37]{index=37}.
     */
    public CMYKBlendingPass(): void {
        this.gl.useProgram(this.cmykShader);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gWaterColorTextureFBO);
        this.gl.viewport(0, 0, this.gTexWidth, this.gTexHeight);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.disable(this.gl.DEPTH_TEST);

        // Input: current base texture (after highlights added)
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gWaterColorBaseTex);
        this.gl.uniform1i(this.gl.getUniformLocation(this.cmykShader, "inputTex"), 0);
        // Pigment colors: define a dark and light pigment (could be configurable)
        // Here we use the original base color's average as one and white as the other for simplicity
        // In practice, user can choose these. For now, use a generic dark pigment (gray) and light pigment (paper white).
        this.gl.uniform3f(this.gl.getUniformLocation(this.cmykShader, "pigmentDark"), 0.2, 0.2, 0.2);
        this.gl.uniform3f(this.gl.getUniformLocation(this.cmykShader, "pigmentLight"), 0.95, 0.95, 0.95);

        this.drawRectangle();

        // After this pass, gWaterColorTexure contains the painting colored with pigment mixing (subtractive blending).
        // Copy the output back to base texture for further processing
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gWaterColorBaseFBO);
        this.gl.viewport(0, 0, this.gTexWidth, this.gTexHeight);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        // Simply draw the texture to base FBO
        this.gl.useProgram(this.textureShader);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gWaterColorTexure);
        this.gl.uniform1i(this.gl.getUniformLocation(this.textureShader, "uTex"), 0);
        this.drawRectangle();
    }

    /**
     * BlurPass: Performs a two-pass Gaussian blur (horizontal then vertical) on the current painting to simulate pigment bleeding:contentReference[oaicite:38]{index=38}.
     * This removes fine details and softens edges before clustering.
     */
    public BlurPass(): void {
        // Horizontal blur
        this.gl.useProgram(this.blurShaderH);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gWaterColorBlurFBO);
        this.gl.viewport(0, 0, this.gTexWidth, this.gTexHeight);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.disable(this.gl.DEPTH_TEST);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gWaterColorBaseTex);
        this.gl.uniform1i(this.gl.getUniformLocation(this.blurShaderH, "tDiffuse"), 0);
        this.gl.uniform1f(this.gl.getUniformLocation(this.blurShaderH, "h"), 1.0 / this.gTexWidth);
        this.drawRectangle();

        // Vertical blur
        this.gl.useProgram(this.blurShaderV);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gWaterColorTextureFBO);
        this.gl.viewport(0, 0, this.gTexWidth, this.gTexHeight);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gWaterColorBlurTex);
        this.gl.uniform1i(this.gl.getUniformLocation(this.blurShaderV, "tDiffuse"), 0);
        this.gl.uniform1f(this.gl.getUniformLocation(this.blurShaderV, "v"), 1.0 / this.gTexHeight);
        this.drawRectangle();

        // Now gWaterColorTexure contains the blurred image (RGBA).
    }

    /**
     * stepPass: Applies a threshold (step function) to the blurred alpha to cluster the pigment into distinct regions:contentReference[oaicite:39]{index=39}:contentReference[oaicite:40]{index=40}.
     * This creates hard-edged shapes from the blurred wash.
     */
    public StepPass(): void {
        this.gl.useProgram(this.stepShader);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gWaterColorBlurFBO);
        this.gl.viewport(0, 0, this.gTexWidth, this.gTexHeight);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.disable(this.gl.DEPTH_TEST);
        // Input: blurred texture
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gWaterColorTexure);
        this.gl.uniform1i(this.gl.getUniformLocation(this.stepShader, "prevTex"), 0);
        // Threshold and cluster alpha values
        this.gl.uniform1f(this.gl.getUniformLocation(this.stepShader, "threshold"), 0.3);
        this.gl.uniform1f(this.gl.getUniformLocation(this.stepShader, "clusterAlpha"), 0.6);
        this.drawRectangle();
        // After this pass, gWaterColorBlurTex contains the thresholded image (with clustered alpha patches).
    }

    /**
     * EdgeDarkenPass: Darkens the edges of pigment patches (edge darkening effect):contentReference[oaicite:41]{index=41}.
     * It uses the difference between the blurred alpha (smooth intensity) and the thresholded alpha to boost pigment at edges:contentReference[oaicite:42]{index=42}.
     */
    public EdgeDarkenPass(): void {
        this.gl.useProgram(this.edgeDarkenShader);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gWaterColorTextureFBO);
        this.gl.viewport(0, 0, this.gTexWidth, this.gTexHeight);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.disable(this.gl.DEPTH_TEST);
        // Input intensity (blurred alpha) texture
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gWaterColorTexure);
        this.gl.uniform1i(this.gl.getUniformLocation(this.edgeDarkenShader, "blurredTex"), 0);
        // Input previous thresholded output
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gWaterColorBlurTex);
        this.gl.uniform1i(this.gl.getUniformLocation(this.edgeDarkenShader, "prevTex"), 1);
        // Edge darkening factor k (magic number to scale edge effect):contentReference[oaicite:43]{index=43}
        this.gl.uniform1f(this.gl.getUniformLocation(this.edgeDarkenShader, "k_edge"), 0.5);
        this.drawRectangle();
        // Now gWaterColorTexure contains the image with edge-darkened alpha (edges of shapes are more opaque/darker).
    }

    /**
     * EdgeModulationPass: Final paper granulation stage:contentReference[oaicite:44]{index=44}:contentReference[oaicite:45]{index=45}.
     * It modulates the final alpha by the paper texture grain, so pigment subtly pools in the paper's valleys (darker areas) and is lighter on peaks.
     * Outputs the final composited watercolor image.
     */
    public EdgeModulationPass(): void {
        this.gl.useProgram(this.edgeModShader);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gMidtoneFBO);
        this.gl.viewport(0, 0, this.gTexWidth, this.gTexHeight);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.disable(this.gl.DEPTH_TEST);
        // Input: image after edge darkening
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gWaterColorTexure);
        this.gl.uniform1i(this.gl.getUniformLocation(this.edgeModShader, "prevTex"), 0);
        // Paper texture input
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.paperTexture);
        this.gl.uniform1i(this.gl.getUniformLocation(this.edgeModShader, "paperTex"), 1);
        // Grain factor controls how strongly paper darkness affects alpha (tunable)
        this.gl.uniform1f(this.gl.getUniformLocation(this.edgeModShader, "grainFactor"), 0.5);
        this.drawRectangle();
        // gMidtoneTex now holds the final composited watercolor RGBA image (with paper grain modulation).
    }

    /**
     * LightingPass: Final composition to the screen.
     * If watercolor mode is enabled, it outputs the final watercolor image to the canvas.
     * If disabled, it falls back to standard Phong shading using the G-buffer.
     */
    public LightingPass(): void {
        // Render to the default framebuffer (canvas)
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.disable(this.gl.DEPTH_TEST);
        this.gl.disable(this.gl.BLEND);

        if (!this.waterColorSettings.waterColorEnabled) {
            // === standard deferred lighting (unchanged) ===
            this.gl.useProgram(this.lightShader);

            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gAlbedoTex);
            this.gl.uniform1i(this.gl.getUniformLocation(this.lightShader, "gAlbedo"), 0);

            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gSpecularTex);
            this.gl.uniform1i(this.gl.getUniformLocation(this.lightShader, "gSpecular"), 1);

            this.gl.activeTexture(this.gl.TEXTURE2);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gNormalTex);
            this.gl.uniform1i(this.gl.getUniformLocation(this.lightShader, "gNormalTex"), 2);

            this.gl.activeTexture(this.gl.TEXTURE3);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gPositionTex);
            this.gl.uniform1i(this.gl.getUniformLocation(this.lightShader, "gPosition"), 3);

            this.gl.uniform1i(this.gl.getUniformLocation(this.lightShader, "mode"), 0); // ensure false
            uploadLightsForProgram(this.lightShader);

            this.drawRectangle();
        } else {
            // === watercolor debug: show gMidtoneTex via `test` sampler ===
            this.gl.useProgram(this.lightShader);

            // Switch to watercolor branch in the shader
            this.gl.uniform1i(
                this.gl.getUniformLocation(this.lightShader, "mode"),
                1
            );

            // Bind gMidtoneTex to texture unit 0 and hook it to sampler `test`
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gMidtoneTex);
            this.gl.uniform1i(
                this.gl.getUniformLocation(this.lightShader, "test"),
                0
            );

            this.drawRectangle();
        }
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

    private initWatercolorTextureBuffer(): void {
        this.gWaterColorTexure = this.gl.createTexture() as WebGLTexture;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gWaterColorTexure);

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

        this.gWaterColorTextureFBO = this.gl.createFramebuffer() as WebGLFramebuffer;
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gWaterColorTextureFBO);
        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,
            this.gl.COLOR_ATTACHMENT0,
            this.gl.TEXTURE_2D,
            this.gWaterColorTexure,
            0
        );
        this.gl.drawBuffers([this.gl.COLOR_ATTACHMENT0]);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }

    private initBlurBuffer(): void {
        this.gWaterColorBlurTex = this.gl.createTexture() as WebGLTexture;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.gWaterColorBlurTex);

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

        this.gWaterColorBlurFBO = this.gl.createFramebuffer() as WebGLFramebuffer;
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gWaterColorBlurFBO);
        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,
            this.gl.COLOR_ATTACHMENT0,
            this.gl.TEXTURE_2D,
            this.gWaterColorBlurTex,
            0
        );
        this.gl.drawBuffers([this.gl.COLOR_ATTACHMENT0]);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
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
