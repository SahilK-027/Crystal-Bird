import * as THREE from 'three';
import vertexShader from '../shaders/cloudBackground/vertex.glsl';
import fragmentShader from '../shaders/cloudBackground/fragment.glsl';

export class CloudBackground {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;

    this.config = {
      speed: 0.2,
      opacity: 0.3,
      tint: new THREE.Color(0x00aaff),
    };

    this.init();
  }

  init() {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: this.config.opacity },
        uTint: { value: this.config.tint },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    });

    const geometry = new THREE.PlaneGeometry(100, 60);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.z = -10;
    this.mesh.rotation.set(-0.1, Math.PI / 7, 0);
    this.mesh.renderOrder = -100;

    this.scene.add(this.mesh);
  }

  update(elapsedTime) {
    if (this.mesh) {
      this.mesh.material.uniforms.uTime.value = elapsedTime;
    }
  }

  setOpacity(value) {
    this.config.opacity = value;
    this.mesh.material.uniforms.uOpacity.value = value;
  }

  setTint(color) {
    this.config.tint.set(color);
    this.mesh.material.uniforms.uTint.value = this.config.tint;
  }

  dispose() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.scene.remove(this.mesh);
    }
  }
}
