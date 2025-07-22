import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import AirplaneModel from './AirplaneModel';

export default function MovingPlane({ arcPoints }: { arcPoints: THREE.Vector3[] }) {
  const meshRef = useRef<THREE.Group>(null);
  const progress = useRef(0);

  useFrame(() => {
    if (!meshRef.current) return;
    progress.current += 0.002;
    if (progress.current > 1) progress.current = 0;

    const currentIndex = Math.floor(progress.current * (arcPoints.length - 1));
    const currentPos = arcPoints[currentIndex];
    const nextIndex = Math.min(currentIndex + 1, arcPoints.length - 1);
    const nextPos = arcPoints[nextIndex];

    meshRef.current.position.copy(currentPos);

    const direction = new THREE.Vector3().subVectors(nextPos, currentPos).normalize();
    const modelForward = new THREE.Vector3(1, 0, 0);
    const lookRotation = new THREE.Quaternion().setFromUnitVectors(modelForward, direction);
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(-1, 0, 0), Math.PI / 2);
    const finalRotation = new THREE.Quaternion().multiplyQuaternions(lookRotation, tilt);
    meshRef.current.setRotationFromQuaternion(finalRotation);
  });

  return (
    <group ref={meshRef}>
      <AirplaneModel arcPoints={arcPoints} />

    </group>
  );
}
