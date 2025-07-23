// DungeonManagerDark.tsx - 深色模式版本的地城管理器

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

  const defaultDungeons = [
    { id: 1, name: "新手礦洞", requiredPower: 300, rewardAmountUSD: "6", baseSuccessRate: 89 },
    { id: 2, name: "哥布林洞穴", requiredPower: 600, rewardAmountUSD: "12", baseSuccessRate: 83 },
    { id: 3, name: "食人魔山谷", requiredPower: 900, rewardAmountUSD: "20", baseSuccessRate: 78 },
    { id: 4, name: "蜘蛛巢穴", requiredPower: 1200, rewardAmountUSD: "27", baseSuccessRate: 74 },
    { id: 5, name: "石化蜥蜴沼澤", requiredPower: 1500, rewardAmountUSD: "35", baseSuccessRate: 70 },
    { id: 6, name: "巫妖墓穴", requiredPower: 1800, rewardAmountUSD: "60", baseSuccessRate: 66 },
    { id: 7, name: "奇美拉之巢", requiredPower: 2100, rewardAmountUSD: "82", baseSuccessRate: 62 },
    { id: 8, name: "惡魔前哨站", requiredPower: 2400, rewardAmountUSD: "103", baseSuccessRate: 58 },
    { id: 9, name: "巨龍之巔", requiredPower: 2700, rewardAmountUSD: "136", baseSuccessRate: 54 },
    { id: 10, name: "混沌深淵", requiredPower: 3000, rewardAmountUSD: "225", baseSuccessRate: 50 }
  ];
  
  // 初始化地城輸入狀態
  const [dungeonInputs, setDungeonInputs] = useState<Record<number, {
    requiredPower: string;
    rewardAmountUSD: string;
    baseSuccessRate: string;
  }>>({});

  // 當從合約讀取到數據時，初始化輸入值
  useEffect(() => {
    if (currentDungeonsData) {
      const initialInputs: Record<number, any> = {};
      currentDungeonsData.forEach((data, index) => {
        if (data.status === 'success' && data.result) {
          const [, requiredPower, rewardAmountUSD, baseSuccessRate, isInitialized] = data.result as any[];
          
          if (isInitialized === true) {
            // 使用合約中的實際值
            initialInputs[index + 1] = {
              requiredPower: requiredPower.toString(),
              rewardAmountUSD: formatEther(rewardAmountUSD),
              baseSuccessRate: baseSuccessRate.toString()
            };
          } else {
            // 使用默認值
            const defaultDungeon = defaultDungeons.find(d => d.id === index + 1);
            if (defaultDungeon) {
              initialInputs[index + 1] = {
                requiredPower: defaultDungeon.requiredPower.toString(),
                rewardAmountUSD: defaultDungeon.rewardAmountUSD,
                baseSuccessRate: defaultDungeon.baseSuccessRate.toString()
              };
            }
          }
        } else {
          // 如果讀取失敗，使用默認值
          const defaultDungeon = defaultDungeons.find(d => d.id === index + 1);
          if (defaultDungeon) {
            initialInputs[index + 1] = {
              requiredPower: defaultDungeon.requiredPower.toString(),
              rewardAmountUSD: defaultDungeon.rewardAmountUSD,
              baseSuccessRate: defaultDungeon.baseSuccessRate.toString()
            };
          }
        }
      });
      setDungeonInputs(initialInputs);
    }
  }, [currentDungeonsData]);
  
  const handleDungeonInputChange = (id: number, field: string, value: string) => {
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
        const contractData = currentDungeonsData?.[i];
        // 檢查數據結構：[id, requiredPower, rewardAmountUSD, baseSuccessRate, isInitialized]
        const isInitialized = contractData?.status === 'success' && contractData?.result?.[4] === true;
        
        const inputs = dungeonInputs[dungeonId] || {
          requiredPower: '',
          rewardAmountUSD: '',
          baseSuccessRate: ''
        };
        
        return (
          <div key={dungeonId} className="p-4 bg-gray-800 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h4 className="font-bold text-lg text-yellow-400">
                  地城 #{dungeonId} - {dungeonName}
                </h4>
                {isInitialized ? (
                  <span className="px-2 py-1 text-xs rounded-full bg-green-900/50 text-green-400">
                    ✓ 已初始化
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs rounded-full bg-red-900/50 text-red-400">
                    ✗ 未初始化
                  </span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">戰力要求</label>
                <input
                  type="text"
                  value={inputs.requiredPower}
                  onChange={e => handleDungeonInputChange(dungeonId, 'requiredPower', e.target.value)}
                  placeholder="戰力要求"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-yellow-400 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">獎勵 (USD)</label>
                <input
                  type="text"
                  value={inputs.rewardAmountUSD}
                  onChange={e => handleDungeonInputChange(dungeonId, 'rewardAmountUSD', e.target.value)}
                  placeholder="獎勵 (USD)"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-yellow-400 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">成功率 (%)</label>
                <input
                  type="text"
                  value={inputs.baseSuccessRate}
                  onChange={e => handleDungeonInputChange(dungeonId, 'baseSuccessRate', e.target.value)}
                  placeholder="成功率 (%)"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-yellow-400 focus:outline-none"
                />
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">
                {isInitialized && contractData?.result && (
                  <>
                    當前: 戰力 {contractData.result[1]?.toString()}, 
                    獎勵 {formatEther(contractData.result[2] || 0n)} USD, 
                    成功率 {contractData.result[3]?.toString()}%
                  </>
                )}
              </div>
              <ActionButton
                onClick={() => handleUpdateDungeon(dungeonId)}
                isLoading={pendingDungeon === dungeonId}
                size="sm"
              >
                更新地城
              </ActionButton>
            </div>
          </div>
        );
      })}
      
      {/* 預設配置參考 */}
      <div className="mt-6 p-4 bg-gray-900 rounded-lg">
        <h4 className="font-semibold text-yellow-400 mb-3">預設配置參考</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {defaultDungeons.map(dungeon => (
            <div key={dungeon.id} className="flex justify-between text-gray-400">
              <span className="text-yellow-400">{dungeon.name}:</span>
              <span>戰力 {dungeon.requiredPower}, 獎勵 ${dungeon.rewardAmountUSD}, 成功率 {dungeon.baseSuccessRate}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DungeonManager;