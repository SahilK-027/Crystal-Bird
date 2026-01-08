import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FlowfieldParticleSystem } from '../particles/FlowfieldParticleSystem.js';

export class ModelLoader {
  constructor(loadingManager, shaderMaterial, scene, renderer) {
    this.shaderMaterial = shaderMaterial;
    this.scene = scene;
    this.renderer = renderer;

    this.gltfLoader = new GLTFLoader(loadingManager);

    this.birdMesh = null;
    this.flowfieldSystem = null;
  }

  load(modelPath, onComplete) {
    this.gltfLoader.load(
      modelPath,
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            this.processMesh(child);
          }
        });
        if (onComplete) onComplete(this.flowfieldSystem);
      },
      undefined,
      (error) => {
        console.error('An error occurred:', error);
      }
    );
  }

  processMesh(child) {
    const originalMaterial = child.material;
    if (originalMaterial && originalMaterial.map) {
      this.shaderMaterial.uniforms.uTexture.value = originalMaterial.map;
      this.shaderMaterial.uniforms.uHasTexture.value = true;
    }

    let geometry = child.geometry;
    geometry = geometry.toNonIndexed();
    geometry.center();

    this.addCenterAttribute(geometry);
    this.addVertexColorAttribute(geometry);

    const mesh = new THREE.Mesh(geometry, this.shaderMaterial);
    mesh.position.set(0, -0.2, 0);
    this.scene.add(mesh);

    this.birdMesh = mesh;
    mesh.updateMatrixWorld(true);

    const birdVertices = this.extractOuterVertices(geometry, mesh);
    this.flowfieldSystem = new FlowfieldParticleSystem(
      birdVertices,
      mesh,
      this.scene,
      this.renderer
    );
  }


  addCenterAttribute(geometry) {
    const positionAttribute = geometry.getAttribute('position');
    const centers = new Float32Array(positionAttribute.count * 3);

    for (let i = 0; i < positionAttribute.count; i += 3) {
      const centerX =
        (positionAttribute.getX(i) +
          positionAttribute.getX(i + 1) +
          positionAttribute.getX(i + 2)) /
        3;
      const centerY =
        (positionAttribute.getY(i) +
          positionAttribute.getY(i + 1) +
          positionAttribute.getY(i + 2)) /
        3;
      const centerZ =
        (positionAttribute.getZ(i) +
          positionAttribute.getZ(i + 1) +
          positionAttribute.getZ(i + 2)) /
        3;

      centers.set([centerX, centerY, centerZ], i * 3);
      centers.set([centerX, centerY, centerZ], (i + 1) * 3);
      centers.set([centerX, centerY, centerZ], (i + 2) * 3);
    }

    geometry.setAttribute('center', new THREE.BufferAttribute(centers, 3));
  }

  addVertexColorAttribute(geometry) {
    const positionAttribute = geometry.getAttribute('position');
    let colorAttribute = geometry.getAttribute('color');

    const vertexColors = new Float32Array(positionAttribute.count * 3);

    if (colorAttribute) {
      for (let i = 0; i < positionAttribute.count; i++) {
        vertexColors[i * 3] = colorAttribute.getX(i);
        vertexColors[i * 3 + 1] = colorAttribute.getY(i);
        vertexColors[i * 3 + 2] = colorAttribute.getZ(i);
      }
    } else {
      for (let i = 0; i < positionAttribute.count; i++) {
        vertexColors[i * 3] = 1.0;
        vertexColors[i * 3 + 1] = 0.0;
        vertexColors[i * 3 + 2] = 0.0;
      }
    }

    geometry.setAttribute(
      'vertexColor',
      new THREE.BufferAttribute(vertexColors, 3)
    );
  }

  extractOuterVertices(geometry, mesh) {
    const posAttr = geometry.getAttribute('position');
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    const verticesWithShellScore = [];

    for (let i = 0; i < posAttr.count; i += 5) {
      const vertex = new THREE.Vector3(
        posAttr.getX(i),
        posAttr.getY(i),
        posAttr.getZ(i)
      );

      const normX = Math.abs((vertex.x - center.x) / (size.x * 0.5));
      const normY = Math.abs((vertex.y - center.y) / (size.y * 0.5));
      const normZ = Math.abs((vertex.z - center.z) / (size.z * 0.5));

      const shellScore = Math.max(normX, normY, normZ);
      const worldVertex = vertex.clone().applyMatrix4(mesh.matrixWorld);

      verticesWithShellScore.push({ vertex: worldVertex, shellScore });
    }

    verticesWithShellScore.sort((a, b) => b.shellScore - a.shellScore);

    const outerCount = Math.floor(verticesWithShellScore.length * 0.7);
    const birdVertices = verticesWithShellScore
      .slice(0, outerCount)
      .map((v) => v.vertex);

    return birdVertices;
  }

  getFlowfieldSystem() {
    return this.flowfieldSystem;
  }
}
