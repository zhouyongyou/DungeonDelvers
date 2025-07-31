// AltarFloatingStatsButton.tsx - 浮動升星統計按鈕
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAccount } from 'wagmi';
import { BarChart3, TrendingUp } from 'lucide-react';
import { AltarHistoryStats } from './AltarHistoryStats';

export const AltarFloatingStatsButton: React.FC = () => {
  const { address } = useAccount();
  const [showStats, setShowStats] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!address) return null;

  // 使用 Portal 確保按鈕真正固定在視窗右下角
  const floatingButton = (
    <div 
      className="z-50" 
      style={{ 
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 9999,
        pointerEvents: 'auto'
      }}
    >
      <div className="relative group">
        {/* 按鈕容器 - 右下角布局 */}
        <div className="relative flex flex-col items-end">
          {/* 初始顯示的中文標籤 - 在按鈕上方 */}
          <div className="mb-3 bg-gray-800/90 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap shadow-lg border border-gray-600/50 opacity-80 group-hover:opacity-100 transition-all duration-300">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span>升星統計</span>
            </div>
            {/* 箭頭向下 */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-t-[6px] border-t-gray-800/90 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent"></div>
          </div>
          
          {/* 主按鈕 */}
          <div className="relative">
            {/* 脈動環效果 */}
            <div className="absolute inset-0 rounded-full bg-purple-600 animate-ping opacity-20"></div>
            
            <button
              onClick={() => setShowStats(true)}
              onMouseEnter={() => setIsExpanded(true)}
              onMouseLeave={() => setIsExpanded(false)}
              className="relative bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-full p-4 shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-110 ring-2 ring-purple-400/30 hover:ring-purple-400/50"
              title="查看升星統計"
            >
              <BarChart3 className="w-6 h-6 transition-transform group-hover:rotate-12" />
            </button>

            {/* 裝飾性粒子效果 */}
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-purple-400/30 rounded-full animate-pulse"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${20 + Math.random() * 60}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Hover時的額外提示 - 在按鈕左側 */}
        {isExpanded && (
          <div className="absolute right-full mr-3 bottom-0 bg-gray-800/95 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-lg border border-gray-600/50 animate-in fade-in-0 slide-in-from-right-2 duration-200">
            <div className="text-center">
              <div className="text-purple-300 font-medium">點擊查看詳細統計</div>
              <div className="text-gray-400 text-[10px] mt-1">成功率 · 歷史記錄 · 收益分析</div>
            </div>
            {/* 箭頭向右 */}
            <div className="absolute left-full bottom-1/2 translate-y-1/2 w-0 h-0 border-l-[6px] border-l-gray-800/95 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent"></div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 使用 Portal 渲染到 body，確保真正的視窗固定定位 */}
      {createPortal(floatingButton, document.body)}
      
      {/* 統計模態框 */}
      <AltarHistoryStats 
        isOpen={showStats} 
        onClose={() => setShowStats(false)} 
      />
    </>
  );
};