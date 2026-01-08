import * as THREE from 'three';
import { LoadingScreen } from '../loaders/LoadingScreen.js';

export class LoadingManager {
  constructor(onReady) {
    this.onReady = onReady;
    this.manager = new THREE.LoadingManager();
    this.loadingScreen = null;
    this.totalItems = 0;
    this.loadedItems = 0;
    this.withMusic = false;
    this.assetsLoaded = false;
    this.systemsReady = false;

    this.setupLoadingScreen();
    this.setupCallbacks();
  }

  setupLoadingScreen() {
    this.loadingScreen = new LoadingScreen((withMusic) => {
      this.withMusic = withMusic;
      const oldLoader = document.getElementById('loader');
      if (oldLoader) {
        oldLoader.style.display = 'none';
      }

      if (this.onReady) {
        this.onReady(withMusic);
      }
    });
  }

  setupCallbacks() {
    this.manager.onStart = (url, itemsLoaded, itemsTotal) => {
      this.totalItems = itemsTotal;
      this.loadedItems = itemsLoaded;
      this.updateProgress();
    };

    this.manager.onProgress = (url, itemsLoaded, itemsTotal) => {
      this.totalItems = itemsTotal;
      this.loadedItems = itemsLoaded;
      this.updateProgress();
    };

    this.manager.onLoad = () => {
      this.assetsLoaded = true;
      this.checkIfFullyReady();
    };

    this.manager.onError = (url) => {
      console.error(`Error loading: ${url}`);
    };
  }

  updateProgress() {
    if (this.totalItems > 0) {
      const progress = (this.loadedItems / this.totalItems) * 100;
      this.loadingScreen.updateProgress(progress);
    }
  }

  setReady() {
    this.systemsReady = true;
    this.checkIfFullyReady();
  }

  checkIfFullyReady() {
    if (this.assetsLoaded && this.systemsReady) {
      this.loadingScreen.updateProgress(100);
    }
  }

  get() {
    return this.manager;
  }

  getWithMusic() {
    return this.withMusic;
  }
}
