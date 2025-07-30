// src/components/ui/NftDisplayToggle.tsx
// NFT 顯示模式切換按鈕（SVG/PNG）

import React from 'react';
import { useNftDisplay } from '../../hooks/useNftDisplayPreference';

interface NftDisplayToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const NftDisplayToggle: React.FC<NftDisplayToggleProps> = ({ 
  className = '', 
  size = 'md',
  showLabel = true 
}) => {
  const { displayMode, toggleDisplayMode } = useNftDisplay();
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };
  
  return (
    <button
      onClick={toggleDisplayMode}
      className={`
        ${sizeClasses[size]}
        flex items-center gap-2
        bg-gradient-to-r ${displayMode === 'svg' ? 'from-blue-600 to-blue-700' : 'from-green-600 to-green-700'}
        hover:${displayMode === 'svg' ? 'from-blue-500 to-blue-600' : 'from-green-500 to-green-600'}
        border ${displayMode === 'svg' ? 'border-blue-500' : 'border-green-500'}
        rounded-lg transition-all shadow-lg
        text-white font-medium
        ${className}
      `}
      title={`切換到 ${displayMode === 'svg' ? 'PNG' : 'SVG'} 顯示`}
    >
      {/* 圖標 */}
      <span className="flex items-center">
        {displayMode === 'svg' ? (
          // SVG 圖標
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10,19L8,14H10L12,19H10M14,19L12,14H14L16,19H14Z"/>
          </svg>
        ) : (
          // PNG 圖標
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z"/>
          </svg>
        )}
      </span>
      
      {/* 標籤 */}
      {showLabel && (
        <span className="uppercase tracking-wide">
          {displayMode === 'svg' ? 'SVG' : 'PNG'} 模式
        </span>
      )}
    </button>
  );
};

// 迷你版本 - 只有圖標
export const NftDisplayToggleMini: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { displayMode, toggleDisplayMode } = useNftDisplay();
  
  return (
    <button
      onClick={toggleDisplayMode}
      className={`
        p-1.5 rounded-md
        bg-gray-800/50 hover:bg-gray-700/50
        border border-gray-700 hover:border-gray-600
        transition-all
        ${className}
      `}
      title={`顯示模式: ${displayMode.toUpperCase()} (點擊切換)`}
    >
      <div className="relative w-5 h-5">
        {/* 背景指示器 */}
        <div className={`
          absolute inset-0 rounded-sm transition-colors
          ${displayMode === 'svg' ? 'bg-blue-500/20' : 'bg-green-500/20'}
        `} />
        
        {/* 文字 */}
        <span className={`
          absolute inset-0 flex items-center justify-center
          text-xs font-bold
          ${displayMode === 'svg' ? 'text-blue-400' : 'text-green-400'}
        `}>
          {displayMode === 'svg' ? 'S' : 'P'}
        </span>
      </div>
    </button>
  );
};

// 切換開關樣式
export const NftDisplaySwitch: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { displayMode, toggleDisplayMode } = useNftDisplay();
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`text-sm ${displayMode === 'png' ? 'text-gray-300' : 'text-gray-500'}`}>
        PNG
      </span>
      
      <button
        onClick={toggleDisplayMode}
        className="relative w-12 h-6 bg-gray-700 rounded-full transition-colors hover:bg-gray-600"
      >
        <div className={`
          absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full 
          transition-transform duration-200
          ${displayMode === 'svg' ? 'translate-x-6' : 'translate-x-0'}
        `} />
      </button>
      
      <span className={`text-sm ${displayMode === 'svg' ? 'text-gray-300' : 'text-gray-500'}`}>
        SVG
      </span>
    </div>
  );
};