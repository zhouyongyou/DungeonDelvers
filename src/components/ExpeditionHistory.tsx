// src/components/ExpeditionHistory.tsx - 修復版本
// 使用強化的 GraphQL 查詢解決 indexer 問題

import React, { useState } from 'react';
import { formatEther } from 'viem';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { logger } from '../utils/logger';
import { formatSoul } from '../utils/formatters';
import { useExpeditionHistory } from '../hooks/useRobustGraphQLQuery';
import { ShareBattleResult } from './ShareBattleResult';

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
    party?: {
        id: string;
        tokenId: string;
        name: string;
        totalPower: string;
    };
}

interface ExpeditionHistoryProps {
    partyId?: string;
    playerId?: string;
    limit?: number;
    title?: string;
}

export const ExpeditionHistory: React.FC<ExpeditionHistoryProps> = ({
    partyId,
    playerId,
    limit = 20,
    title = "出征歷史"
}) => {
    const [showAll, setShowAll] = useState(false);

    // 使用強化的出征歷史查詢
    const { data: expeditionData, isLoading, error } = useExpeditionHistory(
        playerId,
        limit,
        {
            enabled: !!playerId,
            maxRetries: 4,
            cacheSeconds: 300, // 歷史數據緩存 5 分鐘
        }
    );

    // 處理數據
    const expeditions: ExpeditionRecord[] = React.useMemo(() => {
        if (!expeditionData?.player?.expeditions) return [];

        let allExpeditions = expeditionData.player.expeditions;

        // 調試：記錄原始數據
        if (import.meta.env.DEV && partyId) {
            logger.info('🔍 ExpeditionHistory 過濾調試:', {
                partyId,
                totalExpeditions: allExpeditions.length,
                partyIds: allExpeditions.map((exp: any) => exp.party?.id).filter(Boolean),
                expeditionParties: allExpeditions.map((exp: any) => ({
                    expId: exp.id,
                    partyId: exp.party?.id,
                    partyName: exp.party?.name,
                    match: exp.party?.id === partyId
                }))
            });
        }

        // 如果指定了特定隊伍，只顯示該隊伍的出征記錄
        if (partyId) {
            const beforeFilter = allExpeditions.length;
            allExpeditions = allExpeditions.filter((exp: any) => 
                exp.party?.id === partyId
            );
            const afterFilter = allExpeditions.length;
            
            if (import.meta.env.DEV) {
                logger.info('🎯 過濾結果:', {
                    partyId,
                    beforeFilter,
                    afterFilter,
                    filteredOut: beforeFilter - afterFilter
                });
            }
        }

        return allExpeditions.map((exp: any) => ({
            id: exp.id,
            dungeonId: exp.dungeonId,
            dungeonName: exp.dungeonName,
            dungeonPowerRequired: exp.dungeonPowerRequired,
            partyPower: exp.partyPower || exp.party?.totalPower || '0',
            success: exp.success,
            reward: exp.reward,
            expGained: exp.expGained,
            timestamp: exp.timestamp,
            transactionHash: exp.transactionHash,
            party: exp.party
        }));
    }, [expeditionData, partyId]);

    const displayedExpeditions = showAll ? expeditions : expeditions.slice(0, 10);

    // 計算累積統計
    const stats = React.useMemo(() => {
        if (expeditions.length === 0) return null;
        
        const totalRewards = expeditions.reduce((sum, exp) => {
            return sum + BigInt(exp.reward || '0');
        }, 0n);
        
        const successfulExpeditions = expeditions.filter(exp => exp.success);
        const successRate = (successfulExpeditions.length / expeditions.length) * 100;
        
        const totalExpGained = expeditions.reduce((sum, exp) => {
            return sum + parseInt(exp.expGained || '0');
        }, 0);
        
        return {
            totalExpeditions: expeditions.length,
            successfulExpeditions: successfulExpeditions.length,
            successRate: successRate,
            totalRewards: totalRewards,
            totalExpGained: totalExpGained
        };
    }, [expeditions]);

    if (isLoading) {
        return (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
                <div className="flex justify-center items-center py-12">
                    <div className="text-center">
                        <LoadingSpinner size="h-8 w-8" />
                        <p className="text-gray-400 mt-2">載入出征記錄中...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        logger.error('出征歷史載入錯誤:', error);
        return (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
                    <p className="text-red-400 mb-2">⚠️ 載入出征記錄時發生錯誤</p>
                    <p className="text-sm text-gray-400 mb-3">
                        {error instanceof Error ? error.message : '網路連接問題或子圖服務暫時不可用'}
                    </p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm transition-colors"
                    >
                        重新載入
                    </button>
                </div>
            </div>
        );
    }

    if (expeditions.length === 0) {
        return (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 text-center">
                    <div className="mb-4">
                        <svg className="w-16 h-16 mx-auto text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2-4h14V7H5v10z" />
                        </svg>
                    </div>
                    <p className="text-blue-400 text-lg font-semibold mb-2">暫無出征紀錄</p>
                    <p className="text-gray-400 text-sm">
                        {partyId ? '這支隊伍還未進行任何出征' : '您還未進行任何出征'}
                    </p>
                    <p className="text-gray-500 text-xs mt-2">
                        開始您的冒險之旅，探索神秘的地下城！
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <div className="text-sm text-gray-400">
                    共 {expeditions.length} 次出征
                </div>
            </div>

            {/* 累積統計 */}
            {stats && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 rounded-lg border border-blue-500/30">
                    <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
                        <span>📊</span>
                        <span>{partyId ? '此隊伍累積統計' : '總累積統計'}</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="text-center">
                            <p className="text-gray-400 mb-1">成功次數</p>
                            <p className="text-green-400 font-bold">{stats.successfulExpeditions}/{stats.totalExpeditions}</p>
                            <p className="text-green-300 text-xs">({stats.successRate.toFixed(1)}%)</p>
                        </div>
                        <div className="text-center">
                            <p className="text-gray-400 mb-1">累積獎勵</p>
                            <p className="text-yellow-400 font-bold">{formatSoul(stats.totalRewards)}</p>
                            <p className="text-yellow-300 text-xs">SOUL</p>
                        </div>
                        <div className="text-center">
                            <p className="text-gray-400 mb-1">累積經驗</p>
                            <p className="text-purple-400 font-bold">{stats.totalExpGained.toLocaleString()}</p>
                            <p className="text-purple-300 text-xs">EXP</p>
                        </div>
                        <div className="text-center">
                            <p className="text-gray-400 mb-1">平均獎勵</p>
                            <p className="text-cyan-400 font-bold">
                                {stats.successfulExpeditions > 0 
                                    ? formatSoul(stats.totalRewards / BigInt(stats.successfulExpeditions))
                                    : '0'
                                }
                            </p>
                            <p className="text-cyan-300 text-xs">SOUL/次</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {displayedExpeditions.map((expedition) => {
                    const expeditionDate = new Date(parseInt(expedition.timestamp) * 1000);
                    const isSuccess = expedition.success;
                    const rewardValue = expedition.reward ? parseFloat(formatEther(BigInt(expedition.reward))) : 0;
                    const expValue = expedition.expGained ? parseFloat(expedition.expGained) : 0;

                    return (
                        <div 
                            key={expedition.id} 
                            className={`p-4 rounded-lg border transition-all hover:shadow-lg ${
                                isSuccess 
                                    ? 'bg-green-900/20 border-green-500/30 hover:border-green-400/50' 
                                    : 'bg-red-900/20 border-red-500/30 hover:border-red-400/50'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                        isSuccess 
                                            ? 'bg-green-600 text-white' 
                                            : 'bg-red-600 text-white'
                                    }`}>
                                        {isSuccess ? '✅ 成功' : '❌ 失敗'}
                                    </span>
                                    <h4 className="text-white font-semibold">
                                        {expedition.dungeonName}
                                    </h4>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-gray-400">
                                        {expeditionDate.toLocaleDateString('zh-TW')}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {expeditionDate.toLocaleTimeString('zh-TW')}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-400">地下城等級:</span>
                                    <div className="text-white">#{expedition.dungeonId}</div>
                                </div>
                                <div>
                                    <span className="text-gray-400">所需戰力:</span>
                                    <div className="text-yellow-400">{expedition.dungeonPowerRequired}</div>
                                </div>
                                <div>
                                    <span className="text-gray-400">隊伍戰力:</span>
                                    <div className="text-blue-400">{expedition.partyPower}</div>
                                </div>
                                <div>
                                    <span className="text-gray-400">使用隊伍:</span>
                                    <div className="text-purple-400">
                                        {expedition.party?.name || `隊伍 #${expedition.party?.tokenId || 'N/A'}`}
                                    </div>
                                </div>
                            </div>

                            {isSuccess && (rewardValue > 0 || expValue > 0) && (
                                <div className="mt-3 pt-3 border-t border-gray-600">
                                    <div className="flex items-center gap-6 text-sm">
                                        {rewardValue > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400">獲得 SOUL:</span>
                                                <span className="text-green-400 font-semibold">
                                                    +{formatSoul(BigInt(expedition.reward))}
                                                </span>
                                            </div>
                                        )}
                                        {expValue > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400">獲得經驗:</span>
                                                <span className="text-blue-400 font-semibold">
                                                    +{expValue}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 交易哈希連結和分享功能 */}
                            <div className="mt-2 pt-2 border-t border-gray-700 flex items-center justify-between">
                                {expedition.transactionHash && (
                                    <a 
                                        href={`https://bscscan.com/tx/${expedition.transactionHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        查看交易: {expedition.transactionHash.slice(0, 8)}...{expedition.transactionHash.slice(-6)}
                                    </a>
                                )}
                                
                                {/* 分享戰績按鈕 - 只在成功時顯示 */}
                                {isSuccess && (
                                    <ShareBattleResult
                                        result={{
                                            success: expedition.success,
                                            dungeonName: expedition.dungeonName,
                                            dungeonLevel: parseInt(expedition.dungeonId),
                                            reward: expedition.reward,
                                            expGained: expedition.expGained,
                                            partyName: expedition.party?.name || `Party #${expedition.party?.tokenId}`,
                                            partyPower: parseInt(expedition.partyPower),
                                            timestamp: expedition.timestamp,
                                            transactionHash: expedition.transactionHash
                                        }}
                                        compact={true}
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 顯示更多按鈕 */}
            {expeditions.length > 10 && (
                <div className="mt-6 text-center">
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        {showAll ? '顯示較少' : `顯示全部 (${expeditions.length})`}
                    </button>
                </div>
            )}

            {/* 統計摘要 */}
            {expeditions.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-700">
                    <div className="grid grid-cols-3 gap-4 text-center text-sm">
                        <div>
                            <div className="text-gray-400">總出征次數</div>
                            <div className="text-white font-semibold text-lg">
                                {expeditions.length}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-400">成功次數</div>
                            <div className="text-green-400 font-semibold text-lg">
                                {expeditions.filter(exp => exp.success).length}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-400">成功率</div>
                            <div className="text-blue-400 font-semibold text-lg">
                                {((expeditions.filter(exp => exp.success).length / expeditions.length) * 100).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};