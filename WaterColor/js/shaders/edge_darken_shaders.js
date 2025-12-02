export function edgeVertex() {
	return `
		varying vec2 vUv; 


		void main() {
			vUv = uv;
			vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
			gl_Position = projectionMatrix * modelViewPosition;
		}
	`
}

export function edgeFragment() {
  return `
    uniform sampler2D intensity;
    uniform sampler2D prev_out; 
    uniform float k_omega;
    varying vec2 vUv;

    vec4 edge_darken(sampler2D rho, sampler2D lambda, vec2 uv) {
      vec4 lambda_xy = texture2D(lambda, uv);
      vec4 rho_xy = texture2D(rho, uv);
      lambda_xy.a = lambda_xy.a * (1.0 + k_omega * (1.0 - rho_xy.a)); 
      return lambda_xy;
    }

    void main() {
      gl_FragColor = edge_darken(intensity, prev_out, vUv);
      // gl_FragColor.a = 1.;
    }
  `
}