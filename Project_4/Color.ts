import { vec4 } from "./helperfunctions.js";

/**
 * Color constants used across the rendering pipeline.
 *
 * All colors are RGBA, components in [0, 1].
 * These are convenience presets for quick face/vertex coloring.
 *
 * @module Color
 */

/** Pure red. @constant @type {vec4} */
export const RED: vec4 = new vec4(1, 0, 0, 1);
/** Pure blue. @constant @type {vec4} */
export const BLUE: vec4 = new vec4(0, 0, 1, 1);
/** Pure green. @constant @type {vec4} */
export const GREEN: vec4 = new vec4(0, 1, 0, 1);
/** Primary yellow. @constant @type {vec4} */
export const YELLOW: vec4 = new vec4(1, 1, 0, 1);
/** Orange. @constant @type {vec4} */
export const ORANGE: vec4 = new vec4(0.9, 0.4, 0.0, 1);
/** Transparent (all zero, alpha 0). @constant @type {vec4} */
export const TRANSPARENT: vec4 = new vec4(0, 0, 0, 0);
/** Black. @constant @type {vec4} */
export const BLACK: vec4 = new vec4(0, 0, 0, 1);
/** Purple (50% red/blue). @constant @type {vec4} */
export const PURPLE: vec4 = new vec4(0.5, 0, 0.5, 1);
/** Cyan. @constant @type {vec4} */
export const CYAN: vec4 = new vec4(0, 1, 1, 1);
/** Magenta. @constant @type {vec4} */
export const MAGENTA: vec4 = new vec4(1, 0, 1, 1);
/** Pink. @constant @type {vec4} */
export const PINK: vec4 = new vec4(1, 0.6, 0.8, 1);
/** Teal. @constant @type {vec4} */
export const TEAL: vec4 = new vec4(0, 0.5, 0.5, 1);
/** Lime. @constant @type {vec4} */
export const LIME: vec4 = new vec4(0.7, 1, 0, 1);
/** Maroon. @constant @type {vec4} */
export const MAROON: vec4 = new vec4(0.5, 0, 0, 1);
/** Navy. @constant @type {vec4} */
export const NAVY: vec4 = new vec4(0, 0, 0.5, 1);
/** Olive. @constant @type {vec4} */
export const OLIVE: vec4 = new vec4(0.5, 0.5, 0, 1);
/** Brown. @constant @type {vec4} */
export const BROWN: vec4 = new vec4(0.4, 0.26, 0.13, 1);
/** Gold. @constant @type {vec4} */
export const GOLD: vec4 = new vec4(1, 0.84, 0, 1);
/** Silver (light gray). @constant @type {vec4} */
export const SILVER: vec4 = new vec4(0.75, 0.75, 0.75, 1);
/** Mid gray. @constant @type {vec4} */
export const GRAY: vec4 = new vec4(0.5, 0.5, 0.5, 1);
/** Light blue. @constant @type {vec4} */
export const LIGHTBLUE: vec4 = new vec4(0.68, 0.85, 0.9, 1);
/** Dark green. @constant @type {vec4} */
export const DARKGREEN: vec4 = new vec4(0.1, 0.39, 0.1, 1);
/** Beige. @constant @type {vec4} */
export const BEIGE: vec4 = new vec4(0.96, 0.96, 0.86, 1);
/** Crimson. @constant @type {vec4} */
export const CRIMSON: vec4 = new vec4(0.86, 0.08, 0.24, 1);
/** Indigo. @constant @type {vec4} */
export const INDIGO: vec4 = new vec4(0.29, 0, 0.51, 1);
/** Turquoise. @constant @type {vec4} */
export const TURQUOISE: vec4 = new vec4(0.25, 0.88, 0.82, 1);
/** Salmon. @constant @type {vec4} */
export const SALMON: vec4 = new vec4(0.98, 0.5, 0.45, 1);
/** Coral. @constant @type {vec4} */
export const CORAL: vec4 = new vec4(1, 0.5, 0.31, 1);
/** Chocolate. @constant @type {vec4} */
export const CHOCOLATE: vec4 = new vec4(0.82, 0.41, 0.12, 1);
/** Khaki. @constant @type {vec4} */
export const KHAKI: vec4 = new vec4(0.76, 0.69, 0.57, 1);
/** Mint. @constant @type {vec4} */
export const MINT: vec4 = new vec4(0.6, 1, 0.6, 1);
/** Lavender (very light purple). @constant @type {vec4} */
export const LAVENDER: vec4 = new vec4(0.9, 0.9, 0.98, 1);
/** Plum. @constant @type {vec4} */
export const PLUM: vec4 = new vec4(0.56, 0.27, 0.52, 1);
/** Aquamarine. @constant @type {vec4} */
export const AQUAMARINE: vec4 = new vec4(0.5, 1, 0.83, 1);
/** Peach. @constant @type {vec4} */
export const PEACH: vec4 = new vec4(1, 0.9, 0.71, 1);
/** Tan. @constant @type {vec4} */
export const TAN: vec4 = new vec4(0.82, 0.71, 0.55, 1);
/** Ivory. @constant @type {vec4} */
export const IVORY: vec4 = new vec4(1, 1, 0.94, 1);
/** Slate gray. @constant @type {vec4} */
export const SLATEGRAY: vec4 = new vec4(0.44, 0.5, 0.56, 1);
/** Light green. @constant @type {vec4} */
export const LIGHTGREEN: vec4 = new vec4(0.56, 0.93, 0.56, 1);
/** Dark red. @constant @type {vec4} */
export const DARKRED: vec4 = new vec4(0.55, 0, 0, 1);
/** Steel blue. @constant @type {vec4} */
export const STEELBLUE: vec4 = new vec4(0.27, 0.51, 0.71, 1);
/** Sea green. @constant @type {vec4} */
export const SEAGREEN: vec4 = new vec4(0.18, 0.55, 0.34, 1);
/** Orchid. @constant @type {vec4} */
export const ORCHID: vec4 = new vec4(0.85, 0.44, 0.84, 1);
/** Firebrick. @constant @type {vec4} */
export const FIREBRICK: vec4 = new vec4(0.7, 0.13, 0.13, 1);
/** Midnight blue. @constant @type {vec4} */
export const MIDNIGHTBLUE: vec4 = new vec4(0.1, 0.1, 0.44, 1);
/** Forest green. @constant @type {vec4} */
export const FORESTGREEN: vec4 = new vec4(0.13, 0.55, 0.13, 1);
/** Dark orange. @constant @type {vec4} */
export const DARKORANGE: vec4 = new vec4(1, 0.55, 0, 1);
/** Hot pink. @constant @type {vec4} */
export const HOTPINK: vec4 = new vec4(1, 0.41, 0.71, 1);
/** Royal blue. @constant @type {vec4} */
export const ROYALBLUE: vec4 = new vec4(0.25, 0.41, 0.88, 1);
/** Dark slate gray. @constant @type {vec4} */
export const DARKSLATEGRAY: vec4 = new vec4(0.18, 0.31, 0.31, 1);
/** Light coral. @constant @type {vec4} */
export const LIGHTCORAL: vec4 = new vec4(0.94, 0.5, 0.5, 1);
/** Spring green. @constant @type {vec4} */
export const SPRINGGREEN: vec4 = new vec4(0, 1, 0.5, 1);
/** Sky blue. @constant @type {vec4} */
export const SKYBLUE: vec4 = new vec4(0.53, 0.81, 0.92, 1);
/** Tomato. @constant @type {vec4} */
export const TOMATO: vec4 = new vec4(1, 0.39, 0.28, 1);
/** Dark violet. @constant @type {vec4} */
export const DARKVIOLET: vec4 = new vec4(0.58, 0, 0.83, 1);
/** Light salmon. @constant @type {vec4} */
export const LIGHTSALMON: vec4 = new vec4(1, 0.63, 0.48, 1);
/** Medium sea green. @constant @type {vec4} */
export const MEDIUMSEAGREEN: vec4 = new vec4(0.24, 0.7, 0.44, 1);
/** Powder blue. @constant @type {vec4} */
export const POWDERBLUE: vec4 = new vec4(0.69, 0.88, 0.9, 1);
/** Dark khaki. @constant @type {vec4} */
export const DARKKHAKI: vec4 = new vec4(0.74, 0.72, 0.42, 1);
/** Peru. @constant @type {vec4} */
export const PERU: vec4 = new vec4(0.8, 0.52, 0.25, 1);
/** Dark slate blue. @constant @type {vec4} */
export const DARKSLATEBLUE: vec4 = new vec4(0.28, 0.24, 0.55, 1);
/** Medium orchid. @constant @type {vec4} */
export const MEDIUMORCHID: vec4 = new vec4(0.73, 0.33, 0.83, 1);
/** Honeydew (very light green). @constant @type {vec4} */
export const HONEYDEW: vec4 = new vec4(0.94, 1, 0.94, 1);
/** Alice blue. @constant @type {vec4} */
export const ALICEBLUE: vec4 = new vec4(0.94, 0.97, 1.0, 1);
/** Antique white. @constant @type {vec4} */
export const ANTIQUEWHITE: vec4 = new vec4(0.98, 0.92, 0.84, 1);
/** Azure. @constant @type {vec4} */
export const AZURE: vec4 = new vec4(0.94, 1.0, 1.0, 1);
/** Burgundy (deep red). @constant @type {vec4} */
export const BURGUNDY: vec4 = new vec4(0.5, 0.0, 0.13, 1);
/** Cadet blue. @constant @type {vec4} */
export const CADETBLUE: vec4 = new vec4(0.37, 0.62, 0.63, 1);
/** Chartreuse. @constant @type {vec4} */
export const CHARTREUSE: vec4 = new vec4(0.5, 1.0, 0.0, 1);
/** Cornflower blue. @constant @type {vec4} */
export const CORNFLOWERBLUE: vec4 = new vec4(0.39, 0.58, 0.93, 1);
/** Cornsilk. @constant @type {vec4} */
export const CORNSILK: vec4 = new vec4(1.0, 0.97, 0.86, 1);
/** Dark cyan. @constant @type {vec4} */
export const DARKCYAN: vec4 = new vec4(0.0, 0.55, 0.55, 1);
/** Dark goldenrod. @constant @type {vec4} */
export const DARKGOLDENROD: vec4 = new vec4(0.72, 0.53, 0.04, 1);
/** Dark magenta. @constant @type {vec4} */
export const DARKMAGENTA: vec4 = new vec4(0.55, 0.0, 0.55, 1);
/** Dark olive green. @constant @type {vec4} */
export const DARKOLIVEGREEN: vec4 = new vec4(0.33, 0.42, 0.18, 1);
/** Dark salmon. @constant @type {vec4} */
export const DARKSALMON: vec4 = new vec4(0.91, 0.59, 0.48, 1);
/** Dark turquoise. @constant @type {vec4} */
export const DARKTURQUOISE: vec4 = new vec4(0.0, 0.81, 0.82, 1);
/** Deep pink. @constant @type {vec4} */
export const DEEPPINK: vec4 = new vec4(1.0, 0.08, 0.58, 1);
/** Deep sky blue. @constant @type {vec4} */
export const DEEPSKYBLUE: vec4 = new vec4(0.0, 0.75, 1.0, 1);
/** Dim gray. @constant @type {vec4} */
export const DIMGRAY: vec4 = new vec4(0.41, 0.41, 0.41, 1);
/** Dodger blue. @constant @type {vec4} */
export const DODGERBLUE: vec4 = new vec4(0.12, 0.56, 1.0, 1);
/** Gainsboro (light gray). @constant @type {vec4} */
export const GAINSBORO: vec4 = new vec4(0.86, 0.86, 0.86, 1);
/** Ghost white. @constant @type {vec4} */
export const GHOSTWHITE: vec4 = new vec4(0.97, 0.97, 1.0, 1);
/** Light cyan. @constant @type {vec4} */
export const LIGHTCYAN: vec4 = new vec4(0.88, 1.0, 1.0, 1);
/** Light goldenrod. @constant @type {vec4} */
export const LIGHTGOLDENROD: vec4 = new vec4(0.98, 0.98, 0.82, 1);
/** Light pink. @constant @type {vec4} */
export const LIGHTPINK: vec4 = new vec4(1.0, 0.71, 0.76, 1);
/** Light sky blue. @constant @type {vec4} */
export const LIGHTSKYBLUE: vec4 = new vec4(0.53, 0.81, 0.98, 1);
/** Medium purple. @constant @type {vec4} */
export const MEDIUMPURPLE: vec4 = new vec4(0.58, 0.44, 0.86, 1);
/** Medium slate blue. @constant @type {vec4} */
export const MEDIUMSLATEBLUE: vec4 = new vec4(0.48, 0.41, 0.93, 1);
/** Medium spring green. @constant @type {vec4} */
export const MEDIUMSPRINGGREEN: vec4 = new vec4(0.0, 0.98, 0.6, 1);
/** Pale violet red. @constant @type {vec4} */
export const PALEVIOLETRED: vec4 = new vec4(0.86, 0.44, 0.58, 1);
/** Seashell. @constant @type {vec4} */
export const SEASHELL: vec4 = new vec4(1.0, 0.96, 0.93, 1);
/** Wheat. @constant @type {vec4} */
export const WHEAT: vec4 = new vec4(0.96, 0.87, 0.7, 1);

/**
 * 32-step rainbow ramp, red → yellow → green → cyan → blue → magenta → red.
 *
 * Useful for cycling vertex colors (e.g., cylinders or ribbons) without
 * recomputing palettes. Each entry is an RGBA vec4 in [0, 1].
 *
 * @constant
 * @type {vec4[]}
 */
export const RAINBOW32: vec4[] = [
    new vec4(1.0, 0.0, 0.0, 1.0),
    new vec4(1.0, 0.1875, 0.0, 1.0),
    new vec4(1.0, 0.375, 0.0, 1.0),
    new vec4(1.0, 0.5625, 0.0, 1.0),
    new vec4(1.0, 0.75, 0.0, 1.0),
    new vec4(1.0, 0.9375, 0.0, 1.0),
    new vec4(0.875, 1.0, 0.0, 1.0),
    new vec4(0.6875, 1.0, 0.0, 1.0),
    new vec4(0.5, 1.0, 0.0, 1.0),
    new vec4(0.3125, 1.0, 0.0, 1.0),
    new vec4(0.125, 1.0, 0.0, 1.0),
    new vec4(0.0, 1.0, 0.0625, 1.0),
    new vec4(0.0, 1.0, 0.25, 1.0),
    new vec4(0.0, 1.0, 0.4375, 1.0),
    new vec4(0.0, 1.0, 0.625, 1.0),
    new vec4(0.0, 1.0, 0.8125, 1.0),
    new vec4(0.0, 1.0, 1.0, 1.0),
    new vec4(0.0, 0.8125, 1.0, 1.0),
    new vec4(0.0, 0.625, 1.0, 1.0),
    new vec4(0.0, 0.4375, 1.0, 1.0),
    new vec4(0.0, 0.25, 1.0, 1.0),
    new vec4(0.0, 0.0625, 1.0, 1.0),
    new vec4(0.125, 0.0, 1.0, 1.0),
    new vec4(0.3125, 0.0, 1.0, 1.0),
    new vec4(0.5, 0.0, 1.0, 1.0),
    new vec4(0.6875, 0.0, 1.0, 1.0),
    new vec4(0.875, 0.0, 1.0, 1.0),
    new vec4(1.0, 0.0, 0.9375, 1.0),
    new vec4(1.0, 0.0, 0.75, 1.0),
    new vec4(1.0, 0.0, 0.5625, 1.0),
    new vec4(1.0, 0.0, 0.375, 1.0),
    new vec4(1.0, 0.0, 0.1875, 1.0),
];

export const SUNSET32: vec4[] = [
    new vec4(1.0, 0.0, 0.2, 1.0),
    new vec4(1.0, 0.0625, 0.25, 1.0),
    new vec4(1.0, 0.125, 0.3, 1.0),
    new vec4(1.0, 0.1875, 0.35, 1.0),
    new vec4(1.0, 0.25, 0.4, 1.0),
    new vec4(1.0, 0.3125, 0.45, 1.0),
    new vec4(1.0, 0.375, 0.5, 1.0),
    new vec4(1.0, 0.4375, 0.55, 1.0),
    new vec4(1.0, 0.5, 0.6, 1.0),
    new vec4(1.0, 0.5625, 0.65, 1.0),
    new vec4(1.0, 0.625, 0.7, 1.0),
    new vec4(1.0, 0.6875, 0.75, 1.0),
    new vec4(1.0, 0.75, 0.8, 1.0),
    new vec4(1.0, 0.8125, 0.85, 1.0),
    new vec4(1.0, 0.875, 0.9, 1.0),
    new vec4(1.0, 0.9375, 0.95, 1.0),
    new vec4(1.0, 1.0, 1.0, 1.0),
    new vec4(0.9375, 0.875, 1.0, 1.0),
    new vec4(0.875, 0.75, 1.0, 1.0),
    new vec4(0.8125, 0.625, 1.0, 1.0),
    new vec4(0.75, 0.5, 1.0, 1.0),
    new vec4(0.6875, 0.375, 1.0, 1.0),
    new vec4(0.625, 0.25, 1.0, 1.0),
    new vec4(0.5625, 0.125, 1.0, 1.0),
    new vec4(0.5, 0.0, 1.0, 1.0),
    new vec4(0.4375, 0.0, 0.875, 1.0),
    new vec4(0.375, 0.0, 0.75, 1.0),
    new vec4(0.3125, 0.0, 0.625, 1.0),
    new vec4(0.25, 0.0, 0.5, 1.0),
    new vec4(0.1875, 0.0, 0.375, 1.0),
    new vec4(0.125, 0.0, 0.25, 1.0),
    new vec4(0.0625, 0.0, 0.125, 1.0),
];

export const OCEAN32: vec4[] = [
    new vec4(0.0, 0.2, 0.3, 1.0),
    new vec4(0.0, 0.25, 0.35, 1.0),
    new vec4(0.0, 0.3, 0.4, 1.0),
    new vec4(0.0, 0.35, 0.45, 1.0),
    new vec4(0.0, 0.4, 0.5, 1.0),
    new vec4(0.0, 0.45, 0.55, 1.0),
    new vec4(0.0, 0.5, 0.6, 1.0),
    new vec4(0.0, 0.55, 0.65, 1.0),
    new vec4(0.0, 0.6, 0.7, 1.0),
    new vec4(0.0, 0.65, 0.75, 1.0),
    new vec4(0.0, 0.7, 0.8, 1.0),
    new vec4(0.0, 0.75, 0.85, 1.0),
    new vec4(0.0, 0.8, 0.9, 1.0),
    new vec4(0.0, 0.85, 0.95, 1.0),
    new vec4(0.0, 0.9, 1.0, 1.0),
    new vec4(0.125, 0.9375, 1.0, 1.0),
    new vec4(0.25, 0.875, 1.0, 1.0),
    new vec4(0.375, 0.8125, 1.0, 1.0),
    new vec4(0.5, 0.75, 1.0, 1.0),
    new vec4(0.625, 0.6875, 1.0, 1.0),
    new vec4(0.75, 0.625, 1.0, 1.0),
    new vec4(0.875, 0.5625, 1.0, 1.0),
    new vec4(1.0, 0.5, 1.0, 1.0),
    new vec4(0.875, 0.4375, 0.9375, 1.0),
    new vec4(0.75, 0.375, 0.875, 1.0),
    new vec4(0.625, 0.3125, 0.8125, 1.0),
    new vec4(0.5, 0.25, 0.75, 1.0),
    new vec4(0.375, 0.1875, 0.6875, 1.0),
    new vec4(0.25, 0.125, 0.625, 1.0),
    new vec4(0.125, 0.0625, 0.5625, 1.0),
    new vec4(0.0, 0.0, 0.5, 1.0),
    new vec4(0.0, 0.0, 0.375, 1.0),
];

export const FOREST32: vec4[] = [
    new vec4(0.0, 0.25, 0.0, 1.0),
    new vec4(0.0, 0.3125, 0.0, 1.0),
    new vec4(0.0, 0.375, 0.0, 1.0),
    new vec4(0.0, 0.4375, 0.0, 1.0),
    new vec4(0.0, 0.5, 0.0, 1.0),
    new vec4(0.0, 0.5625, 0.0, 1.0),
    new vec4(0.0, 0.625, 0.0, 1.0),
    new vec4(0.0, 0.6875, 0.0, 1.0),
    new vec4(0.0, 0.75, 0.0, 1.0),
    new vec4(0.125, 0.8125, 0.0, 1.0),
    new vec4(0.25, 0.875, 0.0, 1.0),
    new vec4(0.375, 0.9375, 0.0, 1.0),
    new vec4(0.5, 1.0, 0.0, 1.0),
    new vec4(0.625, 0.9375, 0.0, 1.0),
    new vec4(0.75, 0.875, 0.0, 1.0),
    new vec4(0.875, 0.8125, 0.0, 1.0),
    new vec4(1.0, 0.75, 0.0, 1.0),
    new vec4(0.9375, 0.625, 0.0, 1.0),
    new vec4(0.875, 0.5, 0.0, 1.0),
    new vec4(0.8125, 0.375, 0.0, 1.0),
    new vec4(0.75, 0.25, 0.0, 1.0),
    new vec4(0.6875, 0.125, 0.0, 1.0),
    new vec4(0.625, 0.0, 0.0, 1.0),
    new vec4(0.5625, 0.0, 0.0, 1.0),
    new vec4(0.5, 0.0, 0.0, 1.0),
    new vec4(0.4375, 0.0625, 0.0, 1.0),
    new vec4(0.375, 0.125, 0.0, 1.0),
    new vec4(0.3125, 0.1875, 0.0, 1.0),
    new vec4(0.25, 0.25, 0.0, 1.0),
    new vec4(0.1875, 0.3125, 0.0, 1.0),
    new vec4(0.125, 0.375, 0.0, 1.0),
    new vec4(0.0625, 0.4375, 0.0, 1.0),
];
