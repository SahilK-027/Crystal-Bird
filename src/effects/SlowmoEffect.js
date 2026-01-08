import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js';
import vignetteVertexShader from '../shaders/postProcessing/vignette.vert.glsl';
import vignetteFragmentShader from '../shaders/postProcessing/vignette.frag.glsl';

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
      maxRGBShift: 0.0055,
      maxCustomAberration: 0.008,
      maxVignette: 1.8,

      baseFOV: this.camera.fov,
      maxFOVChange: 7,

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
      vertexShader: vignetteVertexShader,
      fragmentShader: vignetteFragmentShader,
    };
  }

  setupHUD() {
    this.hudElement = document.querySelector('.slowmo-hud');
    this.progressBar = document.querySelector('.slowmo-progress-bar');
    this.hintElement = document.querySelector('.slowmo-hint');

    if (!this.hudElement || !this.progressBar || !this.hintElement) {
      console.warn('SlowmoEffect: UI elements not found in DOM');
    }
  }

  setupInputHandlers() {
    this.onPointerDown = this.handlePointerDown.bind(this);
    this.onPointerUp = this.handlePointerUp.bind(this);

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
  }

  endHold() {
    this.isHolding = false;
    this.isReleasing = true;
    this.releaseStartTime = performance.now();
    this.releaseProgress = 0;
    this.progressAtRelease = this.progress;
    this.targetTimeScale = 1.0;
  }

  update(deltaTime) {
    if (!this.isInitialized) {
      return 1.0;
    }

    const now = performance.now();
    const rawDelta = deltaTime;

    if (this.isHolding) {
      this.holdElapsed = (now - this.holdStartTime) / 1000;

      if (this.holdElapsed < this.config.holdDelay) {
        this.progress = 0;

        this.hudElement.style.opacity = '0';
      } else {
        this.hudElement.style.opacity = '1';

        const effectiveHoldTime = this.holdElapsed - this.config.holdDelay;
        this.progress = Math.min(
          effectiveHoldTime / this.config.holdDuration,
          1.0
        );
      }

      this.targetTimeScale = this.lerp(
        1.0,
        this.config.minTimeScale,
        this.progress
      );

      this.updateHUDProgress(this.progress);
    } else if (this.isReleasing) {
      const releaseElapsed = (now - this.releaseStartTime) / 1000;
      this.releaseProgress = Math.min(
        releaseElapsed / this.config.releaseEaseDuration,
        1.0
      );

      const eased = 1 - Math.pow(1 - this.releaseProgress, 2);

      this.progress = this.lerp(this.progressAtRelease, 0, eased);

      this.updateHUDProgress(this.progress);

      if (this.releaseProgress >= 1.0) {
        this.isReleasing = false;
        this.progress = 0;
        this.progressAtRelease = 0;
        this.hudElement.style.opacity = '0';

        if (this.audio) {
          this.audio.playbackRate = 1.0;
        }
      }
    } else if (this.progress > 0) {
      this.progress = Math.max(0, this.progress - rawDelta * 2);
      this.updateHUDProgress(this.progress);

      if (this.progress === 0 && this.audio) {
        this.audio.playbackRate = 1.0;
      }
    }

    const lerpFactor = 1 - Math.exp(-this.config.easeK * rawDelta);
    this.currentTimeScale = this.lerp(
      this.currentTimeScale,
      this.targetTimeScale,
      lerpFactor
    );

    this.updateEffects();

    this.updateAudio();

    this.updateCamera();

    return this.currentTimeScale;
  }

  updateEffects() {
    if (this.progress > 0.001) {
      this.afterimagePass.enabled = true;

      let dampValue;
      if (this.isReleasing && this.progress < 0.3) {
        dampValue = this.lerp(0.5, this.config.trailDamp, this.progress / 0.3);
      } else {
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

    const rgbShiftAmount = this.lerp(0, this.config.maxRGBShift, this.progress);
    this.rgbShiftPass.uniforms['amount'].value = rgbShiftAmount;

    if (this.chromaticAberrationPass) {
      const customAberration = this.lerp(
        0,
        this.config.maxCustomAberration,
        this.progress
      );
      this.chromaticAberrationPass.uniforms['uAberration'].value =
        customAberration;
    }

    const vignetteAmount = this.lerp(0, this.config.maxVignette, this.progress);
    this.vignettePass.uniforms['vignetteIntensity'].value = vignetteAmount;
  }

  updateAudio() {
    if (!this.audio) return;

    let targetRate;
    if (this.progress < 0.01) {
      targetRate = 1.0;
    } else {
      targetRate = this.lerp(1.0, this.config.minTimeScale, this.progress);
    }

    try {
      this.audio.playbackRate = targetRate;
      this.audio.preservesPitch = false;
    } catch (e) {
      console.warn('Audio playback rate control not supported');
    }
  }

  updateCamera() {
    const targetFOV =
      this.config.baseFOV + this.config.maxFOVChange * this.progress;
    this.camera.fov = this.lerp(this.camera.fov, targetFOV, 0.1);
    this.camera.updateProjectionMatrix();
  }

  updateHUDProgress(progress) {
    const percentage = Math.max(0, Math.min(100, progress * 100));
    this.progressBar.style.width = `${percentage}%`;
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  dispose() {
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    if (this.hudElement) {
      this.hudElement.style.opacity = '0';
    }

    if (this.progressBar) {
      this.progressBar.style.width = '0%';
    }

    if (this.composer) {
      this.composer.removePass(this.afterimagePass);
      this.composer.removePass(this.rgbShiftPass);
      this.composer.removePass(this.vignettePass);
    }

    if (this.chromaticAberrationPass) {
      this.chromaticAberrationPass.uniforms['uAberration'].value = 0;
    }

    if (this.audio) {
      this.audio.playbackRate = 1.0;
      this.audio.preservesPitch = true;
    }

    this.camera.fov = this.config.baseFOV;
    this.camera.updateProjectionMatrix();
  }
}
