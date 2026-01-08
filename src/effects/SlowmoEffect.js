import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js';

/**
 * SlowmoEffect - Hold-to-slowmo interaction with lens distortion and audio slowdown
 *
 * Usage:
 *   const slowmo = new SlowmoEffect({
 *     composer: effectComposer,
 *     camera: camera,
 *     audio: audioElement,
 *     renderer: renderer
 *   });
 */
export class SlowmoEffect {
  constructor(options = {}) {
    this.composer = options.composer;
    this.camera = options.camera;
    this.audio = options.audio;
    this.renderer = options.renderer;

    this.chromaticAberrationPass = options.chromaticAberrationPass || null;

    this.config = {
      holdDelay: 0.25,
      holdDuration: 3.0,
      minTimeScale: 0.3,
      easeK: 8.0,
      releaseEaseDuration: 0.8,

      defaultDamp: 0.96,
      trailDamp: 0.7,
      maxRGBShift: 0.005,
      maxCustomAberration: 0.008,
      maxVignette: 1.8,

      baseFOV: this.camera.fov,
      maxFOVChange: 5,

      ...options.config,
    };

    this.isInitialized = false;
    this.isHolding = false;
    this.holdStartTime = 0;
    this.holdElapsed = 0;
    this.progress = 0;
    this.progressAtRelease = 0;

    this.targetTimeScale = 1.0;
    this.currentTimeScale = 1.0;

    this.releaseStartTime = 0;
    this.releaseProgress = 0;
    this.isReleasing = false;

    this.originalAudioRate = 1.0;

    this.init();
  }

  init() {
    requestAnimationFrame(() => {
      this.setupPostProcessing();
      this.isInitialized = true;

      requestAnimationFrame(() => {
        this.setupInputHandlers();

        requestAnimationFrame(() => {
          this.setupHUD();
        });
      });
    });
  }

  setupPostProcessing() {
    this.afterimagePass = new AfterimagePass(this.config.defaultDamp);
    this.afterimagePass.enabled = false;
    this.composer.addPass(this.afterimagePass);

    this.rgbShiftPass = new ShaderPass(RGBShiftShader);
    this.rgbShiftPass.uniforms['amount'].value = 0;
    this.composer.addPass(this.rgbShiftPass);

    this.vignettePass = new ShaderPass(this.createVignetteShader());
    this.vignettePass.uniforms['vignetteIntensity'].value = 0;
    this.composer.addPass(this.vignettePass);
  }

  createVignetteShader() {
    return {
      uniforms: {
        tDiffuse: { value: null },
        vignetteIntensity: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float vignetteIntensity;
        varying vec2 vUv;

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          
          // Dark vignette effect (darkens edges)
          vec2 center = vUv - 0.5;
          float vignette = 1.0 - dot(center, center) * vignetteIntensity;
          vignette = smoothstep(0.2, 1.0, vignette);
          
          color.rgb *= vignette;
          
          gl_FragColor = color;
        }
      `,
    };
  }

  setupHUD() {
    // Reference existing DOM elements from index.html
    this.hudElement = document.querySelector('.slowmo-hud');
    this.progressBar = document.querySelector('.slowmo-progress-bar');
    this.hintElement = document.querySelector('.slowmo-hint');

    if (!this.hudElement || !this.progressBar || !this.hintElement) {
      console.warn('SlowmoEffect: UI elements not found in DOM');
    }
  }

  setupInputHandlers() {
    // Pointer events
    this.onPointerDown = this.handlePointerDown.bind(this);
    this.onPointerUp = this.handlePointerUp.bind(this);

    // Keyboard events
    this.onKeyDown = this.handleKeyDown.bind(this);
    this.onKeyUp = this.handleKeyUp.bind(this);

    window.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  handlePointerDown() {
    if (!this.isHolding) {
      this.startHold();
    }
  }

  handlePointerUp() {
    if (this.isHolding) {
      this.endHold();
    }
  }

  handleKeyDown(event) {
    if (event.code === 'Space' && !this.isHolding && !event.repeat) {
      event.preventDefault();
      this.startHold();
    }
  }

  handleKeyUp(event) {
    if (event.code === 'Space' && this.isHolding) {
      event.preventDefault();
      this.endHold();
    }
  }

  startHold() {
    this.isHolding = true;
    this.isReleasing = false;
    this.holdStartTime = performance.now();
    this.holdElapsed = 0;

    // Don't show HUD immediately - wait for holdDelay
  }

  endHold() {
    this.isHolding = false;
    this.isReleasing = true;
    this.releaseStartTime = performance.now();
    this.releaseProgress = 0;
    this.progressAtRelease = this.progress; // Store current progress for smooth lerp
    this.targetTimeScale = 1.0;
  }

  update(deltaTime) {
    // Skip update if not yet initialized
    if (!this.isInitialized) {
      return 1.0;
    }

    const now = performance.now();
    const rawDelta = deltaTime;

    if (this.isHolding) {
      // Update hold time
      this.holdElapsed = (now - this.holdStartTime) / 1000;

      // Linear progress with delay, then ramp over duration
      if (this.holdElapsed < this.config.holdDelay) {
        this.progress = 0;
        // Hide HUD during delay period
        this.hudElement.style.opacity = '0';
      } else {
        // Show HUD once delay is over
        this.hudElement.style.opacity = '1';

        const effectiveHoldTime = this.holdElapsed - this.config.holdDelay;
        this.progress = Math.min(
          effectiveHoldTime / this.config.holdDuration,
          1.0
        );
      }

      // Update target time scale
      this.targetTimeScale = this.lerp(
        1.0,
        this.config.minTimeScale,
        this.progress
      );

      // Update HUD progress
      this.updateHUDProgress(this.progress);
    } else if (this.isReleasing) {
      // Ease out release over 1.2s with gentler easing
      const releaseElapsed = (now - this.releaseStartTime) / 1000;
      this.releaseProgress = Math.min(
        releaseElapsed / this.config.releaseEaseDuration,
        1.0
      );

      // Ease out quadratic (gentler than cubic)
      const eased = 1 - Math.pow(1 - this.releaseProgress, 2);

      // Fade progress back to 0 from the stored release value
      this.progress = this.lerp(this.progressAtRelease, 0, eased);

      // Update HUD
      this.updateHUDProgress(this.progress);

      if (this.releaseProgress >= 1.0) {
        this.isReleasing = false;
        this.progress = 0;
        this.progressAtRelease = 0;
        this.hudElement.style.opacity = '0';

        // Explicitly reset audio to normal speed
        if (this.audio) {
          this.audio.playbackRate = 1.0;
        }
      }
    } else if (this.progress > 0) {
      // Fade out any remaining progress
      this.progress = Math.max(0, this.progress - rawDelta * 2);
      this.updateHUDProgress(this.progress);

      // Ensure audio is reset when progress reaches 0
      if (this.progress === 0 && this.audio) {
        this.audio.playbackRate = 1.0;
      }
    }

    // Smooth time scale with exponential smoothing
    const lerpFactor = 1 - Math.exp(-this.config.easeK * rawDelta);
    this.currentTimeScale = this.lerp(
      this.currentTimeScale,
      this.targetTimeScale,
      lerpFactor
    );

    // Update post-processing effects
    this.updateEffects();

    // Update audio playback rate
    this.updateAudio();

    // Update camera FOV
    this.updateCamera();

    return this.currentTimeScale;
  }

  updateEffects() {
    // Enable/disable afterimage pass based on progress
    if (this.progress > 0.001) {
      this.afterimagePass.enabled = true;

      // During release, actively clear the buffer by reducing damp below default
      // This makes trails fade out faster during the transition
      let dampValue;
      if (this.isReleasing && this.progress < 0.3) {
        // Aggressively clear buffer during final phase of release
        dampValue = this.lerp(0.5, this.config.trailDamp, this.progress / 0.3);
      } else {
        // Normal interpolation during hold
        dampValue = this.lerp(
          this.config.defaultDamp,
          this.config.trailDamp,
          this.progress
        );
      }

      this.afterimagePass.uniforms['damp'].value = dampValue;
    } else {
      this.afterimagePass.enabled = false;
    }

    // RGB shift (chromatic aberration) - subtle effect
    const rgbShiftAmount = this.lerp(0, this.config.maxRGBShift, this.progress);
    this.rgbShiftPass.uniforms['amount'].value = rgbShiftAmount;

    // Also control custom chromatic aberration pass if provided
    if (this.chromaticAberrationPass) {
      const customAberration = this.lerp(
        0,
        this.config.maxCustomAberration,
        this.progress
      );
      this.chromaticAberrationPass.uniforms['uAberration'].value =
        customAberration;
    }

    // Dark vignette (intensifies during slowmo for focus)
    const vignetteAmount = this.lerp(0, this.config.maxVignette, this.progress);
    this.vignettePass.uniforms['vignetteIntensity'].value = vignetteAmount;
  }

  updateAudio() {
    if (!this.audio) return;

    // Use a threshold to ensure we snap back to normal playback
    let targetRate;
    if (this.progress < 0.01) {
      // Snap to normal speed when progress is very small
      targetRate = 1.0;
    } else {
      // Smoothly adjust playback rate based on progress
      targetRate = this.lerp(1.0, this.config.minTimeScale, this.progress);
    }

    try {
      // Preserve playback rate allows for smooth pitch shifting
      this.audio.playbackRate = targetRate;
      this.audio.preservesPitch = false; // Enable pitch shift for slowmo effect
    } catch (e) {
      // Fallback if playback rate control fails
      console.warn('Audio playback rate control not supported');
    }
  }

  updateCamera() {
    // Subtle FOV change for dolly effect
    const targetFOV =
      this.config.baseFOV + this.config.maxFOVChange * this.progress;
    this.camera.fov = this.lerp(this.camera.fov, targetFOV, 0.1);
    this.camera.updateProjectionMatrix();
  }

  updateHUDProgress(progress) {
    // Update linear progress bar width
    const percentage = Math.max(0, Math.min(100, progress * 100));
    this.progressBar.style.width = `${percentage}%`;
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  dispose() {
    // Remove event listeners
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    // Reset HUD visibility (don't remove elements, they're in index.html)
    if (this.hudElement) {
      this.hudElement.style.opacity = '0';
    }

    if (this.progressBar) {
      this.progressBar.style.width = '0%';
    }

    // Remove post-processing passes
    if (this.composer) {
      this.composer.removePass(this.afterimagePass);
      this.composer.removePass(this.rgbShiftPass);
      this.composer.removePass(this.vignettePass);
    }

    // Reset custom chromatic aberration if it was provided
    if (this.chromaticAberrationPass) {
      this.chromaticAberrationPass.uniforms['uAberration'].value = 0;
    }

    // Reset audio
    if (this.audio) {
      this.audio.playbackRate = 1.0;
      this.audio.preservesPitch = true;
    }

    // Reset camera
    this.camera.fov = this.config.baseFOV;
    this.camera.updateProjectionMatrix();
  }
}
