// AxisGizmo.ts
import { RenderableObject } from "./Base/RenderableObject.js";
import { Cylinder } from "./Cylinder.js";
import * as Color from "../../Utility/Color.js"

/**
 * Logical group of three cylinders visualizing a local coordinate frame.
 *
 * Assumptions:
 * - Each Cylinder is modeled along +Y in its own local space.
 * - RenderableObject has:
 *     getX/Y/Z(), getYaw/Pitch/Roll()
 *     getOrbitYaw/Pitch/Roll()
 */
export class AxisGizmo {
    constructor(
        public xAxis: Cylinder,
        public yAxis: Cylinder,
        public zAxis: Cylinder
    ) {}

    /**
     * Align this gizmo to the given base object so that:
     *  - It shares the same position.
     *  - It shares the same orbit rotation (world-space).
     *  - Each axis cylinder shares the same local rotation, plus an axis-specific offset.
     */
    attachTo(base: RenderableObject): void {
        // ─────────────────────────────────────
        // 1. Position: all three share base origin
        // ─────────────────────────────────────
        const x = base.getX();
        const y = base.getY();
        const z = base.getZ();

        this.xAxis.setX(x); this.xAxis.setY(y); this.xAxis.setZ(z);
        this.yAxis.setX(x); this.yAxis.setY(y); this.yAxis.setZ(z);
        this.zAxis.setX(x); this.zAxis.setY(y); this.zAxis.setZ(z);

        // ─────────────────────────────────────
        // 2. Copy orbit rotation (world-space)
        // ─────────────────────────────────────
        const oYaw   = base.getOrbitYaw();
        const oPitch = base.getOrbitPitch();
        const oRoll  = base.getOrbitRoll();

        // X axis
        this.xAxis.setOrbitYaw(oYaw);
        this.xAxis.setOrbitPitch(oPitch);
        this.xAxis.setOrbitRoll(oRoll);

        // Y axis
        this.yAxis.setOrbitYaw(oYaw);
        this.yAxis.setOrbitPitch(oPitch);
        this.yAxis.setOrbitRoll(oRoll);

        // Z axis
        this.zAxis.setOrbitYaw(oYaw);
        this.zAxis.setOrbitPitch(oPitch);
        this.zAxis.setOrbitRoll(oRoll);

        // ─────────────────────────────────────
        // 3. Local rotation (object-space)
        // ─────────────────────────────────────
        const yaw   = base.getYaw();
        const pitch = base.getPitch();
        const roll  = base.getRoll();

        // Y axis: points along base's +Y (no extra twist)
        this.yAxis.setYaw(yaw);
        this.yAxis.setPitch(pitch);
        this.yAxis.setRoll(roll);

        // X axis: rotate +90° around Z to swing +Y → +X
        // (If it points the wrong way, flip to -90.)
        this.xAxis.setYaw(yaw);
        this.xAxis.setPitch(pitch);
        this.xAxis.setRoll(roll + 90);

        // Z axis: rotate -90° (or +90°) around X to swing +Y → +Z
        // Try pitch - 90; if it points toward -Z, use pitch + 90 instead.
        this.zAxis.setYaw(yaw);
        this.zAxis.setPitch(pitch - 90);
        this.zAxis.setRoll(roll);
    }

    public disableAxes(){
        this.xAxis.setColor(Color.TRANSPARENT)
        this.yAxis.setColor(Color.TRANSPARENT)
        this.zAxis.setColor(Color.TRANSPARENT)
    }

    public enableAxes(){
        this.xAxis.setColor(Color.RED)
        this.yAxis.setColor(Color.GREEN)
        this.zAxis.setColor(Color.BLUE)
    }
}
