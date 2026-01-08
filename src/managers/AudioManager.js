export class AudioManager {
  constructor(loadingManager) {
    this.loadingManager = loadingManager;
    this.audio = null;
    this.isPlaying = false;
    this.isLoaded = false;

    this.loadAudio();
    this.createMusicButton();
  }

  loadAudio() {
    if (this.loadingManager) {
      this.loadingManager.itemStart('/audio/bgm.mp3');
    }

    this.audio = new Audio();
    this.audio.loop = true;
    this.audio.volume = 0.5;

    this.audio.addEventListener(
      'canplaythrough',
      () => {
        this.isLoaded = true;
        if (this.loadingManager) {
          this.loadingManager.itemEnd('/audio/bgm.mp3');
        }
      },
      { once: true }
    );

    this.audio.addEventListener(
      'error',
      () => {
        console.warn('Audio failed to load');
        if (this.loadingManager) {
          this.loadingManager.itemError('/audio/bgm.mp3');
          this.loadingManager.itemEnd('/audio/bgm.mp3');
        }
      },
      { once: true }
    );

    this.audio.src = '/audio/bgm.mp3';
    this.audio.load();
  }

  createMusicButton() {
    const button = document.createElement('button');
    button.className = 'music-btn';
    button.setAttribute('aria-label', 'Toggle music');
    button.innerHTML = `
      <div class="music-btn-inner">
        <div class="music-bars">
          <span class="bar"></span>
          <span class="bar"></span>
          <span class="bar"></span>
          <span class="bar"></span>
        </div>
        <svg class="play-icon" viewBox="0 0 32 32" fill="none">
          <!-- Music note -->
          <path class="note" d="M12 6v16"/>
          <ellipse class="note-head" cx="8" cy="22" rx="4" ry="3"/>
          <path class="note" d="M12 6l8-2v4l-8 2"/>
          <!-- Sound waves -->
          <path class="wave" d="M22 10c2 1.5 3 4 3 6s-1 4.5-3 6"/>
          <path class="wave" d="M25 7c3 2.5 4.5 6 4.5 9s-1.5 6.5-4.5 9"/>
        </svg>
      </div>
    `;

    button.addEventListener('click', () => this.toggle());
    document.body.appendChild(button);
    this.button = button;
  }

  toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    this.audio
      .play()
      .then(() => {
        this.isPlaying = true;
        this.button.classList.add('playing');
      })
      .catch((err) => {
        console.warn('Audio playback failed:', err);
      });
  }

  pause() {
    this.audio.pause();
    this.isPlaying = false;
    this.button.classList.remove('playing');
  }

  setVolume(value) {
    this.audio.volume = Math.max(0, Math.min(1, value));
  }
}
