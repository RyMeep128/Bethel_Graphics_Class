import { BindTexture } from "./BindTexture.js";
import { UniformMap } from "./UniformMap.js";

/**
 * Payload object passed into a render {@link Pass}.
 *
 * This bundles:
 * - viewport dimensions,
 * - the shared G-Buffer textures produced by the geometry pass,
 * - an optional chained input texture (for post-processing pipelines),
 * - per-frame/per-pass parameters (camera position, offsets),
 * - and a callback for uploading cross-cutting uniforms (lights, toggles, etc.).
 */
export type PassTypes = {
    /** Output width for the pass (typically the canvas or target framebuffer width). */
    width: number;

    /** Output height for the pass (typically the canvas or target framebuffer height). */
    height: number;

    // Common textures

    /** G-Buffer albedo/base-color texture. */
    gAlbedoTex?: WebGLTexture;

    /** G-Buffer specular/roughness/metalness texture (depending on your packing). */
    gSpecularTex?: WebGLTexture;

    /** G-Buffer normal texture (often view-space or world-space normals). */
    gNormalTex?: WebGLTexture;

    /** G-Buffer position texture (often view-space or world-space positions). */
    gPositionTex?: WebGLTexture;

    /** Paper texture used to drive/modulate watercolor effects. */
    paperTex?: WebGLTexture;

    // Optional chain inputs

    /**
     * Optional texture output from a previous pass when chaining post-processing passes.
     * If omitted, the pass should rely only on the common textures (or its own defaults).
     */
    inputTex?: WebGLTexture;

    /**
     * Optional texture output from a previous pass when chaining post-processing passes.
     * If omitted, the pass should rely only on the common textures (or its own defaults).
     */
    originalOutputTex?: WebGLTexture;

    // Misc per-frame/per-pass values

    /**
     * Hook for uploading uniforms that are shared across many passes, such as:
     * - lights,
     * - feature toggles (watercolor mode),
     * - global settings.
     *
     * Called by a {@link Pass} after binding its program and before drawing.
     *
     * @param program - The currently active WebGL program for this pass.
     * @param uniforms - Uniform lookup map for that program.
     * @param binder - Texture binder/allocator for consistent texture unit assignment.
     */
    uploadCommonUniforms?: (program: WebGLProgram, uniforms: UniformMap, binder: BindTexture) => void;
};
