// SettingRowDark.tsx - 深色模式版本

import React, { useState } from 'react';
import { useWriteContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import type { Abi } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import { getContractWithABI } from '../../config/contractsWithABI';
import { useAppToast } from '../../hooks/useAppToast';
import { ActionButton } from '../ui/ActionButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { invalidationStrategies } from '../../config/queryConfig';

interface SettingRowProps {
  label: string;
  readSource: string;
  contract: NonNullable<ReturnType<typeof getContractWithABI>>;
  functionName: string;
  currentValue?: unknown;
  isLoading: boolean;
  unit?: 'USD' | 'BNB' | '‱' | '無';
  placeholders?: string[];
}

const SettingRow: React.FC<SettingRowProps> = ({
  label,
  readSource,
  contract,
  functionName,
  currentValue,
  isLoading,
  unit = '無',
  placeholders = ['輸入新值']
}) => {
  const [inputValues, setInputValues] = useState<string[]>(
    new Array(placeholders.length).fill('')
  );
  const { showToast } = useAppToast();
  const { writeContractAsync, isPending } = useWriteContract();
  const queryClient = useQueryClient();

  // 防護：確保 label 有值 - 移到所有 Hook 之後
  if (!label) {
    console.warn('SettingRow: label is undefined or null');
    return null;
  }

  const handleUpdate = async () => {
    if (inputValues.some(v => !v)) return;
    
    try {
      // ★★★【核心修正】★★★
      // 現在，前端只負責傳送管理者輸入的原始字串。
      // 對於 BNB，我們仍然使用 parseEther。
      // 對於 USD，我們不再使用 parseEther，因為合約端會處理 * 1e18。
      const valuesToSet = inputValues.map((val) => {
        if (unit === 'BNB') return parseEther(val);
        // 對於 USD 和其他所有數值，直接轉換為 BigInt
        return BigInt(val);
      });
      
      console.log('🔧 管理後台更新:', { label, contract: contract.address, functionName, valuesToSet });
      
      const result = await writeContractAsync({
        address: contract.address,
        abi: contract.abi as Abi,
        functionName,
        args: valuesToSet
      });
      
      console.log('✅ 合約更新成功:', { label, txHash: result });
      showToast(`${label} 更新成功！交易哈希: ${result}`, 'success');
      
      // 清空輸入框
      setInputValues(new Array(placeholders.length).fill(''));
      
      // 🔄 立即失效相關快取 - 根據參數類型決定失效策略
      const parameterType = label.toLowerCase();
      
      if (parameterType.includes('price') || parameterType.includes('價格')) {
        // 如果是價格相關，立即失效價格快取
        queryClient.invalidateQueries({ queryKey: ['price-data'] });
        queryClient.invalidateQueries({ queryKey: ['mint-prices'] });
        queryClient.invalidateQueries({ queryKey: ['admin-parameters'] });
        
        // 特別處理：失效所有與價格相關的查詢
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey;
            return Array.isArray(key) && key.some(k => 
              typeof k === 'string' && (
                k.includes('price') || 
                k.includes('Price') || 
                k.includes('mint') || 
                k.includes('required')
              )
            );
          }
        });
      } else if (parameterType.includes('fee') || parameterType.includes('費用') || parameterType.includes('平台費')) {
        // 如果是費用相關，立即失效費用快取
        queryClient.invalidateQueries({ queryKey: ['platform-fees'] });
        queryClient.invalidateQueries({ queryKey: ['admin-parameters'] });
        
        // 🔧 增強：失效所有與費用相關的查詢
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey;
            return Array.isArray(key) && key.some(k => 
              typeof k === 'string' && (
                k.includes('fee') || 
                k.includes('Fee') || 
                k.includes('platform') || 
                k.includes('Platform') ||
                k.includes('費用') ||
                k.includes('平台費')
              )
            );
          }
        });
        
        // 🔧 立即重新獲取最新數據
        setTimeout(() => {
          window.location.reload();
        }, 2000); // 2秒後重新載入頁面確保顯示最新數據
      } else if (parameterType.includes('tax') || parameterType.includes('稅')) {
        // 如果是稅務相關，立即失效稅務快取
        queryClient.invalidateQueries({ queryKey: ['tax-system'] });
        queryClient.invalidateQueries({ queryKey: ['tax-params'] });
      } else {
        // 通用管理員參數更新
        invalidationStrategies.onAdminParameterChanged(queryClient, parameterType);
      }
    } catch (e: unknown) {
      const error = e as { shortMessage?: string; message?: string };
      // 不顯示用戶取消的錯誤訊息
      if (!error.message?.includes('User rejected')) {
        showToast(error.shortMessage || "更新失敗", "error");
      }
    }
  };

  // 調試日誌
  if (label === "地下城挑戰冷卻 (秒)") {
    console.log('🔍 SettingRow 地下城冷卻:', {
      label,
      currentValue,
      currentValueType: typeof currentValue,
      isLoading,
      unit
    });
  }

  // 顯示邏輯保持不變，依然使用 formatEther 來美化顯示
  const displayValue = isLoading ? (
    <LoadingSpinner size="h-4 w-4" />
  ) : currentValue === undefined || currentValue === null ? (
    '讀取失敗'
  ) : unit === 'USD' || unit === 'BNB' ? (
    `${formatEther(typeof currentValue === 'bigint' ? currentValue : BigInt(currentValue || 0))}`
  ) : unit === '‱' ? (
    `${(Number(currentValue ?? 0n) / 100).toFixed(2)}%`
  ) : (
    currentValue.toString()
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
      <div className="text-gray-300 md:col-span-1" title={`讀取來源: ${readSource}`}>
        {label}
      </div>
      <div className="font-mono text-sm bg-gray-800 p-2 rounded md:col-span-1 break-all">
        當前值: <span className="text-yellow-400">{displayValue}</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 md:col-span-1">
        {inputValues.map((val: unknown, index: number) => {
          const safeLabel = label || 'unknown';
          const labelId = `setting-${safeLabel.replace(/\s+/g, '-')}-${index}`;
          
          return (
            <div key={index} className="flex-1">
              <label htmlFor={labelId} className="sr-only">
                {placeholders[index]}
              </label>
              <input
                id={labelId}
                name={labelId}
                type="text"
                value={val as string}
                onChange={(e) => {
                  const newValues = [...inputValues];
                  newValues[index] = e.target.value;
                  setInputValues(newValues);
                }}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-yellow-400 focus:outline-none"
                placeholder={placeholders[index]}
              />
            </div>
          );
        })}
        <ActionButton
          onClick={handleUpdate}
          isLoading={isPending}
          className="h-10 w-full sm:w-24"
        >
          更新
        </ActionButton>
      </div>
    </div>
  );
};

export default SettingRow;