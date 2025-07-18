// src/components/ExpeditionHistory.tsx
// 顯示隊伍出征歷史紀錄的組件

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { logger } from '../utils/logger';

const THE_GRAPH_API_URL = import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL;

interface ExpeditionRecord {
    id: string;
    dungeonId: string;
    dungeonName: string;
    dungeonPowerRequired: string;
    partyPower: string;
    success: boolean;
    reward: string;
    expGained: string;
    timestamp: string;
    transactionHash: string;
}

interface ExpeditionHistoryProps {
    partyId: string;
    limit?: number;
}

// GraphQL 查詢獲取隊伍的出征歷史
const GET_EXPEDITION_HISTORY_QUERY = `
  query GetExpeditionHistory($partyId: String!, $limit: Int!) {
    expeditions(
      where: { party: $partyId }
      orderBy: timestamp
      orderDirection: desc
      first: $limit
    ) {
      id
      dungeonId
      dungeonName
      dungeonPowerRequired
      partyPower
      success
      reward
      expGained
      timestamp
      transactionHash
    }
  }
`;

export const ExpeditionHistory: React.FC<ExpeditionHistoryProps> = ({ partyId, limit = 5 }) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ['expeditionHistory', partyId, limit],
        queryFn: async () => {
            if (!THE_GRAPH_API_URL) {
                throw new Error('The Graph API URL not configured');
            }
            
            try {
                const response = await fetch(THE_GRAPH_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: GET_EXPEDITION_HISTORY_QUERY,
                        variables: { 
                            partyId: partyId,
                            limit: limit
                        },
                    }),
                });
                
                if (!response.ok) {
                    throw new Error(`GraphQL Network response was not ok: ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.errors) {
                    throw new Error(`GraphQL query failed: ${result.errors.map((e: any) => e.message).join(', ')}`);
                }
                
                return result.data?.expeditions || [];
            } catch (error) {
                logger.error('Error fetching expedition history:', error);
                throw error;
            }
        },
        enabled: !!partyId && !!THE_GRAPH_API_URL,
        staleTime: 1000 * 60 * 2, // 2分鐘
        gcTime: 1000 * 60 * 10, // 10分鐘
    });

    if (isLoading) {
        return (
            <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="flex items-center justify-center py-4">
                    <LoadingSpinner size="h-4 w-4" />
                    <span className="ml-2 text-sm text-gray-400">載入歷史紀錄...</span>
                </div>
            </div>
        );
    }

    if (error || !data || data.length === 0) {
        return (
            <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-sm text-gray-500 text-center">暫無出征紀錄</p>
            </div>
        );
    }

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(parseInt(timestamp) * 1000);
        return date.toLocaleString('zh-TW', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatTxHash = (hash: string) => {
        return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
    };

    return (
        <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
            <h5 className="text-sm font-semibold text-gray-300 mb-2">最近出征紀錄</h5>
            <div className="space-y-2">
                {data.map((expedition: ExpeditionRecord) => (
                    <div 
                        key={expedition.id} 
                        className={`p-2 rounded-lg border ${
                            expedition.success 
                                ? 'bg-green-900/20 border-green-700/50' 
                                : 'bg-red-900/20 border-red-700/50'
                        }`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-medium ${
                                        expedition.success ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                        {expedition.success ? '✓ 成功' : '✗ 失敗'}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {formatTimestamp(expedition.timestamp)}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-300 mt-1">
                                    {expedition.dungeonName} 
                                    <span className="text-gray-500 ml-1">
                                        (戰力 {expedition.partyPower}/{expedition.dungeonPowerRequired})
                                    </span>
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-medium text-white">
                                    +{formatEther(BigInt(expedition.reward))} SOUL
                                </p>
                                <p className="text-xs text-blue-400">
                                    +{expedition.expGained} EXP
                                </p>
                            </div>
                        </div>
                        <div className="mt-1">
                            <a 
                                href={`https://bscscan.com/tx/${expedition.transactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
                            >
                                {formatTxHash(expedition.transactionHash)} ↗
                            </a>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* 累計統計 */}
            {data.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <p className="text-gray-500">成功率</p>
                            <p className="font-medium text-white">
                                {Math.round(
                                    (data.filter((e: ExpeditionRecord) => e.success).length / data.length) * 100
                                )}%
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-500">總獲得</p>
                            <p className="font-medium text-white">
                                {formatEther(
                                    data.reduce((sum: bigint, e: ExpeditionRecord) => 
                                        sum + BigInt(e.reward), 0n
                                    )
                                )} SOUL
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};