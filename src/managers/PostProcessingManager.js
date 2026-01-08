import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import customPassVertexShader from '../shaders/postProcessing/customPass.vert.glsl';
import customPassFragmentShader from '../shaders/postProcessing/customPass.frag.glsl';
import glowPassVertexShader from '../shaders/postProcessing/glowPass.vert.glsl';
import glowPassFragmentShader from '../shaders/postProcessing/glowPass.frag.glsl';
import chromaticAberrationVertexShader from '../shaders/postProcessing/chromaticAberration.vert.glsl';
import chromaticAberrationFragmentShader from '../shaders/postProcessing/chromaticAberration.frag.glsl';
import filmGrainVertexShader from '../shaders/postProcessing/filmGrain.vert.glsl';
import filmGrainFragmentShader from '../shaders/postProcessing/filmGrain.frag.glsl';

export class PostProcessingManager {
  constructor(scene, camera, renderer, sizes) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.sizes = sizes;

    this.composer = new EffectComposer(renderer);
    this.setupPasses();
  }

  setupPasses() {
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.sizes.width, this.sizes.height),
      0.2,
      1.0,
      0.8
    );
    this.composer.addPass(this.bloomPass);

    this.customPass = this.createCustomPass();
    this.composer.addPass(this.customPass);

    this.glowPass = this.createGlowPass();
    this.composer.addPass(this.glowPass);

    this.chromaticAberrationPass = this.createChromaticAberrationPass();
    this.composer.addPass(this.chromaticAberrationPass);

    this.filmGrainPass = this.createFilmGrainPass();
    this.composer.addPass(this.filmGrainPass);
  }

  createCustomPass() {
    const customShader = {
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
      },
      vertexShader: customPassVertexShader,
      fragmentShader: customPassFragmentShader,
    };
    return new ShaderPass(customShader);
  }

  createGlowPass() {
    const glowShader = {
      uniforms: {
        tDiffuse: { value: null },
        uIntensity: { value: 0.4 },
        uTime: { value: 0 },
      },
      vertexShader: glowPassVertexShader,
      fragmentShader: glowPassFragmentShader,
    };
    return new ShaderPass(glowShader);
  }

  createChromaticAberrationPass() {
    const chromaticAberrationShader = {
      uniforms: {
        tDiffuse: { value: null },
        uAberration: { value: 0.0 },
        uMouseInfluence: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: chromaticAberrationVertexShader,
      fragmentShader: chromaticAberrationFragmentShader,
    };
    return new ShaderPass(chromaticAberrationShader);
  }

  createFilmGrainPass() {
    const filmGrainShader = {
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uIntensity: { value: 0.08 },
      },
      vertexShader: filmGrainVertexShader,
      fragmentShader: filmGrainFragmentShader,
    };
    return new ShaderPass(filmGrainShader);
  }

  update(elapsedTime, mouseVelocity) {
    this.glowPass.uniforms.uTime.value = elapsedTime;
    this.chromaticAberrationPass.uniforms.uMouseInfluence.value.copy(
      mouseVelocity
    );
    this.filmGrainPass.uniforms.uTime.value = elapsedTime;
  }

  render() {
    this.composer.render();
  }

  handleResize(width, height) {
    this.composer.setSize(width, height);
  }
}
