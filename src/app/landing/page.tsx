'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GoogleAuthButton from '@/components/landing/GoogleAuthButton';
import BackgroundCube from '@/components/landing/BackgroundCube';
import { useScrollProgress } from '@/components/landing/useScrollProgress';

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function LandingPage() {
  const [isClient, setIsClient] = useState(false);
  const scrollProgress = useScrollProgress();
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <main className="relative min-h-screen bg-white">
      {/* Background 3D Cubes */}
      {isClient && (
        <BackgroundCube 
          scrollProgress={scrollProgress} 
          className="opacity-40"
        />
      )}

      {/* Content Container - Perplexity Style */}
      <div className="relative z-10">
        
        {/* What is snap2spec */}
        <section className="min-h-screen flex items-center justify-center px-6 py-32">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-12"
            >
              <motion.h1 
                variants={fadeInUp}
                className="text-4xl md:text-6xl font-bold text-black leading-relaxed"
              >
                snap2specとは
              </motion.h1>
              
              <motion.p 
                variants={fadeInUp}
                className="text-lg md:text-xl text-gray-700 leading-relaxed"
              >
                画像1枚からUI仕様書を自動生成するAIツールです。<br />
                あなたの感覚を読み取り、独自のデザイン仕様を作成します。
              </motion.p>

              <motion.div variants={fadeInUp}>
                <GoogleAuthButton />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Problem */}
        <section className="min-h-screen flex items-center justify-center px-6 py-32">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-12"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-black leading-relaxed">
                現在のデザイン作成の課題
              </h2>
              
              <div className="space-y-8 text-left">
                <div className="border-l-4 border-red-500 pl-6">
                  <h3 className="text-xl font-semibold text-black mb-3">
                    プロンプトを考えるのが面倒
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    「モダンでクリーンな...」「レスポンシブで...」<br />
                    毎回同じような指示を考えるのに時間がかかります。
                  </p>
                </div>
                
                <div className="border-l-4 border-red-500 pl-6">
                  <h3 className="text-xl font-semibold text-black mb-3">
                    みんな似たようなデザイン
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    AIが作るデザインは結局テンプレート的。<br />
                    個性や独自性が生まれにくい現状があります。
                  </p>
                </div>
                
                <div className="border-l-4 border-red-500 pl-6">
                  <h3 className="text-xl font-semibold text-black mb-3">
                    感覚を言語化できない
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    頭の中にあるイメージやモヤモヤした感覚を<br />
                    うまく言葉で表現するのは困難です。
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Solution */}
        <section className="min-h-screen flex items-center justify-center px-6 py-32">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-12"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-black leading-relaxed">
                snap2specの解決方法
              </h2>
              
              <div className="space-y-8 text-left">
                <div className="border-l-4 border-green-500 pl-6">
                  <h3 className="text-xl font-semibold text-black mb-3">
                    画像から直接感覚を読み取り
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    言葉で説明する必要はありません。<br />
                    写真1枚から、AIがあなたの感覚を理解します。
                  </p>
                </div>
                
                <div className="border-l-4 border-green-500 pl-6">
                  <h3 className="text-xl font-semibold text-black mb-3">
                    独自の連想システム
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    テンプレートではなく、画像から生まれる<br />
                    独自の連想でデザインを生成します。
                  </p>
                </div>
                
                <div className="border-l-4 border-green-500 pl-6">
                  <h3 className="text-xl font-semibold text-black mb-3">
                    すぐに使える仕様書
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    生成されたJSON仕様書を<br />
                    そのままコーディングエージェントに渡すだけ。
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* How to Use */}
        <section className="min-h-screen flex items-center justify-center px-6 py-32">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-16"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-black leading-relaxed">
                使い方
              </h2>
              
              <div className="space-y-12">
                {[
                  {
                    step: "1",
                    title: "画像をアップロード",
                    description: "日常の写真、風景、オブジェクト。何でも構いません。AIがその画像から感覚を読み取ります。"
                },
                {
                  step: "2", 
                  title: "JSON仕様書を生成",
                  description: "AIが画像から連想を展開し、独自のUI仕様書をJSON形式で自動生成します。"
                },
                {
                  step: "3",
                  title: "コーディングエージェントに渡す",
                  description: "生成されたJSONをv0やCursor、ChatGPTなどにそのまま渡すだけで実装完了。"
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 60 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.2 }}
                  viewport={{ once: true }}
                  className="flex items-start space-x-6 text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-black mb-3">
                      {item.title}
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
            </motion.div>
          </div>
        </section>

        {/* Demo Section */}
        <section className="min-h-screen flex items-center justify-center px-6 py-32">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-12"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-black leading-relaxed">
                実際の使用例
              </h2>
              
              <div className="bg-gray-50 rounded-lg p-12 border-2 border-dashed border-gray-300">
                <div className="text-gray-500 text-lg">
                  📋 デモ画面は今後追加予定です
                </div>
                <p className="text-gray-400 text-sm mt-4">
                  実際の生成例やビフォーアフターを<br />
                  こちらで確認できるようになります
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="min-h-screen flex items-center justify-center px-6 py-32">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-12"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-black leading-relaxed">
                今すぐ試してみる
              </h2>
              
              <p className="text-lg text-gray-700 leading-relaxed">
                無料で始められます。<br />
                あなたの感覚をデザインに変えてみませんか？
              </p>

              <div className="flex flex-col items-center space-y-6">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <GoogleAuthButton />
                </motion.div>
                
                <p className="text-sm text-gray-500">
                  アカウント作成から利用まで、すべて無料
                </p>
              </div>
            </motion.div>
          </div>
        </section>

      </div>
    </main>
  );
}