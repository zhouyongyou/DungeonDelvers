// src/components/ui/PartyTierBadge.tsx
// 隊伍等級徽章組件 - 顯示隊伍的戰力等級

import React from 'react';
import { getPartyTier, getPartyTierStyles, formatPowerDisplay, getNextTierInfo } from '../../utils/partyTiers';

interface PartyTierBadgeProps {
  totalPower: number | bigint;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PartyTierBadge: React.FC<PartyTierBadgeProps> = ({ 
  totalPower, 
  showProgress = false,
  size = 'md',
  className = ''
}) => {
  const power = Number(totalPower);
  const tier = getPartyTier(power);
  const styles = getPartyTierStyles(power);
  const { nextTier, powerNeeded, percentage } = getNextTierInfo(power);
  
  // 尺寸樣式
  const sizeStyles = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };
  
  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      {/* 等級徽章 */}
      <div 
        className={`${sizeStyles[size]} rounded-lg font-bold text-white relative overflow-hidden`}
        style={{
          backgroundColor: styles.color,
          border: `2px solid ${styles.borderColor}`,
          boxShadow: styles.boxShadow
        }}
      >
        {/* 光暈效果 */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at center, ${styles.color}40 0%, transparent 70%)`
          }}
        />
        
        {/* 等級名稱 */}
        <span className="relative z-10">
          {tier.displayName}
        </span>
        
        {/* 戰力值 */}
        <span className="relative z-10 ml-2 opacity-90">
          ({formatPowerDisplay(power)})
        </span>
      </div>
      
      {/* 進度條 */}
      {showProgress && nextTier && (
        <div className="mt-2 w-full max-w-xs">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>升級進度</span>
            <span>{powerNeeded.toLocaleString()} 戰力到 {nextTier.displayName}</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-300"
              style={{
                width: `${percentage}%`,
                backgroundColor: tier.color
              }}
            />
          </div>
          <div className="text-center text-xs text-gray-400 mt-1">
            {percentage.toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  );
};

// 迷你版本 - 只顯示圖標和等級
export const PartyTierIcon: React.FC<{
  totalPower: number | bigint;
  size?: number;
  showTooltip?: boolean;
}> = ({ totalPower, size = 24, showTooltip = true }) => {
  const tier = getPartyTier(Number(totalPower));
  const styles = getPartyTierStyles(totalPower);
  
  return (
    <div 
      className="relative inline-flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: styles.color,
        border: `2px solid ${styles.borderColor}`,
        boxShadow: styles.boxShadow
      }}
      title={showTooltip ? `${tier.displayName} (${formatPowerDisplay(totalPower)})` : undefined}
    >
      <span className="text-white font-bold" style={{ fontSize: size * 0.5 }}>
        {tier.name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
};