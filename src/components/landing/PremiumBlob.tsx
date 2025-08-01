'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

interface BlobProps {
  scrollProgress: number;
  sectionIndex: number;
  className?: string;
}

// Blobmixer風高品質Blob
function BlobCore({ scrollProgress, sectionIndex }: { scrollProgress: number; sectionIndex: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { scene, gl } = useThree();

  // セクション毎の色設定
  const sectionColors = useMemo(() => ({
    0: new THREE.Color(0x3aa76d), // 緑
    1: new THREE.Color(0x1a1a1a), // 黒
    2: new THREE.Color(0x3aa76d), // 緑
    3: new THREE.Color(0xe5e5e5), // 白
    4: new THREE.Color(0x1a1a1a), // 黒
    5: new THREE.Color(0x3aa76d), // 緑
  }), []);

  const currentColor = sectionColors[sectionIndex as keyof typeof sectionColors] || sectionColors[0];

  // 高品質PBRマテリアル（明るい背景用に調整）
  const material = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x10b981), // emerald-500
    metalness: 0.1,
    roughness: 0.3,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    iridescence: 0.5,
    iridescenceIOR: 1.3,
    envMapIntensity: 0.8,
    transmission: 0.05,
    thickness: 0.3,
  }), []);

  // 高解像度ジオメトリ（サブディビジョン多め）
  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1.5, 6);
    
    // 頂点シェーダーでノイズ変形（のっぺり回避）
    const positions = geo.attributes.position;
    if (positions) {
      const vertex = new THREE.Vector3();
      
      for (let i = 0; i < positions.count; i++) {
        vertex.fromBufferAttribute(positions, i);
        
        // ノイズベースの変形
        const noise = 
          Math.sin(vertex.x * 2) * 0.1 +
          Math.cos(vertex.y * 3) * 0.1 +
          Math.sin(vertex.z * 2.5) * 0.1;
        
        vertex.normalize().multiplyScalar(1.5 + noise);
        positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }
    }
    
    geo.computeVertexNormals();
    return geo;
  }, []);

  // 環境光設定
  useMemo(() => {
    // 明るい背景色（透明にして背景グラデーションを活かす）
    scene.background = null;
    
    // 明るい環境光
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0xf0f0f0);
    
    const envMap = pmremGenerator.fromScene(envScene).texture;
    scene.environment = envMap;
    
    return () => {
      pmremGenerator.dispose();
      envMap.dispose();
    };
  }, [scene, gl]);

  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.elapsedTime;
    const mesh = meshRef.current;

    // スムーズな回転
    mesh.rotation.x = scrollProgress * Math.PI * 0.5 + time * 0.1;
    mesh.rotation.y = scrollProgress * Math.PI * 1.5 + time * 0.15;
    mesh.rotation.z = time * 0.05;

    // 浮遊感のある動き
    mesh.position.y = Math.sin(time * 0.8) * 0.3;
    mesh.position.x = Math.cos(time * 0.6) * 0.2;

    // スケール変動
    const scale = 1.0 + Math.sin(time * 0.5) * 0.05;
    mesh.scale.setScalar(scale);

    // 色の更新
    material.color.copy(currentColor);
  });

  return (
    <group position={[0, 0, -2]}>
      {/* 明るい環境用ライティング */}
      <directionalLight
        position={[5, 8, 5]}
        intensity={2.5}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <ambientLight intensity={0.4} />
      <hemisphereLight
        args={[0xffffff, 0xe5e5e5, 0.6]}
      />
      
      {/* メインBlob */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        castShadow
        receiveShadow
      />
      
      {/* コンタクトシャドウの床 */}
      <mesh
        position={[0, -2.5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[10, 10]} />
        <shadowMaterial opacity={0.15} />
      </mesh>
    </group>
  );
}

export default function PremiumBlob({ scrollProgress, sectionIndex, className = '' }: BlobProps) {
  return (
    <div className={`fixed inset-0 pointer-events-none z-0 ${className}`}>
      <Canvas
        camera={{ 
          position: [0, 0.8, 3.2], 
          fov: 38,
          near: 0.1,
          far: 100 
        }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance",
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1
        }}
        shadows="soft"
        onCreated={({ gl }) => {
          gl.setClearColor(0xffffff, 0);
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <BlobCore scrollProgress={scrollProgress} sectionIndex={sectionIndex} />
        
        {/* ポストプロセス: Bloom効果 */}
        <EffectComposer>
          <Bloom intensity={0.3} luminanceThreshold={0.9} luminanceSmoothing={0.9} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}