'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GoogleAuthButton from '@/components/landing/GoogleAuthButton';
import PremiumRubiksCube from '@/components/landing/PremiumRubiksCube';
import { useScrollProgress } from '@/components/landing/useScrollProgress';

// Animation variants
const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }
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
  const [currentSection, setCurrentSection] = useState(0);
  const scrollProgress = useScrollProgress();
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // セクションの検出
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const sectionIndex = Math.floor(scrollY / windowHeight);
      setCurrentSection(Math.min(sectionIndex, 5));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main className="relative min-h-screen bg-gray-950 text-white">
      {/* Premium 3D Rubik's Cube Background */}
      {isClient && (
        <PremiumRubiksCube 
          scrollProgress={scrollProgress}
          sectionIndex={currentSection}
          className="opacity-5"
        />
      )}

      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3l7 4v6l-7 4-7-4V7l7-4z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-semibold text-xl text-white">snap2spec</span>
          </div>
          <div className="flex items-center space-x-8">
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Product</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Developers</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Docs</a>
            </nav>
            <GoogleAuthButton />
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 pt-20">
        
        {/* Hero - Supabase Style */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 py-32">
          <div className="max-w-5xl text-center">
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-12"
            >
              {/* Announcement Badge */}
              <motion.div 
                variants={fadeIn}
                className="inline-flex items-center px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-sm text-green-400"
              >
                LW15 ✨ View all the announcements →
              </motion.div>

              <motion.h1 
                variants={fadeIn}
                className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-tight"
              >
                Build in a weekend
                <br />
                <span className="text-green-400">Scale to millions</span>
              </motion.h1>
              
              <motion.div 
                variants={fadeIn}
                className="space-y-6 max-w-3xl mx-auto"
              >
                <p className="text-xl md:text-2xl text-gray-300 leading-relaxed">
                  snap2specは画像1枚からUI仕様書を生成するクリエイティブプラットフォーム。
                </p>
                <p className="text-lg text-gray-400 leading-relaxed">
                  プロジェクトを画像アップロード、AI連想分析、JSON仕様書生成、
                  そして実装まで、完全なクリエイティブワークフローを提供します。
                </p>
              </motion.div>

              <motion.div 
                variants={fadeIn}
                className="flex flex-col sm:flex-row gap-4 justify-center pt-8"
              >
                <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-medium transition-all duration-200">
                  Start your project
                </button>
                <button className="border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white px-8 py-4 rounded-lg font-medium transition-all duration-200">
                  Request a demo
                </button>
              </motion.div>
            </motion.div>
          </div>

          {/* Trusted by logos */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="flex items-center justify-center space-x-12 mt-24 opacity-50"
          >
            <div className="text-gray-500 font-semibold">Resend</div>
            <div className="text-gray-500 font-semibold">Loops</div>
            <div className="text-gray-500 font-semibold">Mobbin</div>
            <div className="text-gray-500 font-semibold">gopuff</div>
            <div className="text-gray-500 font-semibold">Chatbase</div>
          </motion.div>

          <div className="text-center text-gray-500 text-sm mt-8">
            Trusted by fast-growing companies worldwide
          </div>
        </section>

        {/* Features - Large Cards */}
        <section className="max-w-7xl mx-auto px-6 py-32">
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Image Upload Feature */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-6"
            >
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-xl font-semibold text-white">画像アップロード</h3>
              </div>
              
              <p className="text-gray-400 leading-relaxed">
                どんな画像からでも直接感覚を読み取り、
                <span className="text-white font-medium">独自のデザイン言語</span>として翻訳。
                言語化の必要は一切ありません。
              </p>

              {/* Visual representation */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="w-full h-32 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-8 h-8 text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <div className="text-sm text-gray-500">Drop image here</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-400">100% portable</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-400">Direct interpretation</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-400">No prompts needed</span>
              </div>
            </motion.div>

            {/* AI Analysis Feature */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-6"
            >
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className="text-xl font-semibold text-white">AI連想分析</h3>
              </div>
              
              <p className="text-gray-400 leading-relaxed">
                人間の思考パターンを再現し、
                <span className="text-white font-medium">複数の連想パス</span>から
                最も創造的なコンセプトを選択します。
              </p>

              {/* Terminal-like visualization */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 font-mono text-sm">
                <div className="text-green-400 mb-2">$ snap2spec analyze</div>
                <div className="text-gray-500 mb-1">Generating association paths...</div>
                <div className="text-gray-300">海 → 無限 → 展開 → 可能性</div>
                <div className="text-gray-300">→ 革新 → デザイン</div>
                <div className="text-green-400 mt-2">✓ Analysis complete</div>
              </div>

              <p className="text-gray-500 text-sm">
                Build multilayer experiences with real-time data synchronization.
              </p>
            </motion.div>

            {/* JSON Output Feature */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-6"
            >
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <h3 className="text-xl font-semibold text-white">JSON仕様書生成</h3>
              </div>
              
              <p className="text-gray-400 leading-relaxed">
                実装レベルの詳細仕様書を自動生成。
                <span className="text-white font-medium">即座にReady-to-use</span>で
                コーディングエージェントに直接渡せます。
              </p>

              {/* Code preview */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="text-xs text-gray-500">design-spec.json</div>
                </div>
                <div className="font-mono text-xs text-gray-300 space-y-1">
                  <div>{"{"}</div>
                  <div className="pl-4">&ldquo;colors&rdquo;: {"//"} countries</div>
                  <div className="pl-4">&ldquo;typography&rdquo;: {"//"} continents</div>
                  <div className="pl-4">&ldquo;layout&rdquo;: {"//"} cities</div>
                  <div className="pl-4">&ldquo;components&rdquo;: {"//"} states</div>
                  <div>{"}"}</div>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-sm">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-400">OpenAI compatible</span>
              </div>
            </motion.div>

          </div>
        </section>

        {/* Customer Stories - Logo Flow */}
        <section className="py-32 bg-gray-900/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-4">CUSTOMER STORIES</div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Trusted by the world&rsquo;s most
                <br />
                innovative companies.
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                See how snap2spec empowers companies of all sizes to accelerate
                their growth and streamline their work.
              </p>
              <div className="flex justify-center space-x-4 mt-8">
                <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
                  View all stories
                </button>
                <button className="border border-gray-600 hover:border-gray-500 text-gray-300 px-6 py-2 rounded-lg text-sm font-medium transition-colors">
                  View Events
                </button>
              </div>
            </div>

            {/* Horizontal scrolling cards */}
            <div className="relative">
              <div className="flex overflow-x-auto space-x-6 pb-6 scrollbar-hide">
                {/* Card 1 */}
                <div className="flex-shrink-0 w-80 bg-gray-900 border border-gray-800 rounded-xl p-8">
                  <div className="text-2xl font-bold text-white mb-4">SHOTGUN</div>
                  <div className="h-40 bg-gray-800 rounded-lg mb-6"></div>
                  <p className="text-gray-400 text-sm">
                    使用例追加予定。実際のプロジェクトでどのように画像から
                    独創的なUI仕様書が生成されるかをご紹介します。
                  </p>
                </div>

                {/* Card 2 */}
                <div className="flex-shrink-0 w-80 bg-gray-900 border border-gray-800 rounded-xl p-8">
                  <div className="text-2xl font-bold text-white mb-4">Chatbase</div>
                  <div className="h-40 bg-gray-800 rounded-lg mb-6"></div>
                  <p className="text-gray-400 text-sm">
                    使用例追加予定。AI連想システムがどのように
                    従来とは異なるクリエイティブなアプローチを実現するかを示します。
                  </p>
                </div>

                {/* Card 3 */}
                <div className="flex-shrink-0 w-80 bg-gray-900 border border-gray-800 rounded-xl p-8">
                  <div className="text-2xl font-bold text-white mb-4">Mobbin</div>
                  <div className="h-40 bg-gray-800 rounded-lg mb-6"></div>
                  <p className="text-gray-400 text-sm">
                    使用例追加予定。JSON仕様書から実装まで、
                    完全なワークフローの実例をご覧いただけます。
                  </p>
                </div>

                {/* Card 4 */}
                <div className="flex-shrink-0 w-80 bg-gray-900 border border-gray-800 rounded-xl p-8">
                  <div className="text-2xl font-bold text-white mb-4">Pebblely</div>
                  <div className="h-40 bg-gray-800 rounded-lg mb-6 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Scaling securely: one million users in 7 months
                    protected with snap2spec Auth
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-32">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                あなたの感覚を
                <br />
                デザインに変換しませんか？
              </h2>
              
              <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                無料で始められます。クレジットカード不要、制限なし。
                今すぐあなたのクリエイティブワークフローを変革してください。
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-medium transition-all duration-200">
                  Start your project
                </button>
                <button className="border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white px-8 py-4 rounded-lg font-medium transition-all duration-200">
                  Request a demo
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-800 py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-2 mb-4 md:mb-0">
                <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3l7 4v6l-7 4-7-4V7l7-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="font-semibold text-xl text-white">snap2spec</span>
              </div>
              <div className="text-sm text-gray-500">
                © 2024 snap2spec. All rights reserved.
              </div>
            </div>
          </div>
        </footer>

      </div>
    </main>
  );
}