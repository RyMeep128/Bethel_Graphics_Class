#version 300 es
/**
 * @file TexCordVertexShader.glsl
 * @author Ryan Shafer
 * @remarks Comments by ChatGPT model 5.2.
 *
 * @description
 * Fullscreen quad vertex shader used for screen-space passes (post-processing).
 *
 * This shader expects a prebuilt quad whose positions are already in clip-space
 * ([-1, 1] range) and whose texcoords are in UV space ([0, 1] range). It simply:
 * - forwards the UVs to the fragment shader, and
 * - outputs clip-space positions directly.
 *
 * Attribute layout must match the VAO configuration in your JS/TS code:
 * - location 0: aPosition (vec2)
 * - location 1: aTexCoord (vec2)
 */

precision mediump float;
precision lowp int;

/**
 * Fullscreen quad vertex position in clip-space.
 * Example vertices: (-1,-1), (1,-1), (-1,1), (1,1)
 */
layout(location = 0) in vec2 aPosition;

/**
 * Fullscreen quad UV coordinates.
 * Typically maps screen corners to (0,0) .. (1,1).
 */
layout(location = 1) in vec2 aTexCoord;

/**
 * UV coordinates passed to the fragment shader.
 * (Minor spelling note: "texCords" works fine, but "texCoords" is the usual name.)
 */
out vec2 texCords;

void main()
{
    // Pass UVs through unchanged; fragment shader will sample textures using these.
    texCords = aTexCoord;

    // Emit clip-space position directly (z=0 since this is a screen-space quad).
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
