import * as THREE from 'three';

export class MouseManager {
  constructor() {
    this.mousePosition = new THREE.Vector2();
    this.smoothedMousePosition = new THREE.Vector2();
    this.previousMousePosition = new THREE.Vector2();
    this.mouseVelocity = new THREE.Vector2();
    this.hover = 0;

    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener('mousemove', (event) => {
      this.previousMousePosition.copy(this.mousePosition);
      this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
      this.mouseVelocity.subVectors(
        this.mousePosition,
        this.previousMousePosition
      );
    });

    window.addEventListener('mousedown', () => {
      this.hover = 1;
    });

    window.addEventListener('mouseup', () => {
      this.hover = 0;
    });
  }

  update() {
    this.smoothedMousePosition.x = THREE.MathUtils.lerp(
      this.smoothedMousePosition.x,
      this.mousePosition.x,
      0.05
    );
    this.smoothedMousePosition.y = THREE.MathUtils.lerp(
      this.smoothedMousePosition.y,
      this.mousePosition.y,
      0.05
    );

    this.mouseVelocity.multiplyScalar(0.95);
  }
}
