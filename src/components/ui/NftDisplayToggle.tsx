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
        bg-gray-700 hover:bg-gray-600
        border border-gray-600 hover:border-gray-500
        rounded-lg transition-all
        text-gray-300 hover:text-white
        ${className}
      `}
      title={`切換到 ${displayMode === 'svg' ? 'PNG' : 'SVG'} 顯示`}
    >
      {/* 圖標 */}
      <span className="text-lg">
        {displayMode === 'svg' ? (
          // SVG 圖標
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 9l6 6M15 9l-6 6" />
          </svg>
        ) : (
          // PNG 圖標
          '🖼️'
        )}
      </span>
      
      {/* 標籤 */}
      {showLabel && (
        <span>
          {displayMode === 'svg' ? 'SVG' : 'PNG'}
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