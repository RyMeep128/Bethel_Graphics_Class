export function bpVertex() {
  return `
    varying vec4 v_position;
    varying vec4 v_normal;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      v_position = modelViewMatrix * vec4(position, 1.0);
      v_normal = vec4(normalize(vec3(modelViewMatrix*vec4(normal, 0.0))), 0.0);
      gl_Position = projectionMatrix * v_position;
    }
  `
}

export function bpFragment() {
  return `
    // uniforms from geometry
    uniform vec3 baseColor;
    uniform float k_ambient;
    uniform float k_diffuse;
    uniform float k_specular;
    uniform float p;
    // uniforms for camera and lights
    uniform vec3 cameraPos;
    uniform vec3 lightPos;
    uniform vec3 lightIntensity;
    // outputs from vertex shader
    varying vec4 v_position;
    varying vec4 v_normal;
    void main() {
      // blinn-phong shader
      float r = length(lightPos - v_position.xyz); // radius
      vec3 h = (cameraPos + lightPos) / length(cameraPos + lightPos); // half-vector
      vec4 ambient = k_ambient * vec4(1.0, 1.0, 1.0, 1.0);
      vec4 diffuse = vec4(k_diffuse * (lightIntensity / (r * r)) * max(0.0, dot(normalize(v_normal.xyz), normalize(lightPos))), 1.0);
      vec4 specular = vec4(k_specular * (lightIntensity / (r * r)) * pow(max(0.0, dot(normalize(v_normal.xyz), normalize(h))), p), 1.0);
      gl_FragColor = ambient + diffuse + specular;
      gl_FragColor = gl_FragColor * vec4(baseColor, 1.0);
    }
  `
}

export function bpPassFragment() {
  return `
    // uniforms from geometry
    uniform sampler2D prev_out;
    uniform float k_ambient;
    uniform float k_diffuse;
    uniform float k_specular;
    uniform float p;
    // uniforms for camera and lights
    uniform vec3 cameraPos;
    uniform vec3 lightPos;
    uniform vec3 lightIntensity;
    // outputs from vertex shader
    varying vec4 v_position;
    varying vec4 v_normal;
    varying vec2 vUv;

    void main() {
      // blinn-phong shader
      float r = length(lightPos - v_position.xyz); // radius
      vec3 h = (cameraPos + lightPos) / length(cameraPos + lightPos); // half-vector
      vec4 ambient = k_ambient * vec4(1.0, 1.0, 1.0, 1.0);
      vec4 diffuse = vec4(k_diffuse * (lightIntensity / (r * r)) * max(0.0, dot(normalize(v_normal.xyz), normalize(lightPos))), 1.0);
      vec4 specular = vec4(k_specular * (lightIntensity / (r * r)) * pow(max(0.0, dot(normalize(v_normal.xyz), normalize(h))), p), 1.0);
      gl_FragColor = ambient + diffuse + specular;
      gl_FragColor = gl_FragColor * vec4(baseColor, 1.0);
    }
  `
}


export function diffuseFragment() {
  return `
    // uniforms from geometry
    uniform vec3 baseColor;
    uniform float k_diffuse;
    uniform float p;
    // uniforms for camera and lights
    uniform vec3 cameraPos;
    uniform vec3 lightPos;
    uniform vec3 lightIntensity;
    // outputs from vertex shader
    varying vec4 v_position;
    varying vec4 v_normal;
    varying vec2 vUv;

    void main() {
      // blinn-phong shader
      float r = length(lightPos - v_position.xyz); // radius
      vec3 h = (cameraPos + lightPos) / length(cameraPos + lightPos); // half-vector
      vec4 diffuse = vec4(k_diffuse * (lightIntensity / (r * r)) * max(0.0, dot(normalize(v_normal.xyz), normalize(lightPos))), 1.0);
      gl_FragColor = diffuse;
      gl_FragColor = gl_FragColor * vec4(baseColor, 1.0);
    }
  `
}

export function specularFragment() {
  return `
    // uniforms from geometry
    uniform vec3 baseColor;
    uniform float k_specular;
    uniform float p;
    // uniforms for camera and lights
    uniform vec3 cameraPos;
    uniform vec3 lightPos;
    uniform vec3 lightIntensity;
    // outputs from vertex shader
    varying vec4 v_position;
    varying vec4 v_normal;
    varying vec2 vUv;

    void main() {
      // blinn-phong shader
      float r = length(lightPos - v_position.xyz); // radius
      vec3 h = (cameraPos + lightPos) / length(cameraPos + lightPos); // half-vector
      vec4 specular = vec4(k_specular * (lightIntensity / (r * r)) * pow(max(0.0, dot(normalize(v_normal.xyz), normalize(h))), p), 1.0);
      gl_FragColor = specular;
      gl_FragColor = gl_FragColor * vec4(baseColor, 1.0);
    }
  `
}

export function addSpecularFragment() {
  return `
    uniform sampler2D intensity;
    uniform sampler2D specular;
    uniform float k_s;
    varying vec2 vUv;

    void main() {
      vec4 Ls_xy = texture2D(specular, vUv);
      vec4 prev_xy = texture2D(intensity, vUv);
      float result = prev_xy.a * (1.0 - step(k_s, Ls_xy.r));
      // float result = step(k_s, vec3(Ls_xy)).r * prev_xy.a;
      gl_FragColor = vec4(prev_xy.rgb, result);
    }
  `
}

export function addDiffuseFragment() {
  return `
    uniform sampler2D intensity;
    uniform sampler2D diffuse;
    uniform vec3 color0;
    uniform vec3 color1;
    varying vec2 vUv;

    vec3 CMYKtoRGB (vec4 cmyk) {
      float c = cmyk.x;
      float m = cmyk.y;
      float y = cmyk.z;
      float k = cmyk.w;

      float invK = 1.0 - k;
      float r = 1.0 - min(1.0, c * invK + k);
      float g = 1.0 - min(1.0, m * invK + k);
      float b = 1.0 - min(1.0, y * invK + k);
      return clamp(vec3(r, g, b), 0.0, 1.0);
    }

    vec4 RGBtoCMYK (vec3 rgb) {
      float r = rgb.r;
      float g = rgb.g;
      float b = rgb.b;
      float k = min(1.0 - r, min(1.0 - g, 1.0 - b));
      vec3 cmy = vec3(0.0);
      float invK = 1.0 - k;
      if (invK != 0.0) {
        cmy.x = (1.0 - r - k) / invK;
        cmy.y = (1.0 - g - k) / invK;
        cmy.z = (1.0 - b - k) / invK;
      }
      return clamp(vec4(cmy, k), 0.0, 1.0);
    }

    void main() {
      vec4 Ld_xy = texture2D(diffuse, vUv);
      vec4 prev_xy = texture2D(intensity, vUv);
      float scale = (1. - (Ld_xy.r*0.5 + Ld_xy.g*0.2 + Ld_xy.b*0.5));
      vec4 color0_cmyk = RGBtoCMYK(color0);
      vec4 color1_cmyk = RGBtoCMYK(color1);
      vec4 interp_cmyk = (color1_cmyk * scale + color0_cmyk * (1. - scale));
      gl_FragColor = vec4(CMYKtoRGB(interp_cmyk), prev_xy.a);
    }
  `
}
