/**
 * Example: How to integrate SlowmoEffect into your Three.js project
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SlowmoEffect } from './SlowmoEffect.js';

// Setup your basic Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Setup EffectComposer
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Setup audio
const audio = new Audio('/audio/bgm.mp3');
audio.loop = true;
audio.volume = 0.5;

// Initialize SlowmoEffect - single line!
const slowmo = new SlowmoEffect({
  composer: composer,
  camera: camera,
  audio: audio,
  renderer: renderer
});

// Optional: customize configuration
const slowmoCustom = new SlowmoEffect({
  composer: composer,
  camera: camera,
  audio: audio,
  renderer: renderer,
  config: {
    holdDuration: 2.5,        // Faster ramp-up
    minTimeScale: 0.2,        // Slower slowmo
    maxRGBShift: 0.015,       // More chromatic aberration
    maxDistort: 0.4,          // More distortion
    maxFOVChange: -8          // More dramatic camera zoom
  }
});

// Animation loop
const clock = new THREE.Clock();
let lastTime = 0;

function animate() {
  requestAnimationFrame(animate);
  
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - lastTime;
  lastTime = elapsedTime;
  
  // Update slowmo effect and get current time scale
  const timeScale = slowmo.update(deltaTime);
  
  // Apply time scale to your animations
  const scaledDelta = deltaTime * timeScale;
  
  // Update your scene objects with scaled time
  // Example: rotating cube
  // cube.rotation.x += scaledDelta * 0.5;
  // cube.rotation.y += scaledDelta * 0.3;
  
  // Render with composer (includes slowmo effects)
  composer.render();
}

// Start audio playback (user interaction required)
document.addEventListener('click', () => {
  audio.play().catch(err => console.warn('Audio playback failed:', err));
}, { once: true });

animate();

// Cleanup when done
// slowmo.dispose();
