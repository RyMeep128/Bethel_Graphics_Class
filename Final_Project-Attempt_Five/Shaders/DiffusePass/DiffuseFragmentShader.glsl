#version 300 es
precision mediump float;

in vec2 texCords;

uniform sampler2D gAlbedo;
uniform sampler2D gNormalTex;
uniform sampler2D gPosition;

uniform vec4 uLightPos[5];
uniform vec4 uLightColor[5];
uniform vec4 uLightAmbient[5];
uniform vec4 uLightEnabled[5];
uniform vec4 uLightDirection[5];
uniform float uLightCutoff[5];

uniform sampler2D paperTex;
uniform float k_ambient;
uniform float k_diffuse;
uniform float k_specular;
uniform float p;

layout(location = 0) out vec4 watercolorBase;

void main() {
    vec3 albedo   = texture(gAlbedo, texCords).rgb;
    vec3 N        = normalize(texture(gNormalTex, texCords).xyz);
    vec3 position = texture(gPosition, texCords).xyz;
    vec3 paper    = texture(paperTex, texCords).rgb;

    vec3 accum = vec3(0.0);

    for (int i = 0; i < 5; ++i) {
        if (uLightEnabled[i].y <= 0.0) continue;

        vec3 lightPos = uLightPos[i].xyz;
        vec3 L = normalize(lightPos - position); // frag -> light

        // spotlight (if cutoff is valid)
        // direction is assumed to be "light forward" in eye space
        vec3 S = normalize(position - lightPos); // light -> frag
        float spot = dot(normalize(uLightDirection[i].xyz), S);
        if (spot < uLightCutoff[i]) continue;

        float r = length(lightPos - position);
        float inv_r2 = 1.0 / max(r * r, 0.0001);

        float NdotL = max(dot(N, L), 0.0);

        // CS184: only one ambient source (key light)
        vec3 ambient = (i == 0 && uLightEnabled[i].x > 0.0)
        ? (k_ambient * uLightAmbient[i].rgb)
        : vec3(0.0);

        vec3 diffuse = (uLightEnabled[i].y > 0.0)
        ? (k_diffuse * uLightColor[i].rgb * NdotL * inv_r2)
        : vec3(0.0);

        // CS184: specular highlight holes from key light only
        if (i == 0 && uLightEnabled[i].z > 0.0) {
            vec3 V = normalize(-position);
            vec3 R = reflect(-L, N);
            float rawSpec = k_specular * inv_r2 * pow(max(dot(R, V), 0.0), p);

            float specMask = step(0.20, rawSpec); // tune
            if (specMask > 0.0) discard;
        }

        accum += (ambient + diffuse);
    }

    vec3 finalColor = paper * accum * albedo;

    float lum = dot(finalColor, vec3(0.2126, 0.7152, 0.0722));
    float alpha = clamp(1.0 - lum, 0.0, 1.0);

    watercolorBase = vec4(finalColor, alpha);
}
