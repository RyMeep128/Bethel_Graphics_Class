export function modVertex() {
	return `
		varying vec2 vUv;

		void main() {
			vUv = uv;
			vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
			gl_Position = projectionMatrix * modelViewPosition;
		}
	`
}

export function modFragment() {
  return `
    uniform sampler2D prev_out;
    uniform float k_delta;
    uniform float k_rho;
    uniform float k_theta;
		uniform sampler2D paper;
    varying vec2 vUv;

    void main() {
      // if (k_rho - k_delta < 0.5)
      //   discard;
			vec3 color = texture2D(paper, vUv).rgb;
      float alpha = 1.0-(color.r*0.5 + color.g*0.2 + color.b*0.5);
			gl_FragColor = texture2D(prev_out, vUv) + vec4(0., 0., 0., alpha) * k_theta;
			// gl_FragColor = texture2D(intensity, vUv);
			// gl_FragColor.a = alpha;
    }
  `
}
