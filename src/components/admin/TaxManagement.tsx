// src/components/admin/TaxManagement.tsx
// 稅收管理組件 - 新版 PlayerVault v4.0 功能

import React, { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { ActionButton } from '../ui/ActionButton';
import { getContractWithABI } from '../../config/contractsWithABI';
import { useContractTransaction } from '../../hooks/useContractTransaction';
import { useSoulPrice } from '../../hooks/useSoulPrice';
import { Icons } from '../ui/icons';
import { bsc } from 'viem/chains';
import { useQuery } from '@tanstack/react-query';
import { getEndpointForFeature } from '../../config/graphql';

interface TaxManagementProps {
  className?: string;
}

interface VirtualTaxRecord {
  id: string;
  amount: string;
  timestamp: string;
  transactionHash: string;
}

interface TaxStatistics {
  totalVirtualTaxCollected: string;
  totalTaxRecords: string;
  lastUpdated: string;
}

export const TaxManagement: React.FC<TaxManagementProps> = ({ className = '' }) => {
  const { address } = useAccount();
  const { formatSoulToUsd } = useSoulPrice();
  const [showDetails, setShowDetails] = useState(false);
  const [showTaxHistory, setShowTaxHistory] = useState(false);
  
  const playerVaultContract = getContractWithABI('PLAYERVAULT');
  
  // 查詢累積稅收餘額
  const { data: taxBalance, isLoading: isTaxLoading, refetch: refetchTaxBalance } = useReadContract({
    address: playerVaultContract?.address,
    abi: playerVaultContract?.abi,
    functionName: 'getTaxBalance',
    chainId: bsc.id,
    query: { enabled: !!playerVaultContract }
  });

  // 查詢合約中的 SoulShard 總餘額
  const soulShardContract = getContractWithABI('SOULSHARD');
  const { data: contractBalance, isLoading: isBalanceLoading } = useReadContract({
    address: soulShardContract?.address,
    abi: soulShardContract?.abi,
    functionName: 'balanceOf',
    args: playerVaultContract?.address ? [playerVaultContract.address] : undefined,
    chainId: bsc.id,
    query: { enabled: !!playerVaultContract && !!soulShardContract }
  });

  // 查詢子圖稅收統計
  const { data: taxStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['taxStatistics'],
    queryFn: async () => {
      const query = `
        query GetTaxStatistics {
          taxStatistics(id: "global") {
            totalVirtualTaxCollected
            totalTaxRecords
            lastUpdated
          }
        }
      `;
      
      const endpoint = await getEndpointForFeature('real-time-stats');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      const result = await response.json();
      return result.data?.taxStatistics as TaxStatistics | null;
    },
    enabled: showTaxHistory,
    refetchInterval: 30000
  });

  // 查詢最近的稅收記錄
  const { data: taxRecords, isLoading: isRecordsLoading } = useQuery({
    queryKey: ['virtualTaxRecords'],
    queryFn: async () => {
      const query = `
        query GetVirtualTaxRecords {
          virtualTaxRecords(
            first: 10
            orderBy: timestamp
            orderDirection: desc
          ) {
            id
            amount
            timestamp
            transactionHash
          }
        }
      `;
      
      const endpoint = await getEndpointForFeature('real-time-stats');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      const result = await response.json();
      return result.data?.virtualTaxRecords as VirtualTaxRecord[] | [];
    },
    enabled: showTaxHistory,
    refetchInterval: 30000
  });

  // 提取稅收交易
  const { executeTransaction, isPending } = useContractTransaction();

  const handleWithdrawTax = async () => {
    if (!playerVaultContract || !taxBalance || taxBalance === 0n) return;

    await executeTransaction({
      contractCall: {
        address: playerVaultContract.address as `0x${string}`,
        abi: playerVaultContract.abi,
        functionName: 'withdrawTax'
      },
      description: `提取累積稅收 ${formatEther(taxBalance)} SOUL`,
      successMessage: '稅收提取成功！',
      errorMessage: '稅收提取失敗',
      loadingMessage: '正在提取稅收...',
      onSuccess: () => {
        refetchTaxBalance();
      }
    });
  };

  const handleWithdrawGameRevenue = async (amount?: bigint) => {
    if (!playerVaultContract) return;

    await executeTransaction({
      contractCall: {
        address: playerVaultContract.address as `0x${string}`,
        abi: playerVaultContract.abi,
        functionName: 'withdrawGameRevenue',
        args: amount ? [amount] : [0n] // 0 表示提取全部
      },
      description: amount ? 
        `提取遊戲收益 ${formatEther(amount)} SOUL` : 
        '提取全部遊戲收益',
      successMessage: '遊戲收益提取成功！',
      errorMessage: '遊戲收益提取失敗',
      loadingMessage: '正在提取遊戲收益...',
      onSuccess: () => {
        refetchTaxBalance();
      }
    });
  };

  const hasTaxBalance = taxBalance && taxBalance > 0n;
  const hasContractBalance = contractBalance && contractBalance > 0n;

  if (!address || (!hasTaxBalance && !hasContractBalance)) {
    return (
      <div className={`bg-gray-800/50 border border-gray-700 rounded-xl p-4 ${className}`}>
        <div className="text-center text-gray-400">
          <Icons.CreditCard className="h-8 w-8 mx-auto mb-2" />
          <p>暫無稅收或遊戲收益可提取</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icons.CreditCard className="h-5 w-5 text-purple-400" />
          <h3 className="text-lg font-bold text-purple-300">稅收與收益管理</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTaxHistory(!showTaxHistory)}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium px-2 py-1 rounded bg-blue-900/20"
          >
            {showTaxHistory ? '隱藏' : '稅收'} 明細
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-purple-400 hover:text-purple-300 text-sm font-medium"
          >
            {showDetails ? '收起' : '詳情'} {showDetails ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* 餘額概覽 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">累積稅收</div>
          <div className="text-xl font-bold text-purple-400">
            {isTaxLoading ? '...' : formatEther(taxBalance || 0n)}
          </div>
          <div className="text-xs text-gray-500">
            SOUL (≈ ${formatSoulToUsd(formatEther(taxBalance || 0n))})
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">合約總餘額</div>
          <div className="text-xl font-bold text-blue-400">
            {isBalanceLoading ? '...' : formatEther(contractBalance || 0n)}
          </div>
          <div className="text-xs text-gray-500">
            SOUL (≈ ${formatSoulToUsd(formatEther(contractBalance || 0n))})
          </div>
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="space-y-2">
        <ActionButton
          onClick={handleWithdrawTax}
          disabled={!hasTaxBalance || isPending}
          isLoading={isPending}
          className={`w-full py-3 font-medium transition-all ${
            hasTaxBalance 
              ? 'bg-purple-600 hover:bg-purple-700 text-white' 
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isPending ? '提取中...' : hasTaxBalance ? `提取稅收 ${formatEther(taxBalance || 0n)} SOUL` : '暫無稅收可提取'}
        </ActionButton>

        <ActionButton
          onClick={() => handleWithdrawGameRevenue()}
          disabled={!hasContractBalance || isPending}
          isLoading={isPending}
          className={`w-full py-3 font-medium transition-all ${
            hasContractBalance 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isPending ? '提取中...' : hasContractBalance ? '提取全部遊戲收益' : '暫無收益可提取'}
        </ActionButton>
      </div>

      {/* 詳細信息 */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-purple-600/30">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">稅收來源:</span>
              <span className="text-white">玩家提現時的稅費</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">收益來源:</span>
              <span className="text-white">遊戲內消費、升級費用等</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">提取方式:</span>
              <span className="text-white">Owner 專用功能</span>
            </div>
          </div>
          
          <div className="mt-3 p-3 bg-purple-900/30 rounded-lg">
            <p className="text-purple-300 text-xs">
              💡 <strong>v4.0 新功能</strong>：稅收和佣金採用虛擬記帳系統，大幅降低 gas 費用。
              稅收會自動累積，可以批量提取以提高效率。
            </p>
          </div>
        </div>
      )}

      {/* 稅收歷史記錄 */}
      {showTaxHistory && (
        <div className="mt-4 pt-4 border-t border-blue-600/30">
          <div className="flex items-center gap-2 mb-3">
            <Icons.BarChart className="h-4 w-4 text-blue-400" />
            <h4 className="text-sm font-semibold text-blue-300">稅收記錄統計</h4>
          </div>

          {/* 統計數據 */}
          {taxStats && (
            <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
              <div className="text-center p-2 bg-blue-900/20 rounded">
                <div className="text-gray-400">累計記錄</div>
                <div className="text-blue-400 font-semibold">{taxStats.totalTaxRecords}</div>
              </div>
              <div className="text-center p-2 bg-blue-900/20 rounded">
                <div className="text-gray-400">歷史總額</div>
                <div className="text-blue-400 font-semibold">
                  {parseFloat((BigInt(taxStats.totalVirtualTaxCollected) / BigInt(10**18)).toString()).toFixed(2)}
                </div>
              </div>
              <div className="text-center p-2 bg-blue-900/20 rounded">
                <div className="text-gray-400">最後更新</div>
                <div className="text-blue-400 font-semibold">
                  {new Date(parseInt(taxStats.lastUpdated) * 1000).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}

          {/* 最近記錄 */}
          <div className="space-y-2">
            <div className="text-xs text-gray-400 mb-2">最近10筆稅收記錄：</div>
            
            {isRecordsLoading || isStatsLoading ? (
              <div className="text-center py-4 text-gray-400">
                <Icons.Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                載入中...
              </div>
            ) : taxRecords && taxRecords.length > 0 ? (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {taxRecords.map((record) => (
                  <div key={record.id} className="flex justify-between items-center text-xs p-2 bg-gray-800/30 rounded">
                    <div>
                      <div className="text-white font-medium">
                        {parseFloat((BigInt(record.amount) / BigInt(10**18)).toString()).toFixed(4)} SOUL
                      </div>
                      <div className="text-gray-400">
                        {new Date(parseInt(record.timestamp) * 1000).toLocaleString()}
                      </div>
                    </div>
                    <a 
                      href={`https://bscscan.com/tx/${record.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                      title="查看交易"
                    >
                      <Icons.ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">
                暫無稅收記錄
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxManagement;