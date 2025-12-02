import * as THREE from '../three.js/build/three.module.js';
import { EffectComposer } from '../three.js/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../three.js/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from '../three.js/examples/jsm/postprocessing/ShaderPass.js';
import { VerticalBlurShader } from '../three.js/examples/jsm/shaders/VerticalBlurShader.js';
import { HorizontalBlurShader } from '../three.js/examples/jsm/shaders/HorizontalBlurShader.js';
import { stepVertex, stepFragment, horizontalBlurVertex, horizontalBlurFragment, verticalBlurVertex, verticalBlurFragment } from './shaders/blur_shaders.js';
import { edgeVertex, edgeFragment } from './shaders/edge_darken_shaders.js';
import { texVertex, texFragment, paperFragment } from './shaders/texture_shaders.js';
import { bpVertex, bpFragment, diffuseFragment, specularFragment, addSpecularFragment, addDiffuseFragment } from './shaders/bp_shaders.js';
import { CopyShader } from '../three.js/examples/jsm/shaders/CopyShader.js';
import { modVertex, modFragment } from './shaders/edge_modulation.js';
import * as dat from '../dat.gui/dat.gui.module.js';
import {OrbitControls} from '../three.js/examples/jsm/controls/OrbitControls.js';

// dimensions
// var width = window.innerWidth / 2
// var height = window.innerHeight / 2
var width = 600
var height = 600

// set up scene and camera
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, width/height, 0.1, 1000 );
// scene.background = new THREE.Color( 0x123456 )

var clock = new THREE.Clock();

// add lights
var pointLight = new THREE.PointLight(0xffffff, 7.0);
pointLight.position.set(0.65, 0.65, 0.9);
scene.add(pointLight);

// create geometry
// var geometry = new THREE.SphereBufferGeometry(2, 30, 30);
// var geometry = new THREE.BoxBufferGeometry(2, 2, 2);
var geometry = new THREE.TorusKnotBufferGeometry(1.5, 0.4, 128, 32);
let material = new THREE.MeshBasicMaterial({ color: 0x000000 });
let cube = new THREE.Mesh( geometry, material );
scene.add( cube );

// create renderer
var renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
renderer.setSize( width, height );
document.getElementById("full-pipeline").appendChild( renderer.domElement );
renderer.setClearColor( 0x000000, );


// set up camera
const canvas = renderer.domElement;
camera.aspect = canvas.clientWidth / canvas.clientHeight;
camera.updateProjectionMatrix();
camera.position.z = 5;

// mouse controls
var controls;
mouseControls();

// generate intensity image
var parameters = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, stencilBuffer: false }
let intensityImage = new THREE.WebGLRenderTarget( width, height, parameters )
let tempImage = new THREE.WebGLRenderTarget( width, height, parameters )
let diffuseImage = new THREE.WebGLRenderTarget( width, height, parameters )
let diffuseMaterial = new THREE.ShaderMaterial({
  uniforms: {
    baseColor: {type: 'vec3', value: new THREE.Color(0xff00ff)},
		k_diffuse: {type: 'f', value: 3.},
		p: {type: 'f', value: 50.},
    cameraPosition: {type: 'vec3', value: camera.position},
    lightPos: {type: 'vec3', value: pointLight.position},
    lightIntensity: {type: 'vec3', value: new THREE.Vector3().addScalar(pointLight.intensity)}
  },
	vertexShader: bpVertex(),
	fragmentShader: diffuseFragment()
})
let specularImage = new THREE.WebGLRenderTarget( width, height, parameters )
let specularMaterial = new THREE.ShaderMaterial({
  uniforms: {
    baseColor: {type: 'vec3', value: new THREE.Color(0xffffff)},
		k_specular: {type: 'f', value: 5.},
		p: {type: 'f', value: 50.},
    cameraPosition: {type: 'vec3', value: camera.position},
    lightPos: {type: 'vec3', value: pointLight.position},
    lightIntensity: {type: 'vec3', value: new THREE.Vector3().addScalar(pointLight.intensity)}
  },
	vertexShader: bpVertex(),
	fragmentShader: specularFragment()
})



//paper texture: pigment granulation
var paper = new THREE.TextureLoader().load('js/textures/paper.jpg')
var paperTarget = new THREE.WebGLRenderTarget( width, height, parameters )
paperTarget.texture = paper

// create RenderPass
var renderPass = new RenderPass(scene, camera)
renderPass.clear = true
renderPass.clearAlpha = false
renderPass.clearColor = true

var addSpecularShader = {
  uniforms: {
    "intensity": {value: null},
    "specular": {value: specularImage},
    "k_s": {type: 'f', value: 0.5}
  },
  transparent: true,
  vertexShader: bpVertex(),
  fragmentShader: addSpecularFragment()
}


const addSpecularPass = new ShaderPass(addSpecularShader, "intensity")

var addDiffuseShader = {
  uniforms: {
    intensity: {value: null},
    diffuse: {value: diffuseImage},
    color0: {type: 'vec3', value: new THREE.Color(0x008ad0)},
    color1: {type: 'vec3', value: new THREE.Color(0x090074)}
  },
  transparent: true,
  vertexShader: bpVertex(),
  fragmentShader: addDiffuseFragment()
}
var addDiffusePass = new ShaderPass(addDiffuseShader, "intensity")

// blur pass
var hShader = {
  uniforms: {
    tDiffuse: {value: null},
    h: {type: 'f', value: 1.0 / 500.0}
  },
  vertexShader: horizontalBlurVertex(),
  fragmentShader: horizontalBlurFragment()
}
var horizontalBlurPass = new ShaderPass(hShader)
var vShader = {
  uniforms: {
    tDiffuse: {value: null},
    v: {type: 'f', value: 1.0 / 500.0}
  },
  vertexShader: verticalBlurVertex(),
  fragmentShader: verticalBlurFragment()
}
var verticalBlurPass = new ShaderPass(vShader)

var stepShader = {
  uniforms: {
    "prev_out": { value: intensityImage },
    "k_p": {type: 'f', value: 0.7},
    "c_a": {type: 'f', value: 0.4}
  },
  transparent: true,
  vertexShader: stepVertex(),
  fragmentShader: stepFragment()
};
var stepPass = new ShaderPass(stepShader)

// edge modulation
var edgeModShader = {
  uniforms: {
    "prev_out": { value: null },
    k_delta: {type: 'f', value: 0.1},
    k_rho: {type: 'f', value: 0.6},
    k_theta: {type: 'f', value: 1.},
    paper: {type: 't', value: paperTarget},
  },
  vertexShader: modVertex(),
  fragmentShader: modFragment()
}
var edgeModPass = new ShaderPass(edgeModShader, "prev_out")

// edge darkening
var edgeDarkenShader = {
  uniforms: {
    "intensity": {value: intensityImage },
    "prev_out": { value: null },
    k_omega: {type: 'f', value: 1.}
  },
  vertexShader: edgeVertex(),
  fragmentShader: edgeFragment()
}
var edgeDarkenPass = new ShaderPass(edgeDarkenShader, "prev_out")

// var paper = new THREE.TextureLoader().load('js/textures/paper.jpg')
// var paperTarget = composer.readBuffer.clone()
// paperTarget.texture = paper
var paperShader = {
  uniforms: {
    prev_out: { value: null },
    paper: {type: 't', value: paperTarget},
    k_r: {type: 'f', value: 0.1}
  },
  transparent: true,
  vertexShader: stepVertex(),
  fragmentShader: paperFragment()
}
paperShader.uniforms.paper.value.wrapS = paperShader.uniforms.paper.value.wrapT = THREE.RepeatWrapping
var paperPass = new ShaderPass(paperShader, "prev_out")

//////////////////////////// GUI STUFF ////////////////////////////////////////////
// allows you to move the camera with the mouse
function mouseControls() {
  controls = new OrbitControls( camera, renderer.domElement );
  // controls.addEventListener( 'change', render );
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.1;
  controls.screenSpacePanning = true;
  controls.minDistance = 1;
  controls.maxDistance = 10;
  controls.maxPolarAngle = Math.PI / 2;
}

// creates the GUI
function initGui() {
  const gui = new dat.GUI({autoPlace: false});
  document.getElementById("full-pipeline_gui").appendChild( gui.domElement );
  // diffuse
  var diffuseColor = {
  	diffuse_color0: '#008ad0',
  	diffuse_color1: '#090074',
  };
  const folder_color = gui.addFolder('Color');
  folder_color.addColor(diffuseColor, 'diffuse_color0').name('Diffuse Color 0').onChange(function (value) {
    addDiffuseShader.uniforms.color0.value = new THREE.Color(value);
    addDiffusePass = new ShaderPass(addDiffuseShader, "intensity");
  });
  folder_color.addColor(diffuseColor, 'diffuse_color1').name('Diffuse Color 1').onChange(function (value) {
    addDiffuseShader.uniforms.color1.value = new THREE.Color(value);
    addDiffusePass = new ShaderPass(addDiffuseShader, "intensity");
  });
  // blurring
  var blurStrength = {
  	blurh: 500,
  	blurv: 500,
  };
  const folder_blur = gui.addFolder('Blur');
  folder_blur.add(blurStrength, 'blurh', 150, 600, 50).name('Horizontal Blur').onChange(function (value) {
    hShader.uniforms.h.value = Math.pow(value, -1);
    horizontalBlurPass = new ShaderPass(hShader);
  });
  folder_blur.add(blurStrength, 'blurv', 150, 600, 50).name('Vertical Blur').onChange(function (value) {
    vShader.uniforms.v.value = Math.pow(value, -1);
    verticalBlurPass = new ShaderPass(vShader);
  });
  // step 
  var stepConstants = { 
    k_p: 0.7,
  }
  const folder_step = gui.addFolder('Step');
  folder_step.add(stepConstants, 'k_p', 0.1, 0.9, 0.1).name('Step').onChange(function (value) {
    stepShader.uniforms.k_p.value = value;
    stepPass = new ShaderPass(stepShader);
  });
  // darkening
  var edgeDarkConstant = {
  	k_omega: 1.,
  };
  const folder_edges = gui.addFolder('Edges');
  folder_edges.add(edgeDarkConstant, 'k_omega', 0.0, 5.).name('Edge Darkening').onChange(function (value) {
    edgeDarkenShader.uniforms.k_omega.value = value;
    edgeDarkenPass = new ShaderPass(edgeDarkenShader, "prev_out");
  });
  // edge modulation
  var edgeModConstant = {
    k_theta: 1.,
  };
  const folder_paper = gui.addFolder('Paper Texture');
  folder_paper.add(edgeModConstant, 'k_theta', 0.0, 3.).name('Edge Mod').onChange(function (value) {
    edgeModShader.uniforms.k_theta.value = value;
    edgeModPass = new ShaderPass(edgeModShader, "prev_out");
  });
  // pigment granulation
  var pigGranulationConst = {
    k_r: 1.,
  };
  folder_paper.add(pigGranulationConst, 'k_r', 0.0, 3.).name('Pigment').onChange(function (value) {
    paperShader.uniforms.k_r.value = value;
    paperPass = new ShaderPass(paperShader, "prev_out");
  });
}
//////////////////////////// GUI END ////////////////////////////////////////////

function testFragment() {
	return `
		uniform sampler2D test;
		varying vec2 vUv;

		void main() {
			gl_FragColor = texture2D(test, vUv);
		}
	`
}

var testShader = {
	uniforms: {
		"test": { value: diffuseImage }
	},
	vertexShader: edgeVertex(),
	fragmentShader: testFragment()
}

const testPass = new ShaderPass(testShader)

var copyPass = new ShaderPass(CopyShader)
copyPass.renderToScreen = false;

var composer = new EffectComposer(renderer)
composer.setSize(canvas.width, canvas.height)

var reset = composer.renderTarget1.clone()
var reset1 = composer.renderTarget1.clone()

var animate = function () {
  var delta = clock.getDelta();
  controls.update();
  composer.reset();
  renderer.clear();
  // composer.renderer.clear();

  // cube.rotation.x += 0.01;
  // cube.rotation.y += 0.01;
  var diffusePasses = [renderPass, copyPass]
  var specularPasses = [renderPass, copyPass]
  var intensityPasses = [renderPass, addSpecularPass, addDiffusePass, horizontalBlurPass, verticalBlurPass, edgeModPass, copyPass]
  var additionalPasses = [stepPass, edgeDarkenPass, paperPass]



  composer.passes = diffusePasses

  cube.material = diffuseMaterial
  composer.readBuffer  = diffuseImage
  composer.render(delta)
  composer.reset()


  composer.passes = specularPasses

  cube.material = specularMaterial
  composer.readBuffer = specularImage
  composer.render(delta)
  composer.reset()

  composer.passes = intensityPasses

  cube.material = material
  composer.writeBuffer = intensityImage
  composer.render(delta)	// reset render target
  composer.reset()


  composer.passes = additionalPasses
  // composer.passes = [testPass]
  composer.render(delta);
  requestAnimationFrame( animate );

};
initGui();
animate();
