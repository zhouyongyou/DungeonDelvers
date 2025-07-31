// LeaderboardSystem.tsx - 多維度排行榜系統
import React, { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { Trophy, TrendingUp, Users, Zap, Calendar, Filter, Clock } from 'lucide-react';
import { AnimatedButton } from '../ui/AnimatedButton';
import { SkeletonLoader } from '../ui/SkeletonLoader';
import { formatSoul } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import { useLeaderboardData, type LeaderboardType, type LeaderboardEntry } from '../../hooks/useLeaderboardData';
import { isGraphConfigured } from '../../config/graphConfig';

interface LeaderboardProps {
  type: LeaderboardType;
  limit?: number;
  showFilters?: boolean;
  className?: string;
}

export const LeaderboardSystem: React.FC<LeaderboardProps> = ({
  type,
  limit = 10,
  showFilters = true,
  className
}) => {
  const { address } = useAccount();
  const [selectedType, setSelectedType] = useState<LeaderboardType>(type);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('all');

  const { data: entries, isLoading, error, refetch, isUsingRealData, isConfigured } = useLeaderboardData(
    selectedType,
    limit,
    timeRange,
    address
  );

  const getTypeIcon = (type: LeaderboardType) => {
    switch (type) {
      case 'totalEarnings': return '💰';
      case 'dungeonClears': return '⚔️';
      case 'partyPower': return '💪';
      case 'weeklyEarnings': return '📈';
      case 'vipLevel': return '👑';
    }
  };

  const getTypeLabel = (type: LeaderboardType) => {
    switch (type) {
      case 'totalEarnings': return '總收益排行';
      case 'dungeonClears': return '通關次數排行';
      case 'partyPower': return '戰力排行';
      case 'weeklyEarnings': return '週收益排行';
      case 'vipLevel': return 'VIP 等級排行';
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-black';
      case 2: return 'bg-gradient-to-r from-gray-400 to-gray-300 text-black';
      case 3: return 'bg-gradient-to-r from-orange-700 to-orange-600 text-white';
      default: return 'bg-gray-800';
    }
  };

  const formatValue = (value: string, type: LeaderboardType) => {
    if (type === 'totalEarnings' || type === 'weeklyEarnings') {
      return `${formatSoul(BigInt(value))} SOUL`;
    }
    if (type === 'vipLevel') {
      return `VIP ${value}`;
    }
    return value;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 篩選器 */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          {/* 類型選擇 */}
          <div className="flex gap-2 flex-wrap">
            {(['totalEarnings', 'dungeonClears', 'partyPower', 'weeklyEarnings', 'vipLevel'] as LeaderboardType[]).map(t => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  selectedType === t
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                )}
              >
                {getTypeIcon(t)} {getTypeLabel(t)}
              </button>
            ))}
          </div>

          {/* 時間範圍 */}
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                )}
              >
                {range === 'daily' && '今日'}
                {range === 'weekly' && '本週'}
                {range === 'monthly' && '本月'}
                {range === 'all' && '全部'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 排行榜標題 */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 p-4 rounded-xl border border-purple-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-bold text-white">
              {getTypeLabel(selectedType)}
            </h2>
          </div>
          <AnimatedButton
            onClick={() => refetch()}
            variant="secondary"
            size="sm"
            animationType="scale"
            className="flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            刷新
          </AnimatedButton>
        </div>
      </div>

      {/* 排行榜內容 */}
      <div className="space-y-2">
        {/* 數據來源指示器 */}
        {!isConfigured ? (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <Clock className="w-4 h-4" />
              <span>❌ The Graph 子圖未配置 - 排行榜功能不可用</span>
            </div>
          </div>
        ) : isUsingRealData ? (
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>✅ 顯示真實鏈上數據</span>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <span>❌ 數據載入失敗: {error.message}</span>
            </div>
          </div>
        ) : null}
        
        {isLoading ? (
          // 載入骨架屏
          Array.from({ length: 5 }).map((_, i) => (
            <SkeletonLoader key={i} height={60} className="rounded-lg" />
          ))
        ) : !isConfigured ? (
          // 子圖未配置時的顯示
          <div className="bg-gray-800/50 rounded-lg p-8 text-center">
            <div className="text-4xl mb-3">⚙️</div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">排行榜功能不可用</h3>
            <p className="text-sm text-gray-500 mb-4">
              需要配置 The Graph 子圖才能顯示排行榜數據
            </p>
          </div>
        ) : !entries || entries.length === 0 ? (
          // 無數據時的顯示
          <div className="bg-gray-800/50 rounded-lg p-8 text-center">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">暫無排行榜數據</h3>
            <p className="text-sm text-gray-500 mb-4">
              {selectedType === 'vipLevel' 
                ? 'VIP 排行榜功能即將推出'
                : '完成一些遊戲後數據將出現在這裡'
              }
            </p>
            <AnimatedButton
              onClick={() => refetch()}
              variant="secondary"
              size="sm"
              animationType="scale"
            >
              重新載入
            </AnimatedButton>
          </div>
        ) : (
          entries?.map((entry) => (
            <div
              key={entry.rank}
              className={cn(
                'relative p-4 rounded-lg transition-all duration-300',
                getRankStyle(entry.rank),
                entry.isCurrentUser && 'ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900'
              )}
            >
              <div className="flex items-center justify-between">
                {/* 排名和用戶信息 */}
                <div className="flex items-center gap-4">
                  {/* 排名 */}
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">
                      {entry.rank === 1 && '🥇'}
                      {entry.rank === 2 && '🥈'}
                      {entry.rank === 3 && '🥉'}
                      {entry.rank > 3 && `#${entry.rank}`}
                    </span>
                    
                    {/* 排名變化 */}
                    {entry.change !== undefined && entry.change !== 0 && (
                      <span className={cn(
                        'text-xs font-medium',
                        entry.change > 0 ? 'text-green-400' : 'text-red-400'
                      )}>
                        {entry.change > 0 ? '↑' : '↓'} {Math.abs(entry.change)}
                      </span>
                    )}
                  </div>

                  {/* 用戶信息 */}
                  <div>
                    <p className="font-medium">
                      {entry.displayName || `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                      {entry.isCurrentUser && (
                        <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-0.5 rounded">
                          你
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                    </p>
                  </div>
                </div>

                {/* 數值 */}
                <div className="text-right">
                  <p className="text-xl font-bold">
                    {formatValue(entry.value, selectedType)}
                  </p>
                </div>
              </div>

              {/* 進度條（僅前三名） */}
              {entry.rank <= 3 && entries && (
                <div className="mt-2 bg-black/20 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-white/30 rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${(parseInt(entry.value) / parseInt(entries[0].value)) * 100}%` 
                    }}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 查看更多 */}
      {entries && entries.length >= limit && (
        <div className="text-center pt-4">
          <AnimatedButton
            variant="secondary"
            animationType="scale"
            onClick={() => {
              // 導航到完整排行榜頁面
              window.location.hash = '#/leaderboard';
            }}
          >
            查看完整排行榜
          </AnimatedButton>
        </div>
      )}
    </div>
  );
};