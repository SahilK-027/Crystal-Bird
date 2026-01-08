import { Pane } from 'tweakpane';

export class GUIManager {
  constructor(shaderMaterial, postProcessing, flowfieldSystem, sparkleSystem) {
    this.pane = new Pane({ title: 'Controls', expanded: false });

    this.shaderMaterial = shaderMaterial;
    this.postProcessing = postProcessing;
    this.flowfieldSystem = flowfieldSystem;
    this.sparkleSystem = sparkleSystem;
    this.cloudBackground = null;

    this.params = {
      shader: { mosaic: 20.0 },
      colors: { glowColor: '#186dec', accentColor: '#20558d' },
      bloom: { strength: 0.2, radius: 1.0, threshold: 0.8 },
      glow: { intensity: 0.4 },
      chromatic: { aberration: 0.002 },
      filmGrain: { intensity: 0.08 },
      flowfield: {
        strength: 0.65,
        frequency: 1.0,
        influence: 0.95,
        size: 10.0,
        color1: '#6ab7ff',
        color2: '#1672d3',
        color3: '#0a3d6e',
      },
      sparkle: { color: '#ffffff', size: 1.0 },
      clouds: { opacity: 0.3, tint: '#00aaff' },
    };

    this.setupControls();
  }

  setupControls() {
    this.setupShaderControls();
    this.setupColorControls();
    this.setupSparkleControls();
    this.setupBloomControls();
    this.setupGlowControls();
    this.setupChromaticAberrationControls();
    this.setupFilmGrainControls();
  }

  setupShaderControls() {
    const folder = this.pane.addFolder({ title: 'Shader Material' });
    folder
      .addBinding(this.params.shader, 'mosaic', { min: 1, max: 40, step: 0.1 })
      .on('change', (ev) => {
        this.shaderMaterial.material.uniforms.uMosaic.value = ev.value;
      });
  }

  setupColorControls() {
    const folder = this.pane.addFolder({ title: 'Colors' });
    folder
      .addBinding(this.params.colors, 'glowColor', { view: 'color' })
      .on('change', (ev) => {
        this.shaderMaterial.material.uniforms.uGlowColor.value.set(ev.value);
      });
    folder
      .addBinding(this.params.colors, 'accentColor', { view: 'color' })
      .on('change', (ev) => {
        this.shaderMaterial.material.uniforms.uAccentColor.value.set(ev.value);
      });
  }

  setupSparkleControls() {
    const folder = this.pane.addFolder({ title: 'Sparkle Particles' });
    folder
      .addBinding(this.params.sparkle, 'size', { min: 0.1, max: 5, step: 0.1 })
      .on('change', (ev) => {
        this.sparkleSystem.material.uniforms.uSize.value = ev.value;
      });
    folder
      .addBinding(this.params.sparkle, 'color', { view: 'color' })
      .on('change', (ev) => {
        this.sparkleSystem.material.uniforms.uColor.value.set(ev.value);
      });
  }

  setupBloomControls() {
    const folder = this.pane.addFolder({ title: 'Bloom Effect' });
    folder
      .addBinding(this.params.bloom, 'strength', { min: 0, max: 3, step: 0.01 })
      .on('change', (ev) => {
        this.postProcessing.bloomPass.strength = ev.value;
      });
    folder
      .addBinding(this.params.bloom, 'radius', { min: 0, max: 1, step: 0.01 })
      .on('change', (ev) => {
        this.postProcessing.bloomPass.radius = ev.value;
      });
    folder
      .addBinding(this.params.bloom, 'threshold', {
        min: 0,
        max: 1,
        step: 0.01,
      })
      .on('change', (ev) => {
        this.postProcessing.bloomPass.threshold = ev.value;
      });
  }

  setupGlowControls() {
    const folder = this.pane.addFolder({ title: 'Glow Effect' });
    folder
      .addBinding(this.params.glow, 'intensity', {
        min: 0,
        max: 10,
        step: 0.01,
      })
      .on('change', (ev) => {
        this.postProcessing.glowPass.uniforms.uIntensity.value = ev.value;
      });
  }

  setupChromaticAberrationControls() {
    const folder = this.pane.addFolder({ title: 'Chromatic Aberration' });
    folder
      .addBinding(this.params.chromatic, 'aberration', {
        min: 0,
        max: 0.02,
        step: 0.001,
      })
      .on('change', (ev) => {
        this.postProcessing.chromaticAberrationPass.uniforms.uAberration.value =
          ev.value;
      });
  }

  setupFilmGrainControls() {
    const folder = this.pane.addFolder({ title: 'Film Grain' });
    folder
      .addBinding(this.params.filmGrain, 'intensity', {
        min: 0,
        max: 0.3,
        step: 0.01,
      })
      .on('change', (ev) => {
        this.postProcessing.filmGrainPass.uniforms.uIntensity.value = ev.value;
      });
  }

  addFlowfieldControls(flowfieldSystem) {
    if (!flowfieldSystem) return;

    const folder = this.pane.addFolder({ title: 'Flowfield Particles' });

    folder
      .addBinding(this.params.flowfield, 'size', { min: 1, max: 30, step: 0.5 })
      .on('change', (ev) => {
        flowfieldSystem.getMaterial().uniforms.uSize.value = ev.value;
      });
    folder
      .addBinding(this.params.flowfield, 'strength', {
        min: 0,
        max: 2,
        step: 0.01,
      })
      .on('change', (ev) => {
        flowfieldSystem.getUniforms().uStrength.value = ev.value;
      });
    folder
      .addBinding(this.params.flowfield, 'frequency', {
        min: 0.1,
        max: 1,
        step: 0.01,
      })
      .on('change', (ev) => {
        flowfieldSystem.getUniforms().uFrequency.value = ev.value;
      });
    folder
      .addBinding(this.params.flowfield, 'influence', {
        min: 0,
        max: 1,
        step: 0.01,
      })
      .on('change', (ev) => {
        flowfieldSystem.getUniforms().uInfluence.value = ev.value;
      });

    folder
      .addBinding(this.params.flowfield, 'color1', { view: 'color' })
      .on('change', (ev) => {
        flowfieldSystem.getMaterial().uniforms.uColor1.value.set(ev.value);
      });
    folder
      .addBinding(this.params.flowfield, 'color2', { view: 'color' })
      .on('change', (ev) => {
        flowfieldSystem.getMaterial().uniforms.uColor2.value.set(ev.value);
      });
    folder
      .addBinding(this.params.flowfield, 'color3', { view: 'color' })
      .on('change', (ev) => {
        flowfieldSystem.getMaterial().uniforms.uColor3.value.set(ev.value);
      });
  }

  getPane() {
    return this.pane;
  }

  addCloudControls(cloudBackground) {
    if (!cloudBackground) return;
    this.cloudBackground = cloudBackground;

    const folder = this.pane.addFolder({
      title: 'Cloud Background',
      expanded: false,
    });
    folder
      .addBinding(this.params.clouds, 'opacity', { min: 0, max: 1, step: 0.01 })
      .on('change', (ev) => {
        this.cloudBackground.setOpacity(ev.value);
      });
    folder
      .addBinding(this.params.clouds, 'tint', { view: 'color' })
      .on('change', (ev) => {
        this.cloudBackground.setTint(ev.value);
      });
  }

  addTreeControls(crystallineBranches) {
    if (!crystallineBranches) return;

    const branches = crystallineBranches.getBranchesData();
    if (branches && branches.length > 0) {
      const branchFolder = this.pane.addFolder({
        title: 'Branches',
        expanded: false,
      });

      branches.forEach(({ params, index }) => {
        const folder = branchFolder.addFolder({
          title: `Branch ${index + 1}`,
          expanded: false,
        });

        folder
          .addBinding(params, 'startX', {
            min: -2,
            max: 2,
            step: 0.05,
            label: 'Start X',
          })
          .on('change', () => crystallineBranches.rebuildBranch(index));
        folder
          .addBinding(params, 'startY', {
            min: -2,
            max: 2,
            step: 0.05,
            label: 'Start Y',
          })
          .on('change', () => crystallineBranches.rebuildBranch(index));
        folder
          .addBinding(params, 'startZ', {
            min: -2,
            max: 2,
            step: 0.05,
            label: 'Start Z',
          })
          .on('change', () => crystallineBranches.rebuildBranch(index));
        folder
          .addBinding(params, 'endX', {
            min: -2,
            max: 2,
            step: 0.05,
            label: 'End X',
          })
          .on('change', () => crystallineBranches.rebuildBranch(index));
        folder
          .addBinding(params, 'endY', {
            min: -2,
            max: 2,
            step: 0.05,
            label: 'End Y',
          })
          .on('change', () => crystallineBranches.rebuildBranch(index));
        folder
          .addBinding(params, 'endZ', {
            min: -2,
            max: 2,
            step: 0.05,
            label: 'End Z',
          })
          .on('change', () => crystallineBranches.rebuildBranch(index));
        folder
          .addBinding(params, 'sag', {
            min: -0.2,
            max: 0.2,
            step: 0.005,
            label: 'Sag',
          })
          .on('change', () => crystallineBranches.rebuildBranch(index));
        folder
          .addBinding(params, 'radius', {
            min: 0.005,
            max: 0.05,
            step: 0.002,
            label: 'Radius',
          })
          .on('change', () => crystallineBranches.rebuildBranch(index));
      });
    }

    const crystals = crystallineBranches.getCrystals();
    if (crystals && crystals.length > 0) {
      const crystalFolder = this.pane.addFolder({
        title: 'Crystals',
        expanded: false,
      });

      crystals.forEach(({ group, material, params, index }) => {
        const folder = crystalFolder.addFolder({
          title: `Crystal ${index + 1}`,
          expanded: false,
        });

        folder
          .addBinding(params, 'posX', {
            min: -3,
            max: 3,
            step: 0.05,
            label: 'X',
          })
          .on('change', (ev) => {
            group.position.x = ev.value;
          });
        folder
          .addBinding(params, 'posY', {
            min: -3,
            max: 3,
            step: 0.05,
            label: 'Y',
          })
          .on('change', (ev) => {
            group.position.y = ev.value;
          });
        folder
          .addBinding(params, 'posZ', {
            min: -3,
            max: 3,
            step: 0.05,
            label: 'Z',
          })
          .on('change', (ev) => {
            group.position.z = ev.value;
          });
        folder
          .addBinding(params, 'rotationZ', {
            min: 0,
            max: Math.PI * 2,
            step: 0.1,
            label: 'Rotation',
          })
          .on('change', (ev) => {
            group.rotation.z = ev.value;
          });
        folder
          .addBinding(params, 'scale', {
            min: 0.01,
            max: 0.2,
            step: 0.005,
            label: 'Scale',
          })
          .on('change', (ev) => {
            group.scale.setScalar(ev.value);
          });
        folder
          .addBinding(params, 'color', { view: 'color', label: 'Color' })
          .on('change', (ev) => {
            material.uniforms.uColor.value.set(ev.value);
          });
      });
    }
  }
}
