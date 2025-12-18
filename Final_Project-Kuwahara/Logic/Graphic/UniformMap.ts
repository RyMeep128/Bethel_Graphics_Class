/**
 * @file UniformMap
 * @author Ryan Shafer
 * @remarks Comments by ChatGPT model 5.2.
 */

/**
 * Small caching layer around `gl.getUniformLocation`.
 *
 * WebGL uniform lookups can be relatively expensive; this class lazily resolves each uniform
 * the first time it is requested and stores the location in a map for reuse.
 *
 * Notes:
 * - `getUniformLocation` can return `null` if the uniform does not exist or was optimized out.
 * - This class intentionally caches `null` as well to prevent repeated lookups.
 */
export class UniformMap {
    /**
     * WebGL2 context used to query uniform locations.
     */
    private gl: WebGL2RenderingContext;

    /**
     * Program whose uniform locations are cached by this instance.
     */
    private program: WebGLProgram;

    /**
     * Cache of uniform locations keyed by uniform name.
     *
     */
    private map: Map<string, WebGLUniformLocation> = new Map<string, WebGLUniformLocation>();

    /**
     * Creates a new uniform-location cache for a specific shader program.
     *
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
     * Behavior:
     * - First call for a given `name` queries `gl.getUniformLocation(...)` and stores the result.
     * - Subsequent calls return the cached location.
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
