// src/pages/ProvisionsPage.tsx - 修正版

import React, { useState } from 'react';
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { formatEther } from 'viem';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { getContractConfig } from '../config/contracts';
import { useAppToast } from '../hooks/useAppToast';
import { CONTRACT_ADDRESSES } from '../config/contracts';

const ProvisionsPage: React.FC = () => {
  const { address } = useAccount();
  const chainId = useChainId();
  const { showToast } = useAppToast();
  const [quantity, setQuantity] = useState<number>(1);
  const [isApproving, setIsApproving] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  // 讀取儲備價格 (USD)
  const { data: provisionPriceUSD, isLoading: isLoadingPrice } = useReadContract({
    ...getContractConfig(bsc.id, 'dungeonMaster'),
    functionName: 'provisionPriceUSD',
    args: [],
  } as const);

  // 讀取用戶的 SoulShard 餘額
  const { data: soulShardBalance, isLoading: isLoadingBalance } = useReadContract({
    ...getContractConfig(bsc.id, 'soulShard'),
    functionName: 'balanceOf',
    args: [address!],
  } as const);

  // 讀取所需的 SoulShard 數量 (通過合約計算)
  const { data: requiredSoulShardAmount, isLoading: isLoadingRequiredAmount } = useReadContract({
    address: CONTRACT_ADDRESSES[bsc.id]?.dungeonCore as `0x${string}`,
    abi: [
      {
        inputs: [{ name: '_amountUSD', type: 'uint256' }],
        name: 'getSoulShardAmountForUSD',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      }
    ],
    functionName: 'getSoulShardAmountForUSD',
    args: [provisionPriceUSD ? provisionPriceUSD * BigInt(quantity) : 0n],
  });

  // 讀取 SoulShard 授權額度
  const { data: allowance, isLoading: isLoadingAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES[bsc.id]?.soulShard as `0x${string}`,
    abi: [
      {
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' }
        ],
        name: 'allowance',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      }
    ],
    functionName: 'allowance',
    args: [address as `0x${string}`, CONTRACT_ADDRESSES[bsc.id]?.dungeonMaster as `0x${string}`],
  });

  // Debug logs
  console.log('DEBUG ProvisionsPage:');
  console.log('provisionPriceUSD:', provisionPriceUSD);
  console.log('soulShardBalance:', soulShardBalance);
  console.log('requiredSoulShardAmount:', requiredSoulShardAmount);
  console.log('allowance:', allowance);

  // SoulShard 授權
  const { writeContract: approve, data: approveData } = useWriteContract();

  // 購買儲備
  const { writeContract: buyProvisions, data: buyData } = useWriteContract();

  // 等待授權交易
  const { isLoading: isApprovingTx } = useWaitForTransactionReceipt({
    hash: approveData,
  });

  // 等待購買交易
  const { isLoading: isBuyingTx } = useWaitForTransactionReceipt({
    hash: buyData,
  });

  const isLoading = isLoadingPrice || isLoadingBalance || isLoadingRequiredAmount || isLoadingAllowance;

  // 檢查是否需要授權
  const needsApproval = allowance && requiredSoulShardAmount ? allowance < requiredSoulShardAmount : true;

  // 處理授權
  const handleApprove = async () => {
    if (!requiredSoulShardAmount) return;
    
    setIsApproving(true);
    approve({
      address: CONTRACT_ADDRESSES[bsc.id]?.soulShard as `0x${string}`,
      abi: [
        {
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          name: 'approve',
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable',
          type: 'function',
        }
      ],
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES[bsc.id]?.dungeonMaster as `0x${string}`, requiredSoulShardAmount],
    });
  };

  // 處理購買
  const handlePurchase = async () => {
    if (!address || !provisionPriceUSD) return;

    try {
      setIsBuying(true);
      await buyProvisions({
        ...getContractConfig(bsc.id, 'dungeonMaster'),
        functionName: 'buyProvisions',
        args: [1n, BigInt(quantity)], // 暫時使用 partyId = 1
      });
      
      showToast(`成功購買 ${quantity} 個儲備！`, 'success');
      setQuantity(1); // 重置數量
    } catch (error) {
      console.error('購買儲備失敗:', error);
      showToast('購買儲備失敗', 'error');
    } finally {
      setIsBuying(false);
    }
  };

  if (!address) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="text-center p-6">
          <h2 className="text-2xl font-bold text-white mb-4">請先連接錢包</h2>
          <p className="text-gray-300">連接錢包後即可購買儲備</p>
        </Card>
      </div>
    );
  }

  if (chainId !== bsc.id) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">錯誤的網路</h2>
          <p className="text-gray-300">請切換到 BSC 網路</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8">儲備商店</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左側：購買界面 */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-white mb-6">購買儲備</h2>
            
            {isLoading ? (
              <div className="flex justify-center items-center p-8">
                <LoadingSpinner size="h-8 w-8" />
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    購買數量
                  </label>
                  <input 
                    type="number" 
                    value={quantity} 
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} 
                    min="1"
                    className="w-full p-3 border rounded-lg bg-gray-800 border-gray-600 text-white focus:border-primary focus:outline-none" 
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">單價</span>
                    <span className="text-white font-mono">
                      {provisionPriceUSD ? formatEther(provisionPriceUSD) : '0'} USD
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">總價 (USD)</span>
                    <span className="text-white font-mono">
                      {provisionPriceUSD ? formatEther(provisionPriceUSD * BigInt(quantity)) : '0'} USD
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">所需 SOUL</span>
                    <span className="text-yellow-400 font-mono">
                      {typeof requiredSoulShardAmount === 'bigint' ? formatEther(requiredSoulShardAmount) : '0'} SOUL
                    </span>
                  </div>

                  {soulShardBalance && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">錢包餘額</span>
                      <span className="text-green-400 font-mono">
                        {formatEther(soulShardBalance)} SOUL
                      </span>
                    </div>
                  )}
                </div>

                {/* 操作按鈕 */}
                <div className="flex gap-4">
                  {needsApproval ? (
                    <Button
                      onClick={handleApprove}
                      loading={isApproving || isApprovingTx}
                      disabled={isApproving || isApprovingTx}
                      className="flex-1"
                      variant="primary"
                    >
                      授權 SOUL
                    </Button>
                  ) : (
                    <Button
                      onClick={handlePurchase}
                      loading={isBuying || isBuyingTx}
                      disabled={isBuying || isBuyingTx || !provisionPriceUSD}
                      className="flex-1"
                      variant="primary"
                    >
                      購買儲備
                    </Button>
                  )}
                </div>

                {/* 提示資訊 */}
                <div className="text-sm text-gray-400">
                  <p>• 購買儲備需要先授權 SOUL 代幣</p>
                  <p>• 儲備會自動分配到您的隊伍</p>
                  <p>• 每次探險消耗 1 個儲備</p>
                </div>
              </div>
            )}
          </Card>

          {/* 右側：說明和規則 */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">儲備說明</h3>
              <div className="space-y-3 text-gray-300">
                <p>• 儲備是進行地城探險的必需品</p>
                <p>• 每次探險消耗 1 個儲備</p>
                <p>• 儲備價格會根據市場情況調整</p>
                <p>• 購買的儲備會自動分配到您的隊伍</p>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">購買須知</h3>
              <div className="space-y-3 text-gray-300">
                <p>• 請確保錢包中有足夠的 SOUL 代幣</p>
                <p>• 首次購買需要先授權 SOUL 代幣</p>
                <p>• 購買成功後儲備會立即到賬</p>
                <p>• 如遇問題請檢查網路連接</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProvisionsPage;
