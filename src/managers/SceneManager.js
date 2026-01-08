import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      lastResizeTime: 0,
      throttleDelay: 300,
      resizeTimeout: null,
    };

    this.setupCamera();
    this.setupRenderer();
    this.setupControls();
    this.updateCameraForAspectRatio();
    this.setupResizeHandler();
  }

  setupCamera() {
    this.idealRatio = 16 / 9;
    this.ratioOverflow = 0;
    this.initialCameraPosition = new THREE.Vector3(1.4, 0.5, 3.5);
    this.baseMaxDistance = 5;

    this.parallaxAmplitude = 0.2;
    this.parallaxEasingSpeed = 10;

    this.cameraGroup = new THREE.Group();
    this.scene.add(this.cameraGroup);

    this.camera = new THREE.PerspectiveCamera(
      75,
      this.sizes.width / this.sizes.height,
      0.1,
      100
    );
    this.camera.position.copy(this.initialCameraPosition);
    this.cameraGroup.add(this.camera);
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(this.sizes.pixelRatio);
  }

  setupControls() {
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.enableZoom = true;
    this.controls.enableRotate = true;
    this.controls.maxDistance = this.baseMaxDistance;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.minPolarAngle = Math.PI / 5;
    this.controls.minDistance = 3;
  }

  updateCameraForAspectRatio() {
    const currentRatio = this.sizes.width / this.sizes.height;
    this.ratioOverflow = Math.max(1, this.idealRatio / currentRatio) - 1;

    const baseDistance = this.initialCameraPosition.length();
    const additionalDistance = baseDistance * this.ratioOverflow * 0.5;
    const direction = this.initialCameraPosition.clone().normalize();
    const newDistance = baseDistance + additionalDistance;

    const adjustedPosition = direction.multiplyScalar(newDistance);
    this.camera.position.copy(adjustedPosition);

    this.controls.maxDistance = Math.max(this.baseMaxDistance, newDistance);
  }

  handleResize() {
    this.sizes.width = window.innerWidth;
    this.sizes.height = window.innerHeight;
    this.sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

    this.camera.aspect = this.sizes.width / this.sizes.height;
    this.camera.updateProjectionMatrix();

    this.updateCameraForAspectRatio();

    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(this.sizes.pixelRatio);
  }

  setupResizeHandler() {
    const handleResizeThrottled = () => {
      const now = Date.now();
      const timeSinceLastResize = now - this.sizes.lastResizeTime;

      if (this.sizes.resizeTimeout) {
        clearTimeout(this.sizes.resizeTimeout);
      }

      if (timeSinceLastResize >= this.sizes.throttleDelay) {
        this.handleResize();
        this.sizes.lastResizeTime = now;
      } else {
        this.sizes.resizeTimeout = setTimeout(() => {
          this.handleResize();
          this.sizes.lastResizeTime = Date.now();
        }, this.sizes.throttleDelay - timeSinceLastResize);
      }
    };

    window.addEventListener('resize', handleResizeThrottled);
  }

  update(mouseManager, deltaTime) {
    this.controls.update();

    if (mouseManager && deltaTime) {
      const parallaxX =
        mouseManager.smoothedMousePosition.x * this.parallaxAmplitude;
      const parallaxY =
        -mouseManager.smoothedMousePosition.y * this.parallaxAmplitude;

      this.cameraGroup.position.x +=
        (parallaxX - this.cameraGroup.position.x) *
        this.parallaxEasingSpeed *
        deltaTime;
      this.cameraGroup.position.y +=
        (parallaxY - this.cameraGroup.position.y) *
        this.parallaxEasingSpeed *
        deltaTime;
    }
  }
}
