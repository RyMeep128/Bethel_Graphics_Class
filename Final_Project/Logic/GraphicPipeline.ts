import {Light} from "../Objects/CameraObjects/Light";
import {flatten, mat4, perspective, vec4} from "../Utility/helperfunctions";

export class GraphicPipeline {

    private gl: WebGLRenderingContext;


    public GraphicPipeline(gl:WebGLRenderingContext){
        this.gl = gl;

    }

    BlurPass(): void {
    }



    EdgeDarkenPass(): void {
    }



    EdgeModulationPass(): void {
    }



    public DiffusePass(): void {

        this.gl.useProgram(diffuseShader);

        // Render into the watercolor base texture
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, gWaterColorBaseFBO);
        this.gl.viewport(0, 0, gTexWidth, gTexHeight);

        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Bind G-buffer textures as inputs (samplers)
        // Albedo
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, gAlbedoTex);
        this.gl.uniform1i(this.gl.getUniformLocation(diffuseShader, "gAlbedo"), 0);

        // Specular
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, gSpecularTex);
        this.gl.uniform1i(this.gl.getUniformLocation(diffuseShader, "gSpecular"), 1);

        // Normal
        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, gNormalTex);
        this.gl.uniform1i(this.gl.getUniformLocation(diffuseShader, "gNormalTex"), 2);

        // Position
        this.gl.activeTexture(this.gl.TEXTURE3);
        this.gl.bindTexture(this.gl.TEXTURE_2D, gPositionTex);
        this.gl.uniform1i(this.gl.getUniformLocation(diffuseShader, "gPosition"), 3);

        uploadLightsForProgram(diffuseShader);

        // Set palette colors as uniforms (paper-ish warm tones)
        const color0 = this.gl.getUniformLocation(diffuseShader, "color0");
        const color1 = this.gl.getUniformLocation(diffuseShader, "color1");

        this.gl.uniform4f(color0, 0.92, 0.88, 0.78, 1.0);

        // darker warm pigment
        this.gl.uniform4f(color1, 0.45, 0.28, 0.18, 1.0);

        this.drawRectangle();
    }


    MidtonePass(): void {
    }

    TexturePass(): void {

        this.gl.useProgram(textureShader);

        // Render into the watercolor base texture
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, gWaterColorTextureFBO);
        this.gl.viewport(0, 0, gTexWidth, gTexHeight);

        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Bind G-buffer textures as inputs (samplers)
        // Albedo
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, gWaterColorBaseTex);
        this.gl.uniform1i(this.gl.getUniformLocation(textureShader, "waterColorMidtoneTex"), 0);

        // Specular
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, paperTexture);
        this.gl.uniform1i(this.gl.getUniformLocation(textureShader, "paperTex"), 1);

        this.drawRectangle();
    }



    ShadowPass(): void {
    }


    /**
     * Performs the lighting pass for deferred shading.
     *
     * - Binds the default framebuffer (canvas).
     * - Samples from G-buffer textures (albedo, specular, normal, position).
     * - Uploads light data to the lighting shader.
     * - Renders a full-screen quad that computes final shaded color per-fragment.
     *
     * Depth testing is disabled for this pass.
     *
     * @returns {void}
     */
    LightingPass(): void {
        this.gl.useProgram(lightShader);
        this.gl.disable(this.gl.BLEND);

        // Render to the default framebuffer (the canvas)
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.viewport(0, 0, canvas.width, canvas.height);

        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.disable(this.gl.DEPTH_TEST);

        // Albedo
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, gAlbedoTex);
        this.gl.uniform1i(this.gl.getUniformLocation(lightShader, "gAlbedo"), 0);

        // Specular
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, gSpecularTex);
        this.gl.uniform1i(this.gl.getUniformLocation(lightShader, "gSpecular"), 1);

        // Normal
        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, gNormalTex);
        this.gl.uniform1i(this.gl.getUniformLocation(lightShader, "gNormalTex"), 2);

        // Position
        this.gl.activeTexture(this.gl.TEXTURE3);
        this.gl.bindTexture(this.gl.TEXTURE_2D, gPositionTex);
        this.gl.uniform1i(this.gl.getUniformLocation(lightShader, "gPosition"), 3);

        //Testing
        this.gl.activeTexture(this.gl.TEXTURE4);
        this.gl.bindTexture(this.gl.TEXTURE_2D, gWaterColorTexure);
        this.gl.uniform1i(this.gl.getUniformLocation(lightShader, "test"), 4);

        // --- Upload light uniforms for the lighting shader ---
        uploadLightsForProgram(lightShader);

        // --- Draw full-screen quad ---
        drawRectangle();

        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.BLEND);
    }

    /**
     * Uploads current light data (sun + car lights) to a given shader program.
     *
     * Populates:
     * - `uLightColor`   (vec4[5])
     * - `uLightAmbient` (vec4[5])
     * - `uLightPos`     (vec4[5])  in view space
     * - `uLightDirection` (vec4[5]) in view space
     * - `uLightEnabled` (vec4[5])  as on/off flags
     * - `uLightCutoff`  (float[5]) for spotlights
     *
     * Positions and directions are computed in the current camera's view space.
     *
     * @param {WebGLProgram} program - The shader program to receive the uniforms.
     * @returns {void}
     */

    uploadLightsForProgram(program: WebGLProgram): void {
        const lights: Light[] = [];
        lights.push(sun);
        lights.push(...car.getLightData());

        const ambients: vec4[] = [];
        const colors: vec4[] = [];
        const directions: vec4[] = [];
        const positions: vec4[] = [];
        const enabled: vec4[] = [];
        const cutOffAngles: number[] = [];

        const cameraMV = getCamera().getCameraMV();

        for (let i = 0; i < 5; i++) {
            ambients.push(lights[i].getAmbient());
            colors.push(lights[i].getColor());

            if (lights[i] !== sun) {
                directions.push(lights[i].getDirection(car.getCarMV(cameraMV)));
                positions.push(lights[i].getPosition(car.getCarMV(cameraMV)));
            } else {
                directions.push(lights[i].getDirection(cameraMV));
                positions.push(lights[i].getPosition(cameraMV));
            }

            enabled.push(lights[i].getEnabled());
            cutOffAngles.push(lights[i].getCutOffAngle());
        }

        const uLightColorLoc = this.gl.getUniformLocation(program, "uLightColor");
        const uAmbientLoc = this.gl.getUniformLocation(program, "uLightAmbient");
        const uLightPosLoc = this.gl.getUniformLocation(program, "uLightPos");
        const uDirectionLoc = this.gl.getUniformLocation(program, "uLightDirection");
        const uEnabledLoc = this.gl.getUniformLocation(program, "uLightEnabled");
        const uLightCutoffLoc = this.gl.getUniformLocation(program, "uLightCutoff");

        if (uLightColorLoc)
            this.gl.uniform4fv(uLightColorLoc, flatten(colors));
        if (uAmbientLoc)
            this.gl.uniform4fv(uAmbientLoc, flatten(ambients));
        if (uLightPosLoc)
            this.gl.uniform4fv(uLightPosLoc, flatten(positions));
        if (uDirectionLoc)
            this.gl.uniform4fv(uDirectionLoc, flatten(directions));
        if (uEnabledLoc)
            this.gl.uniform4fv(uEnabledLoc, flatten(enabled));
        if (uLightCutoffLoc)
            this.gl.uniform1fv(uLightCutoffLoc, cutOffAngles);
    }

    drawRectangle() {

        this.gl.bindVertexArray(screenRectangle);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.bindVertexArray(null);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null); // leave clean for next passes
    }
}