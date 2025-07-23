'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const cardData = [
  {
    title: "Lightning Fast",
    subtitle: "5-15 seconds analysis",
    icon: "⚡",
    color: "from-yellow-500 to-orange-500"
  },
  {
    title: "Cost Effective", 
    subtitle: "75% cheaper than alternatives",
    icon: "💰",
    color: "from-green-500 to-emerald-500"
  },
  {
    title: "High Accuracy",
    subtitle: "AI-powered precision",
    icon: "🎯",
    color: "from-blue-500 to-cyan-500"
  },
  {
    title: "Developer Friendly",
    subtitle: "Code-ready specifications",
    icon: "👩‍💻",
    color: "from-purple-500 to-pink-500"
  }
];

export default function FloatingCards() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {cardData.map((card, index) => {
        const offsetX = (mousePosition.x - 0.5) * 50;
        const offsetY = (mousePosition.y - 0.5) * 50;
        
        return (
          <motion.div
            key={index}
            className="absolute"
            style={{
              left: `${20 + (index % 2) * 60}%`,
              top: `${20 + Math.floor(index / 2) * 60}%`,
            }}
            animate={{
              x: offsetX * (0.1 + index * 0.05),
              y: offsetY * (0.1 + index * 0.05),
              rotateY: offsetX * 2,
              rotateX: -offsetY * 2,
            }}
            transition={{
              type: "spring",
              stiffness: 50,
              damping: 20
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.1, z: 50 }}
          >
            <div 
              className={`w-64 h-40 rounded-2xl bg-gradient-to-br ${card.color} p-6 shadow-2xl backdrop-blur-sm bg-opacity-90 border border-white/20`}
              style={{
                transform: 'preserve-3d',
              }}
            >
              <div className="text-4xl mb-4">{card.icon}</div>
              <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
              <p className="text-white/80 text-sm">{card.subtitle}</p>
              
              {/* Glow effect */}
              <motion.div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.color} opacity-50 blur-xl -z-10`}
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: index * 0.5
                }}
              />
            </div>
          </motion.div>
        );
      })}

      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden -z-20">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20"
            style={{
              width: `${200 + i * 50}px`,
              height: `${200 + i * 50}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>
    </div>
  );
}