import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import { getSimulationShader } from './simulationShader.js';
import flowfieldVertexShader from '../shaders/particles/flowfield.vert.glsl';
import flowfieldFragmentShader from '../shaders/particles/flowfield.frag.glsl';

export class FlowfieldParticleSystem {
  constructor(horseVertices, horseMesh, scene, renderer) {
    this.horseVertices = horseVertices;
    this.horseMesh = horseMesh;
    this.scene = scene;
    this.renderer = renderer;

    this.WIDTH = 260;
    this.PARTICLES = this.WIDTH * this.WIDTH;

    this.init();
  }

  init() {
    this.gpuCompute = new GPUComputationRenderer(
      this.WIDTH,
      this.WIDTH,
      this.renderer
    );

    const dtPosition = this.gpuCompute.createTexture();
    this.fillInitialPositions(dtPosition);

    this.positionVariable = this.gpuCompute.addVariable(
      'uParticles',
      getSimulationShader(),
      dtPosition
    );

    this.gpuCompute.setVariableDependencies(this.positionVariable, [
      this.positionVariable,
    ]);

    this.positionVariable.material.uniforms.uTime = { value: 0 };
    this.positionVariable.material.uniforms.uDeltaTime = { value: 0 };
    this.positionVariable.material.uniforms.uBase = { value: dtPosition };
    this.positionVariable.material.uniforms.uInfluence = { value: 0.95 };
    this.positionVariable.material.uniforms.uStrength = { value: 0.5 };
    this.positionVariable.material.uniforms.uFrequency = { value: 1.0 };
    this.positionVariable.material.uniforms.uSpeedX = { value: 1.5 };
    this.positionVariable.material.uniforms.uHorsePosition = {
      value: new THREE.Vector3(0, -0.2, 0),
    };

    const error = this.gpuCompute.init();
    if (error !== null) console.error(error);

    this.createParticleGeometry();
    this.createParticleMaterial();

    this.particleSystem = new THREE.Points(
      this.particleGeometry,
      this.particleMaterial
    );
    this.scene.add(this.particleSystem);
  }

  fillInitialPositions(dtPosition) {
    const posArray = dtPosition.image.data;
    const particleSpacing = 0.8;
    
    if (!this.horseVertices || this.horseVertices.length === 0) {
      console.error('No horse vertices available for particle initialization');
      for (let k = 0; k < posArray.length; k += 4) {
        posArray[k + 0] = (Math.random() - 0.5) * 2;
        posArray[k + 1] = (Math.random() - 0.5) * 2 - 2;
        posArray[k + 2] = (Math.random() - 0.5) * 2;
        posArray[k + 3] = Math.random();
      }
      return;
    }
    
    for (let k = 0; k < posArray.length; k += 4) {
      const vertex =
        this.horseVertices[Math.floor(Math.random() * this.horseVertices.length)];
      posArray[k + 0] = vertex.x + (Math.random() - 0.5) * particleSpacing;
      posArray[k + 1] = vertex.y + (Math.random() - 0.5) * particleSpacing;
      posArray[k + 2] = vertex.z + (Math.random() - 0.5) * particleSpacing;
      posArray[k + 3] = Math.random();
    }
  }

  createParticleGeometry() {
    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.PARTICLES * 3);
    const uvs = new Float32Array(this.PARTICLES * 2);

    for (let i = 0; i < this.PARTICLES; i++) {
      uvs[i * 2] = (i % this.WIDTH) / this.WIDTH;
      uvs[i * 2 + 1] = Math.floor(i / this.WIDTH) / this.WIDTH;
    }

    this.particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    this.particleGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }

  createParticleMaterial() {
    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPositions: { value: null },
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uSize: { value: 8.0 },
        uColor1: { value: new THREE.Color(0x093762) },
        uColor2: { value: new THREE.Color(0x1672d3) },
        uColor3: { value: new THREE.Color(0x3a164b) },
      },
      vertexShader: flowfieldVertexShader,
      fragmentShader: flowfieldFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  update(deltaTime, elapsedTime) {
    this.positionVariable.material.uniforms.uTime.value = elapsedTime;
    this.positionVariable.material.uniforms.uDeltaTime.value = deltaTime;
    this.positionVariable.material.uniforms.uHorsePosition.value.copy(
      this.horseMesh.position
    );

    this.gpuCompute.compute();

    this.particleMaterial.uniforms.uPositions.value =
      this.gpuCompute.getCurrentRenderTarget(this.positionVariable).texture;
    this.particleMaterial.uniforms.uTime.value = elapsedTime;
  }

  getUniforms() {
    return this.positionVariable.material.uniforms;
  }

  getMaterial() {
    return this.particleMaterial;
  }
}
