import React, { useState, useEffect } from 'react';
import { useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import type { Abi } from 'viem';
import { bsc } from 'wagmi/chains';
import { getContract } from '../../config/contracts';
import { useAppToast } from '../../hooks/useAppToast';
import { ActionButton } from '../ui/ActionButton';

type SupportedChainId = typeof bsc.id;

interface DungeonManagerProps {
  chainId: SupportedChainId;
}

const DungeonManager: React.FC<DungeonManagerProps> = ({ chainId }) => {
  const { showToast } = useAppToast();
  const { writeContractAsync } = useWriteContract();
  const [pendingDungeon, setPendingDungeon] = useState<number | null>(null);
  
  const dungeonMasterContract = getContract(chainId, 'dungeonMaster');
  
  // 簡化的地下城配置 - 直接使用預設值
  const defaultDungeons = [
    { id: 1, name: "新手礦洞", requiredPower: 100, rewardAmountUSD: 2, baseSuccessRate: 90 },
    { id: 2, name: "哥布林洞穴", requiredPower: 300, rewardAmountUSD: 5, baseSuccessRate: 85 },
    { id: 3, name: "食人魔山谷", requiredPower: 600, rewardAmountUSD: 10, baseSuccessRate: 80 },
    { id: 4, name: "蜘蛛巢穴", requiredPower: 1000, rewardAmountUSD: 15, baseSuccessRate: 75 },
    { id: 5, name: "石化蜥蜴沼澤", requiredPower: 1500, rewardAmountUSD: 25, baseSuccessRate: 70 },
    { id: 6, name: "巫妖墓穴", requiredPower: 2200, rewardAmountUSD: 40, baseSuccessRate: 65 },
    { id: 7, name: "奇美拉之巢", requiredPower: 3000, rewardAmountUSD: 60, baseSuccessRate: 60 },
    { id: 8, name: "惡魔前哨站", requiredPower: 4000, rewardAmountUSD: 100, baseSuccessRate: 55 },
    { id: 9, name: "巨龍之巔", requiredPower: 5500, rewardAmountUSD: 200, baseSuccessRate: 50 },
    { id: 10, name: "混沌深淵", requiredPower: 7500, rewardAmountUSD: 500, baseSuccessRate: 45 }
  ];

  const [dungeonInputs, setDungeonInputs] = useState<Record<number, {
    requiredPower: string;
    rewardAmountUSD: string;
    baseSuccessRate: string;
  }>>({});

  useEffect(() => {
    // 初始化輸入值為預設值
    const initialInputs: Record<number, { requiredPower: string; rewardAmountUSD: string; baseSuccessRate: string }> = {};
    defaultDungeons.forEach(dungeon => {
      initialInputs[dungeon.id] = {
        requiredPower: dungeon.requiredPower.toString(),
        rewardAmountUSD: dungeon.rewardAmountUSD.toString(),
        baseSuccessRate: dungeon.baseSuccessRate.toString()
      };
    });
    setDungeonInputs(initialInputs);
  }, []);
  
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
    } catch (e) {
      const err = e as { shortMessage?: string };
      showToast(err.shortMessage || `地城 #${id} 更新失敗`, "error");
    } finally {
      setPendingDungeon(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-yellow-400">地下城配置管理</h3>
        <p className="text-sm text-gray-400">設定地下城的戰力要求、獎勵和成功率</p>
      </div>

      {defaultDungeons.map((dungeon) => {
        const inputs = dungeonInputs[dungeon.id] || {
          requiredPower: '',
          rewardAmountUSD: '',
          baseSuccessRate: ''
        };
        
        return (
          <div key={dungeon.id} className="p-4 bg-black/20 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h4 className="font-bold text-lg text-yellow-400">
                  地城 #{dungeon.id} - {dungeon.name}
                </h4>
                <span className="px-2 py-1 text-xs rounded-full bg-blue-900/50 text-blue-400">
                  預設配置
                </span>
              </div>
            </div>
            
            {/* 配置輸入 */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
              <div>
                <label htmlFor={`dungeon-${dungeon.id}-power`} className="text-xs text-gray-400">要求戰力</label>
                <input
                  id={`dungeon-${dungeon.id}-power`}
                  name={`dungeon-${dungeon.id}-power`}
                  type="text"
                  value={inputs.requiredPower}
                  onChange={e => handleInputChange(dungeon.id, 'requiredPower', e.target.value)}
                  placeholder="例：1000"
                  className="input-field"
                />
              </div>
              <div>
                <label htmlFor={`dungeon-${dungeon.id}-reward`} className="text-xs text-gray-400">獎勵 (USD)</label>
                <input
                  id={`dungeon-${dungeon.id}-reward`}
                  name={`dungeon-${dungeon.id}-reward`}
                  type="text"
                  value={inputs.rewardAmountUSD}
                  onChange={e => handleInputChange(dungeon.id, 'rewardAmountUSD', e.target.value)}
                  placeholder="例：10.5"
                  className="input-field"
                />
              </div>
              <div>
                <label htmlFor={`dungeon-${dungeon.id}-success`} className="text-xs text-gray-400">基礎成功率 (%)</label>
                <input
                  id={`dungeon-${dungeon.id}-success`}
                  name={`dungeon-${dungeon.id}-success`}
                  type="text"
                  value={inputs.baseSuccessRate}
                  onChange={e => handleInputChange(dungeon.id, 'baseSuccessRate', e.target.value)}
                  placeholder="例：75"
                  className="input-field"
                />
              </div>
              <div>
                <ActionButton
                  onClick={() => handleUpdateDungeon(dungeon.id)}
                  isLoading={pendingDungeon === dungeon.id}
                  className="w-full h-10"
                >
                  更新地城
                </ActionButton>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DungeonManager;