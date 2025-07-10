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
        if (d.status === 'success' && d.result && Array.isArray(d.result)) {
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

  const getDungeonName = (id: number) => {
    const names = ["", "新手礦洞", "哥布林洞穴", "食人魔山谷", "蜘蛛巢穴", "石化蜥蜴沼澤", "巫妖墓穴", "奇美拉之巢", "惡魔前哨站", "巨龍之巔", "混沌深淵"];
    return names[id] || "未知地城";
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-yellow-400">地下城配置管理</h3>
        <ActionButton
          onClick={() => refetch()}
          className="bg-blue-600 hover:bg-blue-500"
        >
          刷新數據
        </ActionButton>
      </div>

      {dungeonsData?.map((d, i) => {
        const dungeonId = i + 1;
        
        if (d.status !== 'success' || !d.result || !Array.isArray(d.result)) {
          return (
            <div key={dungeonId} className="p-4 bg-red-900/20 rounded-lg">
              <span className="text-red-400">地城 #{dungeonId}: 讀取失敗</span>
            </div>
          );
        }
        
        const [requiredPower, rewardAmountUSD, baseSuccessRate, isInitialized] = d.result as [bigint, bigint, number, boolean];
        
        const inputs = dungeonInputs[dungeonId] || {
          requiredPower: '',
          rewardAmountUSD: '',
          baseSuccessRate: ''
        };
        
        return (
          <div key={dungeonId} className="p-4 bg-black/20 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h4 className="font-bold text-lg text-yellow-400">
                  地城 #{dungeonId} - {getDungeonName(dungeonId)}
                </h4>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  isInitialized ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                }`}>
                  {isInitialized ? '已配置' : '未配置'}
                </span>
              </div>
            </div>
            
            {/* 當前配置顯示 */}
            {isInitialized && (
              <div className="grid grid-cols-3 gap-4 p-3 bg-gray-800/50 rounded-lg text-sm">
                <div>
                  <p className="text-gray-400">當前要求戰力</p>
                  <p className="font-bold text-white">{requiredPower.toString()}</p>
                </div>
                <div>
                  <p className="text-gray-400">當前獎勵</p>
                  <p className="font-bold text-white">${formatEther(rewardAmountUSD)}</p>
                </div>
                <div>
                  <p className="text-gray-400">當前成功率</p>
                  <p className="font-bold text-white">{baseSuccessRate}%</p>
                </div>
              </div>
            )}
            
            {/* 配置輸入 */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
              <div>
                <label htmlFor={`dungeon-${dungeonId}-power`} className="text-xs text-gray-400">要求戰力</label>
                <input
                  id={`dungeon-${dungeonId}-power`}
                  name={`dungeon-${dungeonId}-power`}
                  type="text"
                  value={inputs.requiredPower}
                  onChange={e => handleInputChange(dungeonId, 'requiredPower', e.target.value)}
                  placeholder="例：1000"
                  className="input-field"
                />
              </div>
              <div>
                <label htmlFor={`dungeon-${dungeonId}-reward`} className="text-xs text-gray-400">獎勵 (USD)</label>
                <input
                  id={`dungeon-${dungeonId}-reward`}
                  name={`dungeon-${dungeonId}-reward`}
                  type="text"
                  value={inputs.rewardAmountUSD}
                  onChange={e => handleInputChange(dungeonId, 'rewardAmountUSD', e.target.value)}
                  placeholder="例：10.5"
                  className="input-field"
                />
              </div>
              <div>
                <label htmlFor={`dungeon-${dungeonId}-success`} className="text-xs text-gray-400">基礎成功率 (%)</label>
                <input
                  id={`dungeon-${dungeonId}-success`}
                  name={`dungeon-${dungeonId}-success`}
                  type="text"
                  value={inputs.baseSuccessRate}
                  onChange={e => handleInputChange(dungeonId, 'baseSuccessRate', e.target.value)}
                  placeholder="例：75"
                  className="input-field"
                />
              </div>
              <ActionButton
                onClick={() => handleUpdateDungeon(dungeonId)}
                isLoading={pendingDungeon === dungeonId}
                className="h-10"
              >
                {isInitialized ? '更新配置' : '啟用地城'}
              </ActionButton>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DungeonManager;