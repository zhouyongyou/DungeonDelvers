// src/components/admin/OraclePriceTestDark.tsx - 深色模式版本的 Oracle 價格測試組件

import React, { useState } from 'react';
import { useReadContract, useChainId } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { getContractWithABI } from '../../config/contractsWithABI';
import AdminSection from './AdminSection';
import { LoadingSpinner } from '../ui/LoadingSpinner';

const OraclePriceTest: React.FC = () => {
  const [testAmount, setTestAmount] = useState('1');
  const chainId = useChainId();
  
  // 獲取 Oracle 合約配置 - 使用小寫名稱
  const oracleContract = getContractWithABI(chainId, 'oracle');
  const dungeonCoreContract = getContractWithABI(chainId, 'dungeonCore');

  // 獲取正確的代幣地址 - 使用正確的名稱映射
  const testUsdContract = getContractWithABI(chainId, 'testUsd');
  const soulShardContract = getContractWithABI(chainId, 'soulShard');

  // 測試 Oracle 直接價格查詢
  const { data: directPrice, isLoading: directLoading, error: directError } = useReadContract({
    ...oracleContract,
    functionName: 'getAmountOut',
    args: [
      testUsdContract?.address || '0x0000000000000000000000000000000000000000',
      parseEther(testAmount || '0')
    ],
    query: {
      enabled: !!oracleContract && !!testAmount && !isNaN(Number(testAmount)) && Number(testAmount) > 0 && !!testUsdContract && !!soulShardContract,
    }
  });
  
  // 調試日誌
  console.log('🔍 Oracle 查詢調試:', {
    oracleContract: oracleContract?.address,
    testUsdContract: testUsdContract?.address,
    soulShardContract: soulShardContract?.address,
    testAmount,
    directPrice,
    directError,
    enabled: !!oracleContract && !!testAmount && !isNaN(Number(testAmount)) && Number(testAmount) > 0
  });

  // 測試 DungeonCore 包裝的價格查詢
  const { data: corePrice, isLoading: coreLoading, error: coreError } = useReadContract({
    ...dungeonCoreContract,
    functionName: 'getSoulShardAmountForUSD',
    args: [parseEther(testAmount || '0')],
    query: {
      enabled: !!dungeonCoreContract && !!testAmount && !isNaN(Number(testAmount)) && Number(testAmount) > 0,
    }
  });

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setTestAmount(value);
    }
  };

  const formatPrice = (price: any) => {
    console.log('🔍 formatPrice 調試:', {
      price,
      priceType: typeof price,
      isZero: price === 0n,
      isUndefined: price === undefined,
      isNull: price === null
    });
    
    if (!price && price !== 0n) return '---';
    try {
      const formatted = formatEther(price as bigint);
      // 格式化顯示，最多顯示 6 位小數
      const num = parseFloat(formatted);
      if (num === 0) return '0';
      if (num < 0.000001) return '< 0.000001';
      return num.toFixed(6).replace(/\.?0+$/, '');
    } catch (error) {
      console.error('Price formatting error:', error);
      return 'Error';
    }
  };

  return (
    <AdminSection title="💰 Oracle 價格測試" defaultExpanded={false}>
      <div className="space-y-6">
        {/* 測試輸入 */}
        <div className="bg-gray-800 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            測試金額 (USD)
          </label>
          <input
            type="text"
            value={testAmount}
            onChange={handleAmountChange}
            placeholder="輸入 USD 金額"
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            輸入要轉換的 USD 金額，查看對應的 Soul Shard 數量
          </p>
        </div>

        {/* 測試結果 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Oracle 直接查詢 */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-200 mb-3">🔮 Oracle 直接查詢</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">狀態:</span>
                <span>
                  {directLoading ? (
                    <div className="flex items-center">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2 text-gray-300">查詢中...</span>
                    </div>
                  ) : directError ? (
                    <span className="text-red-400">❌ 錯誤</span>
                  ) : (
                    <span className="text-green-400">✅ 成功</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">結果:</span>
                <span className="font-mono text-white">
                  {directLoading ? '...' : formatPrice(directPrice)} SOUL
                </span>
              </div>
              {directError && (
                <div className="text-xs text-red-400 mt-2">
                  錯誤: {directError.message}
                </div>
              )}
            </div>
          </div>

          {/* DungeonCore 包裝查詢 */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-200 mb-3">🏰 DungeonCore 查詢</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">狀態:</span>
                <span>
                  {coreLoading ? (
                    <div className="flex items-center">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2 text-gray-300">查詢中...</span>
                    </div>
                  ) : coreError ? (
                    <span className="text-red-400">❌ 錯誤</span>
                  ) : (
                    <span className="text-green-400">✅ 成功</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">結果:</span>
                <span className="font-mono text-white">
                  {coreLoading ? '...' : formatPrice(corePrice)} SOUL
                </span>
              </div>
              {coreError && (
                <div className="text-xs text-red-400 mt-2">
                  錯誤: {coreError.message}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 價格一致性檢查 */}
        {directPrice && corePrice && Number(testAmount) > 0 && (
          <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
            <h4 className="font-semibold text-blue-400 mb-2">🔍 一致性檢查</h4>
            <div className="text-sm text-blue-300">
              {formatPrice(directPrice) === formatPrice(corePrice) ? (
                <div className="flex items-center">
                  <span className="text-green-400 mr-2">✅</span>
                  價格一致，系統正常
                </div>
              ) : (
                <div>
                  <div className="flex items-center">
                    <span className="text-red-400 mr-2">❌</span>
                    價格不一致，可能存在問題
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    <div>Oracle 直接: {formatPrice(directPrice)} SOUL</div>
                    <div>DungeonCore: {formatPrice(corePrice)} SOUL</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 當前兌換率 */}
        {(directPrice || corePrice) && Number(testAmount) > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-200 mb-2">💱 當前兌換率</h4>
            <div className="text-2xl font-mono text-yellow-400">
              1 USD = {formatPrice(directPrice || corePrice)} SOUL
            </div>
            <div className="text-sm text-gray-400 mt-1">
              基於當前 Oracle 價格數據
            </div>
          </div>
        )}

        {/* 使用說明 */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h4 className="font-semibold text-gray-200 mb-2">ℹ️ 說明</h4>
          <div className="text-sm text-gray-400 space-y-1">
            <p>• <strong className="text-gray-300">Oracle 直接查詢</strong>: 直接調用 Oracle.getAmountOut() 函數</p>
            <p>• <strong className="text-gray-300">DungeonCore 查詢</strong>: 通過 DungeonCore.getSoulShardAmountForUSD() 包裝調用</p>
            <p>• 兩個結果應該相同，如果不同則表示配置有問題</p>
            <p>• 測試使用的交易對: TestUSD ({testUsdContract?.address?.slice(0, 6)}...) → SoulShard ({soulShardContract?.address?.slice(0, 6)}...)</p>
          </div>
        </div>
      </div>
    </AdminSection>
  );
};

export default OraclePriceTest;