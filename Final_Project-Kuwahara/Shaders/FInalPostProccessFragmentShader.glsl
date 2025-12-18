#version 300 es
/**
 * @file SaturationBoostFragmentShader.glsl
 * @author Ryan Shafer
 * @remarks Comments by ChatGPT model 5.2.
 *
 * @description
 * Post-process saturation boost pass.
 *
 * This shader:
 * 1) samples the previous pass output (prevOutput),
 * 2) converts RGB -> HSL,
 * 3) scales saturation by `boost` (with clamp),
 * 4) converts back HSL -> RGB,
 * 5) outputs the boosted color.
 *
 * Credit:
 * - The RGB<->HSL conversion routines are taken from a StackOverflow post (link below).
 */

precision mediump float;

/** UV coordinates for fullscreen quad. */
in vec2 texCords;

/** Previous pass output texture (the image you want to adjust). */
uniform sampler2D prevOutput;

/**
 * Saturation multiplier.
 * - boost = 1.0 -> no change
 * - boost > 1.0 -> more saturated
 * - boost < 1.0 -> less saturated
 */
uniform float boost;

/** Output color after saturation adjustment. */
out vec4 fColor;

//--- All conversion code is taken from this post ---
//  https://stackoverflow.com/questions/50965644/glsl-shader-to-boost-the-color

/**
 * Converts RGB -> HSL.
 *
 * Input range:
 * - c.rgb in [0,1]
 *
 * Output range:
 * - hsl in [0,1]
 *   - h is normalized hue (0..1 maps to 0..360°)
 *   - s is saturation
 *   - l is lightness
 */
vec3 rgb2hsl(vec3 c)
{
    float cMax = max(c.r, max(c.g, c.b));
    float cMin = min(c.r, min(c.g, c.b));
    float delta = cMax - cMin;

    float h = 0.0;
    float s = 0.0;
    float l = (cMax + cMin) * 0.5;

    // If delta == 0, the color is gray: saturation stays 0, hue is irrelevant.
    if (delta > 0.0)
    {
        // Saturation formula for HSL
        s = delta / (1.0 - abs(2.0 * l - 1.0));

        // Hue depends on which channel is max
        if (cMax == c.r)
        h = (c.g - c.b) / delta;
        else if (cMax == c.g)
        h = 2.0 + (c.b - c.r) / delta;
        else
        h = 4.0 + (c.r - c.g) / delta;

        h /= 6.0;
        h = fract(h); // wrap into [0,1)
    }

    return vec3(h, s, l);
}

/**
 * Helper used by HSL->RGB conversion. Interpolates between p and q based on hue.
 */
float hue2rgb(float p, float q, float t)
{
    t = fract(t);
    if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
    if (t < 1.0/2.0) return q;
    if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
    return p;
}

/**
 * Converts HSL -> RGB.
 *
 * Input range:
 * - hsl in [0,1]
 * Output range:
 * - rgb in [0,1]
 */
vec3 hsl2rgb(vec3 hsl)
{
    float h = hsl.x;
    float s = hsl.y;
    float l = hsl.z;

    // Achromatic (gray) case
    if (s <= 0.0)
    return vec3(l);

    float q = (l < 0.5) ? (l * (1.0 + s)) : (l + s - l * s);
    float p = 2.0 * l - q;

    float r = hue2rgb(p, q, h + 1.0/3.0);
    float g = hue2rgb(p, q, h);
    float b = hue2rgb(p, q, h - 1.0/3.0);

    return vec3(r, g, b);
}

void main()
{
    // Sample base color from the previous pass.
    vec4 base = texture(prevOutput, texCords);

    // Convert to HSL so we can manipulate saturation cleanly.
    vec3 hsl = rgb2hsl(base.xyz);

    // Apply saturation boost, clamped to valid range.
    hsl.y = clamp(hsl.y * boost, 0.0, 1.0);

    // Optional lightness tweak could go here:
    // hsl.z = clamp(hsl.z * someScale, 0.0, 1.0);

    // Convert back to RGB. You currently force alpha to 1.0.
    // If you want to preserve alpha, use base.a instead.
    fColor = vec4(hsl2rgb(hsl), base.a);
}
