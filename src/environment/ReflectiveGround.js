import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

export class ReflectiveGround {
  constructor(scene, renderer, camera) {
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;

    this.groundY = -2.2;
    this.groundSize = 30;

    this.init();
  }

  init() {
    const geometry = new THREE.PlaneGeometry(this.groundSize, this.groundSize);

    // Use Three.js Reflector
    this.reflector = new Reflector(geometry, {
      clipBias: 0.003,
      textureWidth: window.innerWidth * window.devicePixelRatio,
      textureHeight: window.innerHeight * window.devicePixelRatio,
      color: 0x889999,
    });

    this.reflector.rotation.x = -Math.PI / 2;
    this.reflector.position.y = this.groundY;

    // Override the reflector's shader to add noise and fade
    this.reflector.material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uNoiseAmount = { value: 0.015 };
      shader.uniforms.uReflectionStrength = { value: 0.4 };
      
      this.shaderUniforms = shader.uniforms;

      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        `
        varying vec3 vWorldPos;
        varying vec2 vUv2;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          vUv2 = uv;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        'uniform vec3 color;',
        `
        uniform vec3 color;
        uniform float uTime;
        uniform float uNoiseAmount;
        uniform float uReflectionStrength;
        varying vec3 vWorldPos;
        varying vec2 vUv2;
        
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        'gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );',
        `
        // Animated noise distortion for cinematic water-like reflection
        float n1 = noise(vWorldPos.xz * 3.0 + uTime * 0.4);
        float n2 = noise(vWorldPos.xz * 5.0 - uTime * 0.3 + 50.0);
        float n3 = noise(vWorldPos.xz * 8.0 + uTime * 0.2 + 100.0);
        float combinedNoise = (n1 + n2 * 0.5 + n3 * 0.25) / 1.75;
        
        // Distance fade
        float dist = length(vWorldPos.xz);
        float fade = 1.0 - smoothstep(2.0, 10.0, dist);
        
        // Edge fade
        float edgeFade = smoothstep(0.0, 0.25, vUv2.y) * smoothstep(1.0, 0.75, vUv2.y);
        edgeFade *= smoothstep(0.0, 0.25, vUv2.x) * smoothstep(1.0, 0.75, vUv2.x);
        fade *= edgeFade;
        
        // Apply noise to break up the reflection
        float noiseBreakup = smoothstep(0.3, 0.7, combinedNoise);
        fade *= mix(0.5, 1.0, noiseBreakup);
        
        // Shimmer effect
        float shimmer = noise(vWorldPos.xz * 15.0 + uTime * 1.5) * 0.15;
        
        vec3 darkBase = vec3(0.008, 0.012, 0.02);
        vec3 reflectedColor = blendOverlay(base.rgb, color);
        
        // Add slight color variation from noise
        reflectedColor *= mix(0.85, 1.0, combinedNoise);
        reflectedColor += shimmer * fade * vec3(0.1, 0.15, 0.2);
        
        // Mix with dark base based on fade
        vec3 finalColor = mix(darkBase, reflectedColor * 0.55, uReflectionStrength * fade);
        
        gl_FragColor = vec4(finalColor, 1.0);
        `
      );
    };

    this.scene.add(this.reflector);
  }

  update(elapsedTime) {
    if (this.shaderUniforms) {
      this.shaderUniforms.uTime.value = elapsedTime;
    }
  }

  handleResize(width, height) {
    // Reflector handles its own resize internally
  }

  getUniforms() {
    return this.shaderUniforms || {};
  }
}
