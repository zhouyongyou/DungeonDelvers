// src/components/ExpeditionTracker.tsx
// Component to track and display recent expedition results prominently

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { bsc } from 'viem/chains';
import { getContractWithABI } from '../config/contractsWithABI';
import { logger } from '../utils/logger';
import { useQuery } from '@tanstack/react-query';
import { request, gql } from 'graphql-request';
import { useExpeditionResult } from '../contexts/ExpeditionContext';
import { useSmartEventListener } from '../utils/smartEventSystem';

interface ExpeditionResult {
    partyId: bigint;
    success: boolean;
    reward: bigint;
    expGained: number;
    timestamp: number;
    dungeonName?: string;
}

interface ExpeditionTrackerProps {
    onNewResult?: (result: ExpeditionResult) => void;
}

const MAX_RESULTS = 20; // 增加顯示數量以避免遺漏最新紀錄
import { THE_GRAPH_API_URL } from '../config/graphConfig';

const GRAPHQL_URL = THE_GRAPH_API_URL;

// GraphQL query for recent expedition results
const GET_RECENT_EXPEDITIONS = gql`
  query GetRecentExpeditions($player: String!, $first: Int!, $skip: Int!) {
    expeditions(
      where: { player: $player }
      orderBy: timestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      party {
        id
      }
      dungeonName
      success
      reward
      expGained
      timestamp
      transactionHash
    }
  }
`;

export const ExpeditionTracker: React.FC<ExpeditionTrackerProps> = ({ onNewResult }) => {
    const { address, chainId } = useAccount();
    const [showBanner, setShowBanner] = useState(false);
    const [latestResult, setLatestResult] = useState<ExpeditionResult | null>(null);
    const { showExpeditionResult } = useExpeditionResult();

    const dungeonMasterContract = getContractWithABI('DUNGEONMASTER');

    // Fetch recent expeditions from subgraph with caching
    const { data: graphResults, refetch, isFetching } = useQuery({
        queryKey: ['recentExpeditions', address],
        queryFn: async () => {
            if (!address) return [];
            
            // Check local cache first
            const cacheKey = `expeditions_${address}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                // Use cache if less than 5 minutes old
                if (Date.now() - timestamp < 5 * 60 * 1000) {
                    logger.info('Using cached expedition data');
                    // Convert string back to BigInt
                    return data.map((r: any) => ({
                        ...r,
                        partyId: BigInt(r.partyId),
                        reward: BigInt(r.reward)
                    }));
                }
            }
            
            try {
                const data = await request(GRAPHQL_URL, GET_RECENT_EXPEDITIONS, {
                    player: address.toLowerCase(),
                    first: MAX_RESULTS,
                    skip: 0
                });
                
                const results = data.expeditions.map((exp: any) => ({
                    partyId: BigInt(exp.party.id.split('-')[1] || '0'),
                    success: exp.success,
                    reward: BigInt(exp.reward || '0'),
                    expGained: Number(exp.expGained || 0),
                    timestamp: Number(exp.timestamp) * 1000, // Convert to milliseconds
                    dungeonName: exp.dungeonName
                }));
                
                // Save to cache - convert BigInt to string for JSON serialization
                const cacheableResults = results.map(r => ({
                    ...r,
                    partyId: r.partyId.toString(),
                    reward: r.reward.toString()
                }));
                
                localStorage.setItem(cacheKey, JSON.stringify({
                    data: cacheableResults,
                    timestamp: Date.now()
                }));
                
                return results;
            } catch (error) {
                logger.error('Error fetching expeditions from subgraph:', error);
                // Try to use stale cache if available
                if (cached) {
                    const { data } = JSON.parse(cached);
                    logger.info('Using stale cache due to API error');
                    // Convert string back to BigInt
                    return data.map((r: any) => ({
                        ...r,
                        partyId: BigInt(r.partyId),
                        reward: BigInt(r.reward)
                    }));
                }
                return [];
            }
        },
        enabled: !!address && chainId === bsc.id,
        refetchInterval: 20000, // 每 20 秒更新一次
        staleTime: 15000, // 15 秒後認為資料過期
        retry: 3, // 增加重試次數
        retryDelay: (attemptIndex) => Math.min(5000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: true, // 當視窗獲得焦點時重新獲取
        refetchOnReconnect: true // 重新連接時刷新
    });

    const recentResults = graphResults || [];
    
    // 當資料為空且不是在載入中時，自動嘗試刷新
    useEffect(() => {
        if (!address || recentResults.length > 0) return;
        
        // 延遲 5 秒後自動刷新一次
        const timer = setTimeout(() => {
            logger.info('No expedition results found, attempting refresh...');
            refetch();
        }, 5000);
        
        return () => clearTimeout(timer);
    }, [address, recentResults.length, refetch]);

    // 使用事件輪詢替代 useWatchContractEvent
    useEffect(() => {
        if (!address || !dungeonMasterContract?.address) return;

        const handleExpeditionLogs = (logs: any[]) => {
            logs.forEach((log) => {
                try {
                    const { args } = log;
                    if (!args) {
                        logger.warn('Expedition log missing args:', log);
                        return;
                    }

                // 確保 args 包含所需的屬性
                if (!args || args.partyId === undefined) {
                    logger.error('Invalid expedition log args:', { args });
                    return;
                }

                const result: ExpeditionResult = {
                    partyId: args.partyId,
                    success: args.success,
                    reward: args.reward ? BigInt(args.reward.toString()) : 0n,
                    expGained: Number(args.expGained || 0),
                    timestamp: Date.now(),
                };
                
                // Debug log for reward parsing
                logger.info('💰 Expedition reward parsing:', {
                    rawReward: args.reward?.toString(),
                    parsedReward: result.reward.toString(),
                    rewardInEther: formatEther(result.reward),
                    success: result.success,
                    expGained: result.expGained
                });

                logger.info('New expedition result:', {
                    partyId: result.partyId?.toString() || 'Unknown',
                    success: result.success,
                    reward: formatEther(result.reward),
                    expGained: result.expGained,
                });

                // Show expedition result modal with images
                showExpeditionResult({
                    success: result.success,
                    reward: result.reward,
                    expGained: BigInt(result.expGained)
                });
                
                // Update state for banner (optional - can keep both)
                setLatestResult(result);
                setShowBanner(false); // Disable banner since we use modal
                
                // Immediately add to local state for instant UI update
                const newResults = [result, ...recentResults.slice(0, MAX_RESULTS - 1)];
                
                // Optimistic update - add the new result to local state immediately
                setLatestResult(result);
                
                // Refetch from subgraph after a short delay to ensure it's indexed
                // But also schedule more frequent refetches for better sync
                logger.info('🔄 Scheduling refetch after new expedition event');
                setTimeout(() => {
                    // 清除本地快取
                    if (address) {
                        const cacheKey = `expeditions_${address}`;
                        localStorage.removeItem(cacheKey);
                    }
                    refetch();
                }, 2000);  // First check after 2s
                setTimeout(() => refetch(), 10000); // Second check after 10s
                setTimeout(() => refetch(), 30000); // Final check after 30s

                // Call callback if provided
                if (onNewResult) {
                    onNewResult(result);
                }
                } catch (error) {
                    logger.error('Error processing expedition log:', error, { log });
                    // 即使發生錯誤也嘗試刷新資料
                    setTimeout(() => refetch(), 1000);
                }
            });
        };

        // 註冊智能事件監聽（自動選擇 Filter 或輪詢模式）
        // 修復事件簽名格式 - parseAbiItem 不支持參數名稱，只能使用類型
        const unsubscribe = useSmartEventListener(
            'ExpeditionFulfilled-Tracker',
            dungeonMasterContract.address,
            'event ExpeditionFulfilled(indexed address, indexed uint256, bool, uint256, uint256)',
            handleExpeditionLogs,
            true
        );

        return unsubscribe;
    }, [address, dungeonMasterContract?.address, showExpeditionResult, onNewResult, refetch]);

    const formatTimeAgo = (timestamp: number) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return `${seconds}秒前`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}分鐘前`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}小時前`;
        return `${Math.floor(hours / 24)}天前`;
    };

    // Banner for latest result
    if (showBanner && latestResult) {
        return (
            <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down ${
                latestResult.success ? 'bg-green-800' : 'bg-red-800'
            } text-white p-4 rounded-lg shadow-xl border-2 ${
                latestResult.success ? 'border-green-400' : 'border-red-400'
            } max-w-lg w-full mx-4`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="text-3xl">
                            {latestResult.success ? '🎉' : '😢'}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">
                                {latestResult.success ? '遠征成功！' : '遠征失敗...'}
                            </h3>
                            <p className="text-sm opacity-90">
                                隊伍 #{latestResult.partyId.toString()}
                            </p>
                            <p className="text-sm opacity-90">
                                獲得 {parseFloat(formatEther(latestResult.reward)).toFixed(1)} SOUL, +{latestResult.expGained} EXP
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowBanner(false)}
                        className="text-white/70 hover:text-white text-xl"
                    >
                        ×
                    </button>
                </div>
            </div>
        );
    }

    // Recent results widget (for sidebar or dedicated section)
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const displayLimit = isExpanded ? 20 : 5; // 預設顯示5筆，展開顯示20筆
    
    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        logger.info('🔄 Manual refresh triggered by user');
        
        // 清除本地快取以獲取最新資料
        if (address) {
            const cacheKey = `expeditions_${address}`;
            localStorage.removeItem(cacheKey);
        }
        
        await refetch();
        setTimeout(() => setIsRefreshing(false), 1000);
    };
    
    if (recentResults.length > 0) {
        return (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-300">最近的遠征結果</h4>
                        <button
                            onClick={handleManualRefresh}
                            disabled={isRefreshing}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="手動刷新"
                        >
                            <svg 
                                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                        {isFetching && (
                            <div className="flex items-center gap-1 text-xs text-blue-400">
                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>同步中...</span>
                            </div>
                        )}
                    </div>
                    {recentResults.length > 5 && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            {isExpanded ? '收起 ▲' : `展開更多 (${recentResults.length}) ▼`}
                        </button>
                    )}
                </div>
                <div className="space-y-2">
                    {recentResults.slice(0, displayLimit).map((result, index) => (
                        <div 
                            key={`${result.partyId}-${result.timestamp}`}
                            className={`flex items-center justify-between p-2 rounded ${
                                result.success 
                                    ? 'bg-green-900/20 border border-green-700/30' 
                                    : 'bg-red-900/20 border border-red-700/30'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xl">
                                    {result.success ? '🎉' : '💀'}
                                </span>
                                <div className="text-sm">
                                    <p className={`font-semibold ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                                        {result.success ? '遠征成功' : '遠征失敗'}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        隊伍 #{result.partyId.toString()} • {formatTimeAgo(result.timestamp)}
                                    </p>
                                    {result.dungeonName && (
                                        <p className="text-xs text-purple-400">
                                            📍 {result.dungeonName}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="text-right text-sm">
                                <p className="text-white font-bold">
                                    {parseFloat(formatEther(result.reward)).toFixed(1)} SOUL
                                </p>
                                <p className="text-blue-400 text-xs">
                                    +{result.expGained} EXP
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                {/* 提示文字 */}
                <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-gray-400 text-xs text-center">
                        💡 沒看到最新紀錄？點擊右上角 <span className="text-blue-400">⟳</span> 按鈕手動刷新
                    </p>
                </div>
            </div>
        );
    }

    // Show placeholder when no results
    return (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-300">最近的遠征結果</h4>
                    {isFetching && (
                        <div className="flex items-center gap-1 text-xs text-blue-400">
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>同步中...</span>
                        </div>
                    )}
                </div>
                <button
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="手動刷新"
                >
                    <svg 
                        className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>
            <div className="text-center py-8">
                <div className="text-4xl mb-2">🏴‍☠️</div>
                <p className="text-gray-500 text-sm">暫無出征紀錄</p>
                <p className="text-gray-600 text-xs mt-1">
                    完成遠征後，結果將顯示在這裡
                </p>
                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                    <p className="text-blue-400 text-xs">
                        💡 <strong>新手提示</strong>：前往「地城」頁面開始第一次冒險！
                    </p>
                    <p className="text-blue-300 text-xs mt-1">
                        需要先在「資產管理」組建隊伍，然後到「地城」選擇適合的挑戰
                    </p>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-gray-400 text-xs text-center">
                        💡 提示：點擊右上角 <span className="text-blue-400">⟳</span> 按鈕可手動刷新戰鬥紀錄
                    </p>
                </div>
            </div>
        </div>
    );
};

// CSS for slide-down animation (add to your global styles)
const animationStyles = `
@keyframes slide-down {
    from {
        transform: translate(-50%, -100%);
        opacity: 0;
    }
    to {
        transform: translate(-50%, 0);
        opacity: 1;
    }
}

.animate-slide-down {
    animation: slide-down 0.3s ease-out;
}
`;

// Export animation styles for inclusion in main CSS
export const expeditionTrackerStyles = animationStyles;