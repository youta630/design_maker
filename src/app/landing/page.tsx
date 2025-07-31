'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GoogleAuthButton from '@/components/landing/GoogleAuthButton';
import EnhancedRubiksCube from '@/components/landing/EnhancedRubiksCube';
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
      setCurrentSection(Math.min(sectionIndex, 5)); // 0-5の範囲に制限
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main className="relative min-h-screen bg-white">
      {/* Enhanced 3D Rubik's Cube Background */}
      {isClient && (
        <EnhancedRubiksCube 
          scrollProgress={scrollProgress}
          sectionIndex={currentSection}
          className="opacity-60"
        />
      )}

      {/* Fixed Google Auth Button - Top Right */}
      <div className="fixed top-6 right-6 z-50">
        <GoogleAuthButton />
      </div>

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
              
              <motion.div 
                variants={fadeInUp}
                className="max-w-4xl mx-auto"
              >
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
                  <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-6">
                    画像1枚からUI仕様書を自動生成するAIツールです。<br />
                    従来のテンプレート的なAIデザインではなく、あなたの感覚を読み取り、
                    独自の連想システムによって創造的なデザイン仕様を作成します。
                  </p>
                  <div className="grid md:grid-cols-3 gap-6 text-center">
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-600 mb-2">1枚の画像</div>
                      <div className="text-sm text-gray-600">複雑な説明は不要</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-600 mb-2">AI連想</div>
                      <div className="text-sm text-gray-600">人間のような発想</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-600 mb-2">JSON出力</div>
                      <div className="text-sm text-gray-600">すぐに実装可能</div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                variants={fadeInUp}
                className="mt-8"
              >
                <div className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3l7 4v6l-7 4-7-4V7l7-4z" clipRule="evenodd" />
                  </svg>
                  今すぐ体験する
                </div>
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
              
              <div className="grid md:grid-cols-1 gap-8">
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-red-200 shadow-xl">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-black mb-4">
                        現在のAIデザイン生成の限界
                      </h3>
                      <div className="space-y-4 text-gray-700">
                        <p className="leading-relaxed">
                          <strong>プロンプト設計の複雑さ：</strong>
                          「モダンでクリーンな...」「レスポンシブで...」「ユーザビリティを考慮した...」
                          毎回同じような抽象的な指示を考えるのに多大な時間を要します。
                          結果的に、デザイナーがプロンプトエンジニアになってしまう現状があります。
                        </p>
                        <p className="leading-relaxed">
                          <strong>テンプレート化された出力：</strong>
                          既存のAIツールは学習データに基づく「よくあるパターン」を出力するため、
                          どのプロジェクトも似たような見た目になりがちです。
                          真の創造性や独自性が生まれにくい構造的な問題があります。
                        </p>
                        <p className="leading-relaxed">
                          <strong>感覚の言語化の困難さ：</strong>
                          頭の中にあるモヤモヤしたイメージ、感覚的な好み、ブランドの雰囲気など、
                          言葉では表現しきれない微妙なニュアンスを伝えることは非常に困難です。
                          結果として、意図したものとは異なるデザインが生成されることが多々あります。
                        </p>
                      </div>
                    </div>
                  </div>
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
              
              <div className="grid md:grid-cols-1 gap-8">
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-green-200 shadow-xl">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-black mb-4">
                        snap2specの革新的アプローチ
                      </h3>
                      <div className="space-y-6">
                        <div className="bg-green-50 rounded-lg p-6">
                          <h4 className="font-bold text-green-800 mb-3">🎯 画像から直接感覚を読み取り</h4>
                          <p className="text-gray-700 leading-relaxed">
                            複雑なプロンプトは一切不要。日常の写真、風景、オブジェクト、アート作品など、
                            どんな画像からでもAIがその背後にある感覚、雰囲気、エネルギーを理解します。
                            言語化できない微妙なニュアンスも、視覚情報から直接キャッチします。
                          </p>
                        </div>
                        
                        <div className="bg-blue-50 rounded-lg p-6">
                          <h4 className="font-bold text-blue-800 mb-3">🧠 人間のような連想思考システム</h4>
                          <p className="text-gray-700 leading-relaxed">
                            「リンゴ→重力→ニュートン→発見→革新」のような人間特有の連想の連鎖を再現。
                            画像から複数の連想パスを生成し、最も創造的で適切なコンセプトを選択します。
                            テンプレートではなく、真に独創的なデザインアイデアが生まれます。
                          </p>
                        </div>
                        
                        <div className="bg-purple-50 rounded-lg p-6">
                          <h4 className="font-bold text-purple-800 mb-3">⚡ 即座に実装可能なJSON仕様書</h4>
                          <p className="text-gray-700 leading-relaxed">
                            生成されるのは詳細なJSON形式の設計仕様書。カラーパレット、タイポグラフィ、
                            レイアウト、インタラクションパターンまで完全に定義されているため、
                            v0、Cursor、ChatGPTなどのコーディングエージェントにそのまま渡すだけで実装完了。
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
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
              
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    step: "1",
                    title: "画像アップロード",
                    description: "日常の写真、風景、オブジェクト、アート作品など、どんな画像でもOK。ドラッグ＆ドロップで簡単アップロード。AIがその画像から色彩、形、雰囲気、エモーションなど、あらゆる要素を読み取ります。",
                    icon: "upload",
                    color: "blue"
                  },
                  {
                    step: "2", 
                    title: "AI連想分析",
                    description: "画像から複数の連想パスを生成。例：リンゴ→重力→ニュートン→発見→革新。各パスを評価し、最も創造的でスクリーンタイプに適切なコンセプトを選択。テンプレートではない、真に独創的なアイデアが生まれます。",
                    icon: "brain",
                    color: "green"
                  },
                  {
                    step: "3",
                    title: "JSON仕様書生成",
                    description: "選択されたコンセプトをベースに、詳細なUI仕様書をJSON形式で出力。カラーパレット、タイポグラフィ、レイアウト、コンポーネント構造、インタラクションまで完全定義。v0、Cursor、Claudeなどにそのまま渡すだけで実装完了です。",
                    icon: "code",
                    color: "purple"
                  }
                ].map((item, index) => {
                  const iconComponents = {
                    upload: (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    ),
                    brain: (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    ),
                    code: (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    )
                  };
                  
                  const colorClasses = {
                    blue: { bg: 'bg-blue-500', border: 'border-blue-200', card: 'bg-blue-50' },
                    green: { bg: 'bg-green-500', border: 'border-green-200', card: 'bg-green-50' },
                    purple: { bg: 'bg-purple-500', border: 'border-purple-200', card: 'bg-purple-50' }
                  };
                  
                  const colors = colorClasses[item.color as keyof typeof colorClasses];
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 60 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: index * 0.2 }}
                      viewport={{ once: true }}
                      className={`${colors.card} rounded-2xl p-8 border ${colors.border} shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105`}
                    >
                      <div className={`w-16 h-16 ${colors.bg} rounded-full flex items-center justify-center text-white font-bold text-xl mb-6 mx-auto`}>
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {iconComponents[item.icon as keyof typeof iconComponents]}
                        </svg>
                      </div>
                      <div className="text-center">
                        <h3 className="text-xl font-bold text-black mb-4">
                          {item.step}. {item.title}
                        </h3>
                        <p className="text-gray-700 leading-relaxed text-sm">
                          {item.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
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
              
              <div className="grid md:grid-cols-2 gap-12">
                {/* Before - Traditional Approach */}
                <div className="bg-red-50 rounded-2xl p-8 border border-red-200">
                  <h4 className="text-xl font-bold text-red-800 mb-6 text-center">🚫 従来のAIデザイン</h4>
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-red-100">
                      <div className="text-sm text-gray-600 mb-2">プロンプト例：</div>
                      <div className="text-xs text-red-700 font-mono bg-red-50 p-2 rounded">
                        &ldquo;モダンでクリーンなデザインで、ユーザビリティを考慮したレスポンシブなレイアウトで...&rdquo;
                      </div>
                    </div>
                    <div className="text-center text-sm text-gray-500">↓ 結果</div>
                    <div className="bg-gray-100 rounded-lg p-4 text-center">
                      <div className="text-gray-500 text-sm">📝 テンプレート的なデザイン</div>
                      <div className="text-xs text-gray-400 mt-2">どこでも見たことのある無難なデザイン</div>
                    </div>
                  </div>
                </div>

                {/* After - snap2spec Approach */}
                <div className="bg-green-50 rounded-2xl p-8 border border-green-200">
                  <h4 className="text-xl font-bold text-green-800 mb-6 text-center">✨ snap2specのアプローチ</h4>
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-green-100">
                      <div className="text-sm text-gray-600 mb-2">入力：</div>
                      <div className="w-full h-16 bg-gradient-to-r from-blue-200 to-green-200 rounded border-2 border-dashed border-green-300 flex items-center justify-center">
                        <span className="text-xs text-green-700">🇫🇯 画像1枚をドロップ</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">↓ AI連想分析</div>
                      <div className="text-xs text-green-600 font-mono bg-green-50 p-2 rounded my-2">
                        &ldquo;海 → 無限 → 展開 → 可能性 → 革新&rdquo;
                      </div>
                    </div>
                    <div className="bg-green-100 rounded-lg p-4 text-center">
                      <div className="text-green-700 text-sm font-semibold">🎆 独創的なデザイン仕様</div>
                      <div className="text-xs text-green-600 mt-2">あなただけのオリジナルデザイン</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-12 bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-8 border border-blue-200">
                <h4 className="text-xl font-bold text-center mb-6">📊 実際の違い</h4>
                <div className="grid md:grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-3xl font-bold text-blue-600 mb-2">95%</div>
                    <div className="text-sm text-gray-600">プロンプト作成時間短縮</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-600 mb-2">3x</div>
                    <div className="text-sm text-gray-600">デザインの独創性向上</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-purple-600 mb-2">10秒</div>
                    <div className="text-sm text-gray-600">画像から仕様書まで</div>
                  </div>
                </div>
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
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl mb-8">
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  無料で始められます。あなただけの感覚をデザインに変えてみませんか？<br />
                  今すぐ登録して、早速体験してみてください。
                </p>
                <div className="grid md:grid-cols-3 gap-4 text-center text-sm">
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="font-semibold text-green-800">✓ 無料アカウント</div>
                    <div className="text-green-600">クレジットカード不要</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="font-semibold text-blue-800">✓ 即座使用開始</div>
                    <div className="text-blue-600">登録後すぐに使用可能</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="font-semibold text-purple-800">✓ 制限なし</div>
                    <div className="text-purple-600">生成回数無制限</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center space-y-6">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center justify-center px-12 py-5 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3l7 4v6l-7 4-7-4V7l7-4z" clipRule="evenodd" />
                  </svg>
                  無料で始める
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