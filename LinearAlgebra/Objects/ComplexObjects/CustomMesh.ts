import { RenderableObject } from "../Primitives/Base/RenderableObject.js";
import { vec4 } from "../../Utility/helperfunctions.js";

/**
 * Custom mesh loaded from a binary STL file.
 *
 * Responsibilities:
 * - Parse a Blender-style binary STL buffer
 * - Recompute face normals
 * - Center and uniformly scale the model
 * - Provide interleaved [position, normal, texCoord] data via getObjectData()
 *
 * Color:
 * - Per-object color is handled by the inherited `uColor` uniform.
 *   Use {@link setColor} just like with {@link Cube} or {@link Sphere}.
 */
export class CustomMesh extends RenderableObject {
    /**
     * Interleaved vertex data for this mesh in the form:
     * [pos0, normal0, tex0, pos1, normal1, tex1, ...]
     */
    private vertexData: vec4[] = [];

    /**
     * Constructs a CustomMesh from a binary STL buffer.
     *
     * @param gl - WebGL2 rendering context.
     * @param shader - Geometry pass shader program.
     * @param objectArr - Existing scene objects (used to compute draw offset).
     * @param stlBuffer - Binary STL file contents.
     * @param targetSize - Longest dimension after scaling (world units). Default: 4.0.
     * @param x - Initial world X translation.
     * @param y - Initial world Y translation.
     * @param z - Initial world Z translation.
     * @param yaw - Initial yaw in degrees.
     * @param pitch - Initial pitch in degrees.
     * @param roll - Initial roll in degrees.
     */
    constructor(
        gl: WebGL2RenderingContext,
        shader: WebGLProgram,
        objectArr: RenderableObject[],
        stlBuffer: ArrayBuffer,
        targetSize: number = 4.0,
        x: number = 0,
        y: number = 0,
        z: number = 0,
        yaw: number = 0,
        pitch: number = 0,
        roll: number = 0
    ) {
        // `sides` is not meaningful for STL; use 0 as a placeholder.
        super(gl, shader, objectArr, 0, x, y, z, yaw, pitch, roll);
        this.loadFromBinarySTL(stlBuffer, targetSize);
    }

    /**
     * Supplies interleaved vertex data for rendering.
     *
     * Layout per-vertex (matches Cube/Sphere):
     *   [ position(vec4), normal(vec4), texCoord(vec4) ]
     *
     * @override
     */
    public override getObjectData(): vec4[] {
        return this.vertexData;
    }

    /**
     * Parses a binary STL buffer, recomputes normals, recenters, scales,
     * builds interleaved [pos, normal, tex] data, and updates vertexCount.
     *
     * Binary STL layout:
     *  - 80-byte header
     *  - 4-byte uint32: number of triangles
     *  - For each triangle:
     *      12 bytes: normal (3 floats)  <-- IGNORED, we recompute
     *      12 bytes: vertex 1 (3 floats)
     *      12 bytes: vertex 2 (3 floats)
     *      12 bytes: vertex 3 (3 floats)
     *      2 bytes: attribute byte count (ignored)
     */
    private loadFromBinarySTL(buffer: ArrayBuffer, targetSize: number): void {
        const dv = new DataView(buffer);

        // Read triangle count at offset 80 (little-endian)
        const triangleCount = dv.getUint32(80, true);

        type RawPos = { x: number; y: number; z: number };
        const rawPositions: RawPos[] = [];
        const normals: vec4[] = [];

        let offset = 84;

        // Bounding box for auto-centering / scaling
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let minZ = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let maxZ = Number.NEGATIVE_INFINITY;

        for (let i = 0; i < triangleCount; i++) {
            // 1) Skip stored normal (12 bytes)
            offset += 12;

            // 2) Read the 3 vertices of this triangle
            const triVerts: RawPos[] = [];

            for (let v = 0; v < 3; v++) {
                const x = dv.getFloat32(offset, true);
                const y = dv.getFloat32(offset + 4, true);
                const z = dv.getFloat32(offset + 8, true);
                offset += 12;

                triVerts.push({ x, y, z });

                // Update bounding box
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (z < minZ) minZ = z;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
                if (z > maxZ) maxZ = z;
            }

            // 3) Compute face normal from triVerts
            const p0 = triVerts[0];
            const p1 = triVerts[1];
            const p2 = triVerts[2];

            const ux = p1.x - p0.x;
            const uy = p1.y - p0.y;
            const uz = p1.z - p0.z;

            const vx = p2.x - p0.x;
            const vy = p2.y - p0.y;
            const vz = p2.z - p0.z;

            // Cross product u x v
            let nx = uy * vz - uz * vy;
            let ny = uz * vx - ux * vz;
            let nz = ux * vy - uy * vx;

            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            if (len > 1e-8) {
                nx /= len;
                ny /= len;
                nz /= len;
            } else {
                // Degenerate triangle → default normal
                nx = 0;
                ny = 0;
                nz = 1;
            }

            const normal = new vec4(nx, ny, nz, 0.0);

            // 4) Store vertices + computed normal (one normal per vertex)
            for (let v = 0; v < 3; v++) {
                rawPositions.push(triVerts[v]);
                normals.push(normal);
            }

            // 5) Skip attribute byte count (2 bytes)
            offset += 2;
        }

        if (rawPositions.length === 0) {
            this.vertexData = [];
            this.vertexCount = 0;
            return;
        }

        // ─────────────────────────────────────────────
        // Centering and scaling
        // ─────────────────────────────────────────────
        const centerX = (minX + maxX) * 0.5;
        const centerY = (minY + maxY) * 0.5;
        const centerZ = (minZ + maxZ) * 0.5;

        const sizeX = maxX - minX;
        const sizeY = maxY - minY;
        const sizeZ = maxZ - minZ;
        const maxSize = Math.max(sizeX, sizeY, sizeZ);

        let scale = 1.0;
        if (maxSize > 1e-6) {
            scale = targetSize / maxSize;
        }

        const positions: vec4[] = [];
        const texcoords: vec4[] = [];

        for (let i = 0; i < rawPositions.length; i++) {
            const p = rawPositions[i];

            const sx = (p.x - centerX) * scale;
            const sy = (p.y - centerY) * scale;
            const sz = (p.z - centerZ) * scale;

            // Position in homogeneous coords
            positions.push(new vec4(sx, sy, sz, 1.0));

            // Simple planar UV mapping using X/Z in scaled space.
            const u = 0.5 + sx / targetSize;
            const v = 0.5 + sz / targetSize;
            texcoords.push(new vec4(u, v, 0.0, 1.0));
        }

        // ─────────────────────────────────────────────
        // Interleave [position, normal, texCoord]
        // ─────────────────────────────────────────────
        this.vertexData = this.loadingArrayHelper(positions, normals, texcoords);
        this.vertexCount = positions.length;
    }
}
