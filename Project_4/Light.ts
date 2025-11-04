import { mat4, vec4 } from "./helperfunctions.js";

/**
 * Represents a light source used for shading in a 3D scene.
 *
 * This class encapsulates all relevant light parameters, including
 * position, color, ambient intensity, direction, cutoff angle,
 * and component enablement flags. It can be transformed into eye space
 * using a provided view matrix.
 */
export class Light {
    /**
     * @private
     * @type {vec4}
     * The color of the light (RGBA).
     */
    private color;

    /**
     * @private
     * @type {vec4}
     * The ambient color of the light (RGBA).
     */
    private ambient;

    /**
     * @private
     * @type {vec4}
     * The position of the light in world space (XYZW, w=1 for positional lights).
     */
    private position;

    /**
     * @private
     * @type {vec4}
     * The direction the light is facing (used for spotlights).
     */
    private direction;

    /**
     * @private
     * @type {number}
     * The cutoff angle of the spotlight cone, in degrees.
     */
    private cutOffAngle;

    /**
     * 1 represents enabled, 0 represents disabled.
     * The channels correspond to:
     * - [0]: Ambient
     * - [1]: Diffuse
     * - [2]: Specular
     * - [3]: Unused (reserved)
     * @private
     * @type {vec4}
     */
    private enabled;

    /**
     * Creates a new Light instance.
     *
     * @param {number} x - The X coordinate of the light position.
     * @param {number} y - The Y coordinate of the light position.
     * @param {number} z - The Z coordinate of the light position.
     * @param {?vec4} [color=null] - The light’s color (RGBA). Optional.
     * @param {?vec4} [ambient=null] - The ambient component color. Optional.
     * @param {number} [cutOffAngle=180] - The cutoff angle of the spotlight cone (default: 180° for omnidirectional).
     * @param {vec4} [direction=new vec4(0,0,0,0)] - The light’s direction vector.
     */
    constructor(x, y, z, color = null, ambient = null, cutOffAngle = 180, direction = new vec4(0,0,0,0)) {
        this.position = new vec4(x, y, z, 1);
        this.color = color;
        this.ambient = ambient;
        this.direction = direction;
        this.enabled = new vec4(1, 1, 1, 1);
        this.cutOffAngle = cutOffAngle;
    }

    /**
     * Sets the light’s color.
     * @param {vec4} color - The new RGBA color for the light.
     */
    public setColor(color) {
        this.color = color;
    }

    /**
     * Sets the light’s ambient color.
     * @param {vec4} ambient - The new ambient RGBA color.
     */
    public setAmbient(ambient) {
        this.ambient = ambient;
    }

    /**
     * Sets the light’s direction vector.
     * @param {vec4} direction - The new direction vector.
     */
    public setDirection(direction) {
        this.direction = direction;
    }

    /**
     * Gets the light’s color.
     * @returns {vec4} The light’s color.
     */
    public getColor() {
        return this.color;
    }

    /**
     * Gets the ambient color of the light.
     * @returns {vec4} The light’s ambient color.
     */
    public getAmbient() {
        return this.ambient;
    }

    /**
     * Gets the light’s direction transformed into eye space.
     * @param {mat4} view - The model-view matrix to transform the direction.
     * @returns {vec4} The transformed direction vector.
     */
    public getDirection(view) {
        return view.mult(this.direction);
    }

    /**
     * Gets the light’s position transformed into eye space.
     * @param {mat4} view - The model-view matrix to transform the position.
     * @returns {vec4} The transformed position vector.
     */
    public getPosition(view) {
        return view.mult(this.position);
    }

    /**
     * Gets the cutoff angle of the light (in degrees).
     * @returns {number} The cutoff angle.
     */
    public getCutOffAngle() {
        return this.cutOffAngle;
    }

    /**
     * Disables all components (ambient, diffuse, and specular).
     */
    public disable() {
        this.enabled = new vec4(0, 0, 0, 0);
    }

    /**
     * Disables only the ambient component of the light.
     */
    public disableAmbient() {
        this.enabled = new vec4(0, this.enabled[1], this.enabled[2], this.enabled[3]);
    }

    /**
     * Enables the ambient component of the light.
     */
    public enableAmbient() {
        this.enabled = new vec4(1, this.enabled[1], this.enabled[2], this.enabled[3]);
    }

    /**
     * Disables only the diffuse component of the light.
     */
    public disableDiffuse() {
        this.enabled = new vec4(this.enabled[0], 0, this.enabled[2], this.enabled[3]);
    }

    /**
     * Disables only the specular component of the light.
     */
    public disableSpec() {
        this.enabled = new vec4(this.enabled[0], this.enabled[1], 0, this.enabled[3]);
    }

    /**
     * Enables all components (ambient, diffuse, and specular).
     */
    public enable() {
        this.enabled = new vec4(1, 1, 1, 1);
    }

    /**
     * Gets the vector representing which components (ambient, diffuse, specular) are enabled.
     *
     * @returns {vec4} A vector of enable flags:
     * `[x, y, z, w] = [ambient, diffuse, specular, unused]`
     */
    public getEnabled() {
        return this.enabled;
    }
}
