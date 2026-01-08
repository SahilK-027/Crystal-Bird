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
    // Required options
    this.composer = options.composer;
    this.camera = options.camera;
    this.audio = options.audio;
    this.renderer = options.renderer;
    
    // Optional: custom chromatic aberration pass to control
    this.chromaticAberrationPass = options.chromaticAberrationPass || null;

    // Configuration
    this.config = {
      holdDelay: 0.25,               // Delay before effect starts
      holdDuration: 3.0,            // Time to ramp from 0 to full (after delay)
      minTimeScale: 0.3,            // Minimum time scale at full effect
      easeK: 8.0,                   // Exponential smoothing factor
      releaseEaseDuration: 0.8,     // Release ease-out duration (longer for smoother fade)
      
      // Post-processing parameters
      defaultDamp: 0.96,            // Default afterimage damp
      trailDamp: 0.7,               // Afterimage damp during slowmo
      maxRGBShift: 0.005,           // Max RGB shift (subtle)
      maxCustomAberration: 0.008,   // Max custom chromatic aberration (if pass provided)
      maxVignette: 1.8,             // Max vignette intensity
      
      // Camera effect
      baseFOV: this.camera.fov,
      maxFOVChange: 5,             // FOV change during effect (positive = zoom out)
      
      ...options.config
    };

    // State
    this.isHolding = false;
    this.holdStartTime = 0;
    this.holdElapsed = 0;
    this.progress = 0;
    this.progressAtRelease = 0;     // Store progress when releasing for smooth lerp
    
    this.targetTimeScale = 1.0;
    this.currentTimeScale = 1.0;
    
    this.releaseStartTime = 0;
    this.releaseProgress = 0;
    this.isReleasing = false;
    
    this.originalAudioRate = 1.0;

    this.init();
  }

  init() {
    this.setupPostProcessing();
    
    // Defer HUD and input setup across multiple frames to avoid blocking
    requestAnimationFrame(() => {
      this.setupInputHandlers();
      
      // Defer HUD creation to next frame (it's heavier due to DOM manipulation)
      requestAnimationFrame(() => {
        this.setupHUD();
      });
    });
  }

  setupPostProcessing() {
    // Insert passes at the END of the pipeline (after all existing effects)
    // This ensures slowmo effects don't interfere with bloom/glow
    
    // Create afterimage pass for motion blur (disabled by default)
    this.afterimagePass = new AfterimagePass(this.config.defaultDamp);
    this.afterimagePass.enabled = false; // Start disabled to avoid affecting existing effects
    this.composer.addPass(this.afterimagePass);

    // Create RGB shift pass for chromatic aberration (subtle effect)
    this.rgbShiftPass = new ShaderPass(RGBShiftShader);
    this.rgbShiftPass.uniforms['amount'].value = 0;
    this.composer.addPass(this.rgbShiftPass);

    // Create vignette pass
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
      `
    };
  }

  setupHUD() {
    // Create HUD container
    this.hudElement = document.createElement('div');
    this.hudElement.className = 'slowmo-hud';
    this.hudElement.style.cssText = `
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      opacity: 0;
      transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
      z-index: 1000;
    `;

    // Create linear progress bar
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
      position: relative;
      width: 280px;
      height: 4px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 2px;
      overflow: hidden;
      box-shadow: 0 0 20px rgba(106, 183, 255, 0.1);
    `;

    // Progress bar fill
    this.progressBar = document.createElement('div');
    this.progressBar.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, 
        rgba(59, 130, 246, 1) 0%, 
        rgba(106, 183, 255, 1) 50%,
        rgba(147, 197, 253, 1) 100%
      );
      border-radius: 2px;
      transition: width 0.05s linear;
      box-shadow: 0 0 16px rgba(106, 183, 255, 0.8),
                  0 0 32px rgba(106, 183, 255, 0.4);
    `;

    progressContainer.appendChild(this.progressBar);

    this.hudElement.appendChild(progressContainer);
    document.body.appendChild(this.hudElement);

    // Create keyboard hint (always visible)
    this.createKeyboardHint();
  }

  createKeyboardHint() {
    this.hintElement = document.createElement('div');
    this.hintElement.style.cssText = `
      position: fixed;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 20px;
      background: rgba(5, 8, 16, 0.85);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(106, 183, 255, 0.2);
      border-radius: 24px;
      color: rgba(255, 255, 255, 0.9);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      font-weight: 400;
      letter-spacing: 0.4px;
      opacity: 0;
      pointer-events: none;
      z-index: 1000;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(106, 183, 255, 0.1) inset;
      animation: hintFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.5s;
    `;

    const kbd = document.createElement('kbd');
    kbd.textContent = 'SPACE';
    kbd.style.cssText = `
      padding: 4px 10px;
      background: rgba(106, 183, 255, 0.12);
      border: 1px solid rgba(106, 183, 255, 0.3);
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      color: rgba(106, 183, 255, 1);
      box-shadow: 0 2px 8px rgba(106, 183, 255, 0.2);
      font-family: 'Inter', monospace;
      letter-spacing: 0.5px;
    `;

    const divider = document.createElement('span');
    divider.textContent = 'or';
    divider.style.cssText = `
      color: rgba(255, 255, 255, 0.4);
      font-size: 11px;
      font-weight: 400;
    `;

    this.hintElement.appendChild(document.createTextNode('Press '));
    this.hintElement.appendChild(kbd);
    this.hintElement.appendChild(document.createTextNode(' '));
    this.hintElement.appendChild(divider);
    this.hintElement.appendChild(document.createTextNode(' hold mouse to dive'));
    document.body.appendChild(this.hintElement);

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes hintFadeIn {
        0% { 
          opacity: 0; 
          transform: translateX(-50%) translateY(10px) scale(0.95); 
        }
        100% { 
          opacity: 1; 
          transform: translateX(-50%) translateY(0) scale(1); 
        }
      }
      
      @keyframes pulse-glow {
        0%, 100% { 
          opacity: 0.6;
          transform: scale(1);
        }
        50% { 
          opacity: 1;
          transform: scale(1.05);
        }
      }
    `;
    document.head.appendChild(style);
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
    this.progressAtRelease = this.progress;  // Store current progress for smooth lerp
    this.targetTimeScale = 1.0;
  }

  update(deltaTime) {
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
        this.progress = Math.min(effectiveHoldTime / this.config.holdDuration, 1.0);
      }
      
      // Update target time scale
      this.targetTimeScale = this.lerp(1.0, this.config.minTimeScale, this.progress);
      
      // Update HUD progress
      this.updateHUDProgress(this.progress);
    } else if (this.isReleasing) {
      // Ease out release over 1.2s with gentler easing
      const releaseElapsed = (now - this.releaseStartTime) / 1000;
      this.releaseProgress = Math.min(releaseElapsed / this.config.releaseEaseDuration, 1.0);
      
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
    this.currentTimeScale = this.lerp(this.currentTimeScale, this.targetTimeScale, lerpFactor);

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
        dampValue = this.lerp(this.config.defaultDamp, this.config.trailDamp, this.progress);
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
      const customAberration = this.lerp(0, this.config.maxCustomAberration, this.progress);
      this.chromaticAberrationPass.uniforms['uAberration'].value = customAberration;
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
    const targetFOV = this.config.baseFOV + (this.config.maxFOVChange * this.progress);
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

    // Remove HUD
    if (this.hudElement && this.hudElement.parentNode) {
      this.hudElement.parentNode.removeChild(this.hudElement);
    }
    
    // Remove hint
    if (this.hintElement && this.hintElement.parentNode) {
      this.hintElement.parentNode.removeChild(this.hintElement);
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
