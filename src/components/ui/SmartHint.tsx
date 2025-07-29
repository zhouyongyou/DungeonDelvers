// src/components/ui/SmartHint.tsx
// 智能提示組件 - 在關鍵決策點顯示數據洞察

import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface SmartHintProps {
  icon?: string;
  text: string;
  color?: string;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showBackground?: boolean;
}

export const SmartHint: React.FC<SmartHintProps> = ({
  icon = '💡',
  text,
  color = 'text-gray-400',
  isLoading = false,
  size = 'sm',
  showBackground = true
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2', 
    lg: 'text-base px-4 py-3'
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${sizeClasses[size]} ${showBackground ? 'bg-gray-800 rounded-lg' : ''}`}>
        <LoadingSpinner size="xs" />
        <span className="text-gray-500">分析中...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${sizeClasses[size]} ${showBackground ? 'bg-gray-800 rounded-lg' : ''}`}>
      <span className="text-sm">{icon}</span>
      <span className={color}>{text}</span>
    </div>
  );
};

// 成功率指示器
interface SuccessRateIndicatorProps {
  rate: number;
  label?: string;
  showPercentage?: boolean;
}

export const SuccessRateIndicator: React.FC<SuccessRateIndicatorProps> = ({
  rate,
  label = '成功率',
  showPercentage = true
}) => {
  const getColor = (rate: number) => {
    if (rate >= 80) return 'text-green-400 bg-green-400/20';
    if (rate >= 60) return 'text-blue-400 bg-blue-400/20';
    if (rate >= 40) return 'text-yellow-400 bg-yellow-400/20';
    return 'text-red-400 bg-red-400/20';
  };

  const getIcon = (rate: number) => {
    if (rate >= 80) return '🎯';
    if (rate >= 60) return '✅';
    if (rate >= 40) return '⚠️';
    return '❌';
  };

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getColor(rate)}`}>
      <span>{getIcon(rate)}</span>
      <span>{label}</span>
      {showPercentage && <span className="font-medium">{rate}%</span>}
    </div>
  );
};

// 進度徽章
interface ProgressBadgeProps {
  current: number;
  next: number;
  label: string;
  icon?: string;
}

export const ProgressBadge: React.FC<ProgressBadgeProps> = ({
  current,
  next,
  label,
  icon = '⭐'
}) => {
  const progress = Math.min((current / next) * 100, 100);
  
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-sm text-gray-300">{label}</span>
        </div>
        <span className="text-xs text-gray-500">{current}/{next}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1.5">
        <div 
          className="bg-[#C0A573] h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      {progress >= 100 && (
        <div className="text-xs text-green-400 mt-1">🎉 達成！</div>
      )}
    </div>
  );
};

// 統計數字卡片
interface StatCardProps {
  number: string;
  label: string;
  trend?: string;
  icon?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatCard: React.FC<StatCardProps> = ({
  number,
  label,
  trend,
  icon,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const numberSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  return (
    <div className={`bg-gray-800 rounded-lg ${sizeClasses[size]} text-center`}>
      {icon && <div className="text-2xl mb-2">{icon}</div>}
      <div className={`font-bold text-white ${numberSizeClasses[size]}`}>
        {number}
      </div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
      {trend && (
        <div className="text-xs text-[#C0A573] mt-1">{trend}</div>
      )}
    </div>
  );
};

// 智能價格顯示
interface SmartPriceProps {
  currentPrice: string;
  lastUpdated?: number;
  currency?: string;
  showTrend?: boolean;
}

export const SmartPrice: React.FC<SmartPriceProps> = ({
  currentPrice,
  lastUpdated,
  currency = 'USD',
  showTrend = true
}) => {
  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    
    if (diff < 60) return '剛剛更新';
    if (diff < 3600) return `${Math.floor(diff / 60)}分鐘前更新`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小時前更新`;
    return `${Math.floor(diff / 86400)}天前更新`;
  };

  return (
    <div className="text-right">
      <div className="text-[#C0A573] font-medium">
        ${currentPrice} {currency}
      </div>
      {lastUpdated && (
        <div className="text-xs text-gray-500 mt-1">
          {formatTimeAgo(lastUpdated)}
        </div>
      )}
    </div>
  );
};