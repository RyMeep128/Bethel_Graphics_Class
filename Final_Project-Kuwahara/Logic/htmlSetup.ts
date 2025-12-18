import { RenderSettings } from "../Utility/RenderSettings.js";

/**
 * @file setupCheckBoxAndSlider
 * @author Ryan Shafer
 * @remarks Comments by ChatGPT model 5.2.
 */

/**
 * Wires UI controls (checkboxes + sliders) to a {@link RenderSettings} instance.
 *
 * This function:
 * - creates a new {@link RenderSettings} object,
 * - registers DOM event listeners for each checkbox/slider,
 * - keeps the UI text readouts in sync with slider values,
 * - and returns the same settings object so the renderer can read live-updated values.
 *
 * Expected HTML elements by id:
 * - Checkboxes: `tensor`, `kuwahara`, `paper`, `post`, `waterColor`, `version1`, `version2`
 * - Sliders: `radius`, `saturationBoost`, `normalEdge`, `depthEdge`, `depthScale`,
 *            `featureWeightX`, `featureWeightY`, `featureWeightZ`,
 *            `albedoWeight`, `normalWeight`, `depthWeight`, `specularWeight`
 * - Value labels: `radiusValue`, `saturationBoostValue`, `normalEdgeValue`, `depthEdgeValue`,
 *                 `depthScaleValue`, `featureWeightXValue`, `featureWeightYValue`, `featureWeightZValue`,
 *                 `albedoWeightValue`, `normalWeightValue`, `depthWeightValue`, `specularWeightValue`
 *
 * @returns A {@link RenderSettings} instance that will be updated whenever the UI changes.
 */
export function setupCheckBoxAndSlider(): RenderSettings {
    /**
     * Single settings object shared with the renderer. All event handlers mutate this object.
     */
    const watercolorSettings = new RenderSettings();

    // -------------------------------------------------------------------------
    // Feature toggles
    // -------------------------------------------------------------------------

    /**
     * Toggle: enables/disables tensor stage in the pipeline.
     */
    const TensorCheckBox = document.getElementById("tensor") as HTMLInputElement;
    TensorCheckBox.addEventListener("change", () => {
        watercolorSettings.TensorEnabled = TensorCheckBox.checked;
    });

    /**
     * Toggle: enables/disables Kuwahara stage in the pipeline.
     */
    const KuwaharaCheckBox = document.getElementById("kuwahara") as HTMLInputElement;
    KuwaharaCheckBox.addEventListener("change", () => {
        watercolorSettings.KuwaharaEnabled = KuwaharaCheckBox.checked;
    });

    /**
     * Toggle: enables/disables paper modulation stage.
     */
    const PaperCheckBox = document.getElementById("paper") as HTMLInputElement;
    PaperCheckBox.addEventListener("change", () => {
        watercolorSettings.PaperEnabled = PaperCheckBox.checked;
    });

    /**
     * Toggle: enables/disables final post-processing stage.
     */
    const PostCheckBox = document.getElementById("post") as HTMLInputElement;
    PostCheckBox.addEventListener("change", () => {
        watercolorSettings.PostEnabled = PostCheckBox.checked;
    });

    /**
     * Master toggle: flips all watercolor-related stages at once (tensor, Kuwahara, paper, post).
     *
     * Also keeps the individual checkboxes visually synced to the master state.
     */
    const waterColorCheckBox = document.getElementById("waterColor") as HTMLInputElement;
    waterColorCheckBox.addEventListener("change", () => {
        watercolorSettings.TensorEnabled = waterColorCheckBox.checked;
        watercolorSettings.KuwaharaEnabled = waterColorCheckBox.checked;
        watercolorSettings.PaperEnabled = waterColorCheckBox.checked;
        watercolorSettings.PostEnabled = waterColorCheckBox.checked;

        TensorCheckBox.checked = waterColorCheckBox.checked;
        KuwaharaCheckBox.checked = waterColorCheckBox.checked;
        PaperCheckBox.checked = waterColorCheckBox.checked;
        PostCheckBox.checked = waterColorCheckBox.checked;
    });

    // -------------------------------------------------------------------------
    // Version selection (mutually exclusive)
    // -------------------------------------------------------------------------

    /**
     * Selects version 1 of the pipeline/shaders.
     * Note: this handler enforces mutual exclusion with `version2`.
     */
    const VersionCheckBox1 = document.getElementById("version1") as HTMLInputElement;

    /**
     * Selects version 2 of the pipeline/shaders.
     * Note: this handler enforces mutual exclusion with `version1`.
     */
    const VersionCheckBox2 = document.getElementById("version2") as HTMLInputElement;

    VersionCheckBox1.addEventListener("change", () => {
        watercolorSettings.version1 = VersionCheckBox1.checked;
        VersionCheckBox2.checked = !VersionCheckBox1.checked;
        watercolorSettings.version2 = !VersionCheckBox1.checked;
    });

    VersionCheckBox2.addEventListener("change", () => {
        watercolorSettings.version2 = VersionCheckBox2.checked;
        VersionCheckBox1.checked = !VersionCheckBox2.checked;
        watercolorSettings.version1 = !VersionCheckBox2.checked;
    });

    // -------------------------------------------------------------------------
    // Sliders
    // -------------------------------------------------------------------------

    /**
     * Radius slider used by passes (e.g., Kuwahara and paper stage).
     */
    const RadiusSlider = document.getElementById("radius") as HTMLInputElement;

    /**
     * Live value label for {@link RadiusSlider}.
     */
    const RadiusValue = document.getElementById("radiusValue") as HTMLElement;

    RadiusSlider.addEventListener("change", () => {
        watercolorSettings.radius = RadiusSlider.valueAsNumber;
        RadiusValue.innerText = RadiusSlider.value;
    });
    RadiusSlider.addEventListener("input", () => {
        watercolorSettings.radius = RadiusSlider.valueAsNumber;
        RadiusValue.innerText = RadiusSlider.value;
    });

    /**
     * Saturation boost used in the post pass.
     */
    const SaturationBoostSlider = document.getElementById("saturationBoost") as HTMLInputElement;
    const SaturationBoostValue = document.getElementById("saturationBoostValue") as HTMLElement;

    SaturationBoostSlider.addEventListener("change", () => {
        watercolorSettings.saturationBoost = SaturationBoostSlider.valueAsNumber;
        SaturationBoostValue.innerText = SaturationBoostSlider.valueAsNumber.toFixed(2);
    });
    SaturationBoostSlider.addEventListener("input", () => {
        watercolorSettings.saturationBoost = SaturationBoostSlider.valueAsNumber;
        SaturationBoostValue.innerText = SaturationBoostSlider.valueAsNumber.toFixed(2);
    });

    /**
     * Normal edge strength used by the Kuwahara stage (shader-specific uniform).
     */
    const NormalEdgeSlider = document.getElementById("normalEdge") as HTMLInputElement;
    const NormalEdgeValue = document.getElementById("normalEdgeValue") as HTMLElement;

    NormalEdgeSlider.addEventListener("change", () => {
        watercolorSettings.normalEdge = NormalEdgeSlider.valueAsNumber;
        NormalEdgeValue.innerText = NormalEdgeSlider.valueAsNumber.toFixed(2);
    });
    NormalEdgeSlider.addEventListener("input", () => {
        watercolorSettings.normalEdge = NormalEdgeSlider.valueAsNumber;
        NormalEdgeValue.innerText = NormalEdgeSlider.valueAsNumber.toFixed(2);
    });

    /**
     * Depth edge falloff used by the Kuwahara stage (shader-specific uniform).
     */
    const DepthEdgeSlider = document.getElementById("depthEdge") as HTMLInputElement;
    const DepthEdgeValue = document.getElementById("depthEdgeValue") as HTMLElement;

    DepthEdgeSlider.addEventListener("change", () => {
        watercolorSettings.depthEdge = DepthEdgeSlider.valueAsNumber;
        DepthEdgeValue.innerText = DepthEdgeSlider.valueAsNumber.toFixed(2);
    });
    DepthEdgeSlider.addEventListener("input", () => {
        watercolorSettings.depthEdge = DepthEdgeSlider.valueAsNumber;
        DepthEdgeValue.innerText = DepthEdgeSlider.valueAsNumber.toFixed(2);
    });

    /**
     * Depth scale factor used by the Kuwahara stage (shader-specific uniform).
     */
    const DepthScaleSlider = document.getElementById("depthScale") as HTMLInputElement;
    const DepthScaleValue = document.getElementById("depthScaleValue") as HTMLElement;

    DepthScaleSlider.addEventListener("change", () => {
        watercolorSettings.depthScale = DepthScaleSlider.valueAsNumber;
        DepthScaleValue.innerText = DepthScaleSlider.valueAsNumber.toFixed(3);
    });
    DepthScaleSlider.addEventListener("input", () => {
        watercolorSettings.depthScale = DepthScaleSlider.valueAsNumber;
        DepthScaleValue.innerText = DepthScaleSlider.valueAsNumber.toFixed(3);
    });

    /**
     * Feature weights (vec3) used by the Kuwahara stage.
     * These typically tune the relative importance of different features in the filter.
     */
    const FeatureWeightXSlider = document.getElementById("featureWeightX") as HTMLInputElement;
    const FeatureWeightXValue = document.getElementById("featureWeightXValue") as HTMLElement;

    FeatureWeightXSlider.addEventListener("change", () => {
        watercolorSettings.featureWeight[0] = FeatureWeightXSlider.valueAsNumber;
        FeatureWeightXValue.innerText = FeatureWeightXSlider.valueAsNumber.toFixed(1);
    });
    FeatureWeightXSlider.addEventListener("input", () => {
        watercolorSettings.featureWeight[0] = FeatureWeightXSlider.valueAsNumber;
        FeatureWeightXValue.innerText = FeatureWeightXSlider.valueAsNumber.toFixed(1);
    });

    const FeatureWeightYSlider = document.getElementById("featureWeightY") as HTMLInputElement;
    const FeatureWeightYValue = document.getElementById("featureWeightYValue") as HTMLElement;

    FeatureWeightYSlider.addEventListener("change", () => {
        watercolorSettings.featureWeight[1] = FeatureWeightYSlider.valueAsNumber;
        FeatureWeightYValue.innerText = FeatureWeightYSlider.valueAsNumber.toFixed(1);
    });
    FeatureWeightYSlider.addEventListener("input", () => {
        watercolorSettings.featureWeight[1] = FeatureWeightYSlider.valueAsNumber;
        FeatureWeightYValue.innerText = FeatureWeightYSlider.valueAsNumber.toFixed(1);
    });

    const FeatureWeightZSlider = document.getElementById("featureWeightZ") as HTMLInputElement;
    const FeatureWeightZValue = document.getElementById("featureWeightZValue") as HTMLElement;

    FeatureWeightZSlider.addEventListener("change", () => {
        watercolorSettings.featureWeight[2] = FeatureWeightZSlider.valueAsNumber;
        FeatureWeightZValue.innerText = FeatureWeightZSlider.valueAsNumber.toFixed(1);
    });
    FeatureWeightZSlider.addEventListener("input", () => {
        watercolorSettings.featureWeight[2] = FeatureWeightZSlider.valueAsNumber;
        FeatureWeightZValue.innerText = FeatureWeightZSlider.valueAsNumber.toFixed(1);
    });

    /**
     * Tensor stage weight: albedo contribution.
     */
    const AlbedoWeightSlider = document.getElementById("albedoWeight") as HTMLInputElement;
    const AlbedoWeightValue = document.getElementById("albedoWeightValue") as HTMLElement;

    AlbedoWeightSlider.addEventListener("change", () => {
        watercolorSettings.albedoWeight = AlbedoWeightSlider.valueAsNumber;
        AlbedoWeightValue.innerText = AlbedoWeightSlider.valueAsNumber.toFixed(2);
    });
    AlbedoWeightSlider.addEventListener("input", () => {
        watercolorSettings.albedoWeight = AlbedoWeightSlider.valueAsNumber;
        AlbedoWeightValue.innerText = AlbedoWeightSlider.valueAsNumber.toFixed(2);
    });

    /**
     * Tensor stage weight: normal contribution.
     */
    const NormalWeightSlider = document.getElementById("normalWeight") as HTMLInputElement;
    const NormalWeightValue = document.getElementById("normalWeightValue") as HTMLElement;

    NormalWeightSlider.addEventListener("change", () => {
        watercolorSettings.normalWeight = NormalWeightSlider.valueAsNumber;
        NormalWeightValue.innerText = NormalWeightSlider.valueAsNumber.toFixed(2);
    });
    NormalWeightSlider.addEventListener("input", () => {
        watercolorSettings.normalWeight = NormalWeightSlider.valueAsNumber;
        NormalWeightValue.innerText = NormalWeightSlider.valueAsNumber.toFixed(2);
    });

    /**
     * Tensor stage weight: depth contribution.
     */
    const DepthWeightSlider = document.getElementById("depthWeight") as HTMLInputElement;
    const DepthWeightValue = document.getElementById("depthWeightValue") as HTMLElement;

    DepthWeightSlider.addEventListener("change", () => {
        watercolorSettings.depthWeight = DepthWeightSlider.valueAsNumber;
        DepthWeightValue.innerText = DepthWeightSlider.valueAsNumber.toFixed(2);
    });
    DepthWeightSlider.addEventListener("input", () => {
        watercolorSettings.depthWeight = DepthWeightSlider.valueAsNumber;
        DepthWeightValue.innerText = DepthWeightSlider.valueAsNumber.toFixed(2);
    });

    /**
     * Tensor stage weight: specular contribution.
     */
    const SpecularWeightSlider = document.getElementById("specularWeight") as HTMLInputElement;
    const SpecularWeightValue = document.getElementById("specularWeightValue") as HTMLElement;

    SpecularWeightSlider.addEventListener("change", () => {
        watercolorSettings.specularWeight = SpecularWeightSlider.valueAsNumber;
        SpecularWeightValue.innerText = SpecularWeightSlider.valueAsNumber.toFixed(2);
    });
    SpecularWeightSlider.addEventListener("input", () => {
        watercolorSettings.specularWeight = SpecularWeightSlider.valueAsNumber;
        SpecularWeightValue.innerText = SpecularWeightSlider.valueAsNumber.toFixed(2);
    });

    return watercolorSettings;
}
