// 合約暫停管理組件
import React, { useState, useMemo } from 'react';
import { useReadContracts, useAccount } from 'wagmi';
import { useWriteContractNoRetry as useWriteContract } from '../../hooks/useWriteContractNoRetry';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ActionButton } from '../ui/ActionButton';
import { getContractWithABI } from '../../config/contractsWithABI';
import { logger } from '../../utils/logger';
import { useAppToast } from '../../contexts/SimpleToastContext';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { useQueryClient } from '@tanstack/react-query';

interface ContractInfo {
  name: string;
  key: string;
  supportsPausable: boolean;
}

export const PausableContractsManager: React.FC = () => {
  const { chainId } = useAccount();
  const { showToast } = useAppToast();
  const { addTransaction } = useTransactionStore();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // 需要檢查的合約列表（只包含支援 pausable 的合約）
  const contractList: ContractInfo[] = [
    { name: 'DungeonCore', key: 'dungeonCore', supportsPausable: true },
    { name: 'DungeonMaster', key: 'dungeonMaster', supportsPausable: true },
    { name: 'DungeonStorage', key: 'dungeonStorage', supportsPausable: false }, // 通常不支援
    { name: 'PlayerVault', key: 'playerVault', supportsPausable: true },
    { name: 'Hero NFT', key: 'hero', supportsPausable: true },
    { name: 'Relic NFT', key: 'relic', supportsPausable: true },
    { name: 'Party NFT', key: 'party', supportsPausable: true },
    { name: 'VIPStaking', key: 'vipStaking', supportsPausable: true },
    { name: 'PlayerProfile', key: 'playerProfile', supportsPausable: true },
    { name: 'AltarOfAscension', key: 'altarOfAscension', supportsPausable: true },
    { name: 'Oracle', key: 'oracle', supportsPausable: false }, // Oracle 通常不支援暫停
    { name: 'SoulShard', key: 'soulShard', supportsPausable: false } // ERC20 通常不支援暫停
  ];

  // 準備合約讀取配置
  const contractsToRead = useMemo(() => {
    if (!chainId) return [];
    
    return contractList
      .filter(contract => contract.supportsPausable)
      .map(contract => {
        const contractConfig = getContractWithABI(chainId, contract.key);
        if (!contractConfig?.address || !contractConfig?.abi) {
          return null;
        }
        
        return {
          address: contractConfig.address,
          abi: contractConfig.abi,
          functionName: 'paused' as const,
          args: []
        };
      })
      .filter(Boolean);
  }, [chainId]);

  // 使用 wagmi v2 的 useReadContracts 讀取暫停狀態
  const { data: pausedData, isLoading, error, refetch } = useReadContracts({
    contracts: contractsToRead,
    query: {
      enabled: contractsToRead.length > 0,
      staleTime: 1000 * 30, // 30秒緩存
      refetchOnWindowFocus: false,
    }
  });

  // 處理合約數據
  const contractsData = useMemo(() => {
    return contractList.map((contract, index) => {
      if (!contract.supportsPausable) {
        return {
          ...contract,
          address: '',
          isPaused: false,
          hasError: true,
          errorMessage: '不支援暫停功能'
        };
      }

      const contractConfig = chainId ? getContractWithABI(chainId, contract.key) : null;
      if (!contractConfig?.address) {
        return {
          ...contract,
          address: '',
          isPaused: false,
          hasError: true,
          errorMessage: '合約未配置'
        };
      }

      // 找到對應的讀取結果
      const pausableIndex = contractList
        .slice(0, index)
        .filter(c => c.supportsPausable).length;
      
      const readResult = pausedData?.[pausableIndex];
      
      return {
        ...contract,
        address: contractConfig.address,
        isPaused: readResult?.result === true,
        hasError: readResult?.status === 'failure',
        errorMessage: readResult?.error?.message || (readResult?.status === 'failure' ? '讀取失敗' : undefined)
      };
    });
  }, [contractList, chainId, pausedData]);

  // 暫停/恢復合約
  const togglePause = async (contractIndex: number) => {
    const contract = contractsData[contractIndex];
    if (!contract.supportsPausable || contract.hasError || !chainId) return;

    const contractConfig = getContractWithABI(chainId, contract.key);
    if (!contractConfig?.address || !contractConfig?.abi) {
      showToast('合約配置無效', 'error');
      return;
    }

    setIsUpdating(contract.address);

    try {
      const functionName = contract.isPaused ? 'unpause' : 'pause';
      
      const hash = await writeContractAsync({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: functionName as any,
        args: []
      });

      addTransaction({ 
        hash, 
        description: `${contract.isPaused ? '恢復' : '暫停'} ${contract.name} 合約` 
      });
      
      showToast(`${contract.name} 合約${contract.isPaused ? '恢復' : '暫停'}交易已送出`, 'success');
      
      // 刷新合約狀態
      setTimeout(() => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ['contract-status'] });
      }, 2000);
      
    } catch (error: any) {
      if (!error?.message?.includes('User rejected')) {
        showToast(`${contract.isPaused ? '恢復' : '暫停'}${contract.name}失敗: ${error?.shortMessage || error?.message || '未知錯誤'}`, 'error');
      }
      logger.error(`Failed to toggle pause for ${contract.name}:`, error);
    } finally {
      setIsUpdating(null);
    }
  };

  // 批量暫停所有合約
  const pauseAll = async () => {
    const unpausedContracts = contractsData.filter(c => c.supportsPausable && !c.isPaused && !c.hasError);
    if (unpausedContracts.length === 0) return;

    showToast(`開始批量暫停 ${unpausedContracts.length} 個合約...`, 'info');
    
    for (let i = 0; i < contractsData.length; i++) {
      const contract = contractsData[i];
      if (contract.supportsPausable && !contract.isPaused && !contract.hasError) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 避免交易衝突
        await togglePause(i);
      }
    }
  };

  // 批量恢復所有合約
  const unpauseAll = async () => {
    const pausedContracts = contractsData.filter(c => c.supportsPausable && c.isPaused && !c.hasError);
    if (pausedContracts.length === 0) return;

    showToast(`開始批量恢復 ${pausedContracts.length} 個合約...`, 'info');
    
    for (let i = 0; i < contractsData.length; i++) {
      const contract = contractsData[i];
      if (contract.supportsPausable && contract.isPaused && !contract.hasError) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 避免交易衝突
        await togglePause(i);
      }
    }
  };

  const somePaused = contractsData.some(c => c.supportsPausable && c.isPaused && !c.hasError);
  const allPaused = contractsData.filter(c => c.supportsPausable && !c.hasError).every(c => c.isPaused);
  const hasValidContracts = contractsData.some(c => c.supportsPausable && !c.hasError);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner size="lg" />
        <span className="ml-2 text-gray-400">載入合約狀態中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">合約暫停管理</h3>
        <div className="flex space-x-4">
          <ActionButton
            onClick={pauseAll}
            disabled={!hasValidContracts || allPaused || isUpdating !== null}
            className="bg-red-600 hover:bg-red-700 text-sm px-3 py-2"
          >
            🛑 暫停所有
          </ActionButton>
          <ActionButton
            onClick={unpauseAll}
            disabled={!hasValidContracts || !somePaused || isUpdating !== null}
            className="bg-green-600 hover:bg-green-700 text-sm px-3 py-2"
          >
            ▶️ 恢復所有
          </ActionButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contractsData
          .filter(contract => contract.supportsPausable && !contract.hasError)
          .map((contract, index) => {
            const originalIndex = contractsData.findIndex(c => c.key === contract.key);
            return (
              <div key={contract.key} className="flex gap-2 items-center">
                <span className="flex-1 text-white">
                  {contract.name === 'DungeonMaster' ? '地城主' : 
                   contract.name === 'Party NFT' ? '隊伍' : 
                   contract.name === 'Hero NFT' ? '英雄' :
                   contract.name === 'Relic NFT' ? '聖物' :
                   contract.name === 'AltarOfAscension' ? '祭壇' :
                   contract.name}
                </span>
                <ActionButton 
                  onClick={() => togglePause(originalIndex)}
                  disabled={isLoading || isUpdating !== null}
                  loading={isUpdating === contract.address}
                  className={`text-sm flex-1 ${
                    contract.isPaused
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {contract.isPaused ? '恢復' : '暫停'} {
                    contract.name === 'DungeonMaster' ? '地城主' : 
                    contract.name === 'Party NFT' ? '隊伍' : 
                    contract.name === 'Hero NFT' ? '英雄' :
                    contract.name === 'Relic NFT' ? '聖物' :
                    contract.name === 'AltarOfAscension' ? '祭壇' :
                    contract.name
                  }
                </ActionButton>
              </div>
            );
          })}
      </div>

      <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4">
        <p className="text-yellow-400 text-sm">
          ⚠️ 注意：暫停合約將阻止所有寫入操作。請謹慎使用此功能，並在解決問題後及時恢復合約運行。
        </p>
      </div>
    </div>
  );
};