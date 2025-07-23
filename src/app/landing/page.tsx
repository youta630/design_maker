'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Suspense, lazy } from 'react';
import * as THREE from 'three';
import SimpleAuthButton from '@/components/SimpleAuthButton';

// Three.js components
const Canvas = lazy(() => import('@react-three/fiber').then(module => ({ default: module.Canvas })));
const OrbitControls = lazy(() => import('@react-three/drei').then(module => ({ default: module.OrbitControls })));
const Sphere = lazy(() => import('@react-three/drei').then(module => ({ default: module.Sphere })));
const Box = lazy(() => import('@react-three/drei').then(module => ({ default: module.Box })));
const MeshDistortMaterial = lazy(() => import('@react-three/drei').then(module => ({ default: module.MeshDistortMaterial })));

function RotatingCube() {
  const mesh = useRef<THREE.Mesh>(null);
  
  return (
    <Box ref={mesh} args={[2, 2, 2]}>
      <meshStandardMaterial color="#ffffff" wireframe />
    </Box>
  );
}

function FloatingGeometry() {
  const mesh = useRef<THREE.Mesh>(null);
  
  return (
    <Sphere ref={mesh} args={[1, 32, 32]} position={[3, 0, 0]}>
      <MeshDistortMaterial
        color="#000000"
        attach="material"
        distort={0.3}
        speed={1}
        roughness={0.2}
      />
    </Sphere>
  );
}

export default function LandingPage() {
  const containerRef = useRef<HTMLElement>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [isClient, setIsClient] = useState(false);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const totalSections = 6;
  
  const sectionProgress = useTransform(
    scrollYProgress,
    [0, 1],
    [0, totalSections - 1]
  );

  const progressBarTransform = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useEffect(() => {
    setIsClient(true);
    
    const unsubscribe = sectionProgress.on("change", (latest) => {
      setCurrentSection(Math.round(latest));
    });

    return () => unsubscribe();
  }, [sectionProgress]);

  const sections = [
    {
      id: 0,
      title: "DESIGN SPEC",
      subtitle: "GENERATOR",
      description: "AI-powered design analysis for developers",
      code: `// Transform designs into code
const spec = await analyzeDesign({
  image: uploadedFile,
  model: 'gemini-2.5-flash',
  output: 'markdown'
});

console.log(spec.components);
console.log(spec.layout);
console.log(spec.colors);`
    },
    {
      id: 1,
      title: "PRICING",
      subtitle: "SIMPLE & FAIR",
      description: "Choose the plan that fits your workflow",
      code: ""
    },
    {
      id: 2,
      title: "ANALYZE",
      subtitle: "SMART DETECTION",
      description: "AI identifies components, layouts, and patterns",
      code: `// Component recognition
const components = await detect({
  type: 'components',
  confidence: 0.95
});

components.forEach(comp => {
  console.log(\`\${comp.type}: \${comp.properties}\`);
});`
    },
    {
      id: 3,
      title: "GENERATE",
      subtitle: "TECHNICAL SPECS",
      description: "Detailed documentation for implementation",
      code: `// Generate specifications
const documentation = await generate({
  format: 'markdown',
  sections: [
    'layout', 'components', 
    'styling', 'interactions'
  ]
});

export default documentation;`
    },
    {
      id: 4,
      title: "IMPLEMENT",
      subtitle: "READY TO CODE",
      description: "Copy-paste ready development guidelines",
      code: `// Implementation guide
export const Button = styled.button\`
  padding: 12px 24px;
  border-radius: 8px;
  background: #000;
  color: #fff;
  border: none;
  cursor: pointer;
\`;`
    },
    {
      id: 5,
      title: "READY",
      subtitle: "START BUILDING",
      description: "Transform your design workflow today",
      code: ""
    }
  ];

  const currentStory = sections[currentSection] || sections[0];

  return (
    <main ref={containerRef} className="relative">
      {/* START NOW button - shows only on READY section */}
      {currentSection === 5 && (
        <div style={{ position: 'fixed', bottom: '120px', left: '50%', transform: 'translateX(-50%)', zIndex: 99999 }}>
          <SimpleAuthButton 
            className="px-16 py-6 bg-white text-black text-xl font-bold hover:bg-gray-200 shadow-2xl"
            redirectTo="/app"
          >
            START NOW
          </SimpleAuthButton>
        </div>
      )}
      
      {/* Login button in top right */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 99999 }}>
        <SimpleAuthButton 
          variant="secondary" 
          redirectTo="/app" 
          className={`px-8 py-3 text-sm ${
            currentSection === 5 
              ? 'border-2 border-white text-white hover:bg-white hover:text-black' 
              : ''
          }`}
        >
          SIGN IN
        </SimpleAuthButton>
      </div>
      
      {/* Fixed background */}
      <motion.div 
        className="fixed inset-0 z-0"
        style={{
          background: currentSection === 0 
            ? 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #ffffff 100%)'
            : currentSection === 5
            ? 'linear-gradient(135deg, #000000 0%, #111111 50%, #000000 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #000000 100%)'
        }}
      />
      
      {/* Animated grid background */}
      <div className="fixed inset-0 z-10 pointer-events-none overflow-hidden">
        {isClient && Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={`grid-h-${i}`}
            className="absolute w-full h-px bg-black/5"
            style={{ top: `${i * 5}%` }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ 
              delay: i * 0.05,
              duration: 0.8
            }}
          />
        ))}
        {isClient && Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={`grid-v-${i}`}
            className="absolute h-full w-px bg-black/5"
            style={{ left: `${i * 5}%` }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ 
              delay: i * 0.05 + 0.5,
              duration: 0.8
            }}
          />
        ))}
      </div>

      {/* Main content area - fixed position */}
      <div className="fixed inset-0 z-20 flex items-center justify-center">
        <div className="max-w-7xl mx-auto px-16 w-full">
          
          {/* Hero Section */}
          {currentSection === 0 && (
            <div className="flex items-center justify-center w-full h-full relative">
              
              {/* 3D Background */}
              <div className="absolute inset-0 z-0 opacity-20">
                <Suspense fallback={<div />}>
                  <Canvas camera={{ position: [0, 0, 8] }}>
                    <Suspense fallback={null}>
                      <ambientLight intensity={0.3} />
                      <pointLight position={[10, 10, 10]} intensity={0.5} />
                      <RotatingCube />
                      <FloatingGeometry />
                      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={1} />
                    </Suspense>
                  </Canvas>
                </Suspense>
              </div>

              {/* Hero Content */}
              <motion.div
                className="text-center relative z-20"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 1 }}
              >
                <motion.h1 
                  className="text-[4rem] sm:text-[6rem] md:text-[8rem] lg:text-[10rem] xl:text-[12rem] font-black text-black leading-none tracking-tight mb-8"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1
                  }}
                  transition={{ delay: 1.2, duration: 1 }}
                >
                  DESIGN SPEC
                  <br />
                  GENERATOR
                </motion.h1>

                <motion.p 
                  className="text-2xl md:text-3xl font-medium text-gray-600 tracking-[0.3em] uppercase mb-16"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2, duration: 1 }}
                >
                  AI • ANALYSIS • AUTOMATION
                </motion.p>


                <motion.div
                  className="mt-16 text-sm font-medium text-gray-400 uppercase tracking-[0.3em]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 3, duration: 1 }}
                >
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    SCROLL TO EXPLORE
                  </motion.span>
                </motion.div>
              </motion.div>
            </div>
          )}

          {/* Main storytelling sections */}
          {currentSection > 0 && currentSection < 5 && (
            <div className="grid grid-cols-2 gap-20 items-center h-full">
              
              {/* Left: Title Area */}
              <div className="space-y-6 flex-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`title-${currentSection}`}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    className="space-y-4"
                  >
                    <motion.div 
                      className="text-sm font-bold text-gray-500 tracking-[0.3em]"
                    >
                      [ {String(currentSection + 1).padStart(2, '0')} / {String(totalSections).padStart(2, '0')} ]
                    </motion.div>

                    <motion.h1 
                      className="text-6xl md:text-7xl font-black text-black leading-none tracking-tight"
                    >
                      {currentStory?.title}
                    </motion.h1>

                    <motion.h2 
                      className="text-2xl md:text-3xl font-bold text-gray-600 tracking-tight"
                    >
                      {currentStory?.subtitle}
                    </motion.h2>

                    <motion.p 
                      className="text-lg font-medium text-gray-700 leading-relaxed"
                    >
                      {currentStory?.description}
                    </motion.p>

                    {/* Progress bar */}
                    <motion.div 
                      className="w-full h-1 bg-gray-200 rounded-full overflow-hidden"
                    >
                      <motion.div 
                        className="h-full bg-black rounded-full"
                        style={{ 
                          scaleX: progressBarTransform,
                          originX: 0
                        }}
                      />
                    </motion.div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Right: Code Editor Area or Pricing */}
              <div className="relative">
                <AnimatePresence mode="wait">
                  {currentSection === 1 ? (
                    /* Pricing Cards */
                    <motion.div
                      key="pricing"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 50 }}
                      transition={{ type: "spring", stiffness: 100, damping: 20 }}
                      className="grid grid-cols-1 gap-4 max-w-sm mx-auto"
                    >
                      {[
                        { period: "週", price: "500", duration: "円/週" },
                        { period: "月", price: "1,000", duration: "円/月", recommended: true },
                        { period: "年", price: "10,000", duration: "円/年", savings: "約33%お得" }
                      ].map((plan, index) => (
                        <motion.div
                          key={plan.period}
                          className={`relative p-4 border-2 border-black bg-white ${plan.recommended ? 'shadow-xl' : 'shadow-lg'}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + index * 0.1 }}
                          whileHover={{ scale: 1.02 }}
                          style={{ zIndex: 10 }}
                        >
                          {plan.recommended && (
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-black text-white px-4 py-1 text-xs font-bold tracking-wider">
                              おすすめ
                            </div>
                          )}
                          <div className="text-center">
                            <div className="text-sm font-bold text-gray-700 mb-2">
                              {plan.period}間プラン
                            </div>
                            <div className="mb-3">
                              <span className="text-3xl font-black text-black">
                                {plan.price}
                              </span>
                              <span className="text-sm text-gray-600 ml-1">
                                {plan.duration}
                              </span>
                            </div>
                            {plan.savings && (
                              <div className="text-xs font-bold text-green-600 mb-3 bg-green-50 py-1 px-2 rounded border border-green-200">
                                {plan.savings}
                              </div>
                            )}
                            <SimpleAuthButton 
                              className="px-6 py-2 bg-black text-white text-sm font-bold hover:bg-gray-800 w-full"
                              redirectTo="/app"
                            >
                              このプランを選択
                            </SimpleAuthButton>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    /* Code Editor */
                    <motion.div
                      key={`code-${currentSection}`}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 50 }}
                      transition={{ type: "spring", stiffness: 100, damping: 20 }}
                      className="relative"
                    >
                      {/* Code Editor */}
                      <div className="bg-white border-2 border-black shadow-2xl overflow-hidden">
                        {/* Title bar */}
                        <div className="flex items-center justify-between px-6 py-4 bg-gray-100 border-b-2 border-black">
                          <div className="flex space-x-3">
                            <div className="w-3 h-3 bg-black rounded-full"></div>
                            <div className="w-3 h-3 bg-black rounded-full"></div>
                            <div className="w-3 h-3 bg-black rounded-full"></div>
                          </div>
                          <div className="text-sm font-bold text-black">
                            design-analyzer.js
                          </div>
                        </div>
                        
                        {/* Code area */}
                        <div className="p-8 font-mono text-sm bg-black text-white">
                          <motion.pre 
                            className="leading-relaxed whitespace-pre-wrap"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3, duration: 1 }}
                          >
                            <TypewriterCode 
                              text={currentStory?.code || ''} 
                              trigger={currentSection}
                            />
                          </motion.pre>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Final READY section */}
          {currentSection === 5 && (
            <AnimatePresence>
              <motion.div 
                className="text-center w-full"
                initial={{ opacity: 0, scale: 0.8, y: 100 }}
                animate={{ 
                  opacity: 1,
                  scale: 1,
                  y: 0
                }}
                exit={{ opacity: 0, scale: 1.2, y: -100 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 120, 
                  damping: 25,
                  duration: 0.8
                }}
              >
                {/* 3D Background for READY */}
                <div className="absolute inset-0 opacity-30" style={{ zIndex: -1 }}>
                  <Suspense fallback={<div />}>
                    <Canvas camera={{ position: [0, 0, 6] }}>
                      <Suspense fallback={null}>
                        <ambientLight intensity={0.4} />
                        <pointLight position={[10, 10, 10]} intensity={0.8} />
                        <RotatingCube />
                        <FloatingGeometry />
                        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={2} />
                      </Suspense>
                    </Canvas>
                  </Suspense>
                </div>

                <motion.h1 
                  className="text-[14rem] font-black text-white leading-none tracking-tight mb-8"
                  style={{ position: 'relative', zIndex: 10 }}
                  animate={{ 
                    textShadow: [
                      "0 0 20px rgba(255,255,255,0.3)",
                      "0 0 40px rgba(255,255,255,0.6)", 
                      "0 0 20px rgba(255,255,255,0.3)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  READY
                </motion.h1>
                <motion.p 
                  className="text-3xl font-bold text-gray-300 tracking-tight mb-12"
                  style={{ position: 'relative', zIndex: 10 }}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  TRANSFORM YOUR WORKFLOW
                </motion.p>

              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Scroll area */}
      <div className="h-[600vh] relative z-30">
        {/* Scroll indicator */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
          <motion.div 
            className="flex space-x-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
          >
            {sections.map((_, index) => (
              <motion.div
                key={index}
                className={`w-2 h-2 transition-all duration-300 ${
                  index === currentSection 
                    ? 'bg-black scale-125' 
                    : 'bg-gray-400 scale-100'
                }`}
                whileHover={{ scale: 1.2 }}
              />
            ))}
          </motion.div>
        </div>
      </div>

    </main>
  );
}

// Typewriter effect component
interface TypewriterCodeProps {
  text: string;
  trigger: number;
}

const TypewriterCode = ({ text, trigger }: TypewriterCodeProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [trigger, text]);
  
  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 30 + Math.random() * 20);
      
      return () => clearTimeout(timer);
    }
    
    return undefined;
  }, [currentIndex, text]);
  
  return (
    <span>
      {displayedText}
      {currentIndex < text.length && (
        <motion.span 
          className="bg-white text-black px-0.5 ml-0.5"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          |
        </motion.span>
      )}
    </span>
  );
};