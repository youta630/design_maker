'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Sphere } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { supabase } from '@/lib/supabase/client';
import Blob from '@/components/3d/Blob';
import * as THREE from 'three';

// 宇宙的な3Dシーン - PostProcessing対応
function CosmicScene({ currentPlan }: { currentPlan: number }) {
  return (
    <>
      <Stars 
        radius={300} 
        depth={60} 
        count={1500} 
        factor={4} 
        saturation={0.3} 
        fade 
        speed={0.3}
      />
      
      {/* 高品質ライティング */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={2.0} castShadow />
      <directionalLight position={[-10, -10, -5]} intensity={1.0} />
      <pointLight position={[5, 5, 5]} intensity={3.0} color="#ffffff" />
      <pointLight position={[-5, -5, 5]} intensity={1.5} color="#ffffff" />
      
      {/* 本格的な3D有機体オブジェクト */}
      <Blob currentPlan={currentPlan} scale={0.8} />
      
      {/* 軌道を回る粒子 */}
      <OrbitingParticles />
      
      <OrbitControls 
        enableZoom={false} 
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.15}
      />
      
      {/* PostProcessing Effects */}
      <EffectComposer>
        <Bloom 
          intensity={1.5}
          kernelSize={3}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.9}
        />
      </EffectComposer>
    </>
  );
}


// 軌道を回る粒子
function OrbitingParticles() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.003;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 8 }).map((_, i) => (
        <OrbitingParticle key={i} index={i} />
      ))}
    </group>
  );
}

function OrbitingParticle({ index }: { index: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const radius = 4 + Math.random() * 1;
  const speed = 0.008 + Math.random() * 0.012;
  const angle = (index / 8) * Math.PI * 2;
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime * speed;
      meshRef.current.position.x = Math.cos(time + angle) * radius;
      meshRef.current.position.z = Math.sin(time + angle) * radius;
      meshRef.current.position.y = Math.sin(time * 3) * 0.6;
    }
  });

  return (
    <Sphere ref={meshRef} args={[0.04, 16, 16]}>
      <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
    </Sphere>
  );
}

export default function SubscribePage() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPlan, setCurrentPlan] = useState<number>(0); // デフォルトでMonthly
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('free');
  const [userSubscriptionPlan, setUserSubscriptionPlan] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No authentication token');
        return;
      }

      const response = await fetch('/api/usage', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Subscription data loaded:', data.subscriptionStatus || 'free');
        setSubscriptionStatus(data.subscriptionStatus || 'free');
        setUserSubscriptionPlan(data.subscriptionStatus === 'monthly' ? 'monthly' : data.subscriptionStatus === 'yearly' ? 'yearly' : null);
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (planType: 'monthly' | 'yearly') => {
    // Security: Validate user authentication state
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.error('User not authenticated');
      // Redirect to login
      return;
    }

    if (subscriptionStatus !== 'free') {
      console.log('User already has a subscription');
      return;
    }
    
    // Security: Validate plan type against allowed values
    if (!['monthly', 'yearly'].includes(planType)) {
      console.error('Invalid plan type');
      return;
    }
    
    try {
      // Get user info for Polar checkout
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not found');
        return;
      }

      // Create Stripe checkout
      const checkoutUrl = new URL('/api/checkout', window.location.origin);
      checkoutUrl.searchParams.set('plan', planType);
      checkoutUrl.searchParams.set('user_id', user.id);
      
      const response = await fetch(checkoutUrl.toString());
      const data = await response.json();
      
      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else if (data.redirect) {
        // Handle existing subscription case
        window.location.href = data.redirect;
      } else {
        console.error('Checkout failed:', data.error);
      }
      
    } catch (error) {
      console.error('Checkout initiation failed:', error);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      // Security: Validate user authentication state
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('User not authenticated');
        return;
      }

      // Security: Validate user has an active subscription
      if (subscriptionStatus === 'free') {
        console.error('No active subscription to cancel');
        return;
      }

      // Redirect to Stripe Customer Portal for subscription management
      const response = await fetch('/api/portal?return=cancel');
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Portal access failed:', data.error);
      }
      
    } catch (error) {
      console.error('Error accessing customer portal:', error);
    }
  };

  const getSubscriptionButtonText = (planType: 'monthly' | 'yearly') => {
    if (subscriptionStatus === 'free') {
      return planType === 'monthly' ? 'Start Creating' : 'Best Value';
    }
    
    if (userSubscriptionPlan === planType) {
      return 'Cancel Plan';
    }
    
    return 'Switch Plan';
  };

  const isButtonDisabled = (planType: 'monthly' | 'yearly') => {
    return subscriptionStatus !== 'free' && userSubscriptionPlan !== planType;
  };

  const plans = [
    {
      id: 0,
      name: "MONTHLY",
      price: "$7.99",
      duration: "USD/month",
      description: "Billed monthly",
      buttonText: "Start Creating"
    },
    {
      id: 1,
      name: "YEARLY",
      price: "$79.99",
      duration: "USD/year",
      description: "Billed annually • Save 17%",
      buttonText: "Best Value",
      savings: "Save 17%"
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div 
            className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full mx-auto mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-gray-600 font-light tracking-wide text-lg">Loading...</p>
        </motion.div>
      </div>
    );
  }


  return (
    <div className="h-screen w-screen bg-white overflow-x-auto overflow-y-hidden relative">
      {/* 3D宇宙背景 - 高品質設定 */}
      <div className="fixed inset-0 z-0">
        <Canvas 
          camera={{ position: [0, 0, 8], fov: 75 }}
          gl={{ 
            antialias: true, 
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
            outputColorSpace: THREE.SRGBColorSpace
          }}
        >
          <CosmicScene currentPlan={currentPlan} />
        </Canvas>
      </div>

      {/* ヘッダー */}
      <motion.header 
        className="relative z-20 px-8 py-6 bg-white/90 backdrop-blur-md border-b border-gray-200"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center max-w-6xl mx-auto relative">
          <div className="flex-1">
            <Link 
              href="/app" 
              className="flex items-center text-gray-600 hover:text-black transition-colors group"
            >
              <motion.svg 
                className="w-5 h-5 mr-3" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                whileHover={{ x: -3 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </motion.svg>
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="mr-2">
                <defs>
                  <linearGradient id="claritySmall" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#000" stopOpacity="0.15"/>
                    <stop offset="30%" stopColor="#000" stopOpacity="0.4"/>
                    <stop offset="70%" stopColor="#000" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#000" stopOpacity="1"/>
                  </linearGradient>
                </defs>
                <path d="M6 16L16 6L26 16L16 26L6 16z" stroke="url(#claritySmall)" strokeWidth="1.5" fill="none"/>
                <path d="M6 16h20M16 6v20" stroke="url(#claritySmall)" strokeWidth="0.8"/>
                <circle cx="16" cy="16" r="1.5" fill="#000"/>
              </svg>
              <span className="font-medium">Back to App</span>
            </Link>
          </div>
          
          <motion.h1 
            className="absolute left-1/2 transform -translate-x-1/2 text-2xl font-black text-gray-900"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
          >
            Choose Your Plan
          </motion.h1>
          
          <div className="flex-1"></div>
        </div>
      </motion.header>

      {/* 横スクロールコンテンツ */}
      <div className="relative z-10 h-screen flex items-center overflow-hidden">
        <motion.div 
          className="flex w-[300vw] h-full"
          animate={{ x: `-${currentPlan * 100}vw` }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          
          {/* Monthly Plan - 1画面目 */}
          <div className="w-screen h-full flex flex-col items-center justify-center px-8 py-8">
            <motion.div 
              className="text-center mb-8"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: currentPlan === 0 ? 1 : 0.3, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-6xl md:text-7xl font-black text-gray-900 mb-3 tracking-tighter">
                {plans[0]?.name}
              </h2>
              <div className="text-3xl font-black text-gray-900 mb-1">
                {plans[0]?.price}
              </div>
              <div className="text-base text-gray-500 mb-2">
                {plans[0]?.duration}
              </div>
              <p className="text-lg text-gray-600 font-medium">
                {plans[0]?.description}
              </p>
            </motion.div>

            <div className="h-32 w-full max-w-md mb-8"></div>

            <motion.div 
              className="text-center mb-20"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: currentPlan === 0 ? 1 : 0.3, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <motion.button
                className={`px-12 py-4 rounded-2xl font-black text-xl transition-all duration-300 shadow-2xl ${
                  isButtonDisabled('monthly') 
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                    : userSubscriptionPlan === 'monthly'
                    ? 'bg-red-600 text-white hover:bg-red-700 hover:scale-105'
                    : 'bg-gray-900 text-white hover:bg-gray-800 hover:scale-105'
                }`}
                whileHover={!isButtonDisabled('monthly') ? { scale: 1.05, y: -5 } : {}}
                whileTap={!isButtonDisabled('monthly') ? { scale: 0.95 } : {}}
                onClick={() => {
                  if (isButtonDisabled('monthly')) return;
                  if (userSubscriptionPlan === 'monthly') {
                    handleCancelSubscription();
                  } else {
                    handleSubscribe('monthly');
                  }
                  setCurrentPlan(0);
                }}
                disabled={isButtonDisabled('monthly')}
              >
                {getSubscriptionButtonText('monthly')}
              </motion.button>
              <div className="mt-4 text-gray-600 text-base">
                <p>Unlimited design analysis with AI</p>
              </div>
            </motion.div>
          </div>

          {/* Yearly Plan - 2画面目 */}
          <div className="w-screen h-full flex flex-col items-center justify-center px-8 py-8">
            <motion.div 
              className="text-center mb-8"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: currentPlan === 1 ? 1 : 0.3, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-6xl md:text-7xl font-black text-gray-900 mb-3 tracking-tighter">
                YEARLY
              </h2>
              <div className="text-3xl font-black text-gray-900 mb-1">
                {plans[1]?.price}
              </div>
              <div className="text-base text-gray-500 mb-2">
                {plans[1]?.duration}
              </div>
              <p className="text-lg text-gray-600 font-medium">
                {plans[1]?.description}
              </p>
            </motion.div>

            <div className="h-32 w-full max-w-md mb-8"></div>

            <motion.div 
              className="text-center mb-20"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: currentPlan === 1 ? 1 : 0.3, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {plans[1]?.savings && (
                <motion.div 
                  className="inline-block mb-4 px-6 py-2 bg-yellow-400 text-black rounded-full font-bold text-base"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {plans[1].savings}
                </motion.div>
              )}
              
              <motion.button
                className={`px-12 py-4 rounded-2xl font-black text-xl transition-all duration-300 shadow-2xl ${
                  isButtonDisabled('yearly') 
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                    : userSubscriptionPlan === 'yearly'
                    ? 'bg-red-600 text-white hover:bg-red-700 hover:scale-105'
                    : 'bg-gray-900 text-white hover:bg-gray-800 hover:scale-105'
                }`}
                whileHover={!isButtonDisabled('yearly') ? { scale: 1.05, y: -5 } : {}}
                whileTap={!isButtonDisabled('yearly') ? { scale: 0.95 } : {}}
                onClick={() => {
                  if (isButtonDisabled('yearly')) return;
                  if (userSubscriptionPlan === 'yearly') {
                    handleCancelSubscription();
                  } else {
                    handleSubscribe('yearly');
                  }
                  setCurrentPlan(1);
                }}
                disabled={isButtonDisabled('yearly')}
              >
                {getSubscriptionButtonText('yearly')}
              </motion.button>
              <div className="mt-4 text-gray-600 text-base">
                <p>Unlimited design analysis with AI</p>
              </div>
            </motion.div>
          </div>

          {/* 3画面目 - 比較画面 */}
          <div className="w-screen h-full flex flex-col items-center justify-center px-8 py-8">
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-5xl font-black text-gray-900 mb-8">
                Ready to Transform?
              </h2>
              <div className="grid md:grid-cols-2 gap-8 max-w-2xl">
                {plans.map((plan, index) => (
                  <motion.div
                    key={plan.name}
                    className="p-6 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-3xl hover:border-gray-300 transition-all cursor-pointer"
                    whileHover={{ scale: 1.02, y: -5 }}
                    onClick={() => setCurrentPlan(index)}
                  >
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-3xl font-black mb-2">{plan.price}</p>
                    <p className="text-gray-600">{plan.duration}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* プラン切り替えボタン - FREEを削除 */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-30">
        <div className="flex space-x-4 bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-gray-200 shadow-xl">
          {plans.map((plan, index) => (
            <motion.button
              key={plan.id}
              onClick={() => setCurrentPlan(index)}
              className={`px-8 py-3 rounded-xl font-bold transition-all ${
                currentPlan === index 
                  ? 'bg-gray-900 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {plan.name}
            </motion.button>
          ))}
        </div>
      </div>

    </div>
  );
}