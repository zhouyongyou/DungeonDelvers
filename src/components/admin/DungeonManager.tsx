import React, { useState, useEffect } from 'react';
import { useWriteContract, useReadContract, useReadContracts } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import type { Abi } from 'viem';
import { bsc } from 'wagmi/chains';
import { getContract } from '../../config/contracts';
import { useAppToast } from '../../hooks/useAppToast';
import { ActionButton } from '../ui/ActionButton';
import { useQueryClient } from '@tanstack/react-query';

type SupportedChainId = typeof bsc.id;

interface DungeonManagerProps {
  chainId: SupportedChainId;
}

const DungeonManager: React.FC<DungeonManagerProps> = ({ chainId }) => {
  const { showToast } = useAppToast();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const [pendingDungeon, setPendingDungeon] = useState<number | null>(null);
  
  const dungeonMasterContract = getContract(chainId, 'dungeonMaster');
  const dungeonStorageContract = getContract(chainId, 'dungeonStorage');

  // 讀取地城總數量
  const { data: numDungeons } = useReadContract({
    address: dungeonStorageContract?.address,
    abi: dungeonStorageContract?.abi,
    functionName: 'NUM_DUNGEONS',
    query: {
      enabled: !!dungeonStorageContract,
      staleTime: 1000 * 60 * 5, // 5分鐘緩存
    }
  });

  // 根據地城數量動態生成合約讀取配置
  const dungeonContracts = Array.from({ length: Number(numDungeons || 10) }, (_, i) => ({
    address: dungeonStorageContract?.address,
    abi: dungeonStorageContract?.abi,
    functionName: 'getDungeon',
    args: [BigInt(i + 1)],
  }));

  // 批量讀取所有地城的當前配置
  const { data: currentDungeonsData, refetch: refetchDungeons } = useReadContracts({
    contracts: dungeonContracts,
    query: {
      enabled: !!dungeonStorageContract && !!numDungeons,
      staleTime: 1000 * 30, // 30秒緩存
    }
  });
  
  // 地下城預設配置 - 作為初始化參考 (2025-01 經濟模型版本)
  const defaultDungeons = [
    { id: 1, name: "新手礦洞", requiredPower: 300, rewardAmountUSD: 29.30, baseSuccessRate: 89 },
    { id: 2, name: "哥布林洞穴", requiredPower: 600, rewardAmountUSD: 62.00, baseSuccessRate: 83 },
    { id: 3, name: "食人魔山谷", requiredPower: 900, rewardAmountUSD: 96.00, baseSuccessRate: 77 },
    { id: 4, name: "蜘蛛巢穴", requiredPower: 1200, rewardAmountUSD: 151.00, baseSuccessRate: 69 },
    { id: 5, name: "石化蜥蜴沼澤", requiredPower: 1500, rewardAmountUSD: 205.00, baseSuccessRate: 63 },
    { id: 6, name: "巫妖墓穴", requiredPower: 1800, rewardAmountUSD: 271.00, baseSuccessRate: 57 },
    { id: 7, name: "奇美拉之巢", requiredPower: 2100, rewardAmountUSD: 418.00, baseSuccessRate: 52 },
    { id: 8, name: "惡魔前哨站", requiredPower: 2400, rewardAmountUSD: 539.00, baseSuccessRate: 52 },
    { id: 9, name: "巨龍之巔", requiredPower: 2700, rewardAmountUSD: 685.00, baseSuccessRate: 50 },
    { id: 10, name: "混沌深淵", requiredPower: 3000, rewardAmountUSD: 850.00, baseSuccessRate: 50 }
  ];

  const [dungeonInputs, setDungeonInputs] = useState<Record<number, {
    requiredPower: string;
    rewardAmountUSD: string;
    baseSuccessRate: string;
  }>>({});

  useEffect(() => {
    // 優先使用合約數據，如果沒有則使用預設值
    const initialInputs: Record<number, { requiredPower: string; rewardAmountUSD: string; baseSuccessRate: string }> = {};
    
    const totalDungeons = Number(numDungeons || 10);
    
    for (let i = 1; i <= totalDungeons; i++) {
      const contractData = currentDungeonsData?.[i - 1]?.result;
      const defaultData = defaultDungeons.find(d => d.id === i);
      
      if (contractData && contractData[3] === true) { // isInitialized
        // 使用合約中的實際數據
        initialInputs[i] = {
          requiredPower: contractData[0].toString(),
          rewardAmountUSD: formatEther(contractData[1]),
          baseSuccessRate: contractData[2].toString()
        };
      } else if (defaultData) {
        // 使用預設數據
        initialInputs[i] = {
          requiredPower: defaultData.requiredPower.toString(),
          rewardAmountUSD: defaultData.rewardAmountUSD.toString(),
          baseSuccessRate: defaultData.baseSuccessRate.toString()
        };
      } else {
        // 為超出預設範圍的地城提供空白模板
        initialInputs[i] = {
          requiredPower: '0',
          rewardAmountUSD: '0',
          baseSuccessRate: '50'
        };
      }
    }
    
    setDungeonInputs(initialInputs);
  }, [currentDungeonsData, numDungeons]);
  
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
      
      // 刷新合約數據
      await refetchDungeons();
      queryClient.invalidateQueries({ queryKey: ['dungeonData'] });
      
      showToast(`地城 #${id} 更新成功！`, 'success');
    } catch (e) {
      const err = e as { shortMessage?: string };
      showToast(err.shortMessage || `地城 #${id} 更新失敗`, "error");
    } finally {
      setPendingDungeon(null);
    }
  };

  const handleInitializeAllDungeons = async () => {
    if (!dungeonMasterContract) return;
    
    setPendingDungeon(-1); // 使用 -1 表示批量處理
    
    try {
      const totalDungeons = Number(numDungeons || 10);
      for (let i = 1; i <= totalDungeons; i++) {
        const inputs = dungeonInputs[i];
        const defaultDungeon = defaultDungeons.find(d => d.id === i);
        const dungeonName = defaultDungeon?.name || `地城 #${i}`;
        
        await writeContractAsync({
          address: dungeonMasterContract.address,
          abi: dungeonMasterContract.abi as Abi,
          functionName: 'adminSetDungeon',
          args: [
            BigInt(i),
            BigInt(inputs.requiredPower),
            parseEther(inputs.rewardAmountUSD),
            BigInt(inputs.baseSuccessRate)
          ],
        });
        
        showToast(`地城 #${i} - ${dungeonName} 初始化成功！`, 'success');
        
        // 稍微延遲避免 RPC 請求過於頻繁
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // 刷新所有合約數據
      await refetchDungeons();
      queryClient.invalidateQueries({ queryKey: ['dungeonData'] });
      
      showToast('所有地城初始化完成！', 'success');
    } catch (e) {
      const err = e as { shortMessage?: string };
      showToast(err.shortMessage || '批量初始化失敗', "error");
    } finally {
      setPendingDungeon(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-yellow-400">地下城配置管理</h3>
          <p className="text-sm text-gray-400">設定地下城的戰力要求、獎勵和成功率</p>
        </div>
        <ActionButton
          onClick={handleInitializeAllDungeons}
          isLoading={pendingDungeon === -1}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
        >
          批量初始化所有地城
        </ActionButton>
      </div>

      {Array.from({ length: Number(numDungeons || 10) }, (_, i) => {
        const dungeonId = i + 1;
        const defaultDungeon = defaultDungeons.find(d => d.id === dungeonId);
        const dungeonName = defaultDungeon?.name || `地城 #${dungeonId}`;
        const contractData = currentDungeonsData?.[i]?.result;
        const isInitialized = contractData?.[3] === true;
        
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
                  地城 #{dungeonId} - {dungeonName}
                </h4>
                {isInitialized ? (
                  <span className="px-2 py-1 text-xs rounded-full bg-green-900/50 text-green-400">
                    已初始化
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs rounded-full bg-gray-900/50 text-gray-400">
                    未初始化
                  </span>
                )}
              </div>
            </div>
            
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
              <div>
                <ActionButton
                  onClick={() => handleUpdateDungeon(dungeonId)}
                  isLoading={pendingDungeon === dungeonId}
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