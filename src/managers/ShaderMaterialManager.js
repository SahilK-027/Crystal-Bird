import * as THREE from 'three';
import vertexShader from '../shaders/bird/vertex.glsl';
import fragmentShader from '../shaders/bird/fragment.glsl';

export class ShaderMaterialManager {
  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        uTime: { value: 0.0 },
        uTriScale: { value: 0.7 },
        uMosaic: { value: 20.0 },
        uProgress: { value: 1.0 },
        uMousePosition: { value: new THREE.Vector2(0, 0) },
        uMouseVelocity: { value: new THREE.Vector2(0, 0) },
        uHover: { value: 0.0 },
        uTexture: { value: null },
        uHasTexture: { value: false },
        uGlowColor: { value: new THREE.Color(0x186dec) },
        uAccentColor: { value: new THREE.Color(0x20558d) },
      },
    });
  }

  update(elapsedTime, mouseManager) {
    this.material.uniforms.uTime.value = elapsedTime;
    this.material.uniforms.uMousePosition.value =
      mouseManager.smoothedMousePosition;
    this.material.uniforms.uMouseVelocity.value = mouseManager.mouseVelocity;
    this.material.uniforms.uHover.value = THREE.MathUtils.lerp(
      this.material.uniforms.uHover.value,
      mouseManager.hover,
      0.1
    );
  }
}
