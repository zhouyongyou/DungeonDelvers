// 懶加載排行榜標籤組件
import React, { useState, memo } from 'react';
import { LeaderboardSystem } from './LeaderboardSystem';
import { type LeaderboardType } from '../../hooks/useLeaderboardData';
import { cn } from '../../utils/cn';

interface LazyLeaderboardTabsProps {
  defaultType?: LeaderboardType;
  limit?: number;
  className?: string;
}

// 排行榜配置（按負載從低到高排序）
const LEADERBOARD_CONFIGS = [
  { type: 'totalEarnings' as LeaderboardType, label: '💰 總收益', priority: 1, loadWeight: 'medium' },
  { type: 'partyPower' as LeaderboardType, label: '🛡️ 隊伍戰力', priority: 2, loadWeight: 'low' },
  { type: 'vipLevel' as LeaderboardType, label: '👑 VIP 等級', priority: 3, loadWeight: 'low' },
  { type: 'dungeonClears' as LeaderboardType, label: '⚔️ 通關次數', priority: 4, loadWeight: 'medium' },
  { type: 'playerLevel' as LeaderboardType, label: '🎯 玩家等級', priority: 5, loadWeight: 'low' },
  { type: 'upgradeAttempts' as LeaderboardType, label: '⚡ 升級次數', priority: 6, loadWeight: 'high' },
] as const;

const LazyLeaderboardTabs: React.FC<LazyLeaderboardTabsProps> = memo(({
  defaultType = 'totalEarnings',
  limit = 10,
  className
}) => {
  const [activeTab, setActiveTab] = useState<LeaderboardType>(defaultType);
  const [loadedTabs, setLoadedTabs] = useState<Set<LeaderboardType>>(new Set([defaultType]));

  const handleTabClick = (type: LeaderboardType) => {
    setActiveTab(type);
    
    // 標記此標籤為已載入
    if (!loadedTabs.has(type)) {
      setLoadedTabs(prev => new Set([...prev, type]));
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* 標籤選擇器 */}
      <div className="flex gap-2 flex-wrap justify-center">
        {LEADERBOARD_CONFIGS.map(({ type, label, loadWeight }) => (
          <button
            key={type}
            onClick={() => handleTabClick(type)}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium transition-all relative',
              activeTab === type
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            )}
          >
            {label}
            {/* 負載指示器 */}
            <span className={cn(
              'absolute -top-1 -right-1 w-2 h-2 rounded-full',
              loadWeight === 'low' && 'bg-green-500',
              loadWeight === 'medium' && 'bg-yellow-500',
              loadWeight === 'high' && 'bg-red-500'
            )} />
          </button>
        ))}
      </div>

      {/* 排行榜內容 */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        {LEADERBOARD_CONFIGS.map(({ type }) => (
          <div
            key={type}
            className={cn(
              'transition-opacity duration-300',
              activeTab === type ? 'block' : 'hidden'
            )}
          >
            {/* 只有在標籤被點擊過時才載入組件 */}
            {loadedTabs.has(type) ? (
              <LeaderboardSystem 
                type={type} 
                limit={limit} 
                showFilters={false}
              />
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">載入中...</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 負載說明 */}
      <div className="text-xs text-gray-500 text-center space-y-1">
        <p>負載指示： <span className="text-green-500">●</span> 低 <span className="text-yellow-500">●</span> 中 <span className="text-red-500">●</span> 高</p>
        <p>排行榜數據會智能緩存，減少子圖查詢壓力</p>
      </div>
    </div>
  );
});

LazyLeaderboardTabs.displayName = 'LazyLeaderboardTabs';

export default LazyLeaderboardTabs;