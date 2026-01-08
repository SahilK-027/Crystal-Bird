import * as THREE from 'three';
import { LoadingManager } from './managers/LoadingManager.js';
import { SceneManager } from './managers/SceneManager.js';
import { MouseManager } from './managers/MouseManager.js';
import { ShaderMaterialManager } from './managers/ShaderMaterialManager.js';
import { PostProcessingManager } from './managers/PostProcessingManager.js';
import { ModelLoader } from './loaders/ModelLoader.js';
import { SparkleParticleSystem } from './particles/SparkleParticleSystem.js';
import { CrystallineBranches } from './environment/CrystallineBranches.js';
import { CloudBackground } from './environment/CloudBackground.js';
import { GUIManager } from './gui/GUIManager.js';
import { PerformanceMonitor } from './debug/PerformanceMonitor.js';
import { AudioManager } from './managers/AudioManager.js';
import { SlowmoEffect } from './effects/SlowmoEffect.js';

export class Application {
  constructor() {
    this.canvas = document.querySelector('canvas.webgl');
    this.clock = new THREE.Clock();
    this.lastTime = 0;
    this.isStarted = false;
    this.slowmoEffect = null;

    this.init();
  }

  init() {
    // Initialize scene and managers first
    this.sceneManager = new SceneManager(this.canvas);
    this.mouseManager = new MouseManager();
    this.shaderMaterialManager = new ShaderMaterialManager();
    this.sparkleSystem = new SparkleParticleSystem(this.sceneManager.scene);
    this.crystallineBranches = new CrystallineBranches(this.sceneManager.scene);
    this.cloudBackground = new CloudBackground(this.sceneManager.scene);

    this.postProcessing = new PostProcessingManager(
      this.sceneManager.scene,
      this.sceneManager.camera,
      this.sceneManager.renderer,
      this.sceneManager.sizes
    );

    // Initialize loading manager with callback for when user clicks start
    this.loadingManager = new LoadingManager((withMusic) => {
      this.startExperience(withMusic);
    });

    this.modelLoader = new ModelLoader(
      this.loadingManager.get(),
      this.shaderMaterialManager.material,
      this.sceneManager.scene,
      this.sceneManager.renderer
    );

    this.guiManager = new GUIManager(
      this.shaderMaterialManager,
      this.postProcessing,
      null,
      this.sparkleSystem
    );

    this.performanceMonitor = new PerformanceMonitor(
      this.sceneManager.renderer,
      this.guiManager.getPane()
    );

    // Initialize audio manager (don't create button yet, but load audio)
    this.audioManager = new AudioManager(this.loadingManager.get(), false);

    this.modelLoader.load('/models/bird.glb', (flowfieldSystem) => {
      console.log('🐦 Model loaded successfully');
      if (flowfieldSystem) {
        this.guiManager.addFlowfieldControls(flowfieldSystem);
      }
      
      // Model loaded - now initialize everything else
      this.initializeAllSystems();
    });

    this.guiManager.addTreeControls(this.crystallineBranches);
    this.guiManager.addCloudControls(this.cloudBackground);

    this.setupResizeHandler();
    
    // Start rendering immediately but in paused state
    this.startPreRendering();
  }

  initializeAllSystems() {
    console.log('🔧 Starting system initialization...');
    
    // Initialize all heavy systems during loading phase
    // Use multiple frames to avoid blocking
    
    // Frame 1: Create music button
    requestAnimationFrame(() => {
      console.log('🎵 Creating music button...');
      this.audioManager.createMusicButton();
      
      // Frame 2: Initialize slowmo effect
      requestAnimationFrame(() => {
        console.log('⏱️ Initializing slowmo effect...');
        this.slowmoEffect = new SlowmoEffect({
          composer: this.postProcessing.composer,
          camera: this.sceneManager.camera,
          audio: this.audioManager.audio,
          renderer: this.sceneManager.renderer,
          chromaticAberrationPass: this.postProcessing.chromaticAberrationPass
        });
        
        // Frame 3: Wait for slowmo to fully initialize (it defers HUD setup)
        requestAnimationFrame(() => {
          // Frame 4: Everything is ready - notify loading manager
          requestAnimationFrame(() => {
            console.log('✅ All systems initialized!');
            this.loadingManager.setReady();
          });
        });
      });
    });
  }

  startPreRendering() {
    // Start the animation loop immediately
    this.preRenderFrame();
  }

  preRenderFrame() {
    if (this.isStarted) {
      this.performanceMonitor.beginFrame();
    }
    
    const elapsedTime = this.clock.getElapsedTime();
    let deltaTime = elapsedTime - this.lastTime;
    this.lastTime = elapsedTime;

    // Update slowmo effect and get time scale
    let timeScale = 1.0;
    if (this.slowmoEffect) {
      timeScale = this.slowmoEffect.update(deltaTime);
    }

    // Apply time scale to delta time for all animations
    const scaledDelta = deltaTime * timeScale;

    // Update systems with scaled time
    this.mouseManager.update();
    this.shaderMaterialManager.update(elapsedTime, this.mouseManager);
    this.sparkleSystem.update(elapsedTime);
    this.crystallineBranches.update(elapsedTime);
    this.cloudBackground.update(elapsedTime, scaledDelta);
    this.postProcessing.update(elapsedTime, this.mouseManager.mouseVelocity);
    this.sceneManager.update(this.mouseManager, scaledDelta);

    const flowfieldSystem = this.modelLoader.getFlowfieldSystem();
    if (flowfieldSystem) {
      flowfieldSystem.update(scaledDelta, elapsedTime);
    }

    // Render frame
    this.postProcessing.render();
    
    if (this.isStarted) {
      this.performanceMonitor.endFrame();
    }

    // Continue animation loop
    window.requestAnimationFrame(() => this.preRenderFrame());
  }

  startExperience(withMusic) {
    if (this.isStarted) return;
    
    console.log('🎬 Experience starting...');
    this.isStarted = true;
    
    // Start music in next frame to avoid blocking
    if (withMusic) {
      requestAnimationFrame(() => {
        console.log('🎵 Starting audio playback...');
        this.audioManager.play();
      });
    }
    
    console.log('✅ Experience started successfully!');
    // Animation loop is already running from preRenderFrame
  }

  setupResizeHandler() {
    const originalHandleResize = this.sceneManager.handleResize.bind(
      this.sceneManager
    );
    this.sceneManager.handleResize = () => {
      originalHandleResize();
      this.postProcessing.handleResize(
        this.sceneManager.sizes.width,
        this.sceneManager.sizes.height
      );
    };
  }

  animate() {
    this.performanceMonitor.beginFrame();

    const elapsedTime = this.clock.getElapsedTime();
    const deltaTime = elapsedTime - this.lastTime;
    this.lastTime = elapsedTime;

    this.mouseManager.update();
    this.shaderMaterialManager.update(elapsedTime, this.mouseManager);
    this.sparkleSystem.update(elapsedTime);
    this.crystallineBranches.update(elapsedTime);
    this.cloudBackground.update(elapsedTime, deltaTime);
    this.postProcessing.update(elapsedTime, this.mouseManager.mouseVelocity);
    this.sceneManager.update(this.mouseManager, deltaTime);

    const flowfieldSystem = this.modelLoader.getFlowfieldSystem();
    if (flowfieldSystem) {
      flowfieldSystem.update(deltaTime, elapsedTime);
    }

    this.postProcessing.render();

    this.performanceMonitor.endFrame();

    window.requestAnimationFrame(() => this.animate());
  }
}
