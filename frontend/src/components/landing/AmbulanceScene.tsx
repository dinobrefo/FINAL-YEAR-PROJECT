import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Ambulance } from '../three/Ambulance';
import { DeviceTier } from '../../hooks/useDeviceTier';

function CameraRig() {
  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime() * 0.25;
    // Gentle constrained orbit in 3/4 front framing
    camera.position.x = 4.6 + Math.sin(t) * 0.4;
    camera.position.z = 5.4 + Math.cos(t) * 0.4;
    camera.position.y = 2.2 + Math.sin(t * 0.5) * 0.12;
    camera.lookAt(0, 0.7, 0);
  });
  return null;
}

interface AmbulanceSceneContentProps {
  tier: DeviceTier;
}

const AmbulanceSceneContent: React.FC<AmbulanceSceneContentProps> = ({ tier }) => {
  return (
    <>
      <color attach="background" args={['#06111F']} />
      <fog attach="fog" args={['#06111F', 8, 22]} />

      <CameraRig />

      {/* Lighting setup per spec */}
      <ambientLight intensity={0.4} />
      {/* Key directional light */}
      <directionalLight
        position={[6, 8, 4]}
        intensity={1.6}
        castShadow={tier === 'full'}
        shadow-mapSize={[1024, 1024]}
      />
      {/* Cool blue rim light from behind for edge separation */}
      <directionalLight position={[-6, 4, -5]} intensity={1.8} color="#38BDF8" />

      {/* Emergency accents */}
      <pointLight position={[2, 3, 2]} color="#EF4444" intensity={1.5} distance={10} />
      <pointLight position={[-2, 3, -2]} color="#3B82F6" intensity={1.5} distance={10} />

      {/* Environment preset on full only */}
      {tier === 'full' && (
        <Suspense fallback={null}>
          <Environment preset="night" />
        </Suspense>
      )}

      {/* The 3D Ambulance */}
      <group position={[0, 0, 0]}>
        <Ambulance scale={1.05} />
      </group>

      {/* Ground Contact Shadows */}
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.7}
        scale={10}
        blur={1.8}
        far={4}
        color="#000000"
      />

      {/* Subtle faint infinite grid */}
      <Grid
        position={[0, -0.01, 0]}
        args={[30, 30]}
        cellSize={0.8}
        cellThickness={0.6}
        cellColor="#1E293B"
        sectionSize={3.2}
        sectionThickness={1}
        sectionColor="#334155"
        fadeDistance={18}
        fadeStrength={1.5}
      />
    </>
  );
};

export interface AmbulanceSceneProps {
  tier: DeviceTier;
}

export const AmbulanceScene: React.FC<AmbulanceSceneProps> = ({ tier }) => {
  const isFull = tier === 'full';

  return (
    <div className="w-full h-full relative bg-[#06111F]">
      <Canvas
        shadows={isFull}
        dpr={isFull ? [1, 1.8] : [1, 1.3]}
        camera={{ position: [5, 2.5, 6], fov: 38 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <AmbulanceSceneContent tier={tier} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default AmbulanceScene;
