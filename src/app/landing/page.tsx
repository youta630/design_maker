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

        {/* Gradient Orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: mousePosition.x * 50,
            y: mousePosition.y * 50,
          }}
          transition={{
            scale: { duration: 4, repeat: Infinity },
            x: { duration: 0.5 },
            y: { duration: 0.5 }
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            x: mousePosition.x * -30,
            y: mousePosition.y * -30,
          }}
          transition={{
            scale: { duration: 3, repeat: Infinity },
            x: { duration: 0.7 },
            y: { duration: 0.7 }
          }}
        />
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
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-4xl">
          
          {/* Animated Logo/Title */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="mb-12"
          >
            <motion.h1 
              className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight mb-8"
              animate={{
                textShadow: [
                  '0 0 20px rgba(34, 197, 94, 0.5)',
                  '0 0 30px rgba(34, 197, 94, 0.8)',
                  '0 0 20px rgba(34, 197, 94, 0.5)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
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
              className="space-y-4"
            >
              <motion.p 
                className="text-xl md:text-2xl text-gray-300 font-light"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                画像から瞬時にUI仕様書を生成
              </motion.p>
              
              <motion.div
                className="flex items-center justify-center space-x-4 text-green-400"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1, type: "spring", stiffness: 200 }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="w-2 h-2 bg-green-400 rounded-full"
                />
                <span className="text-sm tracking-wider">COMING SOON</span>
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="w-2 h-2 bg-green-400 rounded-full"
                />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Floating Action Elements */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className="relative"
          >
            {/* Animated Ring */}
            <motion.div
              className="absolute inset-0 border-2 border-green-500/30 rounded-full"
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 360]
              }}
              transition={{
                scale: { duration: 2, repeat: Infinity },
                rotate: { duration: 20, repeat: Infinity, ease: "linear" }
              }}
              style={{ width: '200px', height: '200px', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
            />
            
            {/* Center Pulse */}
            <motion.div
              className="relative z-10 w-32 h-32 mx-auto rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center"
              animate={{
                scale: [1, 1.05, 1],
                boxShadow: [
                  '0 0 20px rgba(34, 197, 94, 0.5)',
                  '0 0 40px rgba(34, 197, 94, 0.8)',
                  '0 0 20px rgba(34, 197, 94, 0.5)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.svg 
                className="w-12 h-12 text-white" 
                fill="currentColor" 
                viewBox="0 0 20 20"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <path fillRule="evenodd" d="M10 3l7 4v6l-7 4-7-4V7l7-4z" clipRule="evenodd" />
              </motion.svg>
            </motion.div>
          </motion.div>

          {/* Animated Bottom Text */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 1 }}
            className="mt-16 space-y-4"
          >
            <motion.p 
              className="text-gray-400 text-sm tracking-wide"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              Revolutionizing Design Workflow
            </motion.p>
            
            {/* Animated Progress Bar */}
            <div className="w-64 h-1 bg-gray-800 rounded-full mx-auto overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 2.5, duration: 3, ease: "easeInOut" }}
              />
            </div>
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