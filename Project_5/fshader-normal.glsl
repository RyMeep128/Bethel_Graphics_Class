#version 300 es

// High-precision floating point for fragment operations
precision highp float;

// === Varyings from vertex shader ===

// 2D texture coordinates (u, v) from vertex stage
in vec2 ftexCoord;

// Tangent vector in eye space (parallel to surface)
in vec3 vT;

// Normal vector in eye space (perpendicular to surface)
in vec3 vN;

// Fragment position in eye space (homogeneous)
in vec4 position;

// Per-fragment/specified specular color (RGBA)
in vec4 fSpecularColor;

// Per-fragment/specified specular exponent (shininess)
in float fSpecularExponent;

// === Uniforms: lighting and material maps ===

// Light position in eye space (xyz, w usually 1 or 0)
uniform vec4 light_position;

// Light color (RGBA)
uniform vec4 light_color;

// Ambient light color (RGBA)
uniform vec4 ambient_light;

// Base color (albedo) texture
uniform sampler2D colorMap;

// Normal map (tangent-space)
uniform sampler2D normalMap;

// Specular map (controls where specular highlights are active)
uniform sampler2D specMap;

// Night/emissive map (city lights etc.)
uniform sampler2D nightMap;

// === Feature toggles ===

// Whether to use the normal map for per-pixel normals
uniform bool useNormalMap;

// Whether to sample the color (albedo) texture
uniform bool useColorMap;

// Whether to use the specular map + specular highlights
uniform bool useSpecMap;

// Whether to blend in the night/emissive map
uniform bool useNightMap;

// Final fragment color output
out vec4 fColor;

// -----------------------------------------------------------------------------
// Specular highlight computation
// N: normal in eye space (unit length)
// L: light direction in eye space (unit length, from fragment to light)
// lambert: diffuse term (N·L, clamped)
// E: eye/view direction in eye space (unit length, from fragment to eye)
// -----------------------------------------------------------------------------
vec4 specular(vec3 N, vec3 L, float lambert, vec3 E) {
    // Sample specular map; red channel controls whether this fragment is shiny
    vec4 specMapVal = texture(specMap, ftexCoord);

    // Only compute specular if the spec map says this area is reflective
    if (specMapVal.r >= 0.5) {
        float specFactor = 0.0;

        // Only compute specular if facing the light
        if (lambert > 0.0) {
            // R = reflection of -L about N
            vec3 R  = normalize(reflect(-L, N));
            // RV = cos(angle between R and E), clamped to [0,1]
            float RV = max(dot(R, E), 0.0);
            // Phong specular term with exponent from vertex input
            specFactor = pow(RV, fSpecularExponent);
        }

        // Scale specular by per-fragment color and light color
        return specFactor * fSpecularColor * light_color;
    } else {
        // No specular contribution at this fragment
        return vec4(0.0);
    }
}

// Simple helper to sample the color map
vec4 color() {
    return texture(colorMap, ftexCoord);
}

void main()
{
    // -------------------------------------------------------------------------
    // Build TBN basis (tangent, binormal, normal) in eye space for normal mapping
    // -------------------------------------------------------------------------

    // Normalize incoming normal and tangent
    vec3 nvN = normalize(vN);
    vec3 nvT = normalize(vT);

    // Binormal (bitangent) = N × T
    vec3 vB = normalize(cross(nvN, nvT));

    // Promote to vec4 so we can build a mat4 (column-major)
    vec4 v4T = vec4(nvT, 0.0);
    vec4 v4B = vec4(vB,  0.0);
    vec4 v4N = vec4(nvN, 0.0);

    // Dummy last column so basisChange is a full mat4
    vec4 v40001 = vec4(0.0, 0.0, 0.0, 1.0);

    // TBN matrix: transforms from tangent space → eye space
    mat4 basisChange = mat4(v4T, v4B, v4N, v40001);

    // -------------------------------------------------------------------------
    // Light and view direction in eye space
    // -------------------------------------------------------------------------

    // Direction from fragment to light in eye space
    vec3 L = normalize((light_position - position).xyz);

    // View direction from fragment to eye (eye is at origin in eye space)
    vec3 E = normalize(-position.xyz);

    // Final normal in eye space
    vec3 N;

    // -------------------------------------------------------------------------
    // Normal mapping: if enabled, sample normal map and transform via TBN
    // -------------------------------------------------------------------------
    if (useNormalMap) {
        // Normal from normal map is in [0,1]; remap to [-1,1]
        vec3 nT = texture(normalMap, ftexCoord).xyz * 2.0 - 1.0;

        // Transform tangent-space normal into eye space
        vec4 nEye = basisChange * vec4(nT, 0.0);
        N = normalize(nEye.xyz);
    } else {
        // Fall back to interpolated vertex normal
        N = nvN;
    }

    // Base surface color (will be modulated by lighting)
    vec4 baseColor = vec4(1.0);  // default white fallback

    // If enabled, take base color from the albedo texture
    if (useColorMap) {
        baseColor = color();
    }

    // -------------------------------------------------------------------------
    // Lambertian diffuse term
    // -------------------------------------------------------------------------

    // lambert = max(N·L, 0)
    float lambert = max(dot(L, N), 0.0);

    // Ambient component: constant, independent of light direction
    vec4 amb = baseColor * ambient_light;

    // Diffuse component: scaled by lambert and light color
    vec4 diff = lambert * baseColor * light_color;

    // -------------------------------------------------------------------------
    // Specular vs non-specular branches
    // NOTE: fColor is not initialized before this; adding spec += is relying on
    // whatever default value the driver gives. Typically you want to start
    // from amb + diff in both branches.
    // -------------------------------------------------------------------------
    if (useSpecMap) {
        // Add specular component and ambient; diffuse is added later (if enabled)
        fColor += specular(N, L, lambert, E) + amb;
    } else {
        // No specular: start with ambient + diffuse
        fColor = amb + diff;
    }

    if(useSpecMap && (useColorMap || useNormalMap || useNightMap)){
        fColor += diff;
    }

    // -------------------------------------------------------------------------
    // Additional diffuse contribution depending on feature usage
    // (Operator precedence: && is evaluated before ||)
    // -------------------------------------------------------------------------
    if ((useColorMap || useNormalMap || useNightMap) && !useSpecMap) {
        fColor += diff;
    }

    // If only normal mapping is on (no color/spec/night), dampen the diffuse
    // to make the normal map effect stand out more
    if (useNormalMap && !(useColorMap || useSpecMap || useNightMap)) {
        fColor -= (diff * 3.0);
    }

    // -------------------------------------------------------------------------
    // Night-time blending using night map and a twilight zone
    // -------------------------------------------------------------------------

    // N·L again, used for determining night vs day (and twilight)
    float ndotl = dot(L, N);

    // Night/emissive color at this texel (e.g., city lights)
    vec4 nightColor = texture(nightMap, ftexCoord);

    // Twilight factor: 0 near the terminator, 1 in full day
    // smoothstep(edge0, edge1, x) gives a smooth transition
    float twilight = smoothstep(0.0, 0.5, ndotl);

    // If enabled, blend between pure nightColor and lit color based on twilight
    if (useNightMap) {
        fColor = mix(nightColor, fColor, twilight);
    }
}
