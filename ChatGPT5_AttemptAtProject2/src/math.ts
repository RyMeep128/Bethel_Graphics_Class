/* Minimal mat4/vec helpers (column-major, WebGL friendly) */

export type Mat4 = Float32Array;
export type Vec2 = [number, number];

export const I4 = (): Mat4 =>
    new Float32Array([1,0,0,0,  0,1,0,0,  0,0,1,0,  0,0,0,1]);

export const clone = (m: Mat4): Mat4 => new Float32Array(m);

export const multiply = (a: Mat4, b: Mat4): Mat4 => {
    const out = new Float32Array(16);
    for (let i = 0; i < 4; ++i) {
        const ai0 = a[i],  ai1 = a[i+4],  ai2 = a[i+8],  ai3 = a[i+12];
        out[i]    = ai0*b[0] + ai1*b[1] + ai2*b[2] + ai3*b[3];
        out[i+4]  = ai0*b[4] + ai1*b[5] + ai2*b[6] + ai3*b[7];
        out[i+8]  = ai0*b[8] + ai1*b[9] + ai2*b[10]+ ai3*b[11];
        out[i+12] = ai0*b[12]+ ai1*b[13]+ ai2*b[14]+ ai3*b[15];
    }
    return out;
};

export const translate = (m: Mat4, x: number, y: number, z: number): Mat4 => {
    const t = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]);
    return multiply(m, t);
};

export const scale = (m: Mat4, x: number, y: number, z: number): Mat4 => {
    const s = new Float32Array([x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1]);
    return multiply(m, s);
};

export const rotateZ = (m: Mat4, rad: number): Mat4 => {
    const c = Math.cos(rad), s = Math.sin(rad);
    const r = new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]);
    return multiply(m, r);
};

export const ortho2D = (l: number, r: number, b: number, t: number): Mat4 => {
    const rl = r - l, tb = t - b;
    return new Float32Array([
        2/rl, 0,    0, 0,
        0,    2/tb, 0, 0,
        0,    0,   -1, 0,
        -(r+l)/rl, -(t+b)/tb, 0, 1
    ]);
};

/* Simple matrix stack */
export class MatrixStack {
    private stack: Mat4[] = [I4()];
    top(): Mat4 { return this.stack[this.stack.length - 1]; }
    push(): void { this.stack.push(clone(this.top())); }
    pop(): void {
        if (this.stack.length <= 1) return;
        this.stack.pop();
    }
    load(m: Mat4) { this.stack[this.stack.length - 1] = m; }
    mult(m: Mat4) { this.load(multiply(this.top(), m)); }
    translate(x: number, y: number, z=0) { this.load(translate(this.top(), x, y, z)); }
    scale(x: number, y: number, z=1) { this.load(scale(this.top(), x, y, z)); }
    rotateZ(rad: number) { this.load(rotateZ(this.top(), rad)); }
}
