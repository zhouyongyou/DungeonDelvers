// src/components/ExpeditionTracker.tsx
// Component to track and display recent expedition results prominently

import React, { useEffect, useState } from 'react';
import { useWatchContractEvent, useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { getContract } from '../config/contracts';
import { logger } from '../utils/logger';
import { createEventWatchConfig } from '../utils/rpcErrorHandler';
import { bsc } from 'wagmi/chains';
import { useQuery } from '@tanstack/react-query';
import { request, gql } from 'graphql-request';

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

const MAX_RESULTS = 5;
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

    const dungeonMasterContract = getContract(chainId === bsc.id ? chainId : bsc.id, 'dungeonMaster');

    // Fetch recent expeditions from subgraph with caching
    const { data: graphResults, refetch } = useQuery({
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
        refetchInterval: 60000, // Increase to 60 seconds
        staleTime: 50000, // Consider data stale after 50 seconds
        retry: 2, // Reduce retries
        retryDelay: (attemptIndex) => Math.min(10000 * 2 ** attemptIndex, 60000),
    });

    const recentResults = graphResults || [];

    // Watch for expedition results with optimized error handling
    useWatchContractEvent({
        address: dungeonMasterContract?.address,
        abi: dungeonMasterContract?.abi,
        eventName: 'ExpeditionFulfilled',
        ...createEventWatchConfig('ExpeditionFulfilled-Tracker', 'high', {
            enabled: chainId === bsc.id && !!address && !!dungeonMasterContract?.address,
        }),
        onLogs(logs) {
            logs.forEach((log) => {
                const { args } = log as any;
                if (!args) return;

                const result: ExpeditionResult = {
                    partyId: args.partyId,
                    success: args.success,
                    reward: args.reward || 0n,
                    expGained: Number(args.expGained || 0),
                    timestamp: Date.now(),
                };

                logger.info('New expedition result:', {
                    partyId: result.partyId.toString(),
                    success: result.success,
                    reward: formatEther(result.reward),
                    expGained: result.expGained,
                });

                // Update state
                setLatestResult(result);
                setShowBanner(true);
                
                // Refetch from subgraph after a short delay to ensure it's indexed
                setTimeout(() => {
                    refetch();
                }, 3000);

                // Call callback if provided
                if (onNewResult) {
                    onNewResult(result);
                }

                // Auto-hide banner after 10 seconds
                setTimeout(() => {
                    setShowBanner(false);
                }, 10000);
            });
        },
        enabled: !!dungeonMasterContract && !!address,
    });

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
                                獲得 {parseFloat(formatEther(latestResult.reward)).toFixed(4)} SOUL, +{latestResult.expGained} EXP
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
    const displayLimit = isExpanded ? 10 : 3; // 預設顯示3筆，展開顯示10筆
    
    if (recentResults.length > 0) {
        return (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-semibold text-gray-300">最近的遠征結果</h4>
                    {recentResults.length > 3 && (
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
                                    {parseFloat(formatEther(result.reward)).toFixed(4)} SOUL
                                </p>
                                <p className="text-blue-400 text-xs">
                                    +{result.expGained} EXP
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Show placeholder when no results
    return (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">最近的遠征結果</h4>
            <div className="text-center py-8">
                <div className="text-4xl mb-2">🏴‍☠️</div>
                <p className="text-gray-500 text-sm">暫無出征紀錄</p>
                <p className="text-gray-600 text-xs mt-1">
                    完成遠征後，結果將顯示在這裡
                </p>
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