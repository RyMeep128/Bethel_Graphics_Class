#version 300 es
precision mediump float;
precision lowp int;

in vec2 texCords;

// G-buffer inputs
uniform sampler2D gAlbedo;// location 0
uniform sampler2D gSpecular;// location 1
uniform sampler2D gNormalTex;// location 2
uniform sampler2D gPosition;// location 3

// Scene lights
uniform vec4 uLightPos[5];
uniform vec4 uLightColor[5];// diffuse color/intensity
uniform vec4 uLightAmbient[5];// ambient color
uniform vec4 uLightEnabled[5];// .x ambient, .y diffuse, .z specular
uniform vec4 uLightDirection[5];
uniform float uLightCutoff[5];

uniform sampler2D paperTex;
uniform vec3 cameraPos;
uniform float k_ambient;
uniform float k_diffuse;
uniform float k_specular;
uniform float p;

// Output: the watercolor diffuse base layer
layout(location = 0) out vec4 watercolorBase;

void main() {

    // Extract G-buffer data
    vec3 albedo  = texture(gAlbedo, texCords).rgb;
    vec3 normal  = normalize(texture(gNormalTex, texCords).xyz);
    vec3 position = texture(gPosition, texCords).xyz;

    // Paper color (screen-space)
    vec3 paperColor = texture(paperTex, texCords).rgb;

    // Final accumulated watercolor color
    vec3 finalColor = vec3(0.0);

    // Loop over all 5 lights
    for (int i = 0; i < 5; ++i) {

        // Skip disabled lights
        if (uLightEnabled[i].y <= 0.0) {
            continue;
        }

        vec3 L = normalize(uLightPos[i].xyz - position.xyz);
        vec3 LD = normalize(uLightDirection[i].xyz);
        vec3 N = normalize((normal).xyz);
        vec3 V = normalize(-position.xyz);

        if ((dot(LD, L) >= uLightCutoff[i])){

            vec3 Ldir = uLightPos[i].xyz;
            float NdotL = dot(normal, Ldir);

            // === 2) Actual radius attenuation (correct, preserved from original) ===
            float r = length(uLightPos[i].xyz - position);
            float inv_r2 = 1.0 / max(r * r, 0.0001);

            vec3 h = normalize(cameraPos + uLightPos[i].xyz);

            // === 4) Stylized specular region (tiny highlight then discard) ===
            float specularSize = (NdotL > 0.95) ? 1.0 : 0.0;

            float rawSpec = k_specular * inv_r2 * pow(max(dot(normal, h), 0.0), p);

            float stylizedSpec = smoothstep(0.01, 0.03, rawSpec) * 0.6;
            stylizedSpec *= specularSize;

            // Discard watercolor in specular highlight zones
            if (stylizedSpec > 0.0) {
                discard;
            }

            // === 5) Ambient (using Option A: your scene's light ambient color) ===
            vec3 ambient = k_ambient * uLightAmbient[i].rgb;

            // === 6) Diffuse using your scene's light color ===
            float diffuseStrength = max(NdotL, 0.0);
            vec3 diffuse = k_diffuse * uLightColor[i].rgb * diffuseStrength * inv_r2;

            // === 7) Per-light contribution to watercolor color ===
            vec3 lightContribution =
            paperColor *// paper modulation
            (ambient + diffuse) *// lighting
            albedo;// surface base color

            finalColor += lightContribution;
        }
    }

    //Alpha channel = pigment coverage
    float alpha = (1.0 - (finalColor.r * 0.8 +
    finalColor.g * 0.1 +
    finalColor.b * 0.7)) * 0.9;

    watercolorBase = vec4(finalColor, alpha);
    watercolorBase = vec4(paperColor,1.0);
    watercolorBase = texture(paperTex,texCords);
//    watercolorBase = vec4(1.0,0.0,0.0,1.0);
}



vec4 shadowPass(){
    return vec4(0.0);
}
