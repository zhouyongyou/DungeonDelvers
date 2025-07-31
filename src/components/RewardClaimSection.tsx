// RewardClaimSection.tsx - 統一的獎勵領取 UI 組件

import React, { useState, useEffect } from 'react';
import { formatEther } from 'viem';
import { ActionButton } from './ui/ActionButton';
import { useRewardManager } from '../hooks/useRewardManager';
import { LoadingSpinner } from './ui/LoadingSpinner';
// import { useRealtimePartyStatus } from '../hooks/useRealtimePartyStatus'; // 移除 Apollo 依賴
import { logger } from '../utils/logger';
import { formatSoul } from '../utils/formatters';
import { RewardAnimation } from './ui/RewardAnimation';
import { AnimatedButton } from './ui/AnimatedButton';

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
    const [showRewardAnimation, setShowRewardAnimation] = useState(false);
    const [lastClaimedAmount, setLastClaimedAmount] = useState('0');
    try {
    // 檢查輸入參數
    if (!partyId) {
        console.error('[RewardClaimSection] partyId is missing');
        return null;
    }
    // 移除 Apollo 即時訂閱，直接使用合約數據
    // const { party, isRealtime } = useRealtimePartyStatus({ 
    //     partyId: partyId.toString() 
    // });
    
    const {
        unclaimedRewards: contractRewards,
        hasRewards,
        claimRewards,
        isClaimPending,
        isClaimSuccess,
        isLoadingRewards,
    } = useRewardManager({ partyId, chainId });
    
    // 當領取成功時顯示動畫
    useEffect(() => {
        if (isClaimSuccess && contractRewards === 0n && lastClaimedAmount !== '0') {
            setShowRewardAnimation(true);
        }
    }, [isClaimSuccess, contractRewards, lastClaimedAmount]);
    
    const handleClaimRewards = async () => {
        setLastClaimedAmount(formatSoul(contractRewards));
        await claimRewards();
    };
    
    // 優先使用合約數據（更準確），子圖數據作為備用
    // 因為子圖可能有延遲，特別是去中心化版本
    const unclaimedRewards = contractRewards;
    const actuallyHasRewards = unclaimedRewards > 0n || hasRewards;
    
    // Debug log
    logger.info('[RewardClaimSection] 獎勵數據:', {
        partyId: partyId.toString(),
        contractRewards: contractRewards.toString(),
        使用數據: '合約數據',
        原因: '合約數據更準確即時'
    });
    
    // 修改：總是顯示組件，讓玩家可以嘗試領取（可能有未同步的獎勵）
    // 即使顯示為 0，也允許玩家點擊領取按鈕
    
    // Compact variant - for inline display
    if (variant === 'compact') {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <span className="text-yellow-400 text-sm">
                    {formatSoul(unclaimedRewards)} SOUL
                </span>
                <AnimatedButton
                    onClick={handleClaimRewards}
                    isLoading={isClaimPending}
                    disabled={isClaimSuccess}
                    className="text-xs px-2 py-1"
                    animationType="ripple"
                    variant="success"
                    size="sm"
                >
                    {isClaimSuccess ? '✓' : '領取'}
                </AnimatedButton>
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
                                {formatSoul(unclaimedRewards)} SOUL
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                                約 ${(parseFloat(formatEther(unclaimedRewards)) * 0.1).toFixed(2)} USD
                            </p>
                        </div>
                        <AnimatedButton
                            onClick={handleClaimRewards}
                            isLoading={isClaimPending}
                            disabled={isClaimSuccess}
                            className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold"
                            animationType="ripple"
                            variant="success"
                        >
                            {isClaimSuccess ? '已領取' : '領取獎勵'}
                        </AnimatedButton>
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
                        {isLoadingRewards ? (
                            <span className="text-gray-400">載入中...</span>
                        ) : (
                            `${formatSoul(unclaimedRewards)} SOUL`
                        )}
                    </p>
                </div>
                <AnimatedButton
                    onClick={handleClaimRewards}
                    isLoading={isClaimPending}
                    disabled={isClaimSuccess}
                    className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-4 py-2"
                    animationType="ripple"
                    variant="success"
                    loadingText="領取中..."
                >
                    {isClaimSuccess ? '已領取' : '領取獎勵'}
                </AnimatedButton>
            </div>
            
            {/* 獎勵動畫 */}
            <RewardAnimation
                amount={lastClaimedAmount}
                currency="SOUL"
                isVisible={showRewardAnimation}
                onComplete={() => setShowRewardAnimation(false)}
            />
        </div>
    );
    } catch (error) {
        console.error('[RewardClaimSection] Component error:', {
            error,
            partyId: partyId?.toString(),
            chainId,
            variant
        });
        return (
            <div className="mt-3 p-3 bg-red-900/20 border border-red-600 rounded-lg text-sm">
                <p className="text-red-400">獎勵組件載入錯誤</p>
                <p className="text-xs text-red-300 mt-1">錯誤: {error?.message || '未知錯誤'}</p>
            </div>
        );
    }
};