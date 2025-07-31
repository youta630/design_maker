'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GoogleAuthButton from '@/components/landing/GoogleAuthButton';
import PremiumRubiksCube from '@/components/landing/PremiumRubiksCube';
import { useScrollProgress } from '@/components/landing/useScrollProgress';

// Animation variants
const fadeIn = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.15
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
    <main className="relative min-h-screen bg-white text-black font-mono">
      {/* Premium 3D Rubik's Cube Background */}
      {isClient && (
        <PremiumRubiksCube 
          scrollProgress={scrollProgress}
          sectionIndex={currentSection}
          className="opacity-20"
        />
      )}

      {/* Fixed Google Auth Button */}
      <div className="fixed top-8 right-8 z-50">
        <GoogleAuthButton />
      </div>

      {/* Content */}
      <div className="relative z-10">
        
        {/* Hero */}
        <section className="min-h-screen flex items-center justify-center px-8">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-16"
            >
              <motion.h1 
                variants={fadeIn}
                className="text-6xl md:text-8xl font-bold tracking-tight leading-none"
              >
                snap2spec
              </motion.h1>
              
              <motion.div 
                variants={fadeIn}
                className="space-y-8"
              >
                <p className="text-xl md:text-2xl font-light max-w-2xl mx-auto leading-relaxed">
                  画像一枚から、完璧なUI仕様書を瞬時に生成。
                </p>
                <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                  複雑な指示は不要。あなたの感覚を理解し、独自のデザイン言語へと変換する新しいクリエイティブツール。
                </p>
              </motion.div>

              <motion.div 
                variants={fadeIn}
                className="pt-8"
              >
                <div className="inline-block px-8 py-4 border border-green-500 text-green-500 hover:bg-green-500 hover:text-white transition-all duration-300 cursor-pointer font-semibold">
                  今すぐ体験する
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Problem */}
        <section className="min-h-screen flex items-center justify-center px-8 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1.2 }}
              viewport={{ once: true }}
              className="space-y-24"
            >
              <h2 className="text-4xl md:text-6xl font-bold text-center">
                現在の限界
              </h2>
              
              <div className="grid md:grid-cols-3 gap-12">
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold">指示の複雑さ</h3>
                  <p className="text-gray-700 leading-relaxed">
                    「モダンで直感的な」「ユーザビリティを考慮した」「レスポンシブな」
                    <br /><br />
                    毎回同じような抽象的な指示を考案し、それでも意図とは異なる結果が返ってくる。
                    デザイナーがプロンプトエンジニアになってしまう現状。
                  </p>
                </div>
                
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold">パターンの限界</h3>
                  <p className="text-gray-700 leading-relaxed">
                    既存AIツールは学習データに基づく「よくあるパターン」を出力。
                    <br /><br />
                    どのプロジェクトも似たような見た目になり、真の独創性が生まれない。
                    クライアントごとの個性や差別化が困難。
                  </p>
                </div>
                
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold">感覚の言語化</h3>
                  <p className="text-gray-700 leading-relaxed">
                    頭の中にある漠然としたイメージ、感覚的な好み、ブランドの雰囲気。
                    <br /><br />
                    これらの微妙なニュアンスを言葉で表現するのは極めて困難で、
                    結果として意図しないデザインが生成される。
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Solution */}
        <section className="min-h-screen flex items-center justify-center px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1.2 }}
              viewport={{ once: true }}
              className="space-y-24"
            >
              <h2 className="text-4xl md:text-6xl font-bold text-center">
                snap2specの価値
              </h2>
              
              <div className="space-y-16">
                <div className="border-l-4 border-green-500 pl-8">
                  <h3 className="text-2xl font-bold mb-4">画像一枚で完結</h3>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    日常の写真、風景、アート作品、オブジェクト。
                    どんな画像からでも、その背後にある感覚、雰囲気、エネルギーを読み取り、
                    あなた独自のデザイン言語として翻訳します。
                    言語化の手間は一切不要。
                  </p>
                </div>
                
                <div className="border-l-4 border-green-500 pl-8">
                  <h3 className="text-2xl font-bold mb-4">人間の思考を再現</h3>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    リンゴ → 重力 → ニュートン → 発見 → 革新
                    <br /><br />
                    人間特有の連想の連鎖を再現し、複数の思考パスから最も創造的で
                    適切なコンセプトを選択。テンプレートではない、
                    真に独創的なデザインアイデアが生まれます。
                  </p>
                </div>
                
                <div className="border-l-4 border-green-500 pl-8">
                  <h3 className="text-2xl font-bold mb-4">即座に実装可能</h3>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    生成されるのは詳細なJSON仕様書。
                    カラーパレット、タイポグラフィ、レイアウト、インタラクションまで完全定義。
                    v0、Cursor、Claude等のコーディングエージェントに
                    そのまま渡すだけで実装完了です。
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Process */}
        <section className="min-h-screen flex items-center justify-center px-8 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1.2 }}
              viewport={{ once: true }}
              className="space-y-24"
            >
              <h2 className="text-4xl md:text-6xl font-bold text-center">
                使用方法
              </h2>
              
              <div className="space-y-20">
                <div className="text-center space-y-8">
                  <div className="w-20 h-20 mx-auto border-4 border-green-500 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold">1</span>
                  </div>
                  <h3 className="text-2xl font-bold">画像をドロップ</h3>
                  <p className="text-gray-700 max-w-2xl mx-auto leading-relaxed">
                    日常の写真、アート作品、風景、オブジェクト。何でも構いません。
                    AIがその画像から色彩、形状、雰囲気、感情を読み取り、
                    あなただけのデザイン言語として解釈します。
                  </p>
                </div>
                
                <div className="text-center space-y-8">
                  <div className="w-20 h-20 mx-auto border-4 border-green-500 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold">2</span>
                  </div>
                  <h3 className="text-2xl font-bold">AI連想分析</h3>
                  <p className="text-gray-700 max-w-2xl mx-auto leading-relaxed">
                    画像から複数の連想パスを生成し、各パスを評価。
                    最も創造的でスクリーンタイプに適切なコンセプトを選択。
                    この過程で、テンプレートにはない独創的なアイデアが生まれます。
                  </p>
                </div>
                
                <div className="text-center space-y-8">
                  <div className="w-20 h-20 mx-auto border-4 border-green-500 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold">3</span>
                  </div>
                  <h3 className="text-2xl font-bold">JSON仕様書出力</h3>
                  <p className="text-gray-700 max-w-2xl mx-auto leading-relaxed">
                    選択されたコンセプトをベースに、実装レベルの詳細仕様書を生成。
                    コーディングエージェントにそのまま渡すだけで、
                    あなたの感覚を反映したUIが完成します。
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Before/After */}
        <section className="min-h-screen flex items-center justify-center px-8">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1.2 }}
              viewport={{ once: true }}
              className="space-y-24"
            >
              <h2 className="text-4xl md:text-6xl font-bold text-center">
                実際の違い
              </h2>
              
              <div className="grid md:grid-cols-2 gap-16">
                <div className="space-y-8">
                  <h3 className="text-2xl font-bold text-center">従来のアプローチ</h3>
                  <div className="border border-gray-300 rounded-lg p-8 space-y-6">
                    <div className="space-y-4">
                      <div className="text-sm text-gray-500">入力例:</div>
                      <div className="font-mono text-sm bg-gray-100 p-4 rounded">
                        モダンでクリーンなデザインで、ユーザビリティを考慮したレスポンシブなレイアウトで...
                      </div>
                    </div>
                    <div className="text-center text-gray-400">↓</div>
                    <div className="bg-gray-100 rounded-lg p-6 text-center">
                      <div className="text-gray-500">テンプレート的なデザイン</div>
                      <div className="text-xs text-gray-400 mt-2">どこでも見たことのある無難なUI</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <h3 className="text-2xl font-bold text-center">snap2spec</h3>
                  <div className="border border-green-500 rounded-lg p-8 space-y-6">
                    <div className="space-y-4">
                      <div className="text-sm text-gray-500">入力例:</div>
                      <div className="w-full h-20 bg-gradient-to-r from-blue-200 to-green-200 rounded border-2 border-dashed border-green-300 flex items-center justify-center">
                        <span className="text-sm text-green-700">画像1枚をドロップ</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-green-600">AI連想:</div>
                      <div className="font-mono text-xs text-green-600 bg-green-50 p-2 rounded my-2">
                        海 → 無限 → 展開 → 可能性 → 革新
                      </div>
                    </div>
                    <div className="bg-green-100 rounded-lg p-6 text-center">
                      <div className="text-green-700 font-semibold">独創的なデザイン仕様</div>
                      <div className="text-xs text-green-600 mt-2">あなただけのオリジナルUI</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8 pt-16 text-center">
                <div>
                  <div className="text-4xl font-bold text-green-500 mb-2">95%</div>
                  <div className="text-gray-600">作業時間短縮</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-green-500 mb-2">∞</div>
                  <div className="text-gray-600">デザインパターン</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-green-500 mb-2">10秒</div>
                  <div className="text-gray-600">画像から仕様書まで</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="min-h-screen flex items-center justify-center px-8 bg-black text-white">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1.2 }}
              viewport={{ once: true }}
              className="space-y-16"
            >
              <h2 className="text-4xl md:text-6xl font-bold">
                あなたの感覚を
                <br />
                デザインに
              </h2>
              
              <div className="space-y-8">
                <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                  無料で始められます。
                  クレジットカード不要、制限なし。
                </p>
                
                <div className="grid md:grid-cols-3 gap-8 text-sm">
                  <div className="border border-gray-700 rounded-lg p-6">
                    <div className="font-semibold text-green-400 mb-2">無料アカウント</div>
                    <div className="text-gray-400">登録のみで即座に利用開始</div>
                  </div>
                  <div className="border border-gray-700 rounded-lg p-6">
                    <div className="font-semibold text-green-400 mb-2">制限なし</div>
                    <div className="text-gray-400">生成回数無制限</div>
                  </div>
                  <div className="border border-gray-700 rounded-lg p-6">
                    <div className="font-semibold text-green-400 mb-2">即座に実装</div>
                    <div className="text-gray-400">JSONを直接エージェントに</div>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-block px-12 py-6 bg-green-500 text-black font-bold text-lg hover:bg-green-400 transition-all duration-300"
                >
                  今すぐ体験する
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

      </div>
    </main>
  );
}