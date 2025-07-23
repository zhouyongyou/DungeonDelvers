// src/components/admin/OraclePriceTest.tsx - Oracle 價格測試組件

import React, { useState } from 'react';
import { useReadContract } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { getContractWithABI } from '../../config/contractsWithABI';
import AdminSection from './AdminSection';
import { LoadingSpinner } from '../ui/LoadingSpinner';

const OraclePriceTest: React.FC = () => {
  const [testAmount, setTestAmount] = useState('1');
  
  // 獲取 Oracle 合約配置
  const oracleContract = getContractWithABI('ORACLE');
  const dungeonCoreContract = getContractWithABI('DUNGEONCORE');
  
  // 獲取正確的代幣地址
  const testUsdContract = getContractWithABI('TESTUSD');
  const soulShardContract = getContractWithABI('SOULSHARD');

  // 測試 Oracle 直接價格查詢
  const { data: directPrice, isLoading: directLoading, error: directError } = useReadContract({
    ...oracleContract,
    functionName: 'getAmountOut',
    args: [
      parseEther(testAmount || '0'), 
      testUsdContract?.address || '0x0000000000000000000000000000000000000000',
      soulShardContract?.address || '0x0000000000000000000000000000000000000000'
    ],
    query: {
      enabled: !!oracleContract && !!testAmount && !isNaN(Number(testAmount)) && !!testUsdContract && !!soulShardContract,
    }
  });

  // 測試 DungeonCore 包裝的價格查詢
  const { data: corePrice, isLoading: coreLoading, error: coreError } = useReadContract({
    ...dungeonCoreContract,
    functionName: 'getSoulShardAmountForUSD',
    args: [parseEther(testAmount)],
    query: {
      enabled: !!dungeonCoreContract && !!testAmount && !isNaN(Number(testAmount)),
    }
  });

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setTestAmount(value);
    }
  };

  const formatPrice = (price: any) => {
    if (!price && price !== 0n) return 'N/A';
    try {
      const formatted = formatEther(price as bigint);
      // 格式化顯示，最多顯示 6 位小數
      const num = parseFloat(formatted);
      return num.toFixed(6).replace(/\.?0+$/, '');
    } catch (error) {
      console.error('Price formatting error:', error);
      return 'Invalid';
    }
  };

  return (
    <AdminSection title="💰 Oracle 價格測試" defaultExpanded={false}>
      <div className="space-y-6">
        {/* 測試輸入 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            測試金額 (USD)
          </label>
          <input
            type="text"
            value={testAmount}
            onChange={handleAmountChange}
            placeholder="輸入 USD 金額"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            輸入要轉換的 USD 金額，查看對應的 Soul Shard 數量
          </p>
        </div>

        {/* 測試結果 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Oracle 直接查詢 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">🔮 Oracle 直接查詢</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>狀態:</span>
                <span>
                  {directLoading ? (
                    <div className="flex items-center">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">查詢中...</span>
                    </div>
                  ) : directError ? (
                    <span className="text-red-600">❌ 錯誤</span>
                  ) : (
                    <span className="text-green-600">✅ 成功</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>結果:</span>
                <span className="font-mono">
                  {directLoading ? '...' : formatPrice(directPrice)} SOUL
                </span>
              </div>
              {directError && (
                <div className="text-xs text-red-600 mt-2">
                  錯誤: {directError.message}
                </div>
              )}
            </div>
          </div>

          {/* DungeonCore 包裝查詢 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">🏰 DungeonCore 查詢</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>狀態:</span>
                <span>
                  {coreLoading ? (
                    <div className="flex items-center">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">查詢中...</span>
                    </div>
                  ) : coreError ? (
                    <span className="text-red-600">❌ 錯誤</span>
                  ) : (
                    <span className="text-green-600">✅ 成功</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>結果:</span>
                <span className="font-mono">
                  {coreLoading ? '...' : formatPrice(corePrice)} SOUL
                </span>
              </div>
              {coreError && (
                <div className="text-xs text-red-600 mt-2">
                  錯誤: {coreError.message}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 價格一致性檢查 */}
        {directPrice && corePrice && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">🔍 一致性檢查</h4>
            <div className="text-sm text-blue-700">
              {formatPrice(directPrice) === formatPrice(corePrice) ? (
                <div className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  價格一致，系統正常
                </div>
              ) : (
                <div className="flex items-center">
                  <span className="text-red-600 mr-2">❌</span>
                  價格不一致，可能存在問題
                  <div className="mt-2 text-xs">
                    <div>Oracle 直接: {formatPrice(directPrice)} SOUL</div>
                    <div>DungeonCore: {formatPrice(corePrice)} SOUL</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 使用說明 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-2">ℹ️ 說明</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• <strong>Oracle 直接查詢</strong>: 直接調用 Oracle.getAmountOut() 函數</p>
            <p>• <strong>DungeonCore 查詢</strong>: 通過 DungeonCore.getSoulShardAmountForUSD() 包裝調用</p>
            <p>• 兩個結果應該相同，如果不同則表示配置有問題</p>
            <p>• 測試使用的交易對: USD Token → Soul Shard Token</p>
          </div>
        </div>
      </div>
    </AdminSection>
  );
};

export default OraclePriceTest;