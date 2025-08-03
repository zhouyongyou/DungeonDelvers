// 合約暫停管理組件
import React, { useState, useEffect } from 'react';
import { useContractRead, useContractWrite } from 'wagmi';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ActionButton } from '../ui/ActionButton';
import { getContractConfig } from '../../utils/contractUtils';
import { logger } from '../../utils/logger';

interface ContractStatus {
  name: string;
  address: string;
  isPaused: boolean;
  loading: boolean;
  hasError: boolean;
}

export const PausableContractsManager: React.FC = () => {
  const [contracts, setContracts] = useState<ContractStatus[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // 需要檢查的合約列表
  const contractList = [
    { name: 'DungeonCore', type: 'DUNGEONCORE' },
    { name: 'DungeonMaster', type: 'DUNGEONMASTER' },
    { name: 'DungeonStorage', type: 'DUNGEONSTORAGE' },
    { name: 'PlayerVault', type: 'PLAYERVAULT' },
    { name: 'Hero NFT', type: 'HERO' },
    { name: 'Relic NFT', type: 'RELIC' },
    { name: 'Party NFT', type: 'PARTY' },
    { name: 'VIPStaking', type: 'VIPSTAKING' },
    { name: 'PlayerProfile', type: 'PLAYERPROFILE' },
    { name: 'AltarOfAscension', type: 'ALTAROFASCENSION' },
    { name: 'Oracle', type: 'ORACLE' },
    { name: 'SoulShard', type: 'SOULSHARD' }
  ];

  // 初始化合約狀態
  useEffect(() => {
    const initialContracts = contractList.map(contract => {
      const config = getContractConfig(contract.type);
      return {
        name: contract.name,
        address: config?.address || '',
        isPaused: false,
        loading: true,
        hasError: false
      };
    });
    setContracts(initialContracts);
  }, []);

  // 批量查詢合約暫停狀態
  useEffect(() => {
    const checkPausedStatus = async () => {
      const updatedContracts = await Promise.all(
        contracts.map(async (contract) => {
          try {
            const config = getContractConfig(contract.name.toUpperCase().replace(/\s+/g, ''));
            if (!config) {
              return { ...contract, loading: false, hasError: true };
            }

            // 查詢 paused() 函數
            const response = await fetch('/api/read-contract', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                address: config.address,
                functionName: 'paused',
                args: []
              })
            });

            if (response.ok) {
              const data = await response.json();
              return { ...contract, isPaused: data.result, loading: false };
            }
          } catch (error) {
            logger.error(`Failed to check pause status for ${contract.name}:`, error);
          }
          return { ...contract, loading: false, hasError: true };
        })
      );
      setContracts(updatedContracts);
    };

    if (contracts.length > 0 && contracts.some(c => c.loading)) {
      checkPausedStatus();
    }
  }, [contracts]);

  // 暫停/恢復合約
  const togglePause = async (contractIndex: number) => {
    const contract = contracts[contractIndex];
    const config = getContractConfig(contract.name.toUpperCase().replace(/\s+/g, ''));
    if (!config) return;

    setIsUpdating(contract.address);

    try {
      const functionName = contract.isPaused ? 'unpause' : 'pause';
      // TODO: 實際調用合約
      logger.info(`${functionName} called for ${contract.name}`);
      
      // 模擬成功後更新狀態
      setTimeout(() => {
        const updated = [...contracts];
        updated[contractIndex].isPaused = !updated[contractIndex].isPaused;
        setContracts(updated);
        setIsUpdating(null);
      }, 1000);
    } catch (error) {
      logger.error(`Failed to toggle pause for ${contract.name}:`, error);
      setIsUpdating(null);
    }
  };

  // 批量暫停所有合約
  const pauseAll = async () => {
    const unpausedContracts = contracts.filter(c => !c.isPaused && !c.hasError);
    for (let i = 0; i < contracts.length; i++) {
      if (!contracts[i].isPaused && !contracts[i].hasError) {
        await togglePause(i);
      }
    }
  };

  // 批量恢復所有合約
  const unpauseAll = async () => {
    const pausedContracts = contracts.filter(c => c.isPaused && !c.hasError);
    for (let i = 0; i < contracts.length; i++) {
      if (contracts[i].isPaused && !contracts[i].hasError) {
        await togglePause(i);
      }
    }
  };

  const allLoading = contracts.every(c => c.loading);
  const somePaused = contracts.some(c => c.isPaused);
  const allPaused = contracts.filter(c => !c.hasError).every(c => c.isPaused);

  if (allLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner size="lg" />
        <span className="ml-2 text-gray-400">載入合約狀態中...</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">合約暫停管理</h2>
        <div className="flex space-x-4">
          <ActionButton
            onClick={pauseAll}
            disabled={allPaused || isUpdating !== null}
            className="bg-red-600 hover:bg-red-700"
          >
            🛑 暫停所有
          </ActionButton>
          <ActionButton
            onClick={unpauseAll}
            disabled={!somePaused || isUpdating !== null}
            className="bg-green-600 hover:bg-green-700"
          >
            ▶️ 恢復所有
          </ActionButton>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-gray-400">合約名稱</th>
              <th className="text-left py-3 px-4 text-gray-400">地址</th>
              <th className="text-center py-3 px-4 text-gray-400">狀態</th>
              <th className="text-center py-3 px-4 text-gray-400">操作</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract, index) => (
              <tr key={contract.address} className="border-b border-gray-700">
                <td className="py-3 px-4 text-white font-medium">{contract.name}</td>
                <td className="py-3 px-4">
                  <code className="text-xs text-gray-400">
                    {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
                  </code>
                </td>
                <td className="py-3 px-4 text-center">
                  {contract.hasError ? (
                    <span className="text-gray-500">不支援</span>
                  ) : contract.loading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      contract.isPaused 
                        ? 'bg-red-900/50 text-red-400 border border-red-500/50' 
                        : 'bg-green-900/50 text-green-400 border border-green-500/50'
                    }`}>
                      {contract.isPaused ? '已暫停' : '運行中'}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  {!contract.hasError && (
                    <ActionButton
                      onClick={() => togglePause(index)}
                      disabled={contract.loading || isUpdating !== null}
                      loading={isUpdating === contract.address}
                      className={`text-sm px-3 py-1 ${
                        contract.isPaused
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {contract.isPaused ? '恢復' : '暫停'}
                    </ActionButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4">
        <p className="text-yellow-400 text-sm">
          ⚠️ 注意：暫停合約將阻止所有寫入操作。請謹慎使用此功能，並在解決問題後及時恢復合約運行。
        </p>
      </div>
    </div>
  );
};