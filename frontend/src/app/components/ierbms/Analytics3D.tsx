import * as React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface BarData {
  name: string;
  value: number;
  color: string;
}

interface Analytics3DProps {
  analyticsData: any;
}

// Animated 3D bar that grows on mount and glows on hover
const Bar3D: React.FC<{
  position: [number, number, number];
  height: number;
  color: string;
  label: string;
  value: number;
  index: number;
}> = ({ position, height, color, label, value }) => {
  const meshRef = React.useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = React.useState(false);
  const [animHeight, setAnimHeight] = React.useState(0);

  useFrame((_, delta) => {
    if (animHeight < height) {
      setAnimHeight(prev => Math.min(prev + delta * height * 1.8, height));
    }
    if (meshRef.current) {
      const targetScale = hovered ? 1.08 : 1.0;
      meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.1);
      meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, targetScale, 0.1);
    }
  });

  return (
    <group position={position}>
      <RoundedBox
        ref={meshRef}
        args={[0.6, Math.max(animHeight, 0.05), 0.6]}
        radius={0.05}
        position={[0, Math.max(animHeight, 0.05) / 2, 0]}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.5 : 0.15}
          metalness={0.3}
          roughness={0.4}
          transparent
          opacity={0.92}
        />
      </RoundedBox>

      <Text
        position={[0, animHeight + 0.3, 0]}
        fontSize={0.22}
        color={hovered ? '#ffffff' : '#a0a0b8'}
        anchorY="bottom"
      >
        {value}
      </Text>

      <Text
        position={[0, -0.35, 0]}
        fontSize={0.15}
        color="#8888a0"
        anchorY="top"
        maxWidth={1.2}
        textAlign="center"
      >
        {label}
      </Text>
    </group>
  );
};

const Platform: React.FC<{ width: number; depth: number }> = ({ width, depth }) => {
  return (
    <group position={[0, -0.05, 0]}>
      <RoundedBox args={[width, 0.08, depth]} radius={0.02} position={[0, 0, 0]}>
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.5}
          roughness={0.3}
          transparent
          opacity={0.9}
        />
      </RoundedBox>
      <gridHelper
        args={[width - 0.5, 10, '#2a2a45', '#2a2a45']}
        position={[0, 0.05, 0]}
      />
    </group>
  );
};

export const Analytics3D: React.FC<Analytics3DProps> = ({ analyticsData }) => {
  const barData = React.useMemo<BarData[]>(() => {
    if (!analyticsData?.bedOccupancy) return [];

    return analyticsData.bedOccupancy.slice(0, 8).map((entry: any) => ({
      name: entry.name?.length > 12 ? entry.name.substring(0, 12) + '…' : entry.name || 'Unknown',
      value: entry.occupancy || 0,
      color: entry.occupancy > 85 ? '#ef4444' : entry.occupancy > 60 ? '#eab308' : '#22c55e'
    }));
  }, [analyticsData]);

  if (barData.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        <p className="animate-pulse">Loading 3D Analytics...</p>
      </div>
    );
  }

  const maxValue = Math.max(...barData.map(d => d.value), 1);
  const barSpacing = 1.2;
  const totalWidth = barData.length * barSpacing;

  return (
    <div className="h-[420px] w-full rounded-lg overflow-hidden border border-border bg-[#0a0a14]">
      <Canvas
        camera={{ position: [0, 4, 8], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0a0a14');
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
        }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={0.8} color="#c4c4ff" />
        <pointLight position={[-3, 5, -3]} intensity={0.5} color="#3b82f6" />
        <pointLight position={[3, 5, 3]} intensity={0.3} color="#8b5cf6" />

        <Platform width={totalWidth + 2} depth={3} />

        {barData.map((bar, idx) => {
          const normalizedHeight = (bar.value / maxValue) * 4;
          const xPos = (idx - (barData.length - 1) / 2) * barSpacing;
          return (
            <Bar3D
              key={bar.name + idx}
              position={[xPos, 0, 0]}
              height={normalizedHeight}
              color={bar.color}
              label={bar.name}
              value={bar.value}
              index={idx}
            />
          );
        })}

        <OrbitControls
          enablePan={false}
          minDistance={4}
          maxDistance={14}
          maxPolarAngle={Math.PI / 2.1}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
};

export default Analytics3D;
