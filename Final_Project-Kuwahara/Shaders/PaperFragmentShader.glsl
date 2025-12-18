#version 300 es
/**
 * @file PaperFragmentShader.glsl
 * @author Ryan Shafer
 * @remarks Comments by ChatGPT model 5.2.
 *
 * @description
 * Simple “paper grain” modulation pass.
 *
 * This shader:
 * 1) samples the previous pipeline output (prevOutput),
 * 2) samples a paper texture (paperTex) at a scaled UV,
 * 3) blends the paper texture toward white via paperStrength (so 1.0 means “no change”),
 * 4) multiplies the base color by that modulation term.
 *
 * Net effect:
 * - darker paper areas slightly darken the image,
 * - lighter paper areas keep the image closer to original,
 * - alpha is preserved from prevOutput.
 */

precision mediump float;

/** UV coordinates for the fullscreen pass. */
in vec2 texCords;

/** Previous pass output (the image you want to apply paper grain onto). */
uniform sampler2D prevOutput;

/** Paper/grain texture used to modulate the image. */
uniform sampler2D paperTex;

/**
 * Strength of the paper modulation.
 *
 * Interpretation in this implementation:
 * - mix(vec3(1), paper, paperStrength)
 *   - paperStrength = 0.0 -> paperMod = 1.0 (no paper effect)
 *   - paperStrength = 1.0 -> paperMod = paper (full paper texture modulation)
 *   - paperStrength > 1.0 -> extrapolates beyond paper, can overshoot (brighter/darker than expected)
 *
 * NOTE: Your comment says "0..1", but the constant is 1.5, which is *beyond* that range.
 * That’s not “wrong”, just means you are deliberately exaggerating the texture influence.
 */
const float paperStrength = 1.5;

/**
 * Scales the UVs for the paper texture:
 * - larger values -> paper texture repeats more -> grain appears smaller/tighter
 * - smaller values -> paper repeats less -> grain appears larger/softer
 */
const vec2 paperScale = vec2(1.5);

/** Output color after applying paper modulation. */
out vec4 fColor;

void main() {
    // Base image from previous pass (usually your stylized/filtered result).
    vec4 base = texture(prevOutput, texCords);

    // Paper UVs: scaling makes the grain repeat at a different frequency than screen UVs.
    vec2 puv = texCords * paperScale;

    // Sample the paper texture (assumed to be in [0..1] RGB).
    vec3 paper = texture(paperTex, puv).rgb;

    // Create a modulation factor:
    // - paperStrength=0 -> vec3(1) (no change)
    // - paperStrength=1 -> paper
    // - >1 -> extrapolation (stronger-than-paper influence)
    vec3 paperMod = mix(vec3(1.0), paper, paperStrength);

    // Multiply base color by paper modulation; preserve alpha.
    fColor = vec4(base.rgb * paperMod, base.a);
}
