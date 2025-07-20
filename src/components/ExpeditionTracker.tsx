// src/components/ExpeditionTracker.tsx
// Component to track and display recent expedition results prominently

import React, { useEffect, useState } from 'react';
import { useWatchContractEvent, useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { getContract } from '../config/contracts';
import { logger } from '../utils/logger';
import { bsc } from 'wagmi/chains';

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

const STORAGE_KEY = 'recentExpeditionResults';
const MAX_RESULTS = 5;

export const ExpeditionTracker: React.FC<ExpeditionTrackerProps> = ({ onNewResult }) => {
    const { address, chainId } = useAccount();
    const [recentResults, setRecentResults] = useState<ExpeditionResult[]>([]);
    const [showBanner, setShowBanner] = useState(false);
    const [latestResult, setLatestResult] = useState<ExpeditionResult | null>(null);

    const dungeonMasterContract = getContract(chainId === bsc.id ? chainId : bsc.id, 'dungeonMaster');

    // Load stored results on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Convert stored data back to proper types
                const results = parsed.map((r: any) => ({
                    ...r,
                    partyId: BigInt(r.partyId),
                    reward: BigInt(r.reward),
                }));
                setRecentResults(results);
            } catch (error) {
                logger.error('Error loading stored expedition results:', error);
            }
        }
    }, []);

    // Watch for expedition results
    useWatchContractEvent({
        address: dungeonMasterContract?.address,
        abi: dungeonMasterContract?.abi,
        eventName: 'ExpeditionFulfilled',
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
                
                // Store in recent results
                setRecentResults(prev => {
                    const updated = [result, ...prev].slice(0, MAX_RESULTS);
                    // Store in localStorage (convert BigInt to string for JSON)
                    const toStore = updated.map(r => ({
                        ...r,
                        partyId: r.partyId.toString(),
                        reward: r.reward.toString(),
                    }));
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
                    return updated;
                });

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
                                獲得 {formatEther(latestResult.reward)} SOUL, {latestResult.expGained} 經驗值
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
    if (recentResults.length > 0) {
        return (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">最近的遠征結果</h4>
                <div className="space-y-2">
                    {recentResults.slice(0, 3).map((result, index) => (
                        <div 
                            key={`${result.partyId}-${result.timestamp}`}
                            className={`flex items-center justify-between p-2 rounded ${
                                result.success 
                                    ? 'bg-green-900/20 border border-green-700/30' 
                                    : 'bg-red-900/20 border border-red-700/30'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-lg">
                                    {result.success ? '✓' : '✗'}
                                </span>
                                <div className="text-sm">
                                    <p className={result.success ? 'text-green-400' : 'text-red-400'}>
                                        {result.success ? '成功' : '失敗'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {formatTimeAgo(result.timestamp)}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right text-sm">
                                <p className="text-white">
                                    {formatEther(result.reward)} SOUL
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

    return null;
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