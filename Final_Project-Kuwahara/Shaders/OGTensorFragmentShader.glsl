#version 300 es
/**
 * @file ReferenceTensorFragmentShader.glsl
 * @author Ryan Shafer
 * @remarks Comments by ChatGPT model 5.2.
 *
 * @description
 * Reference "tensor" fragment shader used in your watercolor pipeline.
 *
 * This shader computes a per-pixel *structure tensor* from an input image (prevOutput).
 * Conceptually:
 *  1) Sample a 3x3 neighborhood around the current UV.
 *  2) Apply Sobel kernels to estimate image gradients:
 *      - Sx = ∂I/∂x (per-channel)
 *      - Sy = ∂I/∂y (per-channel)
 *  3) Pack the 2×2 structure tensor components into RGBA:
 *      - R = dot(Sx, Sx)  ≈ |∂I/∂x|^2
 *      - G = dot(Sy, Sy)  ≈ |∂I/∂y|^2
 *      - B = dot(Sx, Sy)  ≈ (∂I/∂x · ∂I/∂y)
 *      - A = 1.0          (unused/constant)
 *
 * The resulting tensor values are typically used later to guide anisotropic filtering
 * (e.g., Kuwahara variants) so strokes align with local image structure.
 *
 * Credit:
 * - Adapted from Maxime Heckel, "On Crafting Painterly Shaders" (CC BY-NC 4.0).
 */

precision mediump float;
precision lowp int;

/**
 * UV coordinates for sampling the input texture.
 * Provided by your fullscreen quad vertex shader (TexCordVertexShader).
 */
in vec2 texCords;

/**
 * Input texture from a previous pass (the image you want to analyze).
 * In your pipeline this is usually the lighting output or an intermediate buffer.
 */
uniform sampler2D prevOutput;

/**
 * Screen size packed into a vec4.
 * Only .xy are used here as (width, height) to build 1-pixel texel offsets.
 */
uniform vec4 screenSize;

/**
 * Output tensor value (packed in RGBA as described above).
 */
out vec4 fColor;

/**
 * Sobel kernel for gradient in "x" direction (as used in this shader).
 * Note: Kernel naming depends on the matrix layout convention; what matters is that
 * Sx and Sy represent two orthogonal gradient directions.
 */
const mat3 Gx = mat3(
-1, -2, -1,
0,  0,  0,
1,  2,  1
);

/**
 * Sobel kernel for gradient in "y" direction (as used in this shader).
 */
const mat3 Gy = mat3(
-1,  0,  1,
-2,  0,  2,
-1,  0,  1
);

/**
 * Computes the per-pixel structure tensor from a 3x3 neighborhood in the input texture.
 *
 * The gradient is computed per color channel (RGB), and then combined using dot products:
 * - dot(Sx, Sx) accumulates gradient energy in the x direction across channels.
 * - dot(Sy, Sy) accumulates gradient energy in the y direction across channels.
 * - dot(Sx, Sy) captures cross-correlation between x and y gradients.
 *
 * @param inputTexture - Texture to analyze (previous pass output).
 * @param texCord - UV coordinate of the current pixel.
 * @returns vec4(R, G, B, 1.0) = (Sx·Sx, Sy·Sy, Sx·Sy, 1).
 */
vec4 computeStructureTensor(sampler2D inputTexture, vec2 texCord)
{
    // Compute 1-pixel offsets in UV space using screen dimensions.
    vec2 t = 1.0 / screenSize.xy;

    // Sample 3x3 neighborhood around texCord.
    vec3 tx0y0 = texture(inputTexture, texCord + vec2(-1, -1) * t).rgb;
    vec3 tx0y1 = texture(inputTexture, texCord + vec2(-1,  0) * t).rgb;
    vec3 tx0y2 = texture(inputTexture, texCord + vec2(-1,  1) * t).rgb;

    vec3 tx1y0 = texture(inputTexture, texCord + vec2( 0, -1) * t).rgb;
    vec3 tx1y1 = texture(inputTexture, texCord + vec2( 0,  0) * t).rgb;
    vec3 tx1y2 = texture(inputTexture, texCord + vec2( 0,  1) * t).rgb;

    vec3 tx2y0 = texture(inputTexture, texCord + vec2( 1, -1) * t).rgb;
    vec3 tx2y1 = texture(inputTexture, texCord + vec2( 1,  0) * t).rgb;
    vec3 tx2y2 = texture(inputTexture, texCord + vec2( 1,  1) * t).rgb;

    // Apply Sobel convolution to estimate ∂I/∂x (Sx).
    vec3 Sx =
    Gx[0][0] * tx0y0 + Gx[1][0] * tx1y0 + Gx[2][0] * tx2y0 +
    Gx[0][1] * tx0y1 + Gx[1][1] * tx1y1 + Gx[2][1] * tx2y1 +
    Gx[0][2] * tx0y2 + Gx[1][2] * tx1y2 + Gx[2][2] * tx2y2;

    // Apply Sobel convolution to estimate ∂I/∂y (Sy).
    vec3 Sy =
    Gy[0][0] * tx0y0 + Gy[1][0] * tx1y0 + Gy[2][0] * tx2y0 +
    Gy[0][1] * tx0y1 + Gy[1][1] * tx1y1 + Gy[2][1] * tx2y1 +
    Gy[0][2] * tx0y2 + Gy[1][2] * tx1y2 + Gy[2][2] * tx2y2;

    // Pack tensor components:
    // R = Sx·Sx, G = Sy·Sy, B = Sx·Sy, A = 1
    return vec4(dot(Sx, Sx), dot(Sy, Sy), dot(Sx, Sy), 1.0);
}

void main()
{
    // Compute structure tensor from the previous pass output.
    vec4 tensor = computeStructureTensor(prevOutput, texCords);

    // Output packed tensor.
    fColor = tensor;
}
