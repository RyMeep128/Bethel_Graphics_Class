import { BindTexture } from "./BindTexture.js";
import { UniformMap } from "./UniformMap.js";

/**
 * @file PassTypes
 * @author Ryan Shafer
 * @remarks Comments by ChatGPT model 5.2.
 */

/**
 * Payload object passed into a render {@link Pass}.
 *
 * This is the “contract” between your render pipeline and each pass. It bundles:
 * - viewport/target dimensions,
 * - shared G-Buffer textures (from the geometry pass),
 * - optional chained textures for post-processing,
 * - and a hook to upload cross-cutting uniforms (lights, toggles, global settings).
 *
 * Notes:
 * - Any texture field is optional because not every pass requires every input.
 * - If `inputTex` is omitted, a pass should fall back to G-Buffer inputs (or its own defaults).
 */
export type PassTypes = {
    /**
     * Output width for the pass (typically the canvas width or target framebuffer width).
     */
    width: number;

    /**
     * Output height for the pass (typically the canvas height or target framebuffer height).
     */
    height: number;

    // -------------------------------------------------------------------------
    // Common / shared textures (usually produced by the geometry pass)
    // -------------------------------------------------------------------------

    /**
     * G-Buffer albedo (base color) texture.
     */
    gAlbedoTex?: WebGLTexture;

    /**
     * G-Buffer “specular” texture (often packed data such as roughness/metalness/specular).
     * The exact packing is renderer-dependent.
     */
    gSpecularTex?: WebGLTexture;

    /**
     * G-Buffer normal texture (commonly view-space or world-space normals).
     */
    gNormalTex?: WebGLTexture;

    /**
     * G-Buffer position texture (commonly view-space or world-space positions).
     */
    gPositionTex?: WebGLTexture;

    /**
     * Paper texture used to drive/modulate watercolor effects.
     */
    paperTex?: WebGLTexture;

    // -------------------------------------------------------------------------
    // Optional chain inputs (post-processing pipelines)
    // -------------------------------------------------------------------------

    /**
     * Optional texture output from a previous pass when chaining post-processing passes.
     * If omitted, the pass should rely on shared G-Buffer textures (or its own defaults).
     */
    inputTex?: WebGLTexture;

    /**
     * Optional reference to an “original”/baseline texture for the chain (pre-effect output).
     * Useful for blending/compare operations (e.g., mixing processed output with original).
     */
    originalOutputTex?: WebGLTexture;

    // -------------------------------------------------------------------------
    // Shared uniform upload hook
    // -------------------------------------------------------------------------

    /**
     * Hook for uploading uniforms shared across many passes, such as:
     * - lights,
     * - feature toggles (e.g., watercolor mode),
     * - global renderer settings.
     *
     * A {@link Pass} should call this after binding its program and before drawing.
     *
     * @param program - The currently active WebGL program for this pass.
     * @param uniforms - Uniform lookup map for that program.
     * @param binder - Texture binder/allocator for consistent texture unit assignment.
     */
    uploadCommonUniforms?: (program: WebGLProgram, uniforms: UniformMap, binder: BindTexture) => void;
};
