import { Asset } from 'expo-asset';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';


let currentPlane: THREE.Object3D | null = null;

export async function MovingPlane(
  scene: THREE.Scene,
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  radius: number
): Promise<void> {
  
  const latLonToVector3 = (lat: number, lon: number, radius: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
  };

  const start = latLonToVector3(from.lat, from.lon, radius + 0.01);
  const end = latLonToVector3(to.lat, to.lon, radius + 0.01);
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5).normalize().multiplyScalar(radius + 0.1);

  const curve = new THREE.CatmullRomCurve3([start, mid, end]);
  const points = curve.getPoints(300);

  const asset = Asset.fromModule(require('../assets/plane_a340.glb'));
  await asset.downloadAsync();

  const loader = new GLTFLoader();

  return new Promise<void>((resolve, reject) => {
    loader.load(
      asset.localUri || asset.uri,
      (gltf) => {
        
        if (currentPlane && currentPlane.parent) {
          currentPlane.parent.remove(currentPlane); // önceki uçağı sahneden kaldırıyor 
          currentPlane = null;
        }

        const plane = gltf.scene;
        plane.scale.set(0.0001, 0.0001, 0.0001);

        const globe = scene.getObjectByName('globeSphere');
        if (globe) {
          globe.add(plane);
        } else {
          scene.add(plane);
        }

        
        currentPlane = plane;

        
        let progress = 0;

        const animate = () => {
          progress += 0.002;
          if (progress > 1) progress = 0;

          const index = Math.floor(progress * (points.length - 1));
          const currentPos = points[index];
          const nextPos = points[Math.min(index + 1, points.length - 1)];

         
          plane.position.copy(currentPos);

          
          const direction = new THREE.Vector3().subVectors(nextPos, currentPos).normalize();
          const modelForward = new THREE.Vector3(1, 0, 0); 
          const lookRotation = new THREE.Quaternion().setFromUnitVectors(modelForward, direction);
          const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(-1, 0, 0), Math.PI / 2);
          const finalRotation = new THREE.Quaternion().multiplyQuaternions(lookRotation, tilt);
          plane.setRotationFromQuaternion(finalRotation);

          
          const peak = 0.5;
          const distanceFromPeak = Math.abs(progress - peak);
          const scaleValue = 0.00001 + (1 - distanceFromPeak * 2) ** 2 * 0.00008;
          plane.scale.set(scaleValue, scaleValue, scaleValue);

          requestAnimationFrame(animate);
        };

        animate();
        resolve();
      },
      undefined,
      (error) => {
        console.error('Uçak yüklenemedi:', error);
        reject(error);
      }
    );
  });
}
