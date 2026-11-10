import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CAMERA } from '../config.js';
import { groundHeight } from '../world/terrain.js';

/**
 * Cámara en tercera persona: sigue al personaje y se orbita arrastrando
 * (ratón o un dedo); la rueda o el pellizco acercan y alejan.
 * @param {THREE.PerspectiveCamera} camera
 * @param {HTMLElement} domElement Canvas del renderer.
 * @param {THREE.Vector3} target Posición del personaje (se lee en cada frame).
 * @returns {{ update: () => void }}
 */
export function createFollowCamera(camera, domElement, target) {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = CAMERA.minDistance;
  controls.maxDistance = CAMERA.maxDistance;
  controls.minPolarAngle = Math.PI * 0.18;
  controls.maxPolarAngle = Math.PI * 0.5;

  const focus = new THREE.Vector3();
  const delta = new THREE.Vector3();

  controls.target.set(target.x, target.y + CAMERA.targetHeight, target.z);
  camera.position.set(
    target.x + CAMERA.offset.x,
    target.y + CAMERA.offset.y,
    target.z + CAMERA.offset.z
  );
  controls.update();

  return {
    update() {
      // Mover cámara y objetivo lo mismo que se movió el personaje
      focus.set(target.x, target.y + CAMERA.targetHeight, target.z);
      delta.subVectors(focus, controls.target);
      camera.position.add(delta);
      controls.target.copy(focus);
      controls.update();

      // Que la cámara no se meta bajo el terreno
      const minY = groundHeight(camera.position.x, camera.position.z) + 1;
      if (camera.position.y < minY) camera.position.y = minY;
    },
  };
}
