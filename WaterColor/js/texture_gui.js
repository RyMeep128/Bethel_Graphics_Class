import * as THREE from '../three.js/build/three.module.js';
import {texVertex} from './shaders/texture_shaders.js';
import {texFragment} from './shaders/texture_shaders.js';
import {shadowVertex} from './shaders/texture_shadow.js';
import {shadowFragment} from './shaders/texture_shadow.js';
import {midtoneVertex} from './shaders/texture_midtone.js';
import {midtoneFragment} from './shaders/texture_midtone.js';
import {diffuseVertex} from './shaders/texture_diffuse.js';
import {diffuseFragment} from './shaders/texture_diffuse.js';
import { EffectComposer } from '../three.js/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../three.js/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from '../three.js/examples/jsm/postprocessing/ShaderPass.js';
import * as dat from '../dat.gui/dat.gui.module.js';

var scene = new THREE.Scene();
scene.background = new THREE.TextureLoader().load('js/textures/paper.jpg');
var camera = new THREE.PerspectiveCamera( 75, width/height, 0.1, 1000 );
var width = 350
var height = 350
var renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
renderer.setSize( width, height );

var pointLight = new THREE.PointLight(0x00FF00, 25.0);
pointLight.position.set(1.5, 1.5, 3);
scene.add(pointLight);

var geometry = new THREE.SphereBufferGeometry(2, 30, 30);
// var geometry = new THREE.BoxBufferGeometry(2, 2, 2);
var ambient_material = new THREE.ShaderMaterial( {
	uniforms: {
    baseColor: {type: 'vec3', value: new THREE.Color(0xed6fb4)},
		k_ambient: {type: 'f', value: 0.4},
		k_diffuse: {type: 'f', value: 3.},
		k_specular: {type: 'f', value: 5.},
		p: {type: 'f', value: 100.},
    cameraPosition: {type: 'vec3', value: camera.position},
    lightPos: {type: 'vec3', value: pointLight.position},
    lightIntensity: {type: 'vec3', value: new THREE.Vector3().addScalar(pointLight.intensity)},
		lightColor: {type: 'vec3', value: new THREE.Color(pointLight.color)},
		paper: {type: 't', value: new THREE.TextureLoader().load('js/textures/paper.jpg')}
  },
	transparent: true,
	vertexShader: texVertex(),
	fragmentShader: texFragment()
});
var diffuse_material = new THREE.ShaderMaterial( {
	uniforms: {
    baseColor: {type: 'vec3', value: new THREE.Color(0x721c54)},
		k_ambient: {type: 'f', value: 0.4},
		k_diffuse: {type: 'f', value: 3.},
		k_specular: {type: 'f', value: 5.},
		p: {type: 'f', value: 100.},
    cameraPosition: {type: 'vec3', value: camera.position},
    lightPos: {type: 'vec3', value: pointLight.position},
    lightIntensity: {type: 'vec3', value: new THREE.Vector3().addScalar(pointLight.intensity)},
		lightColor: {type: 'vec3', value: new THREE.Color(pointLight.color)},
		paper: {type: 't', value: new THREE.TextureLoader().load('js/textures/paper.jpg')}
  },
	transparent: true,
	vertexShader: diffuseVertex(),
	fragmentShader: diffuseFragment()
});
var midtone_material = new THREE.ShaderMaterial( {
	uniforms: {
    baseColor: {type: 'vec3', value: new THREE.Color(0x9c2768)},
		k_ambient: {type: 'f', value: 0.4},
		k_diffuse: {type: 'f', value: 3.},
		k_specular: {type: 'f', value: 5.},
		p: {type: 'f', value: 100.},
    cameraPosition: {type: 'vec3', value: camera.position},
    lightPos: {type: 'vec3', value: pointLight.position},
    lightIntensity: {type: 'vec3', value: new THREE.Vector3().addScalar(pointLight.intensity)},
		lightColor: {type: 'vec3', value: new THREE.Color(pointLight.color)},
		paper: {type: 't', value: new THREE.TextureLoader().load('js/textures/paper.jpg')}
  },
	transparent: true,
	vertexShader: midtoneVertex(),
	fragmentShader: midtoneFragment()
});
var shadow_material = new THREE.ShaderMaterial( {
	uniforms: {
    baseColor: {type: 'vec3', value: new THREE.Color(0x6b224a)},
		k_ambient: {type: 'f', value: 0.4},
		k_diffuse: {type: 'f', value: 3.},
		k_specular: {type: 'f', value: 5.},
		p: {type: 'f', value: 100.},
    cameraPosition: {type: 'vec3', value: camera.position},
    lightPos: {type: 'vec3', value: pointLight.position},
    lightIntensity: {type: 'vec3', value: new THREE.Vector3().addScalar(pointLight.intensity)},
		lightColor: {type: 'vec3', value: new THREE.Color(pointLight.color)},
		paper: {type: 't', value: new THREE.TextureLoader().load('js/textures/paper.jpg')}
  },
	transparent: true,
	vertexShader: shadowVertex(),
	fragmentShader: shadowFragment()
});
ambient_material.uniforms.paper.value.wrapS = ambient_material.uniforms.paper.value.wrapT = THREE.RepeatWrapping;
diffuse_material.uniforms.paper.value.wrapS = diffuse_material.uniforms.paper.value.wrapT = THREE.RepeatWrapping;
midtone_material.uniforms.paper.value.wrapS = midtone_material.uniforms.paper.value.wrapT = THREE.RepeatWrapping;
shadow_material.uniforms.paper.value.wrapS = shadow_material.uniforms.paper.value.wrapT = THREE.RepeatWrapping;

var cube = new THREE.Mesh(geometry, ambient_material);
var diffuse = new THREE.Mesh(geometry, diffuse_material);
var midtone = new THREE.Mesh(geometry, midtone_material);
var shadow = new THREE.Mesh(geometry, shadow_material);
scene.add(cube);
scene.add(diffuse);
scene.add(shadow);
scene.add(midtone);

// add gui elements
var color = {
	ambientColor: '#ed6fb4',
	diffuseColor: '#721c54',
	midtoneColor: '#9c2768',
	shadowColor: '#6b224a'
};

const gui = new dat.GUI({autoPlace: false});
const folder_color = gui.addFolder('Color');
folder_color.addColor(color, 'ambientColor').name('Ambient Color').onChange((value) => {
	ambient_material.uniforms.baseColor.value = new THREE.Color(value)
});
folder_color.addColor(color, 'diffuseColor').name('Diffuse Color').onChange((value) => {
	diffuse_material.uniforms.baseColor.value = new THREE.Color(value)
});
folder_color.addColor(color, 'midtoneColor').name('Midtone Color').onChange((value) => {
	midtone_material.uniforms.baseColor.value = new THREE.Color(value)
});
folder_color.addColor(color, 'shadowColor').name('Shadow Color').onChange((value) => {
	shadow_material.uniforms.baseColor.value = new THREE.Color(value)
});

// create renderer
var renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
renderer.setSize( width, height );
document.getElementById("texture_gui").appendChild( gui.domElement );
document.getElementById("texture_gui").appendChild( renderer.domElement );
renderer.setClearColor( 0x000000,  );

// set up camera
const canvas = renderer.domElement;
camera.aspect = canvas.clientWidth / canvas.clientHeight;
camera.updateProjectionMatrix();
camera.position.z = 5;

// create composer
const composer = new EffectComposer(renderer)
composer.setSize(canvas.width, canvas.height)

// create RenderPass
var renderPass = new RenderPass(scene, camera)

renderPass.clear = true
renderPass.clearAlpha = false
renderPass.clearColor = true

composer.addPass(renderPass)
// composer.addPass(new ShaderPass(diffuse_material))


var animate = function () {
  requestAnimationFrame( animate );
  composer.render();
  // composer.clear();
};

animate();
