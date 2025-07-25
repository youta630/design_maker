'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { ShaderMaterial, SphereGeometry, Mesh } from 'three';
import { vertexShader, fragmentShader } from './Shaders';

interface BlobProps {
  currentPlan: number;
  scale?: number;
}

export default function Blob({ currentPlan, scale = 1 }: BlobProps) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  // プランごとの設定
  const planConfig = useMemo(() => ({
    0: { // Monthly
      colorA: [1.0, 0.188, 0.188], // 鮮烈な赤
      colorB: [1.0, 0.4, 0.1],     // オレンジ
      distortion: 0.8,
      scale: 1.8 * scale,
    },
    1: { // Yearly  
      colorA: [0.0, 1.0, 0.533],   // 鮮烈な緑
      colorB: [0.0, 0.8, 1.0],     // シアン
      distortion: 1.0,
      scale: 2.0 * scale,
    }
  }), [scale]);

  const config = planConfig[currentPlan as keyof typeof planConfig] || planConfig[0];

  // 高解像度なSphereGeometry
  const geometry = useMemo(() => new SphereGeometry(1, 128, 64), []);

  // ShaderMaterial
  const material = useMemo(() => new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uDistortion: { value: config.distortion },
      uColorA: { value: config.colorA },
      uColorB: { value: config.colorB },
      uOpacity: { value: 1.0 },
      uEnvMap: { value: null },
    },
    transparent: false,
    wireframe: false,
  }), [config]);

  // アニメーションループ
  useFrame((state) => {
    if (materialRef.current?.uniforms) {
      const uniforms = materialRef.current.uniforms;
      if (uniforms.uTime) uniforms.uTime.value = state.clock.elapsedTime * 0.5;
      
      // プラン変更時のカラー更新
      if (uniforms.uColorA) uniforms.uColorA.value = config.colorA;
      if (uniforms.uColorB) uniforms.uColorB.value = config.colorB;
      if (uniforms.uDistortion) uniforms.uDistortion.value = config.distortion;
    }

    if (meshRef.current) {
      // 緩やかな回転
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
      meshRef.current.rotation.y += 0.005;
      
      // スケール更新
      meshRef.current.scale.setScalar(config.scale);
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
    >
      <shaderMaterial
        ref={materialRef}
        attach="material"
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uDistortion: { value: config.distortion },
          uColorA: { value: config.colorA },
          uColorB: { value: config.colorB },
          uOpacity: { value: 1.0 },
          uEnvMap: { value: null },
        }}
      />
    </mesh>
  );
}