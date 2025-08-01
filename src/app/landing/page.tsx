'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GoogleAuthButton from '@/components/landing/GoogleAuthButton';
import PremiumBlob from '@/components/landing/PremiumBlob';
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
        <PremiumBlob 
          scrollProgress={scrollProgress + mousePosition.x * 0.1}
          sectionIndex={0}
          className="opacity-60"
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
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center">
          
          {/* Animated Logo/Title */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="mb-8"
          >
            <motion.h1 
              className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[10rem] 2xl:text-[12rem] font-black tracking-tighter leading-none"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              <span className="text-white">snap</span>
              <span className="text-green-400">2</span>
              <span className="text-white">spec</span>
            </motion.h1>
            
            {/* Animated Subtitle */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="mt-6"
            >
              <motion.p 
                className="text-gray-400 text-sm sm:text-base md:text-lg lg:text-xl font-mono tracking-widest"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                Design Workflow Revolution
              </motion.p>
            </motion.div>

            <motion.div
              className="mt-8 text-green-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-mono tracking-widest">COMING SOON</span>
            </motion.div>
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