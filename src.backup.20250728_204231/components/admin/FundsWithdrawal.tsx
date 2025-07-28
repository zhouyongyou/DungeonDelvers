// src/components/admin/FundsWithdrawal.tsx

import React, { useState } from 'react';
import { useReadContracts, useWriteContract, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { ActionButton } from '../ui/ActionButton';
import { getContract } from '../../config/contracts';
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

  // 只有 dungeonMaster 合約支援提取功能
  const contracts = [
    { name: 'dungeonMaster', label: '地城主', hasWithdraw: true },
    // 其他合約只顯示餘額，但不支援提取
    { name: 'hero', label: '英雄合約', hasWithdraw: false },
    { name: 'relic', label: '聖物合約', hasWithdraw: false },
    { name: 'party', label: '隊伍合約', hasWithdraw: false },
    { name: 'playerVault', label: '玩家金庫', hasWithdraw: false },
    { name: 'vipStaking', label: 'VIP質押', hasWithdraw: false },
    { name: 'dungeonCore', label: '地城核心', hasWithdraw: false },
    { name: 'altarOfAscension', label: '升星祭壇', hasWithdraw: false }
  ];

  // 獲取所有合約的 BNB 餘額
  const balanceQueries = contracts.map(({ name }) => {
    const contract = getContractWithABI(chainId, name as any);
    return contract ? { address: contract.address } : null;
  }).filter(Boolean);

  const { data: balances } = useBalance({
    address: balanceQueries[0]?.address as `0x${string}`,
    chainId,
    query: {
      staleTime: 1000 * 60 * 5, // 5分鐘 - 合約餘額需要較新的數據
      gcTime: 1000 * 60 * 15,   // 15分鐘
      refetchOnWindowFocus: false,
      retry: 2,
    }
  });

  const handleWithdrawSoulShard = async (contractName: string, label: string, hasWithdraw: boolean) => {
    if (!hasWithdraw) {
      showToast(`${label} 不支援提取功能`, 'warning');
      return;
    }
    
    try {
      const contract = getContractWithABI(chainId, contractName as any);
      if (!contract) return;

      const hash = await writeContractAsync({ 
        address: contract.address, 
        abi: contract.abi, 
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
      const contract = getContractWithABI(chainId, contractName as any);
      if (!contract) return;

      // 嘗試不同的函數名稱
      const functionNames = ['withdrawBNB', 'withdraw', 'withdrawETH', 'withdrawFunds'];
      let success = false;

      for (const funcName of functionNames) {
        try {
          const hash = await writeContractAsync({ 
            address: contract.address, 
            abi: contract.abi, 
            functionName: funcName 
          });
          addTransaction({ hash, description: `提取 ${label} BNB` });
          showToast(`${label} BNB 提取成功`, 'success');
          success = true;
          break;
        } catch (e) {
          // 繼續嘗試下一個函數名
          continue;
        }
      }

      if (!success) {
        showToast(`${label} 可能不支援 BNB 提取`, 'warning');
      }
    } catch (e: any) {
      if (!e.message?.includes('User rejected')) {
        showToast(`提取 ${label} BNB 失敗: ${e.shortMessage || e.message}`, 'error');
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold">資金提取</h4>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-gray-400 hover:text-white"
        >
          {isExpanded ? '收起' : '展開'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contracts.map(({ name, label, hasWithdraw }) => {
              const contract = getContractWithABI(chainId, name as any);
              if (!contract) return null;

              return (
                <div key={name} className="p-4 bg-gray-800 rounded-lg space-y-3">
                  <h5 className="font-medium text-white">{label}</h5>
                  
                  <div className="space-y-2">
                    {/* SoulShard 提取 */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">SoulShard:</span>
                      <ActionButton
                        onClick={() => handleWithdrawSoulShard(name, label, hasWithdraw)}
                        className={`text-xs px-3 py-1 ${hasWithdraw ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 cursor-not-allowed'}`}
                        disabled={!hasWithdraw}
                      >
                        提取 SOUL
                      </ActionButton>
                    </div>
                    
                    {/* BNB 提取 */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">BNB:</span>
                      <ActionButton
                        onClick={() => handleWithdrawBNB(name, label, hasWithdraw)}
                        className={`text-xs px-3 py-1 ${hasWithdraw ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-600 cursor-not-allowed'}`}
                        disabled={!hasWithdraw}
                      >
                        提取 BNB
                      </ActionButton>
                    </div>
                  </div>
                  
                  {/* 顯示合約地址 */}
                  <div className="text-xs text-gray-500 truncate">
                    {contract.address}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
            <p className="text-sm text-yellow-200">
              ⚠️ 注意：目前只有地城主合約支援提取功能。其他合約的提取按鈕已禁用。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FundsWithdrawal;