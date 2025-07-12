import React from 'react';
import { useReadContract, useWriteContract } from 'wagmi';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { getContractConfig } from '../../config/contracts';
import { useAppToast } from '../../hooks/useAppToast';
import { bsc } from 'wagmi/chains';

interface RewardsDisplayProps {
  partyId: bigint;
  onClaimSuccess?: () => void;
}

export const RewardsDisplay: React.FC<RewardsDisplayProps> = ({ partyId, onClaimSuccess }) => {
  const { showToast } = useAppToast();

  // 讀取隊伍的獎勵信息
  const { data: rewards, isLoading: isLoadingRewards } = useReadContract({
    ...getContractConfig(bsc.id, 'dungeonMaster'),
    functionName: 'getPartyRewards',
    args: [partyId],
  } as const);

  // 讀取隊伍的經驗值
  const { data: experience, isLoading: isLoadingExperience } = useReadContract({
    ...getContractConfig(bsc.id, 'dungeonMaster'),
    functionName: 'getPartyExperience',
    args: [partyId],
  } as const);

  // 領取獎勵
  const { writeContract: claimRewards, isPending: isClaiming } = useWriteContract();

  const isLoading = isLoadingRewards || isLoadingExperience;

  const handleClaimRewards = async () => {
    try {
      await claimRewards({
        ...getContractConfig(bsc.id, 'dungeonMaster'),
        functionName: 'claimRewards',
        args: [partyId],
      });
      showToast('獎勵領取成功！', 'success');
      onClaimSuccess?.();
    } catch (error) {
      console.error('領取獎勵失敗:', error);
      showToast('領取獎勵失敗', 'error');
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="text-center text-gray-400">
          載入獎勵信息中...
        </div>
      </Card>
    );
  }

  if (!rewards || rewards === 0n) {
    return (
      <Card className="p-4">
        <div className="text-center text-gray-400">
          暫無可領取的獎勵
        </div>
      </Card>
    );
  }

  const hasExperience = experience && experience > 0n;

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white">遠征獎勵</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">SoulShard 獎勵</span>
            <span className="text-yellow-400 font-mono font-bold">
              {rewards.toString()} SS
            </span>
          </div>
          
          {hasExperience && (
            <div className="flex justify-between items-center">
              <span className="text-gray-300">經驗值</span>
              <span className="text-blue-400 font-mono">
                +{experience!.toString()} EXP
              </span>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-gray-700">
          <Button
            onClick={handleClaimRewards}
            loading={isClaiming}
            disabled={isClaiming}
            className="w-full"
            variant="primary"
          >
            領取獎勵
          </Button>
        </div>

        <div className="text-xs text-gray-400">
          💡 提示：獎勵會自動存入您的金庫，可以隨時提取
        </div>
      </div>
    </Card>
  );
}; 