export class LoadingScreen {
  constructor(onStart) {
    this.onStart = onStart;
    this.progress = 0;
    this.isReady = false;
    
    this.initElements();
  }

  initElements() {
    this.container = document.getElementById('crystal-loader');
    this.progressBar = this.container.querySelector('.crystal-loader-progress-bar');
    this.progressText = this.container.querySelector('.crystal-loader-progress-text');
    this.hintText = this.container.querySelector('.crystal-loader-hint');
    this.btnMusic = this.container.querySelector('.crystal-btn-music');
    this.btnSilent = this.container.querySelector('.crystal-btn-silent');
    
    this.btnMusic.addEventListener('click', () => this.startExperience(true));
    this.btnSilent.addEventListener('click', () => this.startExperience(false));
  }

  updateProgress(progress) {
    this.progress = Math.min(progress, 100);
    this.progressBar.style.setProperty('--progress', `${this.progress}%`);
    this.progressText.textContent = `${Math.round(this.progress)}%`;
    
    if (this.progress >= 100 && !this.isReady) {
      this.isReady = true;
      this.hintText.textContent = 'Ready to explore';
      this.showButtons();
    }
  }

  showButtons() {
    this.btnMusic.disabled = false;
    this.btnSilent.disabled = false;
    this.container.querySelector('.crystal-loader-buttons').classList.add('visible');
  }

  startExperience(withMusic) {
    // Disable buttons to prevent double-clicks
    this.btnMusic.disabled = true;
    this.btnSilent.disabled = true;
    
    // Start fade out transition immediately
    this.container.classList.add('hidden');
    
    // Call onStart immediately - everything is already initialized
    if (this.onStart) {
      this.onStart(withMusic);
    }
    
    // Remove DOM element after transition completes
    setTimeout(() => {
      this.dispose();
    }, 850);
  }

  dispose() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
