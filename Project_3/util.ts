/**
 * @file util.js
 * @description
 * Centralized constants used throughout the WebGL car project for timing,
 * movement, rotation, and camera configuration.
 *
 * These are defined as named exports so they can be easily imported and tuned
 * without hunting for “magic numbers” scattered across the codebase.
 *
 * @author Ryan Shafer
 * @author Some comments by ChatGPT Model 5
 */

/**
 * The time interval (in milliseconds) between fixed-step updates.
 * - 16 ms corresponds to ~60 updates per second (1000 / 60 ≈ 16.67).
 */
export const FramesPerMS: number = 16;

/**
 * Base linear movement speed of the car in world units per update step.
 * Used for forward/backward motion. 0.1 is chosen for smooth camera-follow speed.
 */
export const Velocity: number = 0.1;

/**
 * Base angular rotation speed (in degrees) applied for wheel turning and car yaw.
 * Used for both steering adjustments and spinning animation of wheels.
 */
export const Rotation: number = 1;

/**
 * Defines geometric tessellation density for curved primitives (spheres/cylinders).
 * - Higher values = smoother curvature.
 * - 64 bands is a reasonable default for visual quality vs. performance.
 */
export const Detail: number = 64;

/**
 * Maximum wheel steering angle in degrees (left or right) for the car.
 * Prevents unrealistic oversteering and stabilizes rotation physics.
 */
export const maxWheelTurn: number = 30;

/**
 * Generic spatial offset constant used in camera logic.
 * - In viewpoint and chase cameras, determines how far “forward” or “behind”
 *   the look target and camera are placed relative to the car.
 * - Expressed in world units.
 */
export const MagicNumber: number = 2;

/**
 * Minimum allowable field-of-view (FOV) in degrees for zooming.
 * - Smaller FOV = stronger zoom effect.
 * - Used as lower clamp for lens zoom; never let FOV reach 0 to avoid inversion.
 */
export const zoomMax: number = 3;

/**
 * Maximum allowable field-of-view (FOV) in degrees for zooming.
 * - Larger FOV = wider, more panoramic view.
 * - Used as upper clamp to prevent extreme distortion.
 */
export const zoomMin: number = 100;

/**
 * Incremental change in FOV (degrees per frame) when zooming in or out.
 * - Higher = faster zoom speed.
 */
export const ZoomAmt: number = 1;

/**
 * Minimum dolly position (world-space Z) allowed for the free-roam camera.
 * - Prevents the camera from moving inside or past the ground plane.
 */
export const dollyMin: number = 1;

/**
 * Maximum dolly position (world-space Z) allowed for the free-roam camera.
 * - Prevents the camera from backing up too far away from the stage.
 */
export const dollyMax: number = 40;

/**
 * Incremental dolly movement step (world-space units per frame).
 * - Controls how quickly the camera moves forward or backward when dollying.
 */
export const DollyAmt: number = 1;
