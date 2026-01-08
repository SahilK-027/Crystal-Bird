import * as THREE from 'three';

export class LoadingManager {
  constructor() {
    this.manager = new THREE.LoadingManager();
    this.setupCallbacks();
  }

  setupCallbacks() {
    this.manager.onStart = () => {
      const loader = document.getElementById('loader');
      if (loader) loader.style.display = 'flex';
    };

    this.manager.onLoad = () => {
      const loader = document.getElementById('loader');
      if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => (loader.style.display = 'none'), 600);
      }
    };

    this.manager.onError = (url) => {
      console.error(`Error loading: ${url}`);
    };
  }

  get() {
    return this.manager;
  }
}
