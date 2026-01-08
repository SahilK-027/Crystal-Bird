import { ThreePerf } from 'three-perf';
import Stats from 'three/examples/jsm/libs/stats.module.js';

export class PerformanceMonitor {
  constructor(renderer, pane) {
    this.renderer = renderer;
    this.pane = pane;
    this.enabled =
      new URLSearchParams(window.location.search).get('mode') === 'debug';

    this.metrics = {
      fps: 0,
      frameTime: 0,
      memory: 0,
      drawCalls: 0,
      triangles: 0,
      showGraph: false,
    };

    if (!this.enabled) return;

    this.threePerf = new ThreePerf({
      domElement: document.body,
      renderer: this.renderer,
      showGraph: false,
      memory: true,
      anchorX: 'right',
      anchorY: 'bottom',
    });

    this.stats = new Stats();
    this.stats.dom.style.top = 'auto';
    this.stats.dom.style.left = 'auto';
    this.stats.dom.style.right = '0px';
    this.stats.dom.style.bottom = '70px';
    document.body.append(this.stats.dom);

    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fpsUpdateInterval = 500;
    this.lastFpsUpdate = 0;

    this.initPane();
  }

  initPane() {
    if (!this.pane) return;

    const folder = this.pane.addFolder({ title: 'Performance' });
    folder.addBinding(this.metrics, 'fps', { readonly: true, label: 'FPS' });
    folder.addBinding(this.metrics, 'frameTime', {
      readonly: true,
      label: 'Frame Time (ms)',
    });
    folder.addBinding(this.metrics, 'drawCalls', {
      readonly: true,
      label: 'Draw Calls',
    });
    folder.addBinding(this.metrics, 'triangles', {
      readonly: true,
      label: 'Triangles',
    });

    if (performance.memory) {
      folder.addBinding(this.metrics, 'memory', {
        readonly: true,
        label: 'Memory (MB)',
      });
    }

    folder
      .addBinding(this.metrics, 'showGraph', { label: 'Show Perf Graph' })
      .on('change', (ev) => {
        this.threePerf.showGraph = ev.value;
      });
  }

  beginFrame() {
    if (!this.enabled) return;
    if (this.threePerf.enabled) this.threePerf.begin();
  }

  endFrame() {
    if (!this.enabled) return;
    if (this.threePerf.enabled) this.threePerf.end();
    this.stats.update();
    this.updateMetrics();
  }

  updateMetrics() {
    const now = performance.now();
    this.frameCount++;

    if (now - this.lastFpsUpdate >= this.fpsUpdateInterval) {
      const elapsed = now - this.lastFpsUpdate;
      this.metrics.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.metrics.frameTime = parseFloat(
        (elapsed / this.frameCount).toFixed(2)
      );
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    const info = this.renderer.info;
    this.metrics.drawCalls = info.render.calls;
    this.metrics.triangles = info.render.triangles;

    if (performance.memory) {
      this.metrics.memory = Math.round(
        performance.memory.usedJSHeapSize / 1048576
      );
    }
  }
}
