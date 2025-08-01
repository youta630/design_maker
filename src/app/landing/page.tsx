'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GoogleAuthButton from '@/components/landing/GoogleAuthButton';
import PremiumRubiksCube from '@/components/landing/PremiumRubiksCube';
import { useScrollProgress } from '@/components/landing/useScrollProgress';

export default function LandingPage() {
  const [isClient, setIsClient] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const scrollProgress = useScrollProgress();
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // マウス追従エフェクト
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      
      {/* Enhanced 3D Background */}
      {isClient && (
        <PremiumRubiksCube 
          scrollProgress={scrollProgress + mousePosition.x * 0.1}
          sectionIndex={0}
          className="opacity-30"
        />
      )}

      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Floating Particles */}
        {isClient && Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-green-500 rounded-full"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
              opacity: 0
            }}
            animate={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}

        {/* Grid Lines */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(rgba(34, 197, 94, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34, 197, 94, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }} />
        </div>

      </div>

      {/* Fixed Google Auth Button */}
      <div className="fixed top-8 right-8 z-50">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <GoogleAuthButton />
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen px-6">
        <div className="absolute inset-0">
          
          {/* Animated Logo/Title */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="mb-12"
          >
            <motion.h1 
              className="text-8xl md:text-9xl lg:text-[12rem] xl:text-[16rem] font-black tracking-tighter leading-none"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              <div className="absolute top-16 left-8">
                <span className="text-white block">snap</span>
              </div>
              <div className="absolute top-32 md:top-48 right-8">
                <span className="text-green-400 block">2</span>
              </div>
              <div className="absolute bottom-16 left-1/3">
                <span className="text-white block">spec</span>
              </div>
            </motion.h1>
            
            {/* Animated Subtitle */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="space-y-4"
            >
              <motion.p 
                className="absolute top-1/2 right-12 text-2xl md:text-4xl text-gray-300 font-light max-w-md text-right leading-relaxed"
                style={{ transform: 'rotate(-90deg)', transformOrigin: 'right center' }}
              >
                画像から瞬時にUI仕様書を生成
              </motion.p>
              
              <motion.div
                className="absolute bottom-8 left-8 text-green-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <span className="text-3xl md:text-5xl font-mono tracking-widest">COMING SOON</span>
              </motion.div>
            </motion.div>
          </motion.div>


          {/* Space-like scattered text */}
          <motion.div
            className="absolute top-1/4 left-1/2 transform -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            <span className="text-gray-400 text-lg font-mono tracking-widest">
              Design Workflow Revolution
            </span>
          </motion.div>
        </div>
      </div>

      {/* Animated Background Shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-4 h-4 border border-green-500/20"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + i * 10}%`,
            }}
            animate={{
              rotate: [0, 360],
              scale: [1, 1.2, 1],
              x: mousePosition.x * (10 + i * 5),
              y: mousePosition.y * (10 + i * 5),
            }}
            transition={{
              rotate: { duration: 10 + i * 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 3 + i, repeat: Infinity },
              x: { duration: 0.5 },
              y: { duration: 0.5 }
            }}
          />
        ))}
      </div>

    </main>
  );
}