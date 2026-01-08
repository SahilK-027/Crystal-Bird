import * as THREE from 'three';
import vertexShader from '../shaders/bird/vertex.glsl';
import fragmentShader from '../shaders/bird/fragment.glsl';
import crystalVertexShader from '../shaders/crystals/crystal.vert.glsl';
import crystalFragmentShader from '../shaders/crystals/crystal.frag.glsl';

export class CrystallineBranches {
  constructor(scene) {
    this.scene = scene;
    this.mainGroup = new THREE.Group();
    this.crystals = [];
    this.branches = [];
    this.init();
  }

  init() {
    this.createBranchMaterial();
    this.createBranches();
    this.createCrystals();

    this.mainGroup.position.set(0, 0, 0);
    this.mainGroup.matrixAutoUpdate = false;
    this.mainGroup.updateMatrix();
    this.scene.add(this.mainGroup);
  }

  createBranchMaterial() {
    this.branchMaterial = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        uTime: { value: 0.0 },
        uTriScale: { value: 0.7 },
        uMosaic: { value: 27.0 },
        uProgress: { value: 1.0 },
        uMousePosition: { value: new THREE.Vector2(0, 0) },
        uMouseVelocity: { value: new THREE.Vector2(0, 0) },
        uHover: { value: 0.0 },
        uTexture: { value: null },
        uHasTexture: { value: false },
        uGlowColor: { value: new THREE.Color(0x1a3a5c) },
        uAccentColor: { value: new THREE.Color(0x4a90d9) },
      },
    });
  }

  prepareGeometryForShader(geometry) {
    const nonIndexed = geometry.toNonIndexed();
    const position = nonIndexed.attributes.position;
    const centers = new Float32Array(position.count * 3);
    const vertexColors = new Float32Array(position.count * 3);

    for (let i = 0; i < position.count; i += 3) {
      const cx =
        (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3;
      const cy =
        (position.getY(i) + position.getY(i + 1) + position.getY(i + 2)) / 3;
      const cz =
        (position.getZ(i) + position.getZ(i + 1) + position.getZ(i + 2)) / 3;

      for (let j = 0; j < 3; j++) {
        centers[(i + j) * 3] = cx;
        centers[(i + j) * 3 + 1] = cy;
        centers[(i + j) * 3 + 2] = cz;
        vertexColors[(i + j) * 3] = 0.1;
        vertexColors[(i + j) * 3 + 1] = 0.15;
        vertexColors[(i + j) * 3 + 2] = 0.25;
      }
    }

    nonIndexed.setAttribute('center', new THREE.BufferAttribute(centers, 3));
    nonIndexed.setAttribute(
      'vertexColor',
      new THREE.BufferAttribute(vertexColors, 3)
    );
    return nonIndexed;
  }

  createCrystalMaterial(color = 0x4ade80, glowColor = 0x22c55e) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uGlowColor: { value: new THREE.Color(glowColor) },
      },
      vertexShader: crystalVertexShader,
      fragmentShader: crystalFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  createBranches() {
    const branchConfigs = [
      {
        start: { x: -0.55, y: -1.05, z: 0.1 },
        end: { x: -0.8, y: -0.9, z: 0.2 },
        sag: -0.05,
        radius: 0.017,
      },
      {
        start: { x: -0.55, y: -0.85, z: 0.1 },
        end: { x: 0.0, y: -0.5, z: 0.2 },
        sag: -0.055,
        radius: 0.019,
      },
      {
        start: { x: -0.6, y: -0.65, z: 0.2 },
        end: { x: -0.8, y: -0.35, z: 0.25 },
        sag: -0.055,
        radius: 0.019,
      },
    ];

    branchConfigs.forEach((config, index) => {
      const startVec = new THREE.Vector3(
        config.start.x,
        config.start.y,
        config.start.z
      );
      const endVec = new THREE.Vector3(
        config.end.x,
        config.end.y,
        config.end.z
      );
      const midPoint = startVec.clone().lerp(endVec, 0.5);
      midPoint.y += config.sag;

      const curve = new THREE.CatmullRomCurve3([startVec, midPoint, endVec]);
      const branchGeom = new THREE.TubeGeometry(
        curve,
        8,
        config.radius,
        6,
        false
      );
      const preparedGeom = this.prepareGeometryForShader(branchGeom);
      const branch = new THREE.Mesh(preparedGeom, this.branchMaterial);
      this.mainGroup.add(branch);

      this.branches.push({
        index,
        mesh: branch,
        params: {
          startX: config.start.x,
          startY: config.start.y,
          startZ: config.start.z,
          endX: config.end.x,
          endY: config.end.y,
          endZ: config.end.z,
          sag: config.sag,
          radius: config.radius,
        },
      });
    });
  }

  createCrystals() {
    const crystalConfigs = [
      {
        pos: { x: -1.55, y: -0.45, z: 0.6 },
        scale: 0.08,
        rotation: 0.5,
        color: '#08ff40',
      },
      {
        pos: { x: 0.05, y: -0.9, z: 0.4 },
        scale: 0.07,
        rotation: 2.6,
        color: '#52ff63',
      },
      {
        pos: { x: -1.75, y: -1.7, z: 0.4 },
        scale: 0.075,
        rotation: 0.9,
        color: '#4bff5d',
      },
    ];

    crystalConfigs.forEach((config, index) => {
      const material = this.createCrystalMaterial();
      const group = new THREE.Group();

      const mainGeom = new THREE.OctahedronGeometry(1, 0);
      mainGeom.scale(1, 2.5, 1);
      const mainCrystal = new THREE.Mesh(mainGeom, material);
      group.add(mainCrystal);

      for (let i = 0; i < 3; i++) {
        const smallGeom = new THREE.OctahedronGeometry(0.4, 0);
        smallGeom.scale(1, 2, 1);
        const smallCrystal = new THREE.Mesh(smallGeom, material);
        const angle = (i / 3) * Math.PI * 2;
        smallCrystal.position.set(
          Math.cos(angle) * 0.7,
          -0.2,
          Math.sin(angle) * 0.7
        );
        smallCrystal.rotation.z = i * 0.4;
        group.add(smallCrystal);
      }

      group.position.set(config.pos.x, config.pos.y, config.pos.z);
      group.scale.setScalar(config.scale);
      group.rotation.z = config.rotation;
      this.mainGroup.add(group);

      this.crystals.push({
        index,
        group,
        material,
        params: {
          posX: config.pos.x,
          posY: config.pos.y,
          posZ: config.pos.z,
          rotationZ: config.rotation,
          scale: config.scale,
          color: config.color,
        },
      });
    });
  }

  rebuildBranch(index) {
    const branchData = this.branches[index];
    const params = branchData.params;

    this.mainGroup.remove(branchData.mesh);
    branchData.mesh.geometry.dispose();

    const startVec = new THREE.Vector3(
      params.startX,
      params.startY,
      params.startZ
    );
    const endVec = new THREE.Vector3(params.endX, params.endY, params.endZ);
    const midPoint = startVec.clone().lerp(endVec, 0.5);
    midPoint.y += params.sag;

    const curve = new THREE.CatmullRomCurve3([startVec, midPoint, endVec]);
    const branchGeom = new THREE.TubeGeometry(
      curve,
      8,
      params.radius,
      6,
      false
    );
    const preparedGeom = this.prepareGeometryForShader(branchGeom);
    const branch = new THREE.Mesh(preparedGeom, this.branchMaterial);
    this.mainGroup.add(branch);
    branchData.mesh = branch;
  }

  getCrystals() {
    return this.crystals;
  }

  getBranchesData() {
    return this.branches;
  }

  getLeavesGroup() {
    return this.mainGroup;
  }

  getBranches() {
    return this.mainGroup;
  }

  update(elapsedTime) {
    this.crystals.forEach(({ material }) => {
      material.uniforms.uTime.value = elapsedTime;
    });
    this.branchMaterial.uniforms.uTime.value = elapsedTime;
  }
}
