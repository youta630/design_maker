'use client';

import { useState, useEffect, useRef } from 'react';

interface ColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  className?: string;
}

const PRESET_COLORS = [
  '#000000', // Black
  '#1f2937', // Dark Gray
  '#3b82f6', // Blue
  '#7c3aed', // Purple
  '#dc2626', // Red
  '#16a34a', // Green
];

export default function ColorPicker({ currentColor, onColorChange, className = '' }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(currentColor);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update custom color when currentColor changes
  useEffect(() => {
    setCustomColor(currentColor);
  }, [currentColor]);

  const handlePresetColorClick = (color: string) => {
    onColorChange(color);
    setCustomColor(color);
    setIsOpen(false);
  };

  const handleCustomColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const color = event.target.value;
    setCustomColor(color);
    onColorChange(color);
  };

  const handleCustomColorBlur = () => {
    // Validate and apply custom color
    if (/^#[0-9A-Fa-f]{6}$/.test(customColor)) {
      onColorChange(customColor);
    } else {
      setCustomColor(currentColor);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Color Picker Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
        title="ボタンカラーを変更"
        aria-label="カラーピッカーを開く"
      >
        <div className="flex items-center space-x-2">
          <div 
            className="w-5 h-5 rounded border border-gray-300"
            style={{ backgroundColor: currentColor }}
          />
          <svg 
            className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[240px]">
          {/* Header */}
          <div className="mb-3">
            <h3 className="text-sm font-medium text-gray-900 mb-1">ボタンカラーを選択</h3>
            <p className="text-xs text-gray-600">メインボタンの色をカスタマイズできます</p>
          </div>

          {/* Preset Colors Grid */}
          <div className="mb-4">
            <div className="grid grid-cols-3 gap-3">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handlePresetColorClick(color)}
                  className={`w-10 h-10 rounded-lg border-2 hover:scale-105 transition-all duration-200 ${
                    currentColor === color 
                      ? 'border-gray-500 ring-2 ring-blue-500 ring-offset-2' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                  aria-label={`色を選択: ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Custom Color Input */}
          <div className="border-t border-gray-200 pt-3">
            <div className="text-xs font-medium text-gray-700 mb-2">カスタムカラー</div>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                title="カラーピッカーで色を選択"
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                onBlur={handleCustomColorBlur}
                placeholder="#000000"
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              HEXカラーコード（例: #1a73e8）
            </div>
          </div>

          {/* Reset Button */}
          <div className="border-t border-gray-200 pt-3 mt-3">
            <button
              onClick={() => handlePresetColorClick('#000000')}
              className="w-full px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              デフォルトに戻す
            </button>
          </div>
        </div>
      )}
    </div>
  );
}