// 手機版統計卡片組件
import React from 'react';

interface StatItem {
  label: string;
  value: React.ReactNode;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'stable';
  };
  color?: string;
}

interface MobileStatsCardProps {
  title?: string;
  stats: StatItem[];
  className?: string;
  variant?: 'default' | 'compact';
}

export const MobileStatsCard: React.FC<MobileStatsCardProps> = ({
  title,
  stats,
  className = '',
  variant = 'default'
}) => {
  const isCompact = variant === 'compact';
  
  const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '→';
    }
  };
  
  const getTrendColor = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return 'text-green-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };
  
  return (
    <div className={`bg-gray-800 rounded-lg ${isCompact ? 'p-3' : 'p-4'} ${className}`}>
      {title && (
        <h3 className={`font-semibold text-white ${isCompact ? 'text-sm mb-2' : 'text-base mb-3'}`}>
          {title}
        </h3>
      )}
      
      <div className={`grid ${stats.length === 2 ? 'grid-cols-2' : stats.length >= 4 ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
        {stats.map((stat, index) => (
          <div key={index} className="space-y-1">
            <div className={`text-gray-400 ${isCompact ? 'text-xs' : 'text-sm'}`}>
              {stat.label}
            </div>
            <div className={`font-bold ${isCompact ? 'text-lg' : 'text-xl'} ${stat.color || 'text-white'}`}>
              {stat.value}
            </div>
            {stat.trend && (
              <div className={`flex items-center gap-1 ${isCompact ? 'text-xs' : 'text-sm'} ${getTrendColor(stat.trend.direction)}`}>
                <span>{getTrendIcon(stat.trend.direction)}</span>
                <span>{stat.trend.value}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// 手機版統計組 - 可橫向滾動
interface MobileStatsGroupProps {
  cards: Array<{
    id: string | number;
    title?: string;
    stats: StatItem[];
  }>;
  className?: string;
}

export const MobileStatsGroup: React.FC<MobileStatsGroupProps> = ({
  cards,
  className = ''
}) => {
  return (
    <div className={`overflow-x-auto -mx-4 px-4 ${className}`}>
      <div className="flex space-x-3 pb-2">
        {cards.map((card) => (
          <div key={card.id} className="flex-shrink-0 w-64">
            <MobileStatsCard
              title={card.title}
              stats={card.stats}
              variant="compact"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileStatsCard;