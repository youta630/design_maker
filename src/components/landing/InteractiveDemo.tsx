'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

export default function InteractiveDemo() {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedStep, setSelectedStep] = useState(0);

  const steps = [
    {
      title: "Upload Design",
      description: "Drag and drop your UI mockup or screenshot",
      visual: "📱"
    },
    {
      title: "AI Analysis",
      description: "Advanced algorithms analyze patterns and structure",
      visual: "🔍"
    },
    {
      title: "Generate Specs",
      description: "Comprehensive documentation with implementation details",
      visual: "📋"
    }
  ];

  return (
    <div className="relative max-w-4xl mx-auto">
      <motion.div
        className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        {/* Interactive Steps */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              className={`cursor-pointer p-6 rounded-xl border transition-all duration-300 ${
                selectedStep === index 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onClick={() => setSelectedStep(index)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="text-4xl mb-4">{step.visual}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-gray-400 text-sm">{step.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Demo Visualization */}
        <div className="relative h-64 bg-black rounded-xl overflow-hidden">
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{
              background: selectedStep === 0 
                ? 'linear-gradient(45deg, #1e293b, #334155)' 
                : selectedStep === 1
                ? 'linear-gradient(45deg, #1e40af, #3b82f6)'
                : 'linear-gradient(45deg, #059669, #10b981)'
            }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="text-6xl"
              animate={{ 
                rotateY: isHovered ? 360 : 0,
                scale: selectedStep === 1 ? 1.2 : 1
              }}
              transition={{ 
                rotateY: { duration: 2, ease: "easeInOut" },
                scale: { duration: 0.3 }
              }}
            >
              {steps[selectedStep]?.visual}
            </motion.div>
          </motion.div>

          {/* Animated particles */}
          {selectedStep === 1 && (
            <div className="absolute inset-0">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-blue-400 rounded-full"
                  initial={{ 
                    opacity: 0,
                    x: Math.random() * 400,
                    y: Math.random() * 200
                  }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: Math.random() * 400,
                    y: Math.random() * 200
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.1
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="mt-6 flex justify-center space-x-2">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              className={`w-3 h-3 rounded-full cursor-pointer ${
                selectedStep === index ? 'bg-blue-500' : 'bg-gray-600'
              }`}
              onClick={() => setSelectedStep(index)}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.8 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}