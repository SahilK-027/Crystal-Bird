import * as THREE from 'three';
import sparkleVertexShader from '../shaders/particles/sparkle.vert.glsl';
import sparkleFragmentShader from '../shaders/particles/sparkle.frag.glsl';

export class SparkleParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.sparkleCount = 200;
    this.init();
  }

  init() {
    this.createGeometry();
    this.createMaterial();
    this.sparkles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.sparkles);
  }

  createGeometry() {
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.sparkleCount * 3);
    const randoms = new Float32Array(this.sparkleCount);

    for (let i = 0; i < this.sparkleCount; i++) {
      const radius = 0.5 + Math.random() * 2.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) - 0.2;
      positions[i * 3 + 2] = radius * Math.cos(phi);
      randoms[i] = Math.random();
    }

    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    this.geometry.setAttribute(
      'aRandom',
      new THREE.BufferAttribute(randoms, 1)
    );
  }

  createMaterial() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uSize: { value: 1.0 },
        uColor: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: sparkleVertexShader,
      fragmentShader: sparkleFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  update(elapsedTime) {
    this.material.uniforms.uTime.value = elapsedTime;
  }
}
