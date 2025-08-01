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
    <main className="relative min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900 overflow-hidden">
      
      {/* Enhanced 3D Background */}
      {isClient && (
        <PremiumBlob 
          scrollProgress={scrollProgress + mousePosition.x * 0.1}
          sectionIndex={0}
          className="opacity-60"
        />
      )}


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
              <span className="text-gray-900">snap</span>
              <span className="text-emerald-500">2</span>
              <span className="text-gray-900">spec</span>
            </motion.h1>
            
            {/* Animated Subtitle */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="mt-6"
            >
              <motion.p 
                className="text-gray-600 text-sm sm:text-base md:text-lg lg:text-xl font-light tracking-wide"
              >
                Design Workflow Revolution
              </motion.p>
            </motion.div>

            <motion.div
              className="mt-8 text-emerald-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light tracking-wider">COMING SOON</span>
            </motion.div>
          </motion.div>
        </div>
      </div>


    </main>
  );
}