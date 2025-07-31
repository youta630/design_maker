'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface BackgroundCubeProps {
  scrollProgress: number;
  className?: string;
}

export default function BackgroundCube({ scrollProgress, className = '' }: BackgroundCubeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    cubes: THREE.Group[];
    animationId: number | null;
  } | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      powerPreference: "high-performance"
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    
    mountRef.current.appendChild(renderer.domElement);

    // Create multiple Rubik's cubes
    const cubes: THREE.Group[] = [];
    
    const createRubiksCube = (size: number = 1) => {
      const cubeGroup = new THREE.Group();
      
      // Materials for different faces
      const materials = [
        new THREE.MeshBasicMaterial({ color: 0x00ff7f, transparent: true, opacity: 0.8 }), // Green
        new THREE.MeshBasicMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.8 }), // Dark
        new THREE.MeshBasicMaterial({ color: 0x00cc64, transparent: true, opacity: 0.8 }), // Green variant
        new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.8 }), // Black
        new THREE.MeshBasicMaterial({ color: 0x009b4c, transparent: true, opacity: 0.8 }), // Dark green
        new THREE.MeshBasicMaterial({ color: 0x404040, transparent: true, opacity: 0.8 }), // Gray
      ];

      // Create 3x3x3 rubik's cube structure
      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          for (let z = -1; z <= 1; z++) {
            const geometry = new THREE.BoxGeometry(size * 0.9, size * 0.9, size * 0.9);
            const material = materials[Math.floor(Math.random() * materials.length)];
            const cube = new THREE.Mesh(geometry, material);
            
            cube.position.set(x * size, y * size, z * size);
            
            // Add subtle edge lines
            const edges = new THREE.EdgesGeometry(geometry);
            const line = new THREE.LineSegments(
              edges, 
              new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
            );
            cube.add(line);
            
            cubeGroup.add(cube);
          }
        }
      }
      
      return cubeGroup;
    };

    // Create multiple cubes at different positions and sizes
    const positions = [
      { x: -8, y: 4, z: -10, size: 0.8 },
      { x: 12, y: -6, z: -15, size: 1.2 },
      { x: -15, y: -3, z: -8, size: 1.0 },
      { x: 18, y: 8, z: -20, size: 0.6 },
      { x: -5, y: 12, z: -12, size: 0.9 },
    ];

    positions.forEach(pos => {
      const cube = createRubiksCube(pos.size);
      cube.position.set(pos.x, pos.y, pos.z);
      scene.add(cube);
      cubes.push(cube);
    });

    // Camera position
    camera.position.z = 5;

    // Store scene references
    sceneRef.current = {
      scene,
      camera,
      renderer,
      cubes,
      animationId: null
    };

    // Handle resize
    const handleResize = () => {
      if (!sceneRef.current) return;
      
      const { camera, renderer } = sceneRef.current;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (sceneRef.current) {
        if (sceneRef.current.animationId) {
          cancelAnimationFrame(sceneRef.current.animationId);
        }
        
        // Dispose of geometries and materials
        sceneRef.current.scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
        
        sceneRef.current.renderer.dispose();
        
        if (mountRef.current && sceneRef.current.renderer.domElement) {
          mountRef.current.removeChild(sceneRef.current.renderer.domElement);
        }
      }
    };
  }, []);

  // Animation loop with scroll integration
  useEffect(() => {
    if (!sceneRef.current) return;

    const animate = () => {
      if (!sceneRef.current) return;

      const { scene, camera, renderer, cubes } = sceneRef.current;

      // Rotate cubes based on scroll progress
      cubes.forEach((cube, index) => {
        const scrollOffset = scrollProgress * Math.PI * 2;
        const phase = (index * Math.PI) / cubes.length;
        
        // Different rotation for each cube
        cube.rotation.x = scrollOffset * 0.5 + phase;
        cube.rotation.y = scrollOffset * 0.3 + phase * 0.7;
        cube.rotation.z = scrollOffset * 0.2 + phase * 0.3;

        // Vertical movement based on scroll
        const baseY = cube.position.y;
        cube.position.y = baseY + Math.sin(scrollOffset + phase) * 2;
        
        // Slight horizontal drift
        cube.position.x += Math.sin(scrollOffset * 0.1 + phase) * 0.01;
      });

      renderer.render(scene, camera);
      sceneRef.current.animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (sceneRef.current?.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
    };
  }, [scrollProgress]);

  return (
    <div 
      ref={mountRef} 
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
      style={{
        filter: 'blur(1px)',
        opacity: 0.6
      }}
    />
  );
}