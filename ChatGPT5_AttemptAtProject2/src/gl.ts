export type GL = WebGL2RenderingContext;

export function createGL(canvas: HTMLCanvasElement): GL {
    const gl = canvas.getContext("webgl2") as WebGL2RenderingContext | null;
    if (!gl) throw new Error("WebGL2 not supported");
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.06, 0.07, 0.09, 1);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    return gl;
}

export function compileShader(gl: GL, source: string, type: number): WebGLShader {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) || "Shader compile error");
    }
    return shader;
}

export function makeProgram(gl: GL, vsSource: string, fsSource: string): WebGLProgram {
    const vs = compileShader(gl, vsSource, gl.VERTEX_SHADER);
    const fs = compileShader(gl, fsSource, gl.FRAGMENT_SHADER);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(prog) || "Program link error");
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return prog;
}

export interface AttributeLocations {
    vPosition: number;
    vColor: number;
}

export interface UniformLocations {
    modelViewMatrix: WebGLUniformLocation;
    projectionMatrix: WebGLUniformLocation;
}

export function getLocations(gl: GL, program: WebGLProgram) {
    const attribs: AttributeLocations = {
        vPosition: gl.getAttribLocation(program, "vPosition"),
        vColor: gl.getAttribLocation(program, "vColor"),
    };
    const uniforms: UniformLocations = {
        modelViewMatrix: gl.getUniformLocation(program, "modelViewMatrix")!,
        projectionMatrix: gl.getUniformLocation(program, "projectionMatrix")!,
    };
    return { attribs, uniforms };
}
