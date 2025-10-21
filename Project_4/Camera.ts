import {lookAt, mat4, rotateX, rotateY, rotateZ, toradians, vec4} from "./helperfunctions.js";
import {RenderableObject} from "./RenderableObject.js";
import * as util from "./util";

/**
 * Simple look-at camera that maintains position and target and exposes helpers
 * to nudge or set either. Internally stores a model-view matrix built via
 * {@link lookAt} with an up vector of (0,1,0).
 *
 * @class Camera
 * @author Ryan Shafer
 * @author Some comments by ChatGPT Model 5
 */
export class Camera {
    // ─────────────────────────────────────────────────────────────────────────────
    // Fields (grouped at top)
    // ─────────────────────────────────────────────────────────────────────────────

    /** Current camera model-view matrix (view transform). */
    private cameraMV: mat4;

    /** Camera x position in world units. */
    private camerax: number;

    /** Camera y position in world units. */
    private cameray: number;

    /** Camera z position in world units. */
    private cameraz: number;

    /** Target x coordinate for look-at. */
    private lookAtX: number;

    /** Target y coordinate for look-at. */
    private lookAtY: number;

    /** Target z coordinate for look-at. */
    private lookAtZ: number;

    /**
     * Constructs a camera with a default eye at (0,10,20) looking at origin.
     * Up vector is (0,1,0).
     */
    constructor() {
        this.camerax = 0;
        this.cameray = 10;
        this.cameraz = 20;
        this.lookAtX = 0;
        this.lookAtY = 0;
        this.lookAtZ = 0;
        this.updateCameraDetails();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Accessors (position)
    // ─────────────────────────────────────────────────────────────────────────────

    /** @returns {number} Current camera x position. */
    public getCamerax(): number {
        return this.camerax;
    }

    /**
     * Sets camera x position and updates the view matrix to reflect the change.
     * @param {number} value - New x position.
     * @returns {void}
     */
    public setCamerax(value: number): void {
        this.camerax = value;
        this.updateCameraDetails();
    }

    /** @returns {number} Current camera y position. */
    public getCameray(): number {
        return this.cameray;
    }

    /**
     * Sets camera y position and updates the view matrix to reflect the change.
     * @param {number} value - New y position.
     * @returns {void}
     */
    public setCameray(value: number): void {
        this.cameray = value;
        this.updateCameraDetails();
    }

    /** @returns {number} Current camera z position. */
    public getCameraz(): number {
        return this.cameraz;
    }

    /**
     * Sets camera z position and updates the view matrix to reflect the change.
     * @param {number} value - New z position.
     * @returns {void}
     */
    public setCameraz(value: number): void {
        this.cameraz = value;
        this.updateCameraDetails();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Accessors (look-at target)
    // ─────────────────────────────────────────────────────────────────────────────

    /** @returns {number} Current look-at x coordinate. */
    public getLookAtX(): number {
        return this.lookAtX;
    }

    /**
     * Sets look-at x coordinate and updates the view matrix accordingly.
     * @param {number} value - New target x.
     * @returns {void}
     */
    public setLookAtX(value: number): void {
        this.lookAtX = value;
        this.updateCameraDetails();
    }

    /** @returns {number} Current look-at y coordinate. */
    public getLookAtY(): number {
        return this.lookAtY;
    }

    /**
     * Sets look-at y coordinate and updates the view matrix accordingly.
     * @param {number} value - New target y.
     * @returns {void}
     */
    public setLookAtY(value: number): void {
        this.lookAtY = value;
        this.updateCameraDetails();
    }

    /** @returns {number} Current look-at z coordinate. */
    public getLookAtZ(): number {
        return this.lookAtZ;
    }

    /**
     * Sets look-at z coordinate and updates the view matrix accordingly.
     * @param {number} value - New target z.
     * @returns {void}
     */
    public setLookAtZ(value: number): void {
        this.lookAtZ = value;
        this.updateCameraDetails();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Incremental updates
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Adds `value` to the current z position and refreshes the view matrix.
     * @param {number} value - Delta z in world units.
     * @returns {void}
     */
    public updateCameraz(value: number): void {
        this.cameraz += value;
        this.updateCameraDetails();
    }

    /**
     * Adds `value` to the current y position and refreshes the view matrix.
     * @param {number} value - Delta y in world units.
     * @returns {void}
     */
    public updateCameray(value: number): void {
        this.cameray += value;
        this.updateCameraDetails();
    }

    /**
     * Adds `value` to the current x position and refreshes the view matrix.
     * @param {number} value - Delta x in world units.
     * @returns {void}
     */
    public updateCamerax(value: number): void {
        this.camerax += value;
        this.updateCameraDetails();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Bulk setters
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Offsets the current camera position and look-at target by the given deltas,
     * then rebuilds the view matrix.
     *
     * @param {number} camerax - Delta x for camera position.
     * @param {number} cameray - Delta y for camera position.
     * @param {number} cameraz - Delta z for camera position.
     * @param {number} lookAtX - Delta x for target.
     * @param {number} lookAtY - Delta y for target.
     * @param {number} lookAtZ - Delta z for target.
     * @returns {void}
     */
    public updateCamera(camerax: number, cameray: number, cameraz: number, lookAtX: number, lookAtY: number, lookAtZ: number): void {
        this.cameray += cameray;
        this.cameraz += cameraz;
        this.camerax += camerax;
        this.lookAtX += lookAtX;
        this.lookAtY += lookAtY;
        this.lookAtZ += lookAtZ;
        this.updateCameraDetails();
    }

    /**
     * Sets absolute camera position and look-at target, then rebuilds the view matrix.
     *
     * @param {number} camerax - Absolute x for camera position.
     * @param {number} cameray - Absolute y for camera position.
     * @param {number} cameraz - Absolute z for camera position.
     * @param {number} lookAtX - Absolute x for target.
     * @param {number} lookAtY - Absolute y for target.
     * @param {number} lookAtZ - Absolute z for target.
     * @returns {void}
     */
    public setCamera(camerax: number, cameray: number, cameraz: number, lookAtX: number, lookAtY: number, lookAtZ: number): void {
        this.cameray = cameray;
        this.cameraz = cameraz;
        this.camerax = camerax;
        this.lookAtX = lookAtX;
        this.lookAtY = lookAtY;
        this.lookAtZ = lookAtZ;
        this.updateCameraDetails();
    }

    /**
     * Sets absolute look-at target while keeping current camera position.
     *
     * @param {number} lookAtX - Absolute x for target.
     * @param {number} lookAtY - Absolute y for target.
     * @param {number} lookAtZ - Absolute z for target.
     * @returns {void}
     */
    public setCameraLook(lookAtX: number, lookAtY: number, lookAtZ: number): void {
        this.lookAtX = lookAtX;
        this.lookAtY = lookAtY;
        this.lookAtZ = lookAtZ;
        this.updateCameraDetails();
    }

    /**
     * Sets absolute camera position while keeping current look-at target.
     *
     * @param {number} camerax - Absolute x for camera position.
     * @param {number} cameray - Absolute y for camera position.
     * @param {number} cameraz - Absolute z for camera position.
     * @returns {void}
     */
    public setCameraPos(camerax: number, cameray: number, cameraz: number): void {
        this.cameray = cameray;
        this.cameraz = cameraz;
        this.camerax = camerax;
        this.updateCameraDetails();
    }

    /**
     * Rebuilds the internal view matrix from the current position and look-at target.
     * Uses an up vector of (0, 1, 0).
     * @returns {void}
     * @private
     */
    private updateCameraDetails(): void {
        this.cameraMV = lookAt(
            new vec4(this.camerax, this.cameray, this.cameraz, 1),
            new vec4(this.lookAtX, this.lookAtY, this.lookAtZ, 1),
            new vec4(0, 1, 0, 0)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Retrieval
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Returns the current camera model-view (view) matrix.
     * @returns {mat4} The view matrix produced by {@link lookAt}.
     */
    public getCameraMV(): mat4 {
        return this.cameraMV;
    }
}
