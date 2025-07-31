'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface RubiksCubeProps {
  scrollProgress: number;
  sectionIndex: number;
  className?: string;
}

// 高品質シェーダー定義
const cubeVertexShader = `
  uniform float uTime;
  uniform float uDistortion;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  
  // Perlin noise function
  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  
  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  
  vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 1.0) * x);
  }
  
  vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
  }
  
  float cnoise(vec3 P) {
    vec3 Pi0 = floor(P);
    vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod289(Pi0);
    Pi1 = mod289(Pi1);
    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
    vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
    vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
    vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
    vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
    vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
    vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
    vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = Pf0 * Pf0 * Pf0 * (Pf0 * (Pf0 * 6.0 - 15.0) + 10.0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
  }

  void main() {
    vUv = uv;
    
    // 微細なノイズ変形でツルツル感を演出
    vec3 pos = position;
    float noise = cnoise(pos * 3.0 + uTime * 0.2) * 0.02;
    
    vec3 newPosition = pos + normal * noise;
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(newPosition, 1.0)).xyz;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const cubeFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uMetalness;
  uniform float uRoughness;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vPosition);
    
    // フレネル効果でツルツル感を演出
    float fresnel = pow(1.0 - dot(normal, viewDir), 2.0);
    
    // 環境反射のシミュレーション
    vec3 reflectDir = reflect(-viewDir, normal);
    float envReflection = (reflectDir.y + 1.0) * 0.5;
    
    // 基本色に反射を合成
    vec3 color = uColor;
    color += vec3(1.0) * fresnel * 0.3;
    color += vec3(1.0) * envReflection * 0.2;
    
    // 微細なノイズパターン
    float pattern = sin(vUv.x * 50.0) * sin(vUv.y * 50.0) * 0.05 + 0.95;
    color *= pattern;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

// 高品質ルービックキューブコンポーネント
function RubiksCubeCore({ scrollProgress, sectionIndex }: { scrollProgress: number; sectionIndex: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const cubesRef = useRef<THREE.Mesh[]>([]);

  // セクション毎の色設定（白黒+緑）
  const sectionColors = useMemo(() => ({
    0: [0.2, 0.8, 0.3], // 緑
    1: [0.1, 0.1, 0.1], // 黒
    2: [0.2, 0.8, 0.3], // 緑
    3: [0.9, 0.9, 0.9], // 白
    4: [0.1, 0.1, 0.1], // 黒
    5: [0.2, 0.8, 0.3], // 緑
  }), []);

  const currentColor = sectionColors[sectionIndex as keyof typeof sectionColors] || sectionColors[0];

  // 高解像度ジオメトリ
  const cubeGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1, 32, 32, 32), []);
  
  // プレミアムシェーダーマテリアル
  const cubeMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: cubeVertexShader,
    fragmentShader: cubeFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uDistortion: { value: 0.1 },
      uColor: { value: new THREE.Vector3(...currentColor) },
      uMetalness: { value: 0.9 },
      uRoughness: { value: 0.1 },
    },
  }), [currentColor]);

  // 3x3x3構造（中心は空洞）
  const cubePositions = useMemo(() => {
    const positions = [];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue; // 中心は空ける
          positions.push([x * 1.1, y * 1.1, z * 1.1]);
        }
      }
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    const group = groupRef.current;

    // スムーズなスクロール追従
    const targetRotationX = scrollProgress * Math.PI * 3;
    const targetRotationY = scrollProgress * Math.PI * 2;
    
    group.rotation.x += (targetRotationX - group.rotation.x) * 0.1;
    group.rotation.y += (targetRotationY - group.rotation.y) * 0.1;

    // 浮遊感のある動き
    group.position.y = Math.sin(scrollProgress * Math.PI * 4 + time * 0.5) * 1.5;
    group.position.x = Math.cos(scrollProgress * Math.PI * 2 + time * 0.3) * 0.8;

    // 個別キューブの微細回転
    cubesRef.current.forEach((cube, index) => {
      if (cube) {
        const offset = index * 0.1;
        cube.rotation.x += 0.005 + Math.sin(time + offset) * 0.002;
        cube.rotation.y += 0.003 + Math.cos(time + offset) * 0.001;
        cube.rotation.z += 0.001 + Math.sin(time * 1.5 + offset) * 0.001;
      }
    });

    // シェーダーユニフォーム更新
    if (cubeMaterial.uniforms) {
      if (cubeMaterial.uniforms.uTime) {
        cubeMaterial.uniforms.uTime.value = time;
      }
      if (cubeMaterial.uniforms.uColor) {
        cubeMaterial.uniforms.uColor.value.set(...currentColor);
      }
    }

    // 全体のスケール変動
    const scale = 1.0 + Math.sin(time * 0.5) * 0.05;
    group.scale.setScalar(scale * 2.5);
  });

  return (
    <group ref={groupRef} position={[0, 0, -8]}>
      {/* 環境ライティング */}
      <ambientLight intensity={0.2} />
      <directionalLight
        position={[10, 10, 10]}
        intensity={2}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
      />
      <pointLight position={[-10, -10, -10]} intensity={1} color="#ffffff" />
      
      {/* プレミアムキューブ群 */}
      {cubePositions.map((position, index) => (
        <mesh
          key={index}
          ref={(el) => {
            if (el) cubesRef.current[index] = el;
          }}
          position={position as [number, number, number]}
          geometry={cubeGeometry}
          material={cubeMaterial}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}

export default function PremiumRubiksCube({ scrollProgress, sectionIndex, className = '' }: RubiksCubeProps) {
  return (
    <div className={`fixed inset-0 pointer-events-none z-0 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 15], fov: 45 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
        }}
      >
        <RubiksCubeCore scrollProgress={scrollProgress} sectionIndex={sectionIndex} />
      </Canvas>
    </div>
  );
}