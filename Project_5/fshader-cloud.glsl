#version 300 es

// Use high precision for floating-point calculations in the fragment shader
precision highp float;

// === Inputs from the vertex shader ===

// 2D texture coordinates for sampling the cloud map
in vec2 ftexCoord;

// Fragment position in eye space (homogeneous coordinates)
in vec4 position;

// Per-fragment specular color (not currently used in this shader, but available)
in vec4 fSpecularColor;

// Per-fragment specular exponent / shininess (not currently used)
in float fSpecularExponent;

// Surface normal in eye space (perpendicular to the surface)
in vec3 vN;

// === Uniforms for lighting and texture ===

// Light position in eye space (xyz; w may be 1 or 0 depending on usage)
uniform vec4 light_position;

// Light color (RGBA)
uniform vec4 light_color;

// Ambient light color (RGBA)
uniform vec4 ambient_light;

// Cloud texture map (RGBA, with alpha for cloud transparency if present)
uniform sampler2D cloudMap;

// Toggle controlling whether the cloud map is sampled/used
uniform bool useCloudMap;

// Final fragment color output
out vec4 fColor;

void main()
{
    // Normalize the interpolated normal to ensure unit length
    vec3 N = normalize(vN);

    // Compute light direction L: from fragment position toward light
    vec3 L = normalize((light_position - position).xyz);

    // Lambertian term: cos(theta) = N·L, clamped to [0, 1]
    float lambert = max(dot(L, N), 0.0);

    // Only shade clouds if the cloud map is enabled
    if (useCloudMap) {

        // Transition factor to control how strongly lighting affects the clouds
        // smoothstep(0.0, 0.5, lambert) yields:
        //  - 0 near the terminator / night side
        //  - 1 in bright daylight
        float transition = smoothstep(0.0, 0.5, lambert);

        // Base cloud color sampled from texture
        vec4 baseColor = texture(cloudMap, ftexCoord);

        // Diffuse lighting contribution from the cloud color and light color
        vec4 diff = lambert * baseColor * light_color;

        // Ambient + diffuse lighting applied to the clouds
        vec4 amb = baseColor * ambient_light + diff;

        // Blend between fully lit clouds (amb) and raw texture (baseColor)
        // based on the transition factor:
        //  - Near night side: closer to 'amb' (dimmer / more lit look)
        //  - In full light: closer to 'baseColor' (stronger texture detail)
        fColor = mix(amb, baseColor, transition);
    } else {
        // If clouds are disabled, output transparent/black
        fColor = vec4(0.0);
    }
}
