export function diffuseVertex() {
  return `
    varying vec4 v_position;
    varying vec4 v_normal;
    varying vec2 v_uv;

    void main() {
      v_uv = uv;
      v_position = modelViewMatrix * vec4(position, 1.0);
      v_normal = vec4(normalize(vec3(modelViewMatrix*vec4(normal, 0.0))), 0.0);
      gl_Position = projectionMatrix * v_position;
    }
  `
}

export function diffuseFragment() {
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
    uniform vec3 lightColor;
    // texture
    uniform sampler2D paper;
    // outputs from vertex shader
    varying vec4 v_position;
    varying vec4 v_normal;
    varying vec2 v_uv;

    void main() {
      float NdotL = dot(lightPos, v_normal.xyz);
      float r = length(lightPos - v_position.xyz); // radius
      vec3 h = (cameraPos + lightPos) / length(cameraPos + lightPos); // half-vector

      float specularSize = (NdotL > 3.55) ? 1. : 0.;
      vec3 specular = k_specular * (lightIntensity / (r * r)) * pow(max(0.0, dot(normalize(v_normal.xyz), normalize(h))), p);
      specular = specular * specularSize;
      // specular = lightColor * specular;
      specular = smoothstep(0.01, 0.03, specular) * 0.6;
      if (specular.r > 0.0) // makes specular region transparent
        discard;

      vec4 ambient = k_ambient * vec4(1.0, 1.0, 1.0, 1.0);
      vec4 diffuse = vec4(k_diffuse * (lightIntensity / (r * r)) * max(0.0, dot(normalize(v_normal.xyz), normalize(lightPos))), 1.0);

      vec3 color = texture2D(paper, vec2(v_uv.x, v_uv.y)).rgb * (ambient.rgb + diffuse.rgb) * baseColor;
      float alpha = (1. - (color.r*0.8 + color.g*0.1 + color.b*0.7)) * 0.9;
      gl_FragColor = vec4(color, alpha);
    }
  `
}
