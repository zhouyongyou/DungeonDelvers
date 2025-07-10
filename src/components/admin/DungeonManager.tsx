import React, { useState, useEffect } from 'react';
import { useReadContracts, useWriteContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import type { Abi } from 'viem';
import { bsc } from 'wagmi/chains';
import { getContract } from '../../config/contracts';
import { useAppToast } from '../../hooks/useAppToast';
import { ActionButton } from '../ui/ActionButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';

type SupportedChainId = typeof bsc.id;

interface DungeonManagerProps {
  chainId: SupportedChainId;
}

const DungeonManager: React.FC<DungeonManagerProps> = ({ chainId }) => {
  const { showToast } = useAppToast();
  const { writeContractAsync } = useWriteContract();
  const [pendingDungeon, setPendingDungeon] = useState<number | null>(null);
  
  const dungeonMasterContract = getContract(chainId, 'dungeonMaster');
  const dungeonStorageContract = getContract(chainId, 'dungeonStorage');
  
  const { data: dungeonsData, isLoading, refetch } = useReadContracts({
    contracts: Array.from({ length: 10 }, (_, i) => ({
      ...dungeonStorageContract,
      functionName: 'getDungeon',
      args: [BigInt(i + 1)]
    })),
    query: { enabled: !!dungeonStorageContract }
  });

  const [dungeonInputs, setDungeonInputs] = useState<Record<number, {
    requiredPower: string;
    rewardAmountUSD: string;
    baseSuccessRate: string;
  }>>({});

  useEffect(() => {
    if (dungeonsData) {
      const initialInputs: Record<number, any> = {};
      dungeonsData.forEach((d, i) => {
        if (d.status === 'success' && Array.isArray(d.result)) {
          const [requiredPower, rewardAmountUSD, baseSuccessRate] = d.result as [bigint, bigint, number];
          initialInputs[i + 1] = {
            requiredPower: requiredPower.toString(),
            rewardAmountUSD: formatEther(rewardAmountUSD),
            baseSuccessRate: baseSuccessRate.toString()
          };
        }
      });
      setDungeonInputs(initialInputs);
    }
  }, [dungeonsData]);
  
  const handleInputChange = (id: number, field: string, value: string) => {
    setDungeonInputs(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleUpdateDungeon = async (id: number) => {
    if (!dungeonMasterContract) return;
    
    setPendingDungeon(id);
    const inputs = dungeonInputs[id];
    
    try {
      await writeContractAsync({
        address: dungeonMasterContract.address,
        abi: dungeonMasterContract.abi as Abi,
        functionName: 'adminSetDungeon',
        args: [
          BigInt(id),
          BigInt(inputs.requiredPower),
          parseEther(inputs.rewardAmountUSD),
          BigInt(inputs.baseSuccessRate)
        ],
      });
      
      showToast(`地城 #${id} 更新成功！`, 'success');
      setTimeout(() => refetch(), 2000);
    } catch (e: any) {
      showToast(e.shortMessage || `地城 #${id} 更新失敗`, "error");
    } finally {
      setPendingDungeon(null);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {dungeonsData?.map((d, i) => {
        const dungeonId = i + 1;
        if (d.status !== 'success' || !d.result) {
          return (
            <div key={dungeonId}>
              地城 #{dungeonId}: 讀取失敗
            </div>
          );
        }
        
        const inputs = dungeonInputs[dungeonId] || {
          requiredPower: '',
          rewardAmountUSD: '',
          baseSuccessRate: ''
        };
        
        return (
          <div key={dungeonId} className="p-4 bg-black/20 rounded-lg space-y-2">
            <h4 className="font-bold text-lg text-yellow-400">地城 #{dungeonId}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
              <input
                id={`dungeon-${dungeonId}-power`}
                name={`dungeon-${dungeonId}-power`}
                type="text"
                value={inputs.requiredPower}
                onChange={e => handleInputChange(dungeonId, 'requiredPower', e.target.value)}
                placeholder="要求戰力"
                className="input-field"
              />
              <input
                id={`dungeon-${dungeonId}-reward`}
                name={`dungeon-${dungeonId}-reward`}
                type="text"
                value={inputs.rewardAmountUSD}
                onChange={e => handleInputChange(dungeonId, 'rewardAmountUSD', e.target.value)}
                placeholder="獎勵 (USD)"
                className="input-field"
              />
              <input
                id={`dungeon-${dungeonId}-success-rate`}
                name={`dungeon-${dungeonId}-success-rate`}
                type="text"
                value={inputs.baseSuccessRate}
                onChange={e => handleInputChange(dungeonId, 'baseSuccessRate', e.target.value)}
                placeholder="成功率 (%)"
                className="input-field"
              />
              <ActionButton
                onClick={() => handleUpdateDungeon(dungeonId)}
                isLoading={pendingDungeon === dungeonId}
                className="h-10"
              >
                更新
              </ActionButton>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DungeonManager;