// src/components/vip/WithdrawalTaxCalculator.tsx
// 動態提現稅率計算器組件

import React, { useState, useMemo, useCallback } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { bsc } from 'wagmi/chains';
import { getContractWithABI } from '../../config/contractsWithABI';
import { useVipStatus } from '../../hooks/useVipStatus';
import { useSoulPrice } from '../../hooks/useSoulPrice';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ActionButton } from '../ui/ActionButton';

interface TaxBreakdown {
  baseRate: number;           // 基礎稅率 (%)
  vipReduction: number;       // VIP減免 (%)
  timeDecay: number;          // 時間衰減 (%)
  levelReduction: number;     // 等級減免 (%)
  totalReduction: number;     // 總減免 (%)
  finalRate: number;          // 最終稅率 (%)
  isLargeWithdraw: boolean;   // 是否為大額提現
}

interface WithdrawalTaxCalculatorProps {
  className?: string;
  showTitle?: boolean;
  compact?: boolean;
}

export const WithdrawalTaxCalculator: React.FC<WithdrawalTaxCalculatorProps> = ({
  className = '',
  showTitle = true,
  compact = false
}) => {
  const { address, chainId } = useAccount();
  const { vipLevel, isLoading: isVipLoading } = useVipStatus();
  const { priceInUsd, formatSoulToUsd, isLoading: isPriceLoading } = useSoulPrice();
  
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [inputMode, setInputMode] = useState<'soul' | 'usd'>('soul');
  const [showDetails, setShowDetails] = useState(false);
  
  // 獲取合約信息
  const playerVaultContract = getContractWithABI('PLAYERVAULT');
  const playerProfileContract = getContractWithABI('PLAYERPROFILE');
  const oracleContract = getContractWithABI('ORACLE');
  
  // 讀取稅率參數
  const { data: standardInitialRate } = useReadContract({
    address: playerVaultContract?.address,
    abi: playerVaultContract?.abi,
    functionName: 'standardInitialRate',
    chainId: bsc.id,
  });
  
  const { data: largeWithdrawInitialRate } = useReadContract({
    address: playerVaultContract?.address,
    abi: playerVaultContract?.abi,
    functionName: 'largeWithdrawInitialRate',
    chainId: bsc.id,
  });
  
  const { data: largeWithdrawThresholdUSD } = useReadContract({
    address: playerVaultContract?.address,
    abi: playerVaultContract?.abi,
    functionName: 'largeWithdrawThresholdUSD',
    chainId: bsc.id,
  });
  
  const { data: decreaseRatePerPeriod } = useReadContract({
    address: playerVaultContract?.address,
    abi: playerVaultContract?.abi,
    functionName: 'decreaseRatePerPeriod',
    chainId: bsc.id,
  });
  
  const { data: periodDuration } = useReadContract({
    address: playerVaultContract?.address,
    abi: playerVaultContract?.abi,
    functionName: 'periodDuration',
    chainId: bsc.id,
  });
  
  // 讀取玩家信息
  const { data: playerInfo } = useReadContract({
    address: playerVaultContract?.address,
    abi: playerVaultContract?.abi,
    functionName: 'playerInfo',
    args: address ? [address] : undefined,
    chainId: bsc.id,
    query: { enabled: !!address }
  });
  
  const { data: playerLevel } = useReadContract({
    address: playerProfileContract?.address,
    abi: playerProfileContract?.abi,
    functionName: 'getLevel',
    args: address ? [address] : undefined,
    chainId: bsc.id,
    query: { enabled: !!address }
  });
  
  const { data: soulShardPriceUSD } = useReadContract({
    address: oracleContract?.address,
    abi: oracleContract?.abi,
    functionName: 'getSoulShardPriceInUSD',
    chainId: bsc.id,
  });
  
  // 計算稅率詳情
  const taxBreakdown = useMemo((): TaxBreakdown | null => {
    if (
      !withdrawAmount || 
      !standardInitialRate || 
      !largeWithdrawInitialRate || 
      !largeWithdrawThresholdUSD ||
      !decreaseRatePerPeriod ||
      !periodDuration ||
      !soulShardPriceUSD
    ) {
      return null;
    }
    
    try {
      const inputAmount = parseFloat(withdrawAmount);
      if (inputAmount <= 0) return null;
      
      // 根據輸入模式轉換為 SOUL 數量
      const amount = inputMode === 'usd' && priceInUsd > 0
        ? inputAmount / priceInUsd
        : inputAmount;
      
      // 計算USD價值
      const amountUSD = amount * (Number(soulShardPriceUSD) / 10**18);
      const thresholdUSD = Number(largeWithdrawThresholdUSD) / 10**18;
      const isLargeWithdraw = amountUSD > thresholdUSD;
      
      // 基礎稅率 - 修復轉換錯誤，合約可能使用 basis points
      let baseRate = isLargeWithdraw 
        ? Number(largeWithdrawInitialRate) / 100  // 先嘗試百分比
        : Number(standardInitialRate) / 100;
      
      // 如果稅率過高（>100%），可能是 basis points 格式，需要再除以100
      if (baseRate > 1) {
        baseRate = baseRate / 100;
      }
      
      // VIP減免 (每級0.5%)
      const vipReduction = vipLevel * 0.5;
      
      // 時間衰減計算 - 修復計算錯誤
      const lastWithdrawTimestamp = playerInfo ? Number(playerInfo[1]) : 0;
      const currentTime = Math.floor(Date.now() / 1000);
      
      // 防止無限時間衰減：如果從未提現，使用合理的時間基準
      let timePassed: number;
      if (lastWithdrawTimestamp === 0) {
        // 如果從未提現，假設已經過了30天（最大減免期）
        timePassed = 30 * 24 * 60 * 60; // 30天秒數
      } else {
        timePassed = Math.max(0, currentTime - lastWithdrawTimestamp);
      }
      
      const periodDurationNum = Number(periodDuration);
      const periodsPassed = periodDurationNum > 0 ? Math.floor(timePassed / periodDurationNum) : 0;
      
      // 限制最大時間衰減為基礎稅率的90%（避免負稅率或0稅率）
      const maxTimeDecayPercent = baseRate * 0.9;
      const rawTimeDecay = periodsPassed * (Number(decreaseRatePerPeriod) / 100);
      const timeDecay = Math.min(rawTimeDecay, maxTimeDecayPercent);
      
      // 等級減免 (每10級1%)
      const currentPlayerLevel = playerLevel ? Number(playerLevel) : 0;
      const levelReduction = Math.floor(currentPlayerLevel / 10) * 1;
      
      // 總減免和最終稅率
      const totalReduction = vipReduction + timeDecay + levelReduction;
      const finalRate = Math.max(0, baseRate - totalReduction);
      
      return {
        baseRate,
        vipReduction,
        timeDecay,
        levelReduction,
        totalReduction,
        finalRate,
        isLargeWithdraw
      };
    } catch (error) {
      console.error('稅率計算錯誤:', error);
      return null;
    }
  }, [
    withdrawAmount, 
    standardInitialRate, 
    largeWithdrawInitialRate, 
    largeWithdrawThresholdUSD,
    decreaseRatePerPeriod,
    periodDuration,
    soulShardPriceUSD,
    vipLevel,
    playerInfo,
    playerLevel
  ]);
  
  // 格式化時間
  const formatTime = useCallback((seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}天${hours}小時`;
    if (hours > 0) return `${hours}小時${mins}分鐘`;
    return `${mins}分鐘`;
  }, []);
  
  // 計算預覽信息
  const previewInfo = useMemo(() => {
    if (!taxBreakdown || !withdrawAmount) return null;
    
    const amount = parseFloat(withdrawAmount);
    const taxAmount = amount * taxBreakdown.finalRate;
    const afterTaxAmount = amount - taxAmount;
    const taxAmountUSD = taxAmount * (Number(soulShardPriceUSD || 0) / 10**18);
    
    return {
      taxAmount,
      afterTaxAmount,
      taxAmountUSD
    };
  }, [taxBreakdown, withdrawAmount, soulShardPriceUSD]);
  
  if (!chainId || chainId !== bsc.id) {
    return (
      <div className={`p-4 bg-gray-800/50 rounded-lg text-center ${className}`}>
        <p className="text-gray-400">請連接到 BSC 網路查看稅率信息</p>
      </div>
    );
  }
  
  const isLoading = isVipLoading || isPriceLoading || !standardInitialRate || !largeWithdrawInitialRate;
  
  return (
    <div className={`space-y-4 ${className}`}>
      {showTitle && (
        <h3 className="text-lg font-bold text-purple-300 flex items-center gap-2">
          <span>🧮</span>
          智能稅率計算器
        </h3>
      )}
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* 輸入區域 */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  預計提現金額
                </label>
                <div className="flex bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setInputMode('soul')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      inputMode === 'soul'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    SOUL
                  </button>
                  <button
                    onClick={() => setInputMode('usd')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      inputMode === 'usd'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    USD
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder={inputMode === 'soul' ? '輸入 SOUL 數量' : '輸入 USD 金額'}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-16"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm font-medium">
                  {inputMode === 'soul' ? 'SOUL' : 'USD'}
                </div>
              </div>
              {inputMode === 'usd' && withdrawAmount && priceInUsd > 0 && (
                <div className="text-xs text-gray-400 mt-1">
                  ≈ {(parseFloat(withdrawAmount) / priceInUsd).toFixed(2)} SOUL
                </div>
              )}
              {inputMode === 'soul' && withdrawAmount && priceInUsd > 0 && (
                <div className="text-xs text-gray-400 mt-1">
                  ≈ ${formatSoulToUsd(withdrawAmount)} USD
                </div>
              )}
            </div>
            
            {/* 快速金額選擇 */}
            <div className="space-y-2">
              <div className="text-xs text-gray-400">快速選擇：</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {inputMode === 'soul'
                  ? [100, 500, 1000, 5000].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setWithdrawAmount(amount.toString())}
                        className="py-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-md transition flex flex-col items-center"
                      >
                        <span>{amount} SOUL</span>
                        {priceInUsd > 0 && (
                          <span className="text-gray-500">≈${(amount * priceInUsd).toFixed(0)}</span>
                        )}
                      </button>
                    ))
                  : [100, 500, 1000, 5000].map(usdAmount => {
                      const soulAmount = priceInUsd > 0 ? usdAmount / priceInUsd : 0;
                      return (
                        <button
                          key={usdAmount}
                          onClick={() => setWithdrawAmount(usdAmount.toString())}
                          className="py-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-md transition flex flex-col items-center"
                        >
                          <span>${usdAmount}</span>
                          {priceInUsd > 0 && (
                            <span className="text-gray-500">≈{soulAmount.toFixed(1)} SOUL</span>
                          )}
                        </button>
                      );
                    })
                }
              </div>
            </div>
          </div>
          
          {/* 當前用戶稅率摘要 */}
          <div className="p-4 bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-500/30 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-sm text-gray-400">您的VIP等級</div>
                <div className="text-xl font-bold text-yellow-400">LV {vipLevel}</div>
                <div className="text-xs text-green-400">稅率減免: -{(vipLevel * 0.5).toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">標準提現稅率</div>
                <div className="text-xl font-bold text-green-400">
                  {Math.max(0, 25 - vipLevel * 0.5).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">基礎25% - VIP減免</div>
              </div>
            </div>
          </div>
          
          {/* 預覽結果 */}
          {taxBreakdown && previewInfo && (
            <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-purple-300 font-medium">提現預覽</h4>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  taxBreakdown.isLargeWithdraw 
                    ? 'bg-red-900/50 text-red-300' 
                    : 'bg-green-900/50 text-green-300'
                }`}>
                  {taxBreakdown.isLargeWithdraw ? '大額提現' : '標準提現'}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">提現金額:</span>
                  <span className="text-white font-mono">{withdrawAmount} SOUL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">適用稅率:</span>
                  <span className="text-red-400 font-bold">{(taxBreakdown.finalRate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">稅額:</span>
                  <span className="text-red-400 font-mono">
                    {previewInfo.taxAmount.toFixed(2)} SOUL 
                    <span className="text-xs ml-1">
                      (≈${previewInfo.taxAmountUSD.toFixed(2)})
                    </span>
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-700">
                  <span className="text-gray-300 font-medium">實際到手:</span>
                  <span className="text-green-400 font-bold font-mono">
                    {previewInfo.afterTaxAmount.toFixed(2)} SOUL
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* 詳細稅率分解 */}
          <div>
            <ActionButton
              onClick={() => setShowDetails(!showDetails)}
              variant="secondary"
              className="w-full mb-3"
            >
              {showDetails ? '隱藏' : '顯示'}稅率詳細分解
            </ActionButton>
            
            {showDetails && taxBreakdown && (
              <div className="space-y-3 p-4 bg-gray-800/50 rounded-lg text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-300">基礎稅率</h5>
                    <div className="flex justify-between">
                      <span className="text-gray-400">
                        {taxBreakdown.isLargeWithdraw ? '大額提現(>$1000)' : '標準提現(≤$1000)'}:
                      </span>
                      <span className="text-red-400 font-mono">{(taxBreakdown.baseRate * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-300">減免項目</h5>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">VIP減免:</span>
                        <span className="text-green-400">-{taxBreakdown.vipReduction.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">時間衰減:</span>
                        <span className="text-green-400">-{Math.min(taxBreakdown.timeDecay, 99.9).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">等級減免:</span>
                        <span className="text-green-400">-{taxBreakdown.levelReduction.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 font-medium">最終稅率:</span>
                    <span className="text-xl font-bold text-purple-400">
                      {(taxBreakdown.finalRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    = {(taxBreakdown.baseRate * 100).toFixed(1)}% - {taxBreakdown.totalReduction.toFixed(1)}% = {(taxBreakdown.finalRate * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* 優化建議 */}
          {taxBreakdown && taxBreakdown.finalRate > 0 && (
            <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <h5 className="text-yellow-300 font-medium mb-2 flex items-center gap-2">
                <span>💡</span>
                優化建議
              </h5>
              <div className="text-xs text-yellow-200 space-y-1">
                {vipLevel < 20 && (
                  <p>• 提升VIP等級可獲得更多稅率減免，每級減免0.5%</p>
                )}
                {taxBreakdown.timeDecay < 10 && (
                  <p>• 距離上次提現越久，時間衰減減免越多（每天5%）</p>
                )}
                {taxBreakdown.isLargeWithdraw && (
                  <p>• 考慮分批提現，單次低於$1000可享受較低基礎稅率</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WithdrawalTaxCalculator;