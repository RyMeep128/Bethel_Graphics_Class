/**
 * Small caching layer around `gl.getUniformLocation`.
 *
 * WebGL uniform lookups are relatively expensive; this class lazily resolves each uniform
 * the first time it is requested and stores the location in a map for reuse.
 *
 * Note:
 * - `getUniformLocation` can return `null` if the uniform does not exist or was optimized out.
 * - This class caches that `null` result as well, preventing repeated lookups.
 */
export class UniformMap {
    /** WebGL2 context used to query uniform locations. */
    private gl: WebGL2RenderingContext;

    /** Program whose uniforms this map caches. */
    private program: WebGLProgram;

    /**
     * Cache of uniform locations keyed by uniform name.
     * Values may be `null` (uniform missing/optimized out), which is intentionally cached.
     */
    private map: Map<string, WebGLUniformLocation | null> = new Map<string, WebGLUniformLocation | null>();

    /**
     * @param gl - WebGL2 rendering context.
     * @param program - Program to query uniform locations from.
     */
    constructor(gl: WebGL2RenderingContext, program: WebGLProgram) {
        this.gl = gl;
        this.program = program;
    }

    /**
     * Returns the uniform location for the given name, using the cached value if available.
     *
     * @param name - GLSL uniform name to resolve.
     * @returns The uniform location, or `null` if not found / optimized out.
     */
    public get(name: string): WebGLUniformLocation | null {
        if (!this.map.has(name)) {
            this.map.set(name, this.gl.getUniformLocation(this.program, name));
        }
        return this.map.get(name) ?? null;
    }
}
