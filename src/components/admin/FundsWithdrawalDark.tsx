// src/components/admin/FundsWithdrawalDark.tsx - 深色模式版本

import React, { useState } from 'react';
import { useReadContracts, useWriteContract, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { ActionButton } from '../ui/ActionButton';
import { getContract, CONTRACT_ADDRESSES } from '../../config/contracts';
import { getContractWithABI } from '../../config/contractsWithABI';
import { useAppToast } from '../../hooks/useAppToast';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { bsc } from 'wagmi/chains';

interface FundsWithdrawalProps {
  chainId: number;
}

const FundsWithdrawal: React.FC<FundsWithdrawalProps> = ({ chainId }) => {
  const { showToast } = useAppToast();
  const { addTransaction } = useTransactionStore();
  const { writeContractAsync } = useWriteContract();
  const [isExpanded, setIsExpanded] = useState(true);

  // 根據合約能力設定提取權限
  const contracts = [
    { name: 'dungeonMaster', label: '地城主', hasWithdraw: true },
    { name: 'hero', label: '英雄合約', hasWithdraw: true }, // 支援 withdrawSoulShard 和 withdrawBNB
    { name: 'relic', label: '聖物合約', hasWithdraw: true }, // 支援 withdrawSoulShard 和 withdrawBNB
    { name: 'party', label: '隊伍合約', hasWithdraw: true }, // 支援 withdrawBNB
    { name: 'altarOfAscension', label: '升星祭壇', hasWithdraw: true }, // 支援 withdrawBNB
    // 以下合約無管理員提取功能
    { name: 'playerVault', label: '玩家金庫', hasWithdraw: false }, // 只有用戶可以提取
    { name: 'vipStaking', label: 'VIP質押', hasWithdraw: false }, // 只有用戶可以提取
    { name: 'dungeonCore', label: '地城核心', hasWithdraw: false } // 無提取功能
  ];

  // 獲取合約地址的輔助函數
  const getContractAddress = (name: string): string | null => {
    switch (name) {
      case 'dungeonMaster':
        return CONTRACT_ADDRESSES.DUNGEONMASTER;
      case 'hero':
        return CONTRACT_ADDRESSES.HERO;
      case 'relic':
        return CONTRACT_ADDRESSES.RELIC;
      case 'party':
        return CONTRACT_ADDRESSES.PARTY;
      case 'altarOfAscension':
        return CONTRACT_ADDRESSES.ALTAROFASCENSION;
      case 'playerVault':
        return CONTRACT_ADDRESSES.PLAYERVAULT;
      case 'vipStaking':
        return CONTRACT_ADDRESSES.VIPSTAKING;
      case 'dungeonCore':
        return CONTRACT_ADDRESSES.DUNGEONCORE;
      default:
        return null;
    }
  };

  // 獲取所有合約的信息
  const contractsWithAddresses = contracts.map(({ name, label, hasWithdraw }) => {
    const address = getContractAddress(name);
    const contractConfig = address ? getContractWithABI(chainId, name as any) : null;
    
    // 調試信息
    if (!address) {
      console.warn(`FundsWithdrawal: 找不到 ${name} 的地址`);
    }
    if (!contractConfig) {
      console.warn(`FundsWithdrawal: 找不到 ${name} 的合約配置`);
    }
    
    return {
      name,
      label,
      hasWithdraw,
      address,
      contract: contractConfig
    };
  }).filter(item => item.address && item.contract);

  // 調試：顯示有效的合約數量
  console.log(`FundsWithdrawal: 找到 ${contractsWithAddresses.length} 個有效合約配置`);

  const handleWithdrawSoulShard = async (contractName: string, label: string, hasWithdraw: boolean) => {
    if (!hasWithdraw) {
      showToast(`${label} 不支援提取功能`, 'warning');
      return;
    }
    
    // Party 和 AltarOfAscension 不支援 SoulShard 提取
    if (contractName === 'party' || contractName === 'altarOfAscension') {
      showToast(`${label} 不支援 SoulShard 提取`, 'warning');
      return;
    }
    
    try {
      const contractInfo = contractsWithAddresses.find(c => c.name === contractName);
      if (!contractInfo?.contract) {
        showToast(`找不到 ${label} 合約配置`, 'error');
        return;
      }

      const hash = await writeContractAsync({ 
        address: contractInfo.contract.address, 
        abi: contractInfo.contract.abi, 
        functionName: 'withdrawSoulShard' 
      });
      addTransaction({ hash, description: `提取 ${label} SoulShard` });
      showToast(`${label} SoulShard 提取成功`, 'success');
    } catch (e: any) {
      if (!e.message?.includes('User rejected')) {
        showToast(`提取 ${label} 失敗: ${e.shortMessage || e.message}`, 'error');
      }
    }
  };

  const handleWithdrawBNB = async (contractName: string, label: string, hasWithdraw: boolean) => {
    if (!hasWithdraw) {
      showToast(`${label} 不支援提取功能`, 'warning');
      return;
    }
    
    try {
      const contractInfo = contractsWithAddresses.find(c => c.name === contractName);
      if (!contractInfo?.contract) {
        showToast(`找不到 ${label} 合約配置`, 'error');
        return;
      }

      // 根據合約類型使用正確的函數名稱
      let functionName = '';
      switch (contractName) {
        case 'dungeonMaster':
        case 'hero':
        case 'relic':
          functionName = 'withdrawNativeFunding';
          break;
        case 'party':
        case 'altarOfAscension':
          functionName = 'withdrawNative';
          break;
        default:
          showToast(`${label} 不支援 BNB 提取`, 'warning');
          return;
      }

      const hash = await writeContractAsync({ 
        address: contractInfo.contract.address, 
        abi: contractInfo.contract.abi, 
        functionName: functionName
      });
      addTransaction({ hash, description: `提取 ${label} BNB` });
      showToast(`${label} BNB 提取成功`, 'success');
    } catch (e: any) {
      if (!e.message?.includes('User rejected')) {
        showToast(`提取 ${label} BNB 失敗: ${e.shortMessage || e.message}`, 'error');
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-200">資金提取</h4>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          {isExpanded ? '收起' : '展開'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="space-y-2">
          {contractsWithAddresses.length === 0 ? (
            <div className="p-4 bg-red-900/20 border border-red-600 rounded-lg text-center">
              <p className="text-red-300">⚠️ 找不到任何有效的合約配置</p>
              <p className="text-sm text-red-400 mt-1">請檢查合約地址和 ABI 配置是否正確</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contractsWithAddresses.map(({ name, label, hasWithdraw, address, contract }) => {
              return (
                <div key={name} className="p-4 bg-gray-800 border border-gray-700 rounded-lg space-y-3">
                  <h5 className="font-medium text-gray-200">{label}</h5>
                  
                  <div className="space-y-2">
                    {/* SoulShard 提取 */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">SoulShard:</span>
                      <ActionButton
                        onClick={() => handleWithdrawSoulShard(name, label, hasWithdraw)}
                        className={`text-xs px-3 py-1 ${
                          hasWithdraw && name !== 'party' && name !== 'altarOfAscension' 
                            ? 'bg-blue-600 hover:bg-blue-700' 
                            : 'bg-gray-700 cursor-not-allowed opacity-50'
                        }`}
                        disabled={!hasWithdraw || name === 'party' || name === 'altarOfAscension'}
                      >
                        提取 SOUL
                      </ActionButton>
                    </div>
                    
                    {/* BNB 提取 */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">BNB:</span>
                      <ActionButton
                        onClick={() => handleWithdrawBNB(name, label, hasWithdraw)}
                        className={`text-xs px-3 py-1 ${hasWithdraw ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-700 cursor-not-allowed opacity-50'}`}
                        disabled={!hasWithdraw}
                      >
                        提取 BNB
                      </ActionButton>
                    </div>
                  </div>
                  
                  {/* 顯示合約地址 */}
                  <div className="text-xs text-gray-500 truncate">
                    {address}
                  </div>
                </div>
              );
            })}
            </div>
          )}
          
          <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
            <p className="text-sm text-yellow-300">
              ⚠️ 注意：
            </p>
            <ul className="text-xs text-yellow-200 mt-1 space-y-1">
              <li>• Hero/Relic/DungeonMaster：支援提取 SoulShard 和 BNB（使用 withdrawSoulShard 和 withdrawNativeFunding）</li>
              <li>• Party/Altar：僅支援提取 BNB（使用 withdrawNative）</li>
              <li>• PlayerVault/VIPStaking：由用戶自行提取</li>
              <li>• DungeonCore：無提取功能</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default FundsWithdrawal;