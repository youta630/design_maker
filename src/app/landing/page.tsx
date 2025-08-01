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

      {/* Data Stream Effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Vertical Data Streams */}
        {isClient && Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={`stream-${i}`}
            className="absolute"
            style={{
              left: `${15 + i * 12}%`,
              top: '-10%',
              height: '120%',
              width: '1px',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0] }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 4,
              ease: "linear"
            }}
          >
            {/* Individual data points flowing down */}
            {Array.from({ length: 15 }).map((_, j) => (
              <motion.div
                key={`point-${j}`}
                className="absolute w-0.5 h-4 bg-green-400"
                style={{
                  top: `${j * 8}%`,
                  opacity: 0.6 - (j * 0.04)
                }}
                initial={{ scaleY: 0 }}
                animate={{ 
                  scaleY: [0, 1, 0],
                  y: [0, 50, 100]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: j * 0.1 + Math.random() * 2,
                  ease: "linear"
                }}
              />
            ))}
          </motion.div>
        ))}

        {/* Subtle matrix-like characters */}
        {isClient && Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={`char-${i}`}
            className="absolute text-green-400 text-xs font-mono opacity-20"
            style={{
              left: `${10 + i * 8}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              opacity: [0.1, 0.3, 0.1],
              y: [0, 20, 40]
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3
            }}
          >
            {['0', '1', '→', '↓', '•', '|'][Math.floor(Math.random() * 6)]}
          </motion.div>
        ))}

      </div>

      {/* Fixed Google Auth Button */}
      <div className="fixed top-4 sm:top-6 md:top-8 right-4 sm:right-6 md:right-8 z-50">
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
              className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[12rem] 2xl:text-[16rem] font-black tracking-tighter leading-none"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              <div className="absolute top-8 sm:top-12 md:top-16 left-4 sm:left-6 md:left-8">
                <span className="text-white block">snap</span>
              </div>
              <div className="absolute top-20 sm:top-24 md:top-32 lg:top-48 left-16 sm:left-20 md:left-32">
                <span className="text-green-400 block">2</span>
              </div>
              <div className="absolute bottom-8 sm:bottom-12 md:bottom-16 left-1/4 sm:left-1/3">
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
              
              <motion.div
                className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-4 sm:left-6 md:left-8 text-green-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-mono tracking-widest">COMING SOON</span>
              </motion.div>
            </motion.div>
          </motion.div>


          {/* Space-like scattered text */}
          <motion.div
            className="absolute top-1/4 left-1/2 transform -translate-x-1/2 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            <span className="text-gray-400 text-sm sm:text-base md:text-lg font-mono tracking-widest">
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