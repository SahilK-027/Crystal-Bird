import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { FlowfieldParticleSystem } from '../particles/FlowfieldParticleSystem.js';

export class ModelLoader {
  constructor(loadingManager, shaderMaterial, scene, renderer) {
    this.shaderMaterial = shaderMaterial;
    this.scene = scene;
    this.renderer = renderer;

    // Setup GLTF loader with DRACO support
    this.gltfLoader = new GLTFLoader(loadingManager);

    this.horseMesh = null;
    this.flowfieldSystem = null;
    this.mixer = null;
    this.animatedScene = null;
  }

  load(modelPath, onComplete) {
    this.gltfLoader.load(
      modelPath,
      (gltf) => {
        console.log('Model loaded. Animations:', gltf.animations.length);
        gltf.animations.forEach((anim, i) => {
          console.log(`Animation ${i}:`, anim.name);
        });

        // Add the animated scene to the Three.js scene
        gltf.scene.position.set(0, -2.0, 0);
        this.scene.add(gltf.scene);
        this.animatedScene = gltf.scene;

        // Setup animation mixer and play animation at index 3
        if (gltf.animations && gltf.animations.length > 24) {
          this.mixer = new THREE.AnimationMixer(gltf.scene);
          const action = this.mixer.clipAction(gltf.animations[24]);
          action.play();
          console.log(
            'Playing animation at index 3:',
            gltf.animations[24].name
          );
        } else if (gltf.animations && gltf.animations.length > 0) {
          // Fallback to first animation if index 3 doesn't exist
          this.mixer = new THREE.AnimationMixer(gltf.scene);
          const action = this.mixer.clipAction(gltf.animations[0]);
          action.play();
          console.log('Playing animation at index 0:', gltf.animations[0].name);
        }

        // Apply shader material to all meshes
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

    // Apply shader material directly to the animated mesh
    child.material = this.shaderMaterial;

    // Enable skinning if this is a SkinnedMesh
    if (child.isSkinnedMesh) {
      this.shaderMaterial.skinning = true;
      console.log('SkinnedMesh detected, skinning enabled');
    }

    // Store reference to the animated mesh and create particle system
    if (!this.horseMesh) {
      this.horseMesh = child;

      // Force update world matrix from root down to ensure position offset is included
      this.scene.updateMatrixWorld(true);

      // Extract vertices directly from the geometry
      const horseVertices = this.extractOuterVertices(child.geometry, child);
      console.log('Extracted vertices:', horseVertices.length);
      if (horseVertices.length > 0) {
        console.log('Sample vertex position:', horseVertices[0]);
        this.flowfieldSystem = new FlowfieldParticleSystem(
          horseVertices,
          this.animatedScene,
          this.scene,
          this.renderer
        );
      } else {
        console.error('No vertices extracted from model!');
      }
    }
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

    if (!posAttr) {
      console.error('No position attribute found in geometry');
      return [];
    }

    console.log('Geometry vertex count:', posAttr.count);
    console.log('Geometry is indexed:', geometry.index !== null);

    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    console.log('Bounding box center:', center);
    console.log('Bounding box size:', size);

    const verticesWithShellScore = [];

    // Get the world matrix including parent transforms
    mesh.updateWorldMatrix(true, false);

    // Handle both indexed and non-indexed geometry
    const indices = geometry.index;
    const vertexCount = indices ? indices.count : posAttr.count;

    for (let i = 0; i < vertexCount; i += 5) {
      const idx = indices ? indices.getX(i) : i;

      const vertex = new THREE.Vector3(
        posAttr.getX(idx),
        posAttr.getY(idx),
        posAttr.getZ(idx)
      );

      const normX = Math.abs((vertex.x - center.x) / (size.x * 0.5 || 1));
      const normY = Math.abs((vertex.y - center.y) / (size.y * 0.5 || 1));
      const normZ = Math.abs((vertex.z - center.z) / (size.z * 0.5 || 1));

      const shellScore = Math.max(normX, normY, normZ);

      // Apply world matrix to get correct world position
      const worldVertex = vertex.clone().applyMatrix4(mesh.matrixWorld);

      verticesWithShellScore.push({ vertex: worldVertex, shellScore });
    }

    verticesWithShellScore.sort((a, b) => b.shellScore - a.shellScore);

    const outerCount = Math.floor(verticesWithShellScore.length * 0.7);
    const horseVertices = verticesWithShellScore
      .slice(0, outerCount)
      .map((v) => v.vertex);

    console.log('Final horse vertices count:', horseVertices.length);

    return horseVertices;
  }

  getFlowfieldSystem() {
    return this.flowfieldSystem;
  }

  update(deltaTime) {
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
  }
}
