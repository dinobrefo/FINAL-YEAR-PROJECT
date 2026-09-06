import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export interface ProceduralAmbulanceProps {
  scale?: number;
}

export const ProceduralAmbulance: React.FC<ProceduralAmbulanceProps> = ({ scale = 1 }) => {
  const redStrobeRef = useRef<THREE.MeshStandardMaterial>(null);
  const blueStrobeRef = useRef<THREE.MeshStandardMaterial>(null);
  const redPointRef = useRef<THREE.PointLight>(null);
  const bluePointRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 5.5;
    const isRedPhase = Math.sin(t) > 0;

    if (redStrobeRef.current) {
      redStrobeRef.current.emissiveIntensity = isRedPhase ? 4.0 : 0.15;
    }
    if (blueStrobeRef.current) {
      blueStrobeRef.current.emissiveIntensity = !isRedPhase ? 4.0 : 0.15;
    }
    if (redPointRef.current) {
      redPointRef.current.intensity = isRedPhase ? 3.5 : 0.1;
    }
    if (bluePointRef.current) {
      bluePointRef.current.intensity = !isRedPhase ? 3.5 : 0.1;
    }
  });

  return (
    <group scale={scale} position={[0, 0, 0]}>
      {/* 1. Main Ambulance Body (Lower Cargo + Cabin) */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 1.1, 1.5]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.2} metalness={0.05} />
      </mesh>

      {/* 2. Top Cabin / High Roof Section */}
      <mesh position={[-0.2, 1.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.6, 1.46]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.2} metalness={0.05} />
      </mesh>

      {/* 3. Front Hood Slope */}
      <mesh position={[1.4, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.6, 1.44]} />
        <meshStandardMaterial color="#F1F5F9" roughness={0.2} metalness={0.1} />
      </mesh>

      {/* 4. Windshield & Cabin Glass */}
      <mesh position={[1.15, 1.05, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.08, 0.6, 1.36]} />
        <meshStandardMaterial color="#0A1120" roughness={0.1} metalness={0.9} />
      </mesh>

      {/* Side Cabin Windows */}
      <mesh position={[0.7, 1.05, 0.76]}>
        <boxGeometry args={[0.7, 0.45, 0.02]} />
        <meshStandardMaterial color="#0A1120" roughness={0.1} metalness={0.9} />
      </mesh>
      <mesh position={[0.7, 1.05, -0.76]}>
        <boxGeometry args={[0.7, 0.45, 0.02]} />
        <meshStandardMaterial color="#0A1120" roughness={0.1} metalness={0.9} />
      </mesh>

      {/* Rear Patient Compartment Windows */}
      <mesh position={[-0.4, 1.15, 0.76]}>
        <boxGeometry args={[1.2, 0.35, 0.02]} />
        <meshStandardMaterial color="#0A1120" roughness={0.1} metalness={0.9} />
      </mesh>
      <mesh position={[-0.4, 1.15, -0.76]}>
        <boxGeometry args={[1.2, 0.35, 0.02]} />
        <meshStandardMaterial color="#0A1120" roughness={0.1} metalness={0.9} />
      </mesh>

      {/* 5. Signature Emergency Red Stripe Belts */}
      <mesh position={[0, 0.65, 0.76]}>
        <boxGeometry args={[3.22, 0.22, 0.02]} />
        <meshStandardMaterial color="#EF4444" roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.65, -0.76]}>
        <boxGeometry args={[3.22, 0.22, 0.02]} />
        <meshStandardMaterial color="#EF4444" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Red Cross Emblem on Sides */}
      <group position={[-0.3, 1.05, 0.765]}>
        <mesh>
          <boxGeometry args={[0.3, 0.1, 0.01]} />
          <meshStandardMaterial color="#EF4444" />
        </mesh>
        <mesh>
          <boxGeometry args={[0.1, 0.3, 0.01]} />
          <meshStandardMaterial color="#EF4444" />
        </mesh>
      </group>
      <group position={[-0.3, 1.05, -0.765]}>
        <mesh>
          <boxGeometry args={[0.3, 0.1, 0.01]} />
          <meshStandardMaterial color="#EF4444" />
        </mesh>
        <mesh>
          <boxGeometry args={[0.1, 0.3, 0.01]} />
          <meshStandardMaterial color="#EF4444" />
        </mesh>
      </group>

      {/* 6. Roof Emergency Lightbar */}
      <group position={[0.7, 1.82, 0]}>
        <mesh>
          <boxGeometry args={[0.3, 0.1, 1.1]} />
          <meshStandardMaterial color="#1E293B" metalness={0.8} />
        </mesh>
        {/* Left Strobe (Red) */}
        <mesh position={[0, 0.05, 0.35]}>
          <boxGeometry args={[0.22, 0.12, 0.35]} />
          <meshStandardMaterial
            ref={redStrobeRef}
            color="#EF4444"
            emissive="#EF4444"
            emissiveIntensity={3}
            toneMapped={false}
          />
        </mesh>
        {/* Right Strobe (Blue) */}
        <mesh position={[0, 0.05, -0.35]}>
          <boxGeometry args={[0.22, 0.12, 0.35]} />
          <meshStandardMaterial
            ref={blueStrobeRef}
            color="#3B82F6"
            emissive="#3B82F6"
            emissiveIntensity={0.2}
            toneMapped={false}
          />
        </mesh>
        {/* Point lights for ambient night scene casting */}
        <pointLight ref={redPointRef} position={[0, 0.5, 0.6]} color="#EF4444" distance={5} intensity={2.5} />
        <pointLight ref={bluePointRef} position={[0, 0.5, -0.6]} color="#3B82F6" distance={5} intensity={2.5} />
      </group>

      {/* 7. Front Grille & Headlights */}
      <mesh position={[1.62, 0.5, 0]}>
        <boxGeometry args={[0.04, 0.35, 1.1]} />
        <meshStandardMaterial color="#0F172A" metalness={0.7} />
      </mesh>
      {/* Headlights */}
      <mesh position={[1.63, 0.58, 0.5]}>
        <boxGeometry args={[0.04, 0.15, 0.25]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#FEF08A" emissiveIntensity={2.5} />
      </mesh>
      <mesh position={[1.63, 0.58, -0.5]}>
        <boxGeometry args={[0.04, 0.15, 0.25]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#FEF08A" emissiveIntensity={2.5} />
      </mesh>
      <pointLight position={[2.2, 0.6, 0]} color="#FEF08A" distance={6} intensity={2} />

      {/* 8. Four Rugged Wheels */}
      {[
        [0.95, 0.32, 0.72],
        [0.95, 0.32, -0.72],
        [-0.95, 0.32, 0.72],
        [-0.95, 0.32, -0.72],
      ].map(([x, y, z], idx) => (
        <group key={idx} position={[x, y, z]}>
          {/* Tire */}
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.32, 0.32, 0.24, 20]} />
            <meshStandardMaterial color="#1E293B" roughness={0.8} />
          </mesh>
          {/* Rim */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.25, 12]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

export default ProceduralAmbulance;
