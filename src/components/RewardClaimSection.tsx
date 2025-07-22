// RewardClaimSection.tsx - 統一的獎勵領取 UI 組件

import React from 'react';
import { formatEther } from 'viem';
import { ActionButton } from './ui/ActionButton';
import { useRewardManager } from '../hooks/useRewardManager';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { useRealtimePartyStatus } from '../hooks/useRealtimePartyStatus';

interface RewardClaimSectionProps {
    partyId: bigint;
    chainId: number;
    variant?: 'default' | 'compact' | 'card';
    className?: string;
}

export const RewardClaimSection: React.FC<RewardClaimSectionProps> = ({ 
    partyId, 
    chainId, 
    variant = 'default',
    className = ''
}) => {
    // 使用即時更新的隊伍狀態
    const { party, isRealtime } = useRealtimePartyStatus({ 
        partyId: partyId.toString() 
    });
    
    const {
        unclaimedRewards: contractRewards,
        hasRewards,
        claimRewards,
        isClaimPending,
        isClaimSuccess,
    } = useRewardManager({ partyId, chainId });
    
    // 優先使用即時數據，回退到合約查詢
    const unclaimedRewards = party?.unclaimedRewards ? BigInt(party.unclaimedRewards) : contractRewards;
    
    if (!hasRewards) return null;
    
    // Compact variant - for inline display
    if (variant === 'compact') {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <span className="text-yellow-400 text-sm">
                    {parseFloat(formatEther(unclaimedRewards)).toFixed(4)} SOUL
                </span>
                <ActionButton
                    onClick={claimRewards}
                    isLoading={isClaimPending}
                    disabled={isClaimSuccess}
                    className="text-xs px-2 py-1"
                >
                    {isClaimSuccess ? '✓' : '領取'}
                </ActionButton>
            </div>
        );
    }
    
    // Card variant - standalone card
    if (variant === 'card') {
        return (
            <div className={`bg-gray-800 rounded-lg border border-gray-700 p-4 ${className}`}>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white">未領取獎勵</h3>
                    <span className="text-sm text-gray-400">隊伍 #{partyId.toString()}</span>
                </div>
                <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg p-3 border border-yellow-600/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-2xl font-bold text-white">
                                {parseFloat(formatEther(unclaimedRewards)).toFixed(4)} SOUL
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                                約 ${(parseFloat(formatEther(unclaimedRewards)) * 0.1).toFixed(2)} USD
                            </p>
                        </div>
                        <ActionButton
                            onClick={claimRewards}
                            isLoading={isClaimPending}
                            disabled={isClaimSuccess}
                            className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold"
                        >
                            {isClaimSuccess ? '已領取' : '領取獎勵'}
                        </ActionButton>
                    </div>
                </div>
            </div>
        );
    }
    
    // Default variant - for DungeonPage
    return (
        <div className={`mt-3 p-3 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg border border-yellow-600/30 ${className}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-yellow-300 font-medium">未領取獎勵</p>
                    <p className="text-lg font-bold text-white">
                        {parseFloat(formatEther(unclaimedRewards)).toFixed(4)} SOUL
                    </p>
                </div>
                <ActionButton
                    onClick={claimRewards}
                    isLoading={isClaimPending}
                    disabled={isClaimSuccess}
                    className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-4 py-2"
                >
                    {isClaimPending && <LoadingSpinner className="mr-2" size="sm" />}
                    {isClaimSuccess ? '已領取' : '領取獎勵'}
                </ActionButton>
            </div>
        </div>
    );
};