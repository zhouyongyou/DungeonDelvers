// AltarFloatingStatsButton.tsx - 浮動升星統計按鈕
import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { BarChart3, TrendingUp } from 'lucide-react';
import { AltarHistoryStats } from './AltarHistoryStats';

export const AltarFloatingStatsButton: React.FC = () => {
  const { address } = useAccount();
  const [showStats, setShowStats] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!address) return null;

  return (
    <>
      {/* 浮動按鈕 */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="relative">
          {/* 主按鈕 */}
          <button
            onClick={() => setShowStats(true)}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 group"
            title="查看升星統計"
          >
            <BarChart3 className="w-6 h-6 transition-transform group-hover:rotate-12" />
          </button>

          {/* 展開提示 */}
          {isExpanded && (
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap shadow-lg border border-gray-600 animate-in slide-in-from-right-2 duration-200">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span>升星統計</span>
              </div>
              {/* 箭頭 */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-l-[6px] border-l-gray-800 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent"></div>
            </div>
          )}

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

      {/* 統計模態框 */}
      <AltarHistoryStats 
        isOpen={showStats} 
        onClose={() => setShowStats(false)} 
      />
    </>
  );
};