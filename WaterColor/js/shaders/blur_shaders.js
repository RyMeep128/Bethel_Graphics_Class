export function horizontalBlurVertex() {
	return [
		"varying vec2 vUv;",

		"void main() {",

		"	vUv = uv;",
		"	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" )
}

export function horizontalBlurFragment() {
	return [

		"uniform sampler2D tDiffuse;",
		"uniform float h;",

		"varying vec2 vUv;",

		"void main() {",

		"	vec4 sum = vec4( 0.0 );",

		"	sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) ) * 0.051;",
		"	sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) ) * 0.0918;",
		"	sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) ) * 0.12245;",
		"	sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) ) * 0.1531;",
		"	sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;",
		"	sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) ) * 0.1531;",
		"	sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) ) * 0.12245;",
		"	sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) ) * 0.0918;",
		"	sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) ) * 0.051;",

		"	gl_FragColor = sum;",

		"}"

	].join( "\n" )
}

export function verticalBlurVertex() {
	return [

		"varying vec2 vUv;",

		"void main() {",

		"	vUv = uv;",
		"	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" )
}

export function verticalBlurFragment() {
	return [

		"uniform sampler2D tDiffuse;",
		"uniform float v;",

		"varying vec2 vUv;",

		"void main() {",

		"	vec4 sum = vec4( 0.0 );",

		"	sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.051;",
		"	sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.0918;",
		"	sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.12245;",
		"	sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.1531;",
		"	sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;",
		"	sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * 0.1531;",
		"	sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * 0.12245;",
		"	sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * 0.0918;",
		"	sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * 0.051;",

		"	gl_FragColor = sum;",

		"}"

	].join( "\n" )
}

export function stepVertex() {
	return `
		varying vec2 vUv;


		void main() {
			vUv = uv;
			vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
			gl_Position = projectionMatrix * modelViewPosition;
		}
	`
}

export function stepFragment() {
	return `
		uniform sampler2D prev_out;
		uniform float k_p; 
		uniform float c_a; 
		varying vec2 vUv;

		vec4 step_tex(sampler2D image, vec2 uv) {
			vec4 rho_xy = texture2D(image, uv);
			rho_xy.a = c_a * step(k_p, rho_xy.a);
			return rho_xy;
		}

		void main() {
			gl_FragColor = step_tex(prev_out, vUv);
			// gl_FragColor.a = 1.;
		}
	`
}

export function smoothStepVertex() {
	return `
		varying vec2 vUv;


		void main() {
			vUv = uv;
			vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
			gl_Position = projectionMatrix * modelViewPosition;
		}
	`
}
export function smoothStepFragment() {
	return `
		uniform sampler2D tDiffuse;
		varying vec2 vUv;

		vec4 step_tex(sampler2D image, vec2 uv) {
			float kp = 0.3;
			float kd = .99;
			vec4 color = texture2D(image, vec2(uv.x, uv.y));
			color.a = 0.4 * smoothstep(kp - kd, kp + kd, color.a);
			return color;
		}

		void main() {
			gl_FragColor = step_tex(tDiffuse, vUv);
			// gl_FragColor.a = 1.;
		}
	`
}
