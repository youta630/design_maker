'use client';

import { motion } from 'framer-motion';
import GoogleAuthButton from '@/components/landing/GoogleAuthButton';

/**
 * Pricing Section Component
 * 
 * このコンポーネントは将来的にStripe課金システムが実装された際に
 * LPに戻すために保存されています。
 * 
 * 使用方法:
 * 1. LPのsections配列にpricing sectionを追加
 * 2. currentSection === 1の条件分岐でこのコンポーネントを使用
 */

interface PricingSectionProps {
  currentSection: number;
}

export default function PricingSection({ currentSection }: PricingSectionProps) {
  const pricingPlans = [
    { period: "月", price: "$7.99", duration: "USD/月", recommended: true },
    { period: "年", price: "$79.99", duration: "USD/年", savings: "約17%お得" }
  ];

  const pricingSectionData = {
    id: 1,
    title: "PRICING",
    subtitle: "SIMPLE & FAIR",
    description: "Choose the plan that fits your workflow",
    code: ""
  };

  if (currentSection !== 1) {
    return null;
  }

  return (
    <motion.div
      key="pricing"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto"
    >
      {pricingPlans.map((plan, index) => (
        <motion.div
          key={plan.period}
          className={`relative p-6 border-2 border-black bg-white ${plan.recommended ? 'shadow-xl transform scale-105' : 'shadow-lg'} rounded-lg`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + index * 0.1 }}
          whileHover={{ scale: 1.02 }}
          style={{ zIndex: 10 }}
        >
          {plan.recommended && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 text-xs font-bold tracking-wider rounded-full">
              人気No.1
            </div>
          )}
          <div className="text-center">
            <div className="text-sm font-bold text-gray-700 mb-2">
              {plan.period}間プラン
            </div>
            <div className="mb-4">
              <div className="text-4xl font-black text-black mb-1">
                {plan.price}
              </div>
              <div className="text-sm text-gray-600">
                {plan.duration}
              </div>
            </div>
            {plan.savings && (
              <div className="text-xs font-bold text-green-600 mb-3 bg-green-50 py-1 px-2 rounded border border-green-200">
                {plan.savings}
              </div>
            )}
            <GoogleAuthButton 
              className="px-6 py-3 bg-black text-white text-sm font-bold hover:bg-gray-800 w-full rounded-lg transition-all duration-200"
              redirectTo="/app/subscribe"
            >
              このプランを選択
            </GoogleAuthButton>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// Export section data for LP integration
export const pricingSectionData = {
  id: 1,
  title: "PRICING",
  subtitle: "SIMPLE & FAIR", 
  description: "Choose the plan that fits your workflow",
  code: ""
};