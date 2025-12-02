#version 300 es

// === Vertex Attributes ===

// Object-space vertex position (x, y, z, w)
in vec4 vPosition;

// Per-vertex texture coordinates (u, v)
in vec2 texCoord;

// Object-space vertex normal (x, y, z, w)
in vec4 vNormal;

// Object-space vertex tangent (x, y, z, w)
in vec4 vTangent;

// Per-vertex specular color (RGBA)
in vec4 vSpecularColor;

// Per-vertex specular exponent (shininess)
in float vSpecularExponent;


// === Varyings to Fragment Shader ===

// Interpolated texture coordinates
out vec2 ftexCoord;

// Tangent vector in eye space (for TBN / normal mapping)
out vec3 vT;

// Normal vector in eye space
out vec3 vN;

// Vertex position in eye space
out vec4 position;

// Specular color passed to fragment stage
out vec4 fSpecularColor;

// Specular exponent passed to fragment stage
out float fSpecularExponent;


// === Uniforms ===

// Model-view transform: object space → eye space
uniform mat4 model_view;

// Projection transform: eye space → clip space
uniform mat4 projection;

// Light position in eye space (declared but not used here;
// actual lighting is handled in the fragment shader)
uniform vec4 light_position;


void main()
{
    // Transform normal and tangent into eye space and normalize
    vN = normalize((model_view * vNormal).xyz);
    vT = normalize((model_view * vTangent).xyz);

    // Compute and export eye-space position
    vec4 veyepos = model_view * vPosition;
    position = veyepos;

    // Pass through specular material properties
    fSpecularColor = vSpecularColor;
    fSpecularExponent = vSpecularExponent;

    // Forward texture coordinates
    ftexCoord = texCoord;

    // Final clip-space position
    gl_Position = projection * model_view * vPosition;
}
