export class LoadingScreen {
  constructor(onStart) {
    this.onStart = onStart;
    this.progress = 0;
    this.isReady = false;
    this.container = null;
    
    this.createDOM();
  }

  createDOM() {
    this.container = document.createElement('div');
    this.container.id = 'crystal-loader';
    this.container.innerHTML = `
      <div class="crystal-loader-background"></div>
      <div class="crystal-loader-content">
        <div class="crystal-text">
          <span class="crystal-letter" style="--delay: 0">C</span>
          <span class="crystal-letter" style="--delay: 1">r</span>
          <span class="crystal-letter" style="--delay: 2">y</span>
          <span class="crystal-letter" style="--delay: 3">s</span>
          <span class="crystal-letter" style="--delay: 4">t</span>
          <span class="crystal-letter" style="--delay: 5">a</span>
          <span class="crystal-letter" style="--delay: 6">l</span>
          <span class="crystal-letter space" style="--delay: 7">&nbsp;</span>
          <span class="crystal-letter" style="--delay: 8">B</span>
          <span class="crystal-letter" style="--delay: 9">i</span>
          <span class="crystal-letter" style="--delay: 10">r</span>
          <span class="crystal-letter" style="--delay: 11">d</span>
        </div>
        <div class="crystal-loader-progress">
          <div class="crystal-loader-progress-bar"></div>
          <div class="crystal-loader-progress-text">0%</div>
        </div>
        <div class="crystal-loader-buttons">
          <button class="crystal-btn crystal-btn-music" disabled>
            <span class="crystal-btn-icon">♪</span>
            Explore with Music
          </button>
          <button class="crystal-btn crystal-btn-silent" disabled>
            <span class="crystal-btn-icon">◇</span>
            Explore without Music
          </button>
        </div>
      </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = this.getStyles();
    document.head.appendChild(style);
    document.body.appendChild(this.container);
    
    this.progressBar = this.container.querySelector('.crystal-loader-progress-bar');
    this.progressText = this.container.querySelector('.crystal-loader-progress-text');
    this.btnMusic = this.container.querySelector('.crystal-btn-music');
    this.btnSilent = this.container.querySelector('.crystal-btn-silent');
    
    this.btnMusic.addEventListener('click', () => this.startExperience(true));
    this.btnSilent.addEventListener('click', () => this.startExperience(false));
  }

  getStyles() {
    return `
      #crystal-loader {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: radial-gradient(ellipse at center, #0b1a22 0%, #050810 100%);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transition: opacity 0.8s ease, visibility 0.8s ease;
      }
      
      #crystal-loader.hidden {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
      }
      
      .crystal-loader-background {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: 
          radial-gradient(circle at 20% 50%, rgba(106, 183, 255, 0.03) 0%, transparent 50%),
          radial-gradient(circle at 80% 50%, rgba(147, 197, 253, 0.02) 0%, transparent 50%);
        animation: bgPulse 8s ease-in-out infinite;
      }
      
      @keyframes bgPulse {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }
      
      .crystal-loader-content {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 60px;
      }
      
      .crystal-text {
        font-family: 'Inter', sans-serif;
        font-size: clamp(48px, 10vw, 80px);
        font-weight: 200;
        letter-spacing: 0.15em;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .crystal-letter {
        display: inline-block;
        color: #ffffffd1;
        text-shadow: 
          0 0 10px rgba(106, 183, 255, 0.6),
          0 0 20px rgba(106, 183, 255, 0.4),
          0 0 30px rgba(106, 183, 255, 0.2);
      }
      
      .crystal-letter.space {
        width: 0.3em;
      }
      
      .crystal-loader-progress {
        width: 280px;
      }
      
      .crystal-loader-progress-bar {
        height: 2px;
        background: rgba(255, 255, 255, 0.15);
        border-radius: 2px;
        position: relative;
        overflow: hidden;
      }
      
      .crystal-loader-progress-bar::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: var(--progress, 0%);
        background: linear-gradient(90deg, #ffffffff, #d9ebffff);
        box-shadow: 0 0 15px rgba(106, 183, 255, 0.5);
        transition: width 0.3s ease;
      }
      
      .crystal-loader-progress-text {
        text-align: center;
        margin-top: 12px;
        font-size: 11px;
        letter-spacing: 3px;
        color: rgba(243, 243, 243, 0.7);
        font-weight: 300;
      }
      
      .crystal-loader-buttons {
        display: flex;
        gap: 20px;
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.6s ease, transform 0.6s ease;
      }
      
      .crystal-loader-buttons.visible {
        opacity: 1;
        transform: translateY(0);
      }
      
      .crystal-btn {
        padding: 14px 28px;
        border: 1px solid rgba(106, 183, 255, 0.3);
        background: rgba(106, 183, 255, 0.05);
        color: rgba(255, 255, 255, 0.9);
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        font-weight: 400;
        letter-spacing: 0.5px;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .crystal-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
      
      .crystal-btn:not(:disabled):hover {
        background: rgba(106, 183, 255, 0.15);
        border-color: rgba(106, 183, 255, 0.6);
        box-shadow: 0 0 30px rgba(106, 183, 255, 0.2);
        transform: translateY(-2px);
      }
      
      .crystal-btn:not(:disabled):active {
        transform: translateY(0);
      }
      
      .crystal-btn-icon {
        font-size: 16px;
        opacity: 0.8;
      }
      
      .crystal-btn-music:not(:disabled) {
        border-color: rgba(106, 183, 255, 0.5);
      }
      
      @media (max-width: 600px) {
        .crystal-loader-buttons {
          flex-direction: column;
          gap: 12px;
        }
        
        .crystal-btn {
          padding: 12px 24px;
          font-size: 12px;
        }
        
        .crystal-loader-progress {
          width: 220px;
        }
        
        .crystal-loader-content {
          gap: 40px;
        }
      }
    `;
  }

  updateProgress(progress) {
    this.progress = Math.min(progress, 100);
    this.progressBar.style.setProperty('--progress', `${this.progress}%`);
    this.progressText.textContent = `${Math.round(this.progress)}%`;
    
    if (this.progress >= 100 && !this.isReady) {
      this.isReady = true;
      this.showButtons();
    }
  }

  showButtons() {
    this.btnMusic.disabled = false;
    this.btnSilent.disabled = false;
    this.container.querySelector('.crystal-loader-buttons').classList.add('visible');
  }

  startExperience(withMusic) {
    this.container.classList.add('hidden');
    
    setTimeout(() => {
      this.dispose();
      if (this.onStart) {
        this.onStart(withMusic);
      }
    }, 800);
  }

  dispose() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
