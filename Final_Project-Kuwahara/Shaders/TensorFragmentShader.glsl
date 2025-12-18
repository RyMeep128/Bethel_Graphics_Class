#version 300 es
/**
 * @file GBufferTensorFragmentShader.glsl
 * @author Ryan Shafer
 * @remarks Comments by ChatGPT model 5.2.
 *
 * @description
 * Your attempt at building a structure-tensor field using *G-buffer features* instead of
 * a single color input.
 *
 * What it computes (per pixel):
 * - For each feature (albedo, normal, depth, specular), it:
 *   1) samples a 3×3 neighborhood,
 *   2) computes Sobel gradients Sx and Sy (per channel),
 *   3) builds a packed structure tensor:
 *        T = (Sx·Sx, Sy·Sy, Sx·Sy, 1)
 * - Then it combines the four tensors using weights:
 *     fColor = wA*T_albedo + wN*T_normal + wD*T_depth + wS*T_specular
 *
 * Output packing (consistent with your reference tensor pass):
 * - fColor.r = Axx = (Sx·Sx)
 * - fColor.g = Ayy = (Sy·Sy)
 * - fColor.b = Axy = (Sx·Sy)
 * - fColor.a = 1.0
 *
 * Notes worth remembering:
 * - You’re treating each feature as a 3-channel signal (vec3) so dot(Sx,Sx) accumulates
 *   energy across channels. For depth you replicate scalar depth into vec3(d).
 * - Your depth feature normalizes by the center depth to reduce scale issues with distance.
 * - This tensor can then drive anisotropic filters (e.g., Kuwahara) using eigenvectors.

  * Credit:
 * - Adapted from Maxime Heckel, "On Crafting Painterly Shaders" (CC BY-NC 4.0).
 */

precision highp float;
precision lowp int;

/**
 * UV coordinates from the fullscreen quad (0..1).
 */
in vec2 texCords;

/**
 * Screen size (xy = width, height) (zw = 1/width, 1/height). Used to compute texel-sized UV offsets.
 */
uniform vec4 screenSize;

/**
 * Output packed structure tensor.
 */
out vec4 fColor;

/**
 * G-buffer inputs.
 * These should be the same textures your lighting pass uses, but here they are sampled
 * to infer *image structure* from multiple features.
 */
uniform sampler2D gAlbedo;
uniform sampler2D gNormalTex;
uniform sampler2D gPosition;
uniform sampler2D gSpecular;

/**
 * Feature weights for combining tensors from different sources.
 * - wA: albedo contribution
 * - wN: normal contribution
 * - wD: depth contribution
 * - wS: specular contribution
 */
uniform float wA;
uniform float wN;
uniform float wD;
uniform float wS;

/**
 * Sobel kernels.
 *
 * (Naming is a little swapped relative to some conventions; that’s fine as long as you’re
 * consistent—your tensor only needs two orthogonal gradient directions.)
 */
const mat3 Gy = mat3(
-1, -2, -1,
0,  0,  0,
1,  2,  1
);

const mat3 Gx = mat3(
-1,  0,  1,
-2,  0,  2,
-1,  0,  1
);


/**
 * Computes the Sobel gradient in one direction using the Gy kernel.
 *
 * @param a00..a22 - 3×3 neighborhood samples (vec3 signal).
 * @returns Gradient vector (per-channel gradient).
 */
vec3 sobelGradX(
vec3 a00, vec3 a10, vec3 a20,
vec3 a01, vec3 a11, vec3 a21,
vec3 a02, vec3 a12, vec3 a22
) {
    return
    Gy[0][0]*a00 + Gy[1][0]*a10 + Gy[2][0]*a20 +
    Gy[0][1]*a01 + Gy[1][1]*a11 + Gy[2][1]*a21 +
    Gy[0][2]*a02 + Gy[1][2]*a12 + Gy[2][2]*a22;
}

/**
 * Computes the Sobel gradient in the orthogonal direction using the Gx kernel.
 */
vec3 sobelGradY(
vec3 a00, vec3 a10, vec3 a20,
vec3 a01, vec3 a11, vec3 a21,
vec3 a02, vec3 a12, vec3 a22
) {
    return
    Gx[0][0]*a00 + Gx[1][0]*a10 + Gx[2][0]*a20 +
    Gx[0][1]*a01 + Gx[1][1]*a11 + Gx[2][1]*a21 +
    Gx[0][2]*a02 + Gx[1][2]*a12 + Gx[2][2]*a22;
}

/**
 * Builds the packed structure tensor from a 3×3 neighborhood of samples.
 *
 * - Sx, Sy are vec3 gradients (one per channel).
 * - dot(Sx,Sx) aggregates gradient energy across channels.
 * - dot(Sx,Sy) captures cross-correlation.
 *
 * @returns vec4(Axx, Ayy, Axy, 1.0)
 */
vec4 tensorFromSamples(
vec3 t00, vec3 t10, vec3 t20,
vec3 t01, vec3 t11, vec3 t21,
vec3 t02, vec3 t12, vec3 t22
) {
    vec3 Sx = sobelGradX(
    t00, t10, t20,
    t01, t11, t21,
    t02, t12, t22
    );
    vec3 Sy = sobelGradY(
    t00, t10, t20,
    t01, t11, t21,
    t02, t12, t22
    );

    // Packed tensor:
    // R=Axx=Sx·Sx, G=Ayy=Sy·Sy, B=Axy=Sx·Sy
    return vec4(dot(Sx, Sx), dot(Sy, Sy), dot(Sx, Sy), 1.0);
}

/**
 * Tensor derived from albedo texture (RGB).
 */
vec4 tensorAlbedo(vec2 uv) {
    vec2 t = screenSize.zw;

    vec3 a00 = texture(gAlbedo, uv + vec2(-1, -1)*t).rgb;
    vec3 a01 = texture(gAlbedo, uv + vec2(-1,  0)*t).rgb;
    vec3 a02 = texture(gAlbedo, uv + vec2(-1,  1)*t).rgb;

    vec3 a10 = texture(gAlbedo, uv + vec2( 0, -1)*t).rgb;
    vec3 a11 = texture(gAlbedo, uv + vec2( 0,  0)*t).rgb;
    vec3 a12 = texture(gAlbedo, uv + vec2( 0,  1)*t).rgb;

    vec3 a20 = texture(gAlbedo, uv + vec2( 1, -1)*t).rgb;
    vec3 a21 = texture(gAlbedo, uv + vec2( 1,  0)*t).rgb;
    vec3 a22 = texture(gAlbedo, uv + vec2( 1,  1)*t).rgb;

    return tensorFromSamples(a00, a10, a20, a01, a11, a21, a02, a12, a22);
}

/**
 * Tensor derived from normal texture.
 * Normals are normalized per sample to reduce interpolation/storage drift.
 */
vec4 tensorNormal(vec2 uv) {
    vec2 t = screenSize.zw;

    vec3 n00 = normalize(texture(gNormalTex, uv + vec2(-1, -1)*t).xyz);
    vec3 n01 = normalize(texture(gNormalTex, uv + vec2(-1,  0)*t).xyz);
    vec3 n02 = normalize(texture(gNormalTex, uv + vec2(-1,  1)*t).xyz);

    vec3 n10 = normalize(texture(gNormalTex, uv + vec2( 0, -1)*t).xyz);
    vec3 n11 = normalize(texture(gNormalTex, uv + vec2( 0,  0)*t).xyz);
    vec3 n12 = normalize(texture(gNormalTex, uv + vec2( 0,  1)*t).xyz);

    vec3 n20 = normalize(texture(gNormalTex, uv + vec2( 1, -1)*t).xyz);
    vec3 n21 = normalize(texture(gNormalTex, uv + vec2( 1,  0)*t).xyz);
    vec3 n22 = normalize(texture(gNormalTex, uv + vec2( 1,  1)*t).xyz);

    return tensorFromSamples(n00, n10, n20, n01, n11, n21, n02, n12, n22);
}

/**
 * Tensor derived from depth (using gPosition.z).
 *
 *
 */
vec4 tensorDepth(vec2 uv) {
    vec2 t = screenSize.zw;

    float d00 = (texture(gPosition, uv + vec2(-1, -1)*t).z);
    float d01 = (texture(gPosition, uv + vec2(-1,  0)*t).z);
    float d02 = (texture(gPosition, uv + vec2(-1,  1)*t).z);

    float d10 = (texture(gPosition, uv + vec2( 0, -1)*t).z);
    float d11 = (texture(gPosition, uv + vec2( 0,  0)*t).z);
    float d12 = (texture(gPosition, uv + vec2( 0,  1)*t).z);

    float d20 = (texture(gPosition, uv + vec2( 1, -1)*t).z);
    float d21 = (texture(gPosition, uv + vec2( 1,  0)*t).z);
    float d22 = (texture(gPosition, uv + vec2( 1,  1)*t).z);

    // Replicate scalar depth into vec3 so we can reuse tensorFromSamples.
    return tensorFromSamples(
    vec3(d00), vec3(d10), vec3(d20),
    vec3(d01), vec3(d11), vec3(d21),
    vec3(d02), vec3(d12), vec3(d22)
    );
}

/**
 * Tensor derived from the specular texture (RGB only).
 * (Your gSpecular also packs exponent in alpha in other passes, but you ignore alpha here.)
 */
vec4 tensorSpecular(vec2 uv) {
    vec2 t = screenSize.zw;

    vec3 s00 = texture(gSpecular, uv + vec2(-1, -1)*t).rgb;
    vec3 s01 = texture(gSpecular, uv + vec2(-1,  0)*t).rgb;
    vec3 s02 = texture(gSpecular, uv + vec2(-1,  1)*t).rgb;

    vec3 s10 = texture(gSpecular, uv + vec2( 0, -1)*t).rgb;
    vec3 s11 = texture(gSpecular, uv + vec2( 0,  0)*t).rgb;
    vec3 s12 = texture(gSpecular, uv + vec2( 0,  1)*t).rgb;

    vec3 s20 = texture(gSpecular, uv + vec2( 1, -1)*t).rgb;
    vec3 s21 = texture(gSpecular, uv + vec2( 1,  0)*t).rgb;
    vec3 s22 = texture(gSpecular, uv + vec2( 1,  1)*t).rgb;

    return tensorFromSamples(s00, s10, s20, s01, s11, s21, s02, s12, s22);
}

void main()
{
    // Compute per-feature tensors at this pixel.
    vec4 tA = tensorAlbedo(texCords);
    vec4 tN = tensorNormal(texCords);
    vec4 tD = tensorDepth(texCords);
    vec4 tS = tensorSpecular(texCords);

    // Combine into a single tensor with adjustable weights.
    fColor = wA * tA + wN * tN + wD * tD + wS * tS;
}
