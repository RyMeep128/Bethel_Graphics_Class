#version 300 es

// === Vertex Attributes ===

// Object-space vertex position (x, y, z, w)
in vec4 vPosition;

// Per-vertex texture coordinates (u, v)
in vec2 texCoord;

// Object-space vertex normal (x, y, z, w)
in vec4 vNormal;

// Object-space vertex tangent (x, y, z, w)
// (Declared but not currently used in this shader; included for completeness)
in vec4 vTangent;

// Per-vertex specular color (RGBA)
in vec4 vSpecularColor;

// Per-vertex specular exponent (shininess value)
in float vSpecularExponent;


// === Varyings to Fragment Shader ===

// Interpolated texture coordinates passed to fragment shader
out vec2 ftexCoord;

// Eye-space position of the vertex, used for lighting
out vec4 position;

// Interpolated specular color passed to fragment shader
out vec4 fSpecularColor;

// Interpolated specular exponent passed to fragment shader
out float fSpecularExponent;

// Eye-space normal (unit length) passed to fragment shader
out vec3 vN;


// === Uniforms ===

// Model-view matrix: transforms from object space → eye space
uniform mat4 model_view;

// Projection matrix: transforms from eye space → clip space
uniform mat4 projection;

void main()
{
    // Transform vertex position into eye space
    vec4 veyepos = model_view * vPosition;
    position = veyepos;

    // Pass through per-vertex specular properties to the fragment stage
    fSpecularColor = vSpecularColor;
    fSpecularExponent = vSpecularExponent;

    // Transform normal into eye space and normalize
    vN = normalize((model_view * vNormal).xyz);

    // Forward texture coordinates to fragment shader
    ftexCoord = texCoord;

    // Final clip-space position: projection * model-view * position
    gl_Position = projection * model_view * vPosition;
}
