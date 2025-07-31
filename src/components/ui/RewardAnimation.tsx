// RewardAnimation.tsx - 獎勵獲得時的動畫效果
import React, { useEffect, useState } from 'react';
import { cn } from '../../utils/cn';

interface RewardAnimationProps {
  amount: string;
  currency?: string;
  isVisible: boolean;
  onComplete?: () => void;
}

export const RewardAnimation: React.FC<RewardAnimationProps> = ({
  amount,
  currency = 'SOUL',
  isVisible,
  onComplete
}) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);

  useEffect(() => {
    if (isVisible) {
      // 創建粒子效果
      const newParticles = Array.from({ length: 8 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100 - 50,
        y: Math.random() * 100 - 50
      }));
      setParticles(newParticles);

      // 清理粒子
      const timeout = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      {/* 主要金額顯示 */}
      <div className={cn(
        'text-6xl font-bold text-yellow-400 animate-bounce-in',
        'drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]'
      )}>
        +{amount} {currency}
      </div>

      {/* 金幣粒子 */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute animate-float-up text-4xl"
          style={{
            left: '50%',
            top: '50%',
            transform: `translate(${particle.x}px, ${particle.y}px)`,
          }}
        >
          💰
        </div>
      ))}

      {/* 光暈效果 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-96 h-96 bg-yellow-400/20 rounded-full animate-pulse-scale" />
      </div>
    </div>
  );
};

// 金幣飛向錢包的動畫
export const CoinToWalletAnimation: React.FC<{
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  onComplete?: () => void;
}> = ({ startPosition, endPosition, onComplete }) => {
  const [coins, setCoins] = useState<Array<{ id: number; delay: number }>>([]);

  useEffect(() => {
    // 創建多個金幣
    const newCoins = Array.from({ length: 5 }, (_, i) => ({
      id: Date.now() + i,
      delay: i * 100
    }));
    setCoins(newCoins);

    // 動畫完成後清理
    const timeout = setTimeout(() => {
      setCoins([]);
      onComplete?.();
    }, 1500);

    return () => clearTimeout(timeout);
  }, [onComplete]);

  return (
    <>
      {coins.map(coin => (
        <div
          key={coin.id}
          className="fixed text-2xl z-50 animate-fly-to-wallet"
          style={{
            left: startPosition.x,
            top: startPosition.y,
            '--end-x': `${endPosition.x - startPosition.x}px`,
            '--end-y': `${endPosition.y - startPosition.y}px`,
            animationDelay: `${coin.delay}ms`
          } as React.CSSProperties}
        >
          🪙
        </div>
      ))}
    </>
  );
};

// CSS 動畫（需要添加到 global CSS）
const animationStyles = `
@keyframes bounce-in {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes float-up {
  0% {
    opacity: 1;
    transform: translate(var(--x, 0), var(--y, 0));
  }
  100% {
    opacity: 0;
    transform: translate(var(--x, 0), calc(var(--y, 0) - 100px));
  }
}

@keyframes pulse-scale {
  0%, 100% {
    transform: scale(0.8);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.1;
  }
}

@keyframes fly-to-wallet {
  0% {
    transform: translate(0, 0) scale(1);
  }
  100% {
    transform: translate(var(--end-x), var(--end-y)) scale(0.5);
    opacity: 0;
  }
}

.animate-bounce-in {
  animation: bounce-in 0.6s ease-out;
}

.animate-float-up {
  animation: float-up 2s ease-out forwards;
}

.animate-pulse-scale {
  animation: pulse-scale 2s ease-in-out infinite;
}

.animate-fly-to-wallet {
  animation: fly-to-wallet 1s ease-in-out forwards;
}
`;