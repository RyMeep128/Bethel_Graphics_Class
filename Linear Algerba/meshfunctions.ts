import {
    initShaders,
    vec4,
    mat4,
    flatten,
    perspective,
    lookAt,
    rotateX,
    rotateY
} from "./helperfunctions.js";

"use strict";

// -----------------------------------------------------------------------------
// WebGL / Program state
// -----------------------------------------------------------------------------
let gl: WebGL2RenderingContext;
let program: WebGLProgram;

// Uniform locations
let umv: WebGLUniformLocation;
let uproj: WebGLUniformLocation;

// Matrices
let mv: mat4;
let p: mat4;

// DOM elements
let canvas: HTMLCanvasElement;

// Interaction / rotation state
let xAngle: number;
let yAngle: number;
let mouse_button_down: boolean = false;
let prevMouseX: number = 0;
let prevMouseY: number = 0;

// Mesh data
let meshVertexBufferID: WebGLBuffer | null = null;
let meshVertexData: vec4[] = []; // interleaved [position, normal]
let meshVertexCount: number = 0;

// -----------------------------------------------------------------------------
// Initialization
// -----------------------------------------------------------------------------
window.onload = function init(): void {

    canvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("webgl2");
    if (!ctx) {
        alert("WebGL2 isn't available in your browser.");
        return;
    }
    gl = ctx;

    // Hardcoded STL load: "myfile.stl"
    fetch("Rubber_Duck.stl")
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to load STL file");
            }
            return response.arrayBuffer();
        })
        .then(buffer => {
            createMeshFromBinarySTL(buffer);
            requestAnimationFrame(render);
        })
        .catch(err => console.error("STL Load Error:", err));

    // Mouse interaction for rotation
    canvas.addEventListener("mousedown", mouse_down);
    canvas.addEventListener("mousemove", mouse_drag);
    canvas.addEventListener("mouseup", mouse_up);
    canvas.addEventListener("mouseleave", mouse_up);

    // Background and depth
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    // Compile / link shaders
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Get uniform locations
    const mvLoc = gl.getUniformLocation(program, "mv");
    const projLoc = gl.getUniformLocation(program, "proj");
    if (!mvLoc || !projLoc) {
        throw new Error("Unable to find mv or proj uniform locations.");
    }
    umv = mvLoc;
    uproj = projLoc;

    // Set up projection
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    p = perspective(60, canvas.clientWidth / canvas.clientHeight, 5, 500);
    gl.uniformMatrix4fv(uproj, false, p.flatten());

    // Initialize rotation
    xAngle = 0;
    yAngle = 0;

    // Nothing loaded yet; render will just clear
    requestAnimationFrame(render);
};

// -----------------------------------------------------------------------------
// Binary STL Parsing and Mesh Creation (with auto-centering & scaling)
// -----------------------------------------------------------------------------

/**
 * Parse a binary STL buffer (Blender-style) and build VBO data.
 *
 * Binary STL layout:
 *   - 80-byte header
 *   - 4-byte uint32: number of triangles
 *   - For each triangle:
 *       12 bytes: normal (3 floats)  <-- IGNORED, we recompute
 *       12 bytes: vertex 1 (3 floats)
 *       12 bytes: vertex 2 (3 floats)
 *       12 bytes: vertex 3 (3 floats)
 *       2 bytes: attribute byte count (ignored)
 *
 * Auto-scaling:
 *   - Compute bounding box of all vertices.
 *   - Center model at origin.
 *   - Uniformly scale so the longest dimension becomes targetSize (here: 4 units).
 */
function createMeshFromBinarySTL(buffer: ArrayBuffer): void {
    const dv = new DataView(buffer);

    // Read triangle count (uint32 LE) at offset 80
    const triangleCount = dv.getUint32(80, true);

    // Store raw positions so we can compute bbox and then center/scale
    type RawPos = { x: number; y: number; z: number };
    const rawPositions: RawPos[] = [];
    const normals: vec4[] = [];

    let offset = 84; // start of first triangle record

    // Initialize bounding box
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < triangleCount; i++) {
        // --------------------------------------------------------------------
        // 1) Skip the stored normal in the file (we'll recompute it)
        // --------------------------------------------------------------------
        // const nx = dv.getFloat32(offset, true);
        // const ny = dv.getFloat32(offset + 4, true);
        // const nz = dv.getFloat32(offset + 8, true);
        offset += 12;

        // --------------------------------------------------------------------
        // 2) Read the three vertices of this triangle
        // --------------------------------------------------------------------
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

        // --------------------------------------------------------------------
        // 3) Compute face normal from the three vertices
        //    normal = normalize( (v1 - v0) x (v2 - v0) )
        // --------------------------------------------------------------------
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
            // Degenerate triangle, pick some default normal
            nx = 0;
            ny = 0;
            nz = 1;
        }

        const normal = new vec4(nx, ny, nz, 0.0);

        // --------------------------------------------------------------------
        // 4) Store vertices + computed normal (one normal per vertex)
        // --------------------------------------------------------------------
        for (let v = 0; v < 3; v++) {
            rawPositions.push(triVerts[v]);
            normals.push(normal);
        }

        // --------------------------------------------------------------------
        // 5) Skip attribute byte count
        // --------------------------------------------------------------------
        offset += 2;
    }

    if (rawPositions.length === 0) {
        meshVertexData = [];
        meshVertexCount = 0;
        return;
    }

    // ------------------------------------------------------------------------
    // Centering and scaling
    // ------------------------------------------------------------------------
    const centerX = (minX + maxX) * 0.5;
    const centerY = (minY + maxY) * 0.5;
    const centerZ = (minZ + maxZ) * 0.5;

    const sizeX = maxX - minX;
    const sizeY = maxY - minY;
    const sizeZ = maxZ - minZ;
    const maxSize = Math.max(sizeX, sizeY, sizeZ);

    const targetSize = 4.0;
    let scale = 1.0;
    if (maxSize > 1e-6) {
        scale = targetSize / maxSize;
    }

    const positions: vec4[] = [];
    for (let i = 0; i < rawPositions.length; i++) {
        const p = rawPositions[i];
        const sx = (p.x - centerX) * scale;
        const sy = (p.y - centerY) * scale;
        const sz = (p.z - centerZ) * scale;
        positions.push(new vec4(sx, sy, sz, 1.0));
    }

    // ------------------------------------------------------------------------
    // Interleave [position, normal] per vertex
    // ------------------------------------------------------------------------
    meshVertexData = [];
    for (let i = 0; i < positions.length; i++) {
        meshVertexData.push(positions[i]); // position
        meshVertexData.push(normals[i]);   // normal (direction only)
    }

    meshVertexCount = positions.length;

    // ------------------------------------------------------------------------
    // Upload to GPU
    // ------------------------------------------------------------------------
    if (meshVertexBufferID) {
        gl.deleteBuffer(meshVertexBufferID);
    }
    meshVertexBufferID = gl.createBuffer();
    if (!meshVertexBufferID) {
        throw new Error("Failed to create vertex buffer.");
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, meshVertexBufferID);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(meshVertexData), gl.STATIC_DRAW);

    const vPositionLoc = gl.getAttribLocation(program, "vPosition");
    const vNormalLoc = gl.getAttribLocation(program, "vNormal");

    const strideBytes = 8 * 4; // 8 floats * 4 bytes = 32 bytes

    // Position: first 4 floats
    if (vPositionLoc >= 0) {
        gl.vertexAttribPointer(
            vPositionLoc,
            4,
            gl.FLOAT,
            false,
            strideBytes,
            0
        );
        gl.enableVertexAttribArray(vPositionLoc);
    }

    // Normal: next 4 floats (offset = 16 bytes)
    if (vNormalLoc >= 0) {
        gl.vertexAttribPointer(
            vNormalLoc,
            4,
            gl.FLOAT,
            false,
            strideBytes,
            4 * 4
        );
        gl.enableVertexAttribArray(vNormalLoc);
    }
}


// -----------------------------------------------------------------------------
// Mouse interaction
// -----------------------------------------------------------------------------

function mouse_drag(event: MouseEvent): void {
    if (!mouse_button_down) return;

    const thetaY = 360.0 * (event.clientX - prevMouseX) / canvas.clientWidth;
    const thetaX = 360.0 * (event.clientY - prevMouseY) / canvas.clientHeight;
    prevMouseX = event.clientX;
    prevMouseY = event.clientY;
    xAngle += thetaX;
    yAngle += thetaY;

    requestAnimationFrame(render);
}

function mouse_down(event: MouseEvent): void {
    mouse_button_down = true;
    prevMouseX = event.clientX;
    prevMouseY = event.clientY;
    requestAnimationFrame(render);
}

function mouse_up(): void {
    mouse_button_down = false;
    requestAnimationFrame(render);
}

// -----------------------------------------------------------------------------
// Render
// -----------------------------------------------------------------------------

function render(): void {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Camera 10 units back from origin
    mv = lookAt(
        new vec4(0, 0, 10, 1),
        new vec4(0, 0, 0, 1),
        new vec4(0, 1, 0, 0)
    );

    // Apply user rotation
    mv = mv.mult(rotateY(yAngle).mult(rotateX(xAngle)));

    // Upload MV
    gl.uniformMatrix4fv(umv, false, mv.flatten());

    // Draw if we have a mesh
    if (meshVertexCount > 0 && meshVertexBufferID) {
        gl.bindBuffer(gl.ARRAY_BUFFER, meshVertexBufferID);
        gl.drawArrays(gl.TRIANGLES, 0, meshVertexCount);
    }
}
