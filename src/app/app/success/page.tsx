'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import Blob from '@/components/3d/Blob';
import * as THREE from 'three';

// 成功時の3Dシーン
function SuccessScene() {
  return (
    <>
      <Stars 
        radius={300} 
        depth={60} 
        count={1000} 
        factor={4} 
        saturation={0.4} 
        fade 
        speed={0.2}
      />
      
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={2.5} castShadow />
      <pointLight position={[5, 5, 5]} intensity={2.0} color="#ffffff" />
      
      <Blob currentPlan={1} scale={1.2} />
      
      <OrbitControls 
        enableZoom={false} 
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
      />
      
      <EffectComposer>
        <Bloom 
          intensity={2.0}
          kernelSize={3}
          luminanceThreshold={0.5}
          luminanceSmoothing={0.9}
        />
      </EffectComposer>
    </>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  
  const type = searchParams.get('type'); // subscribe, change, portal, cancel
  const plan = searchParams.get('plan'); // monthly, yearly
  const from = searchParams.get('from'); // プラン変更の場合の前のプラン
  const sessionId = searchParams.get('session_id'); // Stripe session ID

  useEffect(() => {
    // 少し待ってからローディング終了（アニメーション効果）
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div 
            className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full mx-auto mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-gray-700 font-light tracking-wide text-lg">処理中...</p>
        </motion.div>
      </div>
    );
  }

  // メッセージ設定
  const getSuccessMessage = () => {
    switch (type) {
      case 'subscribe':
        return {
          title: `${plan === 'monthly' ? 'Monthly' : 'Yearly'} プラン契約ありがとうございます！`,
          subtitle: '無制限でデザイン分析をお楽しみください',
          icon: '🎉',
          color: 'from-green-400 to-blue-500'
        };
      case 'change':
        return {
          title: `${plan === 'monthly' ? 'Monthly' : 'Yearly'} プランに変更されました！`,
          subtitle: from ? `${from} プランから変更いたしました` : 'プラン変更が完了しました',
          icon: '🔄',
          color: 'from-blue-400 to-purple-500'
        };
      case 'cancel':
        return {
          title: 'サブスクリプションを解約しました',
          subtitle: 'ご利用いただき、ありがとうございました',
          icon: '👋',
          color: 'from-gray-400 to-gray-600'
        };
      case 'portal':
        return {
          title: '設定を更新しました',
          subtitle: from === 'cancel' ? '解約処理が完了しました' : '課金設定が更新されました',
          icon: '⚙️',
          color: 'from-indigo-400 to-cyan-500'
        };
      default:
        return {
          title: 'ありがとうございます！',
          subtitle: '処理が完了しました',
          icon: '✨',
          color: 'from-green-400 to-blue-500'
        };
    }
  };

  const message = getSuccessMessage();

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-green-50 to-blue-50 overflow-hidden relative">
      {/* 3D背景 */}
      <div className="fixed inset-0 z-0">
        <Canvas 
          camera={{ position: [0, 0, 8], fov: 75 }}
          gl={{ 
            antialias: true, 
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
            outputColorSpace: THREE.SRGBColorSpace
          }}
        >
          <SuccessScene />
        </Canvas>
      </div>

      {/* コンテンツ */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-8">
        <motion.div 
          className="text-center max-w-2xl"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* アイコン */}
          <motion.div 
            className="text-8xl mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, type: "spring", bounce: 0.5 }}
          >
            {message.icon}
          </motion.div>

          {/* タイトル */}
          <motion.h1 
            className={`text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r ${message.color} bg-clip-text text-transparent`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {message.title}
          </motion.h1>

          {/* サブタイトル */}
          <motion.p 
            className="text-xl text-gray-700 mb-8 font-medium"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {message.subtitle}
          </motion.p>

          {/* セッション情報（デバッグ用、本番では削除） */}
          {sessionId && (
            <motion.div 
              className="text-sm text-gray-500 mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.8 }}
            >
              Session: {sessionId.slice(0, 20)}...
            </motion.div>
          )}

          {/* ボタン */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <Link href="/app">
              <motion.button
                className={`px-12 py-4 rounded-2xl font-black text-xl text-white shadow-2xl bg-gradient-to-r ${message.color} hover:shadow-3xl transition-all duration-300`}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                アプリに戻る
              </motion.button>
            </Link>
            
            {type !== 'cancel' && (
              <div>
                <Link href="/app/subscribe">
                  <motion.button
                    className="px-8 py-3 rounded-xl font-medium text-gray-600 hover:text-gray-800 transition-colors"
                    whileHover={{ scale: 1.02 }}
                  >
                    プラン管理
                  </motion.button>
                </Link>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* 追加メッセージ（プラン詳細など） */}
        {(type === 'subscribe' || type === 'change') && (
          <motion.div 
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 shadow-lg">
              <p className="text-gray-600 font-medium mb-2">
                {plan === 'monthly' ? '月額 $7.99' : '年額 $79.99 (17% お得)'}
              </p>
              <p className="text-sm text-gray-500">
                無制限のAIデザイン分析が利用可能になりました
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div 
            className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full mx-auto mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-gray-700 font-light tracking-wide text-lg">Loading...</p>
        </motion.div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}