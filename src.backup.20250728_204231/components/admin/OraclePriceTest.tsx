// src/components/admin/OraclePriceTest.tsx - Oracle 價格測試組件

import React, { useState } from 'react';
import { useReadContract } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { getContractWithABI } from '../../config/contractsWithABI';
import AdminSection from './AdminSection';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { bsc } from 'wagmi/chains';

const OraclePriceTest: React.FC = () => {
  const [testAmount, setTestAmount] = useState('1');
  
  // 獲取 Oracle 合約配置
  const oracleContract = getContractWithABI(bsc.id, 'oracle');
  const dungeonCoreContract = getContractWithABI(bsc.id, 'dungeonCore');
  
  // 獲取 Oracle 中的 USD 代幣地址
  const { data: usdTokenAddress } = useReadContract({
    ...oracleContract,
    functionName: 'usdToken',
    query: {
      enabled: !!oracleContract,
    }
  });

  // 獲取 Oracle 中的 SoulShard 代幣地址
  const { data: soulShardTokenAddress } = useReadContract({
    ...oracleContract,
    functionName: 'soulShardToken',
    query: {
      enabled: !!oracleContract,
    }
  });

  // 直接使用配置的 SoulShard 地址作為備份
  const backupSoulShardAddress = getContractWithABI(bsc.id, 'soulShard')?.address;
  const finalSoulShardAddress = soulShardTokenAddress || backupSoulShardAddress;

  // 獲取 USD 代幣的小數位數
  const { data: usdDecimals } = useReadContract({
    address: usdTokenAddress,
    abi: [
      {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function"
      }
    ],
    functionName: 'decimals',
    query: {
      enabled: !!usdTokenAddress,
    }
  });

  // USD1 是 18 位精度，直接使用 parseEther 即可
  const usdAmount = parseEther(testAmount || '0');
  
  // 測試 Oracle 直接價格查詢（USD1 是 18 位精度）
  const { data: directPrice, isLoading: directLoading, error: directError } = useReadContract({
    ...oracleContract,
    functionName: 'getAmountOut',
    args: [
      usdTokenAddress || '0x0000000000000000000000000000000000000000',
      usdAmount
    ],
    query: {
      enabled: !!oracleContract && !!testAmount && !isNaN(Number(testAmount)) && !!usdTokenAddress,
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

  // ★ 新增：反向測試 - SoulShard → USD
  const soulAmount = parseEther(testAmount || '0');
  
  // Oracle 直接反向查詢 (SoulShard → USD)
  const { data: directReversePrice, isLoading: directReverseLoading, error: directReverseError } = useReadContract({
    ...oracleContract,
    functionName: 'getAmountOut',
    args: [
      finalSoulShardAddress || '0x0000000000000000000000000000000000000000',
      soulAmount
    ],
    query: {
      enabled: !!oracleContract && !!testAmount && !isNaN(Number(testAmount)) && !!finalSoulShardAddress,
    }
  });

  // DungeonCore 反向查詢 (SoulShard → USD)
  const { data: coreReversePrice, isLoading: coreReverseLoading, error: coreReverseError } = useReadContract({
    ...dungeonCoreContract,
    functionName: 'getUSDValueForSoulShard',
    args: [soulAmount],
    query: {
      enabled: !!dungeonCoreContract && !!testAmount && !isNaN(Number(testAmount)),
    }
  });

  // 獲取 SoulShard 在 USD 中的價格
  const { data: soulShardUsdPrice, isLoading: priceLoading } = useReadContract({
    ...oracleContract,
    functionName: 'getSoulShardPriceInUSD',
    query: {
      enabled: !!oracleContract,
    }
  });

  // 測試 Oracle V22 自適應功能
  const { data: adaptivePeriods } = useReadContract({
    ...oracleContract,
    functionName: 'getAdaptivePeriods',
    query: {
      enabled: !!oracleContract,
    }
  });

  // 測試所有週期
  const { data: periodTests } = useReadContract({
    ...oracleContract,
    functionName: 'testAllPeriods',
    query: {
      enabled: !!oracleContract,
    }
  });

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setTestAmount(value);
    }
  };

  const formatPrice = (price: any) => {
    if (price === undefined || price === null) return '---';
    try {
      const rawValue = price as bigint;
      console.log('Raw price value:', rawValue.toString());
      
      // 檢查是否為 0
      if (rawValue === 0n) return '0';
      
      // 檢查是否為極大值（可能溢出）
      if (rawValue > BigInt('1000000000000000000000000')) { // > 1e24
        return `Overflow: ${rawValue.toString()}`;
      }
      
      const formatted = formatEther(rawValue);
      const num = parseFloat(formatted);
      
      // 檢查是否為 NaN 或無效數字
      if (isNaN(num) || !isFinite(num)) {
        return `Invalid: ${rawValue.toString()}`;
      }
      
      return num.toFixed(6).replace(/\.?0+$/, '');
    } catch (error) {
      console.error('Price formatting error:', error, 'Raw value:', price);
      return `Error: ${price}`;
    }
  };

  return (
    <AdminSection title="💰 Oracle 價格測試" defaultExpanded={false}>
      <div className="space-y-6">
        {/* 測試輸入 */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            測試金額 (USD)
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={testAmount}
              onChange={handleAmountChange}
              placeholder="輸入 USD 金額"
              className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
            />
            <div className="flex gap-1">
              {['0.1', '1', '10', '100'].map(amount => (
                <button
                  key={amount}
                  onClick={() => setTestAmount(amount)}
                  className="px-3 py-2 text-sm bg-blue-900 text-blue-300 rounded hover:bg-blue-800 transition-colors"
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400">
            輸入要轉換的 USD 金額，或點擊快速選擇按鈕
          </p>
        </div>

        {/* Oracle 配置信息 */}
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
          <h4 className="font-semibold text-blue-300 mb-2">🔧 Oracle 配置</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex justify-between mb-1">
                <span>Oracle 地址:</span>
                <code className="text-xs bg-blue-900/50 px-2 py-1 rounded">
                  {oracleContract?.address ? `${oracleContract.address.slice(0, 6)}...${oracleContract.address.slice(-4)}` : '未載入'}
                </code>
              </div>
              <div className="flex justify-between mb-1">
                <span>USD Token:</span>
                <code className="text-xs bg-blue-900/50 px-2 py-1 rounded">
                  {usdTokenAddress ? `${usdTokenAddress.slice(0, 6)}...${usdTokenAddress.slice(-4)}` : '載入中...'}
                </code>
              </div>
              <div className="flex justify-between mb-1">
                <span>USD Decimals:</span>
                <span className="text-xs font-mono">
                  {usdDecimals ? `${usdDecimals} 位小數` : '載入中...'}
                </span>
              </div>
              <div className="flex justify-between mb-1">
                <span>SoulShard Token:</span>
                <code className="text-xs bg-blue-900/50 px-2 py-1 rounded">
                  {finalSoulShardAddress ? `${finalSoulShardAddress.slice(0, 6)}...${finalSoulShardAddress.slice(-4)}` : '載入中...'}
                </code>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>SoulShard USD 價格:</span>
                <span className="font-mono text-xs">
                  {priceLoading ? '載入中...' : soulShardUsdPrice ? formatPrice(soulShardUsdPrice) : '未知'} USD
                </span>
              </div>
              <div className="flex justify-between mb-1">
                <span>配置狀態:</span>
                <span className={oracleContract && usdTokenAddress && usdDecimals && finalSoulShardAddress ? 'text-green-600' : 'text-red-600'}>
                  {oracleContract && usdTokenAddress && usdDecimals && finalSoulShardAddress ? '✅ 正常' : '❌ 異常'}
                </span>
              </div>
              <div className="flex justify-between mb-1">
                <span>反向測試準備:</span>
                <span className={finalSoulShardAddress && testAmount ? 'text-green-600' : 'text-yellow-600'}>
                  {finalSoulShardAddress && testAmount ? '✅ 就緒' : '⚠️ 等待'}
                </span>
              </div>
              <div className="flex justify-between mb-1">
                <span>USD1 金額:</span>
                <span className="text-xs font-mono">
                  {usdAmount ? `${usdAmount} (18位)` : '計算中...'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Oracle 基本功能測試 */}
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
          <h4 className="font-semibold text-green-300 mb-2">🧪 Oracle 基本功能測試</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex justify-between mb-1">
                <span>getSoulShardPriceInUSD():</span>
                <span className="font-mono text-xs">
                  {priceLoading ? '載入中...' : formatPrice(soulShardUsdPrice)} USD
                </span>
              </div>
              <div className="text-xs text-gray-500">
                原始值: {String(soulShardUsdPrice)}
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>基本功能狀態:</span>
                <span className={soulShardUsdPrice ? 'text-green-600' : 'text-red-600'}>
                  {soulShardUsdPrice ? '✅ 正常' : '❌ 異常'}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                價格分析: {soulShardUsdPrice && soulShardUsdPrice > BigInt('1000000000000000000000000') ? '⚠️ 價格過大' : '正常範圍'}
              </div>
            </div>
          </div>
        </div>

        {/* Oracle V22 自適應功能 */}
        <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
          <h4 className="font-semibold text-purple-300 mb-2">🔮 Oracle V22 自適應週期</h4>
          <div className="text-sm space-y-2">
            <div>
              <span className="font-medium">配置週期: </span>
              <span className="font-mono text-xs">
                {adaptivePeriods ? 
                  (adaptivePeriods as number[]).map(p => `${p}s`).join(', ') : 
                  '載入中...'
                }
              </span>
            </div>
            {periodTests && (
              <div>
                <span className="font-medium">週期測試結果:</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(adaptivePeriods as number[] || []).map((period, index) => {
                    const available = (periodTests as any)[0]?.[index];
                    const price = (periodTests as any)[1]?.[index];
                    return (
                      <div key={period} className="text-xs bg-gray-800 border border-gray-700 rounded p-2">
                        <div className="flex justify-between">
                          <span>{period}s:</span>
                          <span className={available ? 'text-green-600' : 'text-red-600'}>
                            {available ? '✅' : '❌'}
                          </span>
                        </div>
                        {available && price && (
                          <div className="text-gray-400 font-mono">
                            {formatPrice(price)} USD
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 測試結果 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Oracle 直接查詢 */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-100 mb-3">🔮 Oracle 直接查詢</h4>
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
              <div className="text-xs text-gray-500 mt-2">
                函數: getAmountOut({usdTokenAddress ? `${usdTokenAddress.slice(0, 6)}...` : '?'}, {usdAmount?.toString() || '0'})
              </div>
              <div className="text-xs text-gray-400 mt-1">
                USD1: {testAmount} → {usdAmount?.toString() || '0'} (18位精度)
              </div>
              <div className="text-xs text-red-500 mt-1">
                Oracle地址: {oracleContract?.address || '未載入'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                原始值: {directLoading ? '...' : String(directPrice)}
              </div>
              {directError && (
                <div className="text-xs text-red-600 mt-2">
                  錯誤: {directError.message}
                </div>
              )}
            </div>
          </div>

          {/* DungeonCore 包裝查詢 */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-100 mb-3">🏰 DungeonCore 查詢</h4>
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

        {/* 🔥 強制顯示調試區塊 */}
        <div className="bg-red-100 border border-red-300 rounded-lg p-2 mb-4">
          <p className="text-red-800 text-sm">🔥 調試：反向測試區塊應該在下方顯示</p>
          <p className="text-xs text-red-600">finalSoulShardAddress: {finalSoulShardAddress || 'undefined'}</p>
        </div>

        {/* ★ 新增：反向測試結果 (SoulShard → USD) */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 mb-3">🔄 反向測試 (SoulShard → USD)</h4>
          <div className="text-xs text-yellow-700 mb-2">
            SoulShard 地址: {finalSoulShardAddress ? `${finalSoulShardAddress.slice(0, 6)}...${finalSoulShardAddress.slice(-4)}` : '載入中...'}
          </div>
          <div className="text-xs text-yellow-600 mb-2">
            來源: {soulShardTokenAddress ? 'Oracle 合約' : backupSoulShardAddress ? '配置備份' : '無法載入'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Oracle 反向直接查詢 */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <h5 className="font-medium text-gray-300 mb-2">🔮 Oracle 反向查詢</h5>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>狀態:</span>
                  <span>
                    {directReverseLoading ? (
                      <div className="flex items-center">
                        <LoadingSpinner size="sm" />
                        <span className="ml-1 text-xs">查詢中...</span>
                      </div>
                    ) : directReverseError ? (
                      <span className="text-red-600">❌ 錯誤</span>
                    ) : (
                      <span className="text-green-600">✅ 成功</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>結果:</span>
                  <span className="font-mono text-xs">
                    {directReverseLoading ? '...' : formatPrice(directReversePrice)} USD
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {testAmount} SOUL → USD
                </div>
                <div className="text-xs text-gray-500">
                  原始值: {directReverseLoading ? '...' : String(directReversePrice)}
                </div>
                <div className="text-xs text-gray-500">
                  函數: getAmountOut({finalSoulShardAddress ? `${finalSoulShardAddress.slice(0, 6)}...` : '?'}, {soulAmount?.toString() || '0'})
                </div>
                {directReverseError && (
                  <div className="text-xs text-red-600">
                    錯誤: {directReverseError.message}
                  </div>
                )}
              </div>
            </div>

            {/* DungeonCore 反向查詢 */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <h5 className="font-medium text-gray-300 mb-2">🏰 DungeonCore 反向查詢</h5>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>狀態:</span>
                  <span>
                    {coreReverseLoading ? (
                      <div className="flex items-center">
                        <LoadingSpinner size="sm" />
                        <span className="ml-1 text-xs">查詢中...</span>
                      </div>
                    ) : coreReverseError ? (
                      <span className="text-red-600">❌ 錯誤</span>
                    ) : (
                      <span className="text-green-600">✅ 成功</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>結果:</span>
                  <span className="font-mono text-xs">
                    {coreReverseLoading ? '...' : formatPrice(coreReversePrice)} USD
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {testAmount} SOUL → USD
                </div>
                <div className="text-xs text-gray-500">
                  原始值: {coreReverseLoading ? '...' : String(coreReversePrice)}
                </div>
                <div className="text-xs text-gray-500">
                  函數: getUSDValueForSoulShard({soulAmount?.toString() || '0'})
                </div>
                {coreReverseError && (
                  <div className="text-xs text-red-600">
                    錯誤: {coreReverseError.message}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 反向一致性檢查 */}
          {directReversePrice && coreReversePrice && (
            <div className="mt-3 p-2 bg-blue-900/20 rounded border border-blue-700">
              <h6 className="font-medium text-blue-300 text-sm mb-1">🔍 反向一致性檢查</h6>
              <div className="text-sm text-blue-400">
                {formatPrice(directReversePrice) === formatPrice(coreReversePrice) ? (
                  <div className="flex items-center">
                    <span className="text-green-600 mr-2">✅</span>
                    反向轉換一致，包裝正常
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="text-red-600 mr-2">❌</span>
                    反向轉換不一致，包裝可能有問題
                    <div className="mt-1 text-xs">
                      <div>Oracle 反向: {formatPrice(directReversePrice)} USD</div>
                      <div>DungeonCore 反向: {formatPrice(coreReversePrice)} USD</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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

        {/* 🚨 地址對比檢查 */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-semibold text-red-800 mb-2">🚨 地址對比檢查</h4>
          <div className="text-sm space-y-2">
            <div>
              <span className="font-medium">Oracle 的 USD Token:</span>
              <code className="ml-2 text-xs bg-red-100 px-2 py-1 rounded">
                {usdTokenAddress || '載入中...'}
              </code>
            </div>
            <div>
              <span className="font-medium">配置中的 USDT:</span>
              <code className="ml-2 text-xs bg-red-100 px-2 py-1 rounded">
                0x7C67Af4EBC6651c95dF78De11cfe325660d935FE
              </code>
            </div>
            <div className="mt-2">
              <span className="font-medium">地址匹配:</span>
              <span className={usdTokenAddress === '0x7C67Af4EBC6651c95dF78De11cfe325660d935FE' ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>
                {usdTokenAddress === '0x7C67Af4EBC6651c95dF78De11cfe325660d935FE' ? '✅ 匹配' : '❌ 不匹配'}
              </span>
            </div>
            {usdTokenAddress && usdTokenAddress !== '0x7C67Af4EBC6651c95dF78De11cfe325660d935FE' && (
              <div className="bg-red-100 p-2 rounded mt-2">
                <strong>⚠️ 發現問題：Oracle 和 DungeonCore 使用不同的 USD 代幣地址！</strong>
              </div>
            )}
          </div>
        </div>

        {/* 重要說明：USD1 是 18 位精度 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">💡 重要說明</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• <strong>USD1 代幣使用 18 位精度</strong>（不是普通 USDT 的 6 位）</p>
            <p>• Oracle 和 DungeonCore 都應該直接使用 18 位精度數值</p>
            <p>• 如果 DungeonCore 包含單位轉換邏輯，可能是多餘的</p>
            <p>• 兩個查詢現在應該返回相同結果</p>
          </div>
        </div>

        {/* 使用說明 */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h4 className="font-semibold text-gray-100 mb-2">ℹ️ 說明</h4>
          <div className="text-sm text-gray-400 space-y-1">
            <p>• <strong>Oracle 直接查詢</strong>: 調用 Oracle.getAmountOut(usdTokenAddress, amount)</p>
            <p>• <strong>DungeonCore 查詢</strong>: 調用 DungeonCore.getSoulShardAmountForUSD(amount)</p>
            <p>• <strong>USD Token 地址</strong>: 自動從 Oracle.usdToken() 獲取</p>
            <p>• <strong>SoulShard USD 價格</strong>: 從 Oracle.getSoulShardPriceInUSD() 獲取</p>
            <p>• <strong>反向測試</strong>: 驗證 SoulShard → USD 轉換是否正常</p>
            <p>• 反向測試可以檢測包裝函數是否完整有效</p>
            <p>• 如果顯示 "--- SOUL" 或 "--- USD" 表示函數返回了無效值</p>
          </div>
        </div>
      </div>
    </AdminSection>
  );
};

export default OraclePriceTest;