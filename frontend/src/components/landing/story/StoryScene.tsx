import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Grid, ContactShadows } from '@react-three/drei';
import { MotionValue } from 'framer-motion';
import { Ambulance } from '../../three/Ambulance';

export interface StorySceneProps {
  progress: MotionValue<number>;
}

export const StoryScene: React.FC<StorySceneProps> = ({ progress }) => {
  const ambulanceGroupRef = useRef<THREE.Group>(null);
  const dashedLineRef = useRef<THREE.Line>(null);
  const pulseMeshRef = useRef<THREE.Mesh>(null);
  const targetHospitalMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const altHospital1MatRef = useRef<THREE.MeshStandardMaterial>(null);
  const altHospital2MatRef = useRef<THREE.MeshStandardMaterial>(null);

  // Smooth 3D Spline Path
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-10, 0, -4),
      new THREE.Vector3(-5, 0, 2),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(5, 0, 3.5),
      new THREE.Vector3(10, 0, 0),
    ]);
  }, []);

  // Pre-generate route line points
  const fullRouteGeometry = useMemo(() => {
    const points = curve.getPoints(120);
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [curve]);

  // Keyframes for Camera Movement across 5 stages
  const cameraKeyframes = useMemo(
    () => [
      { pos: new THREE.Vector3(-12, 4.5, 2.5), target: new THREE.Vector3(-10, 0, -4) },
      { pos: new THREE.Vector3(-2, 13, 11), target: new THREE.Vector3(2, 0, 0) },
      { pos: new THREE.Vector3(6, 6.5, 7.5), target: new THREE.Vector3(10, 0, 0) },
      { pos: new THREE.Vector3(3, 4, 2), target: new THREE.Vector3(7, 0, 1.5) },
      { pos: new THREE.Vector3(13.5, 3.2, 4.5), target: new THREE.Vector3(10, 0.7, 0) },
    ],
    []
  );

  const currentCamPos = useRef(new THREE.Vector3(-12, 4.5, 2.5));
  const currentCamTarget = useRef(new THREE.Vector3(-10, 0, -4));

  useFrame(({ clock, camera }) => {
    const p = Math.max(0, Math.min(progress.get(), 1));
    const t = clock.getElapsedTime();

    // 1. Move ambulance along the curve
    if (ambulanceGroupRef.current) {
      const ambT = Math.min(p * 1.05, 1);
      const position = curve.getPointAt(ambT);
      ambulanceGroupRef.current.position.copy(position);

      const tangent = curve.getTangentAt(ambT);
      const angle = Math.atan2(tangent.x, tangent.z);
      ambulanceGroupRef.current.rotation.y = angle - Math.PI / 2;
    }

    // 2. Incident start pulse
    if (pulseMeshRef.current) {
      const pulseScale = 1 + (Math.sin(t * 4) + 1) * 0.4;
      pulseMeshRef.current.scale.set(pulseScale, pulseScale, 1);
    }

    // 3. Dynamic route draw range
    if (dashedLineRef.current) {
      const geometry = dashedLineRef.current.geometry as THREE.BufferGeometry;
      const count = Math.floor(p * 120);
      geometry.setDrawRange(0, Math.max(2, count));
    }

    // 4. Hospital highlight transition (Stage 3+: p >= 0.4)
    if (targetHospitalMatRef.current) {
      if (p >= 0.4) {
        targetHospitalMatRef.current.color.set('#10B981');
        targetHospitalMatRef.current.emissive.set('#10B981');
        targetHospitalMatRef.current.emissiveIntensity = 1.8;
      } else {
        targetHospitalMatRef.current.color.set('#38BDF8');
        targetHospitalMatRef.current.emissive.set('#38BDF8');
        targetHospitalMatRef.current.emissiveIntensity = 0.5;
      }
    }

    // Dim other candidate hospitals in stage 3+
    const altDim = p >= 0.4 ? 0.15 : 0.6;
    if (altHospital1MatRef.current) {
      altHospital1MatRef.current.opacity = altDim;
    }
    if (altHospital2MatRef.current) {
      altHospital2MatRef.current.opacity = altDim;
    }

    // 5. Interpolate Camera Keyframes based on progress
    const segment = p * 4;
    const stageIdx = Math.min(Math.floor(segment), 3);
    const stageFrac = segment - stageIdx;

    const k1 = cameraKeyframes[stageIdx] || cameraKeyframes[0];
    const k2 = cameraKeyframes[stageIdx + 1] || cameraKeyframes[4];

    const desiredPos = new THREE.Vector3().lerpVectors(k1!.pos, k2!.pos, stageFrac);
    const desiredTarget = new THREE.Vector3().lerpVectors(k1!.target, k2!.target, stageFrac);

    currentCamPos.current.lerp(desiredPos, 0.08);
    currentCamTarget.current.lerp(desiredTarget, 0.08);

    camera.position.copy(currentCamPos.current);
    camera.lookAt(currentCamTarget.current);
  });

  return (
    <>
      <color attach="background" args={['#06111F']} />
      <fog attach="fog" args={['#06111F', 14, 38]} />

      {/* Lighting */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[10, 16, 8]} intensity={1.8} castShadow />
      <directionalLight position={[-10, 6, -6]} intensity={1.2} color="#38BDF8" />

      {/* Incident Origin Pulse (at -10, 0, -4) */}
      <group position={[-10, 0.05, -4]}>
        <mesh ref={pulseMeshRef} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.8, 32]} />
          <meshBasicMaterial color="#EF4444" transparent opacity={0.65} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.3, 32]} />
          <meshBasicMaterial color="#EF4444" />
        </mesh>
        <pointLight color="#EF4444" intensity={2} distance={6} />
      </group>

      {/* Faint Full Route Baseline */}
      <line geometry={fullRouteGeometry}>
        <lineBasicMaterial color="#334155" transparent opacity={0.4} />
      </line>

      {/* Active Glowing Route Drawn as progress increases */}
      <line ref={dashedLineRef} geometry={fullRouteGeometry}>
        <lineBasicMaterial color="#EF4444" linewidth={3} />
      </line>

      {/* 3 Hospital Destination Pillars */}
      {/* 1. Chosen Target Hospital (Komfo Anokye Teaching Hospital) at [10, 0, 0] */}
      <group position={[10, 0, 0]}>
        <mesh position={[0, 1.5, 0]} castShadow>
          <cylinderGeometry args={[0.8, 0.9, 3, 24]} />
          <meshStandardMaterial ref={targetHospitalMatRef} color="#38BDF8" roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Glowing cross emblem on top */}
        <mesh position={[0, 3.4, 0]}>
          <boxGeometry args={[0.3, 0.8, 0.1]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#10B981" emissiveIntensity={1} />
        </mesh>
        <mesh position={[0, 3.4, 0]}>
          <boxGeometry args={[0.8, 0.3, 0.1]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#10B981" emissiveIntensity={1} />
        </mesh>
        <pointLight position={[0, 4, 0]} color="#10B981" intensity={2} distance={8} />
      </group>

      {/* 2. Alternative Candidate Hospital 1 at [4, 0, -8] */}
      <group position={[4, 0, -8]}>
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.6, 0.7, 2.2, 16]} />
          <meshStandardMaterial ref={altHospital1MatRef} color="#64748B" transparent opacity={0.6} />
        </mesh>
      </group>

      {/* 3. Alternative Candidate Hospital 2 at [-2, 0, 8] */}
      <group position={[-2, 0, 8]}>
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.6, 0.7, 2.2, 16]} />
          <meshStandardMaterial ref={altHospital2MatRef} color="#64748B" transparent opacity={0.6} />
        </mesh>
      </group>

      {/* The Moving Ambulance */}
      <group ref={ambulanceGroupRef}>
        <Ambulance scale={0.7} />
      </group>

      {/* Ground Contact Shadows & Subtle Grid */}
      <ContactShadows position={[0, 0, 0]} opacity={0.6} scale={40} blur={2} far={6} color="#000" />

      <Grid
        position={[0, -0.01, 0]}
        args={[60, 60]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1E293B"
        sectionSize={4}
        sectionThickness={1}
        sectionColor="#334155"
        fadeDistance={30}
        fadeStrength={1.5}
      />
    </>
  );
};

export default StoryScene;
