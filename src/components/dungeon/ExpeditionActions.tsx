import React from 'react';
import { useWriteContract, useReadContract } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { Button } from '../ui/Button';
import { RewardsDisplay } from './RewardsDisplay';
import { getContractConfig } from '../../config/contracts';
import { useAppToast } from '../../hooks/useAppToast';

interface ExpeditionActionsProps {
  partyId: bigint;
  onSuccess?: () => void;
}

export const ExpeditionActions: React.FC<ExpeditionActionsProps> = ({ partyId, onSuccess }) => {
  const { showToast } = useAppToast();

  // 檢查隊伍是否被鎖定（正在遠征中）
  const { data: isLocked } = useReadContract({
    ...getContractConfig(bsc.id, 'dungeonMaster'),
    functionName: 'isPartyLocked',
    args: [partyId],
  } as const);

  // 開始遠征
  const { writeContract: startExpedition, isPending: isStarting } = useWriteContract();

  // 休息恢復
  const { writeContract: restParty, isPending: isResting } = useWriteContract();

  const handleStartExpedition = async () => {
    try {
      await startExpedition({
        ...getContractConfig(bsc.id, 'dungeonMaster'),
        functionName: 'requestExpedition',
        args: [partyId, 1n], // 暫時固定使用 dungeonId = 1
        value: 0n, // 如果需要支付費用，這裡需要設置
      });
      showToast('遠征開始！', 'success');
      onSuccess?.();
    } catch (error) {
      console.error('開始遠征失敗:', error);
      showToast('開始遠征失敗', 'error');
    }
  };

  const handleRest = async () => {
    try {
      await restParty({
        ...getContractConfig(bsc.id, 'dungeonMaster'),
        functionName: 'restParty',
        args: [partyId],
      });
      showToast('休息恢復成功！', 'success');
      onSuccess?.();
    } catch (error) {
      console.error('休息恢復失敗:', error);
      showToast('休息恢復失敗', 'error');
    }
  };

  if (isLocked) {
    return (
      <div className="space-y-4">
        <div className="text-center text-yellow-400">
          ⚔️ 隊伍正在遠征中...
        </div>
        <RewardsDisplay
          partyId={partyId}
          onClaimSuccess={onSuccess}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={handleStartExpedition}
        loading={isStarting}
        disabled={isStarting}
        className="w-full"
      >
        開始遠征
      </Button>
      
      <Button
        onClick={handleRest}
        loading={isResting}
        disabled={isResting}
        variant="secondary"
        className="w-full"
      >
        休息恢復
      </Button>

      {/* 顯示可領取的獎勵 */}
      <RewardsDisplay
        partyId={partyId}
        onClaimSuccess={onSuccess}
      />
    </div>
  );
}; 