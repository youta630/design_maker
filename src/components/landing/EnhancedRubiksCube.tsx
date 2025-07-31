'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
// Removed unused imports
import * as THREE from 'three';

interface RubiksCubeProps {
  scrollProgress: number;
  sectionIndex: number;
  className?: string;
}

// 高品質なルービックキューブコンポーネント
function RubiksCube({ scrollProgress, sectionIndex }: { scrollProgress: number; sectionIndex: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const smallCubesRef = useRef<THREE.Mesh[]>([]);

  // セクションごとの色設定
  const sectionColors = useMemo(() => ({
    0: { primary: '#22c55e', secondary: '#000000', accent: '#16a34a' }, // What - Green
    1: { primary: '#ef4444', secondary: '#1f2937', accent: '#dc2626' }, // Problem - Red
    2: { primary: '#22c55e', secondary: '#000000', accent: '#16a34a' }, // Solution - Green
    3: { primary: '#3b82f6', secondary: '#1e293b', accent: '#2563eb' }, // How - Blue
    4: { primary: '#f59e0b', secondary: '#374151', accent: '#d97706' }, // Demo - Orange
    5: { primary: '#8b5cf6', secondary: '#1f2937', accent: '#7c3aed' }, // CTA - Purple
  }), []);

  const colors = sectionColors[sectionIndex as keyof typeof sectionColors] || sectionColors[0];

  // 3x3x3のルービックキューブ構造を作成
  const cubeGeometry = useMemo(() => new THREE.BoxGeometry(0.9, 0.9, 0.9), []);
  
  const materials = useMemo(() => [
    new THREE.MeshPhysicalMaterial({
      color: colors.primary,
      metalness: 0.8,
      roughness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      emissive: colors.accent,
      emissiveIntensity: 0.1,
    }),
    new THREE.MeshPhysicalMaterial({
      color: colors.secondary,
      metalness: 0.9,
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    }),
  ], [colors]);

  const smallCubes = useMemo(() => {
    const cubes = [];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          // 中心は空ける
          if (x === 0 && y === 0 && z === 0) continue;
          
          cubes.push({
            position: [x * 1.05, y * 1.05, z * 1.05],
            material: Math.random() > 0.4 ? materials[0] : materials[1],
            initialRotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
          });
        }
      }
    }
    return cubes;
  }, [materials]);

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    const group = groupRef.current;

    // スクロールベースの回転とコロコロ動き
    const scrollRotation = scrollProgress * Math.PI * 4;

    // メインの回転アニメーション
    group.rotation.x = scrollRotation * 0.7 + Math.sin(time * 0.5) * 0.1;
    group.rotation.y = scrollRotation * 0.5 + time * 0.2;
    group.rotation.z = scrollRotation * 0.3 + Math.cos(time * 0.3) * 0.05;

    // 上下の波動運動
    group.position.y = Math.sin(scrollProgress * Math.PI * 2 + time * 0.5) * 2;

    // 左右の軽微な動き
    group.position.x = Math.sin(scrollProgress * Math.PI + time * 0.3) * 1.5;

    // 個別の小キューブのアニメーション
    smallCubesRef.current.forEach((cube, index) => {
      if (cube) {
        const offset = index * 0.1;
        cube.rotation.x += 0.01 + Math.sin(time + offset) * 0.005;
        cube.rotation.y += 0.008 + Math.cos(time + offset) * 0.003;
        cube.rotation.z += 0.006 + Math.sin(time * 1.5 + offset) * 0.002;
      }
    });

    // スケールのパルス効果
    const pulse = 1 + Math.sin(time * 2) * 0.05;
    group.scale.setScalar(pulse * 1.5);
  });

  return (
    <group ref={groupRef} position={[0, 0, -5]}>
      {/* 環境光とスポットライト */}
      <ambientLight intensity={0.4} />
      <spotLight
        position={[10, 10, 10]}
        angle={0.3}
        penumbra={0.5}
        intensity={2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-10, -10, -10]} intensity={0.8} color={colors.primary} />
      
      {/* 小キューブたち */}
      {smallCubes.map((cube, index) => (
        <mesh
          key={index}
          ref={(el) => {
            if (el) smallCubesRef.current[index] = el;
          }}
          position={cube.position as [number, number, number]}
          rotation={cube.initialRotation as [number, number, number]}
          geometry={cubeGeometry}
          material={cube.material}
          castShadow
          receiveShadow
        />
      ))}

      {/* 中央のコア部分（光るエフェクト） */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color={colors.primary}
          transparent
          opacity={0.6}
          emissive={colors.accent}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

export default function EnhancedRubiksCube({ scrollProgress, sectionIndex, className = '' }: RubiksCubeProps) {
  return (
    <div className={`fixed inset-0 pointer-events-none z-0 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <RubiksCube scrollProgress={scrollProgress} sectionIndex={sectionIndex} />
      </Canvas>
    </div>
  );
}