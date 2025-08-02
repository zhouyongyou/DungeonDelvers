// AnalyticsDashboard.tsx - 個人數據分析儀表板
import React, { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { usePlayerAnalytics } from '../../hooks/usePlayerAnalytics';
// 🔥 優化：保持原有導入，依賴 Tree Shaking
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Activity, Users, 
  Calendar, Clock, Target, Zap 
} from 'lucide-react';
import { SkeletonLoader } from '../ui/SkeletonLoader';
import { AnimatedButton } from '../ui/AnimatedButton';
import { formatSoul, formatLargeNumber } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import { formatEther } from 'viem';

export const AnalyticsDashboard: React.FC<{ className?: string }> = ({ className }) => {
  const { address } = useAccount();
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(7); // 預設7天
  const [selectedChart, setSelectedChart] = useState<'earnings' | 'parties' | 'achievements'>('earnings');

  const { data, isLoading, hasRealData } = usePlayerAnalytics(timeRange);

  // 圖表專用的格式化函數 - 使用 K 單位
  const formatChartValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(0);
  };

  // 計算統計摘要
  const summary = useMemo(() => {
    if (!data || !hasRealData) return null;
    
    // 使用實際的總收益，而不是從趨勢圖計算
    const totalEarnings = Number(formatEther(data.totalEarnings));
    // 計算實際有收益的天數來得到更準確的日均
    const daysWithEarnings = data.earningsTrend.filter(day => day.earnings > 0).length;
    const avgDailyEarnings = daysWithEarnings > 0 
      ? data.earningsTrend.reduce((sum, day) => sum + day.earnings, 0) / daysWithEarnings
      : 0;
    const trend = data.earningsTrend.length > 1 && 
      data.earningsTrend[data.earningsTrend.length - 1].earnings > data.earningsTrend[0].earnings;
    
    return {
      totalEarnings,
      avgDailyEarnings,
      trend,
      successRate: data.dungeonStats.successRate
    };
  }, [data, hasRealData]);

  const chartColors = useMemo(() => ({
    primary: '#8B5CF6',
    secondary: '#3B82F6', 
    tertiary: '#10B981',
    quaternary: '#F59E0B'
  }), []);

  // 所有 Hook 調用完成後，才進行條件渲染
  if (!address) {
    return (
      <div className="text-center py-8 text-gray-400">
        請先連接錢包以查看數據分析
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLoader key={i} height={120} className="rounded-xl" />
        ))}
      </div>
    );
  }

  // 如果沒有真實數據且不在載入中，就不顯示組件
  if (!hasRealData) {
    return (
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <Clock className="w-8 h-8 text-blue-400" />
          <div>
            <h3 className="text-lg font-medium text-blue-300 mb-2">數據分析準備中</h3>
            <p className="text-sm text-gray-400 mb-3">
              The Graph 正在同步您的遊戲記錄，請稍候...
            </p>
            <p className="text-xs text-gray-500">
              完成一些遠征後數據將自動出現
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader key={i} height={120} className="rounded-xl" />
          ))
        ) : summary && (
          <>
            {/* 總收益 */}
            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 p-4 rounded-xl border border-purple-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">總收益</span>
                {summary.trend ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
              </div>
              <p className="text-2xl font-bold text-white">
                {summary.totalEarnings > 0 
                  ? `${formatSoul(data.totalEarnings, 0)} SOUL`
                  : '尚無收益'
                }
              </p>
              <p className="text-sm text-gray-400 mt-1">
                日均: {summary.avgDailyEarnings > 0 
                  ? `${summary.avgDailyEarnings.toFixed(1)} SOUL`
                  : '0 SOUL'
                }
              </p>
            </div>

            {/* 成功率 */}
            <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 p-4 rounded-xl border border-blue-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">地下城成功率</span>
                <Activity className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {summary.successRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-400 mt-1">
                共 {data.dungeonStats.totalAttempts} 次嘗試
              </p>
            </div>

            {/* 最愛地下城 */}
            <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 p-4 rounded-xl border border-green-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">最常挑戰</span>
                <Target className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-xl font-bold text-white">
                {data.dungeonStats.favoritesDungeon}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                平均獎勵: {parseFloat(data.dungeonStats.avgRewardPerRun).toFixed(1)} SOUL
              </p>
            </div>

            {/* 隊伍數量 */}
            <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 p-4 rounded-xl border border-orange-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">活躍隊伍</span>
                <Users className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {data.partyPerformance.length}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                支隊伍在運作
              </p>
            </div>
          </>
        )}
      </div>

      {/* 圖表區域 */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        {/* 圖表選擇器 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedChart('earnings')}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-all',
                selectedChart === 'earnings'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              )}
            >
              收益趨勢
            </button>
            <button
              onClick={() => setSelectedChart('parties')}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-all',
                selectedChart === 'parties'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              )}
            >
              隊伍表現
            </button>
          </div>

          {/* 時間範圍選擇 */}
          {selectedChart === 'earnings' && (
            <div className="flex gap-2">
              {([7, 30, 90] as const).map(days => (
                <button
                  key={days}
                  onClick={() => setTimeRange(days)}
                  className={cn(
                    'px-3 py-1 rounded text-sm transition-all',
                    timeRange === days
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  )}
                >
                  {days}天
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 圖表內容 */}
        <div className="h-80">
          {isLoading ? (
            <SkeletonLoader height={320} className="rounded-lg" />
          ) : data && (
            <>
              {/* 收益趨勢圖 */}
              {selectedChart === 'earnings' && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.earningsTrend.slice(-timeRange)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9CA3AF" />
                    <YAxis 
                      stroke="#9CA3AF" 
                      tickFormatter={formatChartValue}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#9CA3AF' }}
                      formatter={(value: number, name: string) => [
                        `${formatChartValue(value)} SOUL`,
                        name
                      ]}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="earnings" 
                      stackId="1"
                      stroke={chartColors.primary} 
                      fill={chartColors.primary}
                      fillOpacity={0.6}
                      name="總收益"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="dungeonRewards" 
                      stackId="2"
                      stroke={chartColors.secondary} 
                      fill={chartColors.secondary}
                      fillOpacity={0.6}
                      name="地下城獎勵"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="referralRewards" 
                      stackId="2"
                      stroke={chartColors.tertiary} 
                      fill={chartColors.tertiary}
                      fillOpacity={0.6}
                      name="推薦獎勵"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {/* 隊伍表現圖 */}
              {selectedChart === 'parties' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.partyPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis 
                      yAxisId="left"
                      stroke="#9CA3AF" 
                      tickFormatter={formatChartValue}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="#9CA3AF"
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#9CA3AF' }}
                      formatter={(value: number, name: string) => [
                        name === '總收益' ? `${formatChartValue(value)} SOUL` : `${value.toFixed(1)}%`,
                        name
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="totalEarnings" fill={chartColors.primary} name="總收益" yAxisId="left" />
                    <Bar dataKey="winRate" fill={chartColors.secondary} name="勝率" yAxisId="right" />
                  </BarChart>
                </ResponsiveContainer>
              )}

            </>
          )}
        </div>
      </div>
    </div>
  );
};