// AltarRitualAnimation.tsx - 祭壇儀式動畫效果組件
import React, { useState, useEffect } from 'react';

interface AltarRitualAnimationProps {
  isActive: boolean;
  stage: 'idle' | 'preparing' | 'ritual' | 'success' | 'great_success' | 'failed';
  selectedCount: number;
  requiredCount: number;
  onAnimationComplete?: () => void;
}

export const AltarRitualAnimation: React.FC<AltarRitualAnimationProps> = ({
  isActive,
  stage,
  selectedCount,
  requiredCount,
  onAnimationComplete
}) => {
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    if (stage === 'ritual') {
      setAnimationKey(prev => prev + 1);
      // 儀式動畫持續 3 秒後回調
      const timer = setTimeout(() => {
        onAnimationComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [stage, onAnimationComplete]);

  const getAltarGlow = () => {
    switch (stage) {
      case 'preparing':
        return 'shadow-2xl shadow-purple-500/30';
      case 'ritual':
        return 'shadow-2xl shadow-yellow-500/50 animate-pulse';
      case 'success':
        return 'shadow-2xl shadow-green-500/60';
      case 'great_success':
        return 'shadow-2xl shadow-purple-500/80';
      case 'failed':
        return 'shadow-2xl shadow-red-500/50';
      default:
        return 'shadow-lg shadow-gray-500/20';
    }
  };

  const getRitualText = () => {
    switch (stage) {
      case 'preparing':
        return '祭壇準備中...';
      case 'ritual':
        return '神秘儀式進行中...';
      case 'success':
        return '祝福降臨！';
      case 'great_success':
        return '神跡顯現！';
      case 'failed':
        return '祭品消散...';
      default:
        return '古老的祭壇靜靜等待著祭品...';
    }
  };

  const getSacrificeSlots = () => {
    const slots = [];
    const radius = 120;
    const centerX = 160;
    const centerY = 160;

    for (let i = 0; i < requiredCount; i++) {
      const angle = (i * 2 * Math.PI) / requiredCount - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      const isOccupied = i < selectedCount;
      const isRitualActive = stage === 'ritual';

      slots.push(
        <div
          key={i}
          className={`absolute w-12 h-12 rounded-full border-2 transition-all duration-500 ${
            isOccupied
              ? 'bg-gradient-to-br from-purple-500 to-indigo-600 border-purple-300 shadow-lg shadow-purple-500/50'
              : 'bg-gray-800/50 border-gray-600 border-dashed'
          } ${
            isRitualActive && isOccupied ? 'animate-bounce' : ''
          }`}
          style={{
            left: x - 24,
            top: y - 24,
            animationDelay: `${i * 0.2}s`
          }}
        >
          {isOccupied && (
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
              {i + 1}
            </div>
          )}
          
          {/* 祭品能量效果 */}
          {isOccupied && stage === 'ritual' && (
            <div className="absolute inset-0 rounded-full">
              {Array.from({ length: 6 }).map((_, particleIndex) => (
                <div
                  key={`${animationKey}-${i}-${particleIndex}`}
                  className="absolute w-1 h-1 bg-purple-400 rounded-full animate-ping"
                  style={{
                    left: '50%',
                    top: '50%',
                    animationDelay: `${particleIndex * 0.3}s`,
                    animationDuration: '1.5s'
                  }}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    return slots;
  };

  return (
    <div className="relative w-80 h-80 mx-auto">
      {/* 祭壇基座 */}
      <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border-4 border-gray-600 transition-all duration-1000 ${getAltarGlow()}`}>
        {/* 祭壇中心 */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 border-2 border-purple-400">
          {/* 中心寶石 */}
          <div className={`w-full h-full rounded-full transition-all duration-1000 ${
            stage === 'ritual' 
              ? 'bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse shadow-lg shadow-yellow-500/50'
              : stage === 'great_success'
              ? 'bg-gradient-to-br from-purple-400 to-pink-500 shadow-lg shadow-purple-500/50'
              : stage === 'success'
              ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/50'  
              : stage === 'failed'
              ? 'bg-gradient-to-br from-red-400 to-red-600 shadow-lg shadow-red-500/50'
              : 'bg-gradient-to-br from-purple-600 to-indigo-700'
          }`}>
            <div className="w-full h-full flex items-center justify-center text-white text-2xl">
              {stage === 'success' && '✨'}
              {stage === 'great_success' && '⚜️'}
              {stage === 'failed' && '💀'}
              {(stage === 'idle' || stage === 'preparing') && '🔮'}
              {stage === 'ritual' && '⚡'}
            </div>
          </div>
        </div>

        {/* 祭壇符文圈 */}
        <div className="absolute inset-4 rounded-full border-2 border-dashed border-purple-500/30">
          {/* 符文標記 */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * 45) - 90;
            return (
              <div
                key={i}
                className={`absolute w-3 h-3 bg-purple-500 rounded-full transition-all duration-1000 ${
                  stage === 'ritual' ? 'animate-pulse' : ''
                }`}
                style={{
                  left: '50%',
                  top: '0',
                  transform: `rotate(${angle}deg) translateY(-2px)`,
                  transformOrigin: '50% 140px'
                }}
              />
            );
          })}
        </div>

        {/* 祭品放置槽 */}
        {getSacrificeSlots()}

        {/* 能量波動效果 */}
        {stage === 'ritual' && (
          <div className="absolute inset-0 rounded-full">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`${animationKey}-wave-${i}`}
                className="absolute inset-0 rounded-full border-2 border-purple-400/30 animate-ping"
                style={{
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: '2s'
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 狀態文字 */}
      <div className="absolute -bottom-8 left-0 right-0 text-center">
        <p className={`text-sm font-medium transition-all duration-500 ${
          stage === 'success' 
            ? 'text-green-400'
            : stage === 'great_success'
            ? 'text-purple-400'
            : stage === 'failed'
            ? 'text-red-400'
            : stage === 'ritual'
            ? 'text-yellow-400 animate-pulse'
            : 'text-gray-400'
        }`}>
          {getRitualText()}
        </p>
      </div>

      {/* 背景粒子效果 */}
      {isActive && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={`${animationKey}-particle-${i}`}
              className="absolute w-1 h-1 bg-purple-400/60 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}

      {/* 成功光效 */}
      {(stage === 'success' || stage === 'great_success') && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent animate-pulse rounded-full"></div>
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = i * 30;
            return (
              <div
                key={`success-ray-${i}`}
                className="absolute w-1 h-20 bg-gradient-to-t from-yellow-400/80 to-transparent"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `rotate(${angle}deg) translateY(-60px)`,
                  transformOrigin: '50% 60px',
                  animation: 'fadeInOut 2s ease-in-out infinite',
                  animationDelay: `${i * 0.1}s`
                }}
              />
            );
          })}
        </div>
      )}

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.4; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.8; }
        }
        
        @keyframes fadeInOut {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};