import { vec4 } from "./helperfunctions.js";

/**
 * Ambient color constants used for Phong lighting.
 *
 * These represent the base ambient reflection color
 * of a surface before diffuse/specular lighting.
 *
 * @module AmbientColors
 */

/** Neutral gray ambient light. @constant @type {vec4} */
export const AMBIENT_NEUTRAL: vec4 = new vec4(0.2, 0.2, 0.2, 1);
/** Warm sunlight ambient tone. @constant @type {vec4} */
export const AMBIENT_WARM: vec4 = new vec4(0.3, 0.25, 0.2, 1);
/** Cool blue ambient tone (moonlight). @constant @type {vec4} */
export const AMBIENT_COOL: vec4 = new vec4(0.15, 0.2, 0.3, 1);
/** Dim ambient shadow tone. @constant @type {vec4} */
export const AMBIENT_DIM: vec4 = new vec4(0.1, 0.1, 0.1, 1);
/** Bright white ambient tone. @constant @type {vec4} */
export const AMBIENT_BRIGHT: vec4 = new vec4(0.5, 0.5, 0.5, 1);
