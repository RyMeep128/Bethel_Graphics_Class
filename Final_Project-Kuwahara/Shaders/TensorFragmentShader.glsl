#version 300 es
precision highp float;
precision lowp int;

in vec2 texCords;

uniform vec4 screenSize;// xy = (width, height)
out vec4 fColor;

uniform sampler2D gAlbedo;
uniform sampler2D gNormalTex;
uniform sampler2D gPosition;

const mat3 Gx = mat3(-1, -2, -1,
0, 0, 0,
1, 2, 1);

const mat3 Gy = mat3(-1, 0, 1,
-2, 0, 2,
-1, 0, 1);

vec2 texel() { return 1.0 / screenSize.xy; }

vec3 sobelGradX(vec3 a00, vec3 a10, vec3 a20,
vec3 a01, vec3 a11, vec3 a21,
vec3 a02, vec3 a12, vec3 a22)
{
    return Gx[0][0]*a00 + Gx[1][0]*a10 + Gx[2][0]*a20 +
    Gx[0][1]*a01 + Gx[1][1]*a11 + Gx[2][1]*a21 +
    Gx[0][2]*a02 + Gx[1][2]*a12 + Gx[2][2]*a22;
}

vec3 sobelGradY(vec3 a00, vec3 a10, vec3 a20,
vec3 a01, vec3 a11, vec3 a21,
vec3 a02, vec3 a12, vec3 a22)
{
    return Gy[0][0]*a00 + Gy[1][0]*a10 + Gy[2][0]*a20 +
    Gy[0][1]*a01 + Gy[1][1]*a11 + Gy[2][1]*a21 +
    Gy[0][2]*a02 + Gy[1][2]*a12 + Gy[2][2]*a22;
}

vec4 tensorFromSamples(
vec3 t00, vec3 t10, vec3 t20,
vec3 t01, vec3 t11, vec3 t21,
vec3 t02, vec3 t12, vec3 t22)
{
    vec3 Sx = sobelGradX(t00, t10, t20, t01, t11, t21, t02, t12, t22);
    vec3 Sy = sobelGradY(t00, t10, t20, t01, t11, t21, t02, t12, t22);
    return vec4(dot(Sx, Sx), dot(Sy, Sy), dot(Sx, Sy), 1.0);
}

vec4 tensorAlbedo(vec2 uv) {
    vec2 t = texel();
    vec3 a00 = texture(gAlbedo, uv + vec2(-1, -1)*t).rgb;
    vec3 a01 = texture(gAlbedo, uv + vec2(-1, 0)*t).rgb;
    vec3 a02 = texture(gAlbedo, uv + vec2(-1, 1)*t).rgb;
    vec3 a10 = texture(gAlbedo, uv + vec2(0, -1)*t).rgb;
    vec3 a11 = texture(gAlbedo, uv + vec2(0, 0)*t).rgb;
    vec3 a12 = texture(gAlbedo, uv + vec2(0, 1)*t).rgb;
    vec3 a20 = texture(gAlbedo, uv + vec2(1, -1)*t).rgb;
    vec3 a21 = texture(gAlbedo, uv + vec2(1, 0)*t).rgb;
    vec3 a22 = texture(gAlbedo, uv + vec2(1, 1)*t).rgb;
    return tensorFromSamples(a00, a10, a20, a01, a11, a21, a02, a12, a22);
}

vec4 tensorNormal(vec2 uv) {
    vec2 t = texel();
    vec3 n00 = normalize(texture(gNormalTex, uv + vec2(-1, -1)*t).xyz);
    vec3 n01 = normalize(texture(gNormalTex, uv + vec2(-1, 0)*t).xyz);
    vec3 n02 = normalize(texture(gNormalTex, uv + vec2(-1, 1)*t).xyz);
    vec3 n10 = normalize(texture(gNormalTex, uv + vec2(0, -1)*t).xyz);
    vec3 n11 = normalize(texture(gNormalTex, uv + vec2(0, 0)*t).xyz);
    vec3 n12 = normalize(texture(gNormalTex, uv + vec2(0, 1)*t).xyz);
    vec3 n20 = normalize(texture(gNormalTex, uv + vec2(1, -1)*t).xyz);
    vec3 n21 = normalize(texture(gNormalTex, uv + vec2(1, 0)*t).xyz);
    vec3 n22 = normalize(texture(gNormalTex, uv + vec2(1, 1)*t).xyz);
    return tensorFromSamples(n00, n10, n20, n01, n11, n21, n02, n12, n22);
}

vec4 tensorDepth(vec2 uv) {
    vec2 t = texel();

    float c = -texture(gPosition, uv).z;
    float invC = 1.0 / (c + 1e-3);

    float d00 = (-texture(gPosition, uv + vec2(-1,-1)*t).z) * invC;
    float d01 = (-texture(gPosition, uv + vec2(-1, 0)*t).z) * invC;
    float d02 = (-texture(gPosition, uv + vec2(-1, 1)*t).z) * invC;
    float d10 = (-texture(gPosition, uv + vec2( 0,-1)*t).z) * invC;
    float d11 = c * invC; // = 1.0
    float d12 = (-texture(gPosition, uv + vec2( 0, 1)*t).z) * invC;
    float d20 = (-texture(gPosition, uv + vec2( 1,-1)*t).z) * invC;
    float d21 = (-texture(gPosition, uv + vec2( 1, 0)*t).z) * invC;
    float d22 = (-texture(gPosition, uv + vec2( 1, 1)*t).z) * invC;

    return tensorFromSamples(
    vec3(d00), vec3(d10), vec3(d20),
    vec3(d01), vec3(d11), vec3(d21),
    vec3(d02), vec3(d12), vec3(d22)
    );
}


void main() {

    float wA = 0.8;
    float wN = 2.0;
    float wD = 1.2;

    vec4 tA = tensorAlbedo(texCords);
    vec4 tN = tensorNormal(texCords);
    vec4 tD = tensorDepth(texCords);

    fColor = wA*tA + wN*tN + wD*tD;
}
