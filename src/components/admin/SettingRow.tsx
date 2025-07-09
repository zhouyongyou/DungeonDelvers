import React, { useState } from 'react';
import { useWriteContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import type { Abi } from 'viem';
import { getContract } from '../../config/contracts';
import { useAppToast } from '../../hooks/useAppToast';
import { ActionButton } from '../ui/ActionButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface SettingRowProps {
  label: string;
  readSource: string;
  contract: NonNullable<ReturnType<typeof getContract>>;
  functionName: string;
  currentValue?: any;
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
      
      await writeContractAsync({
        address: contract.address,
        abi: contract.abi as Abi,
        functionName,
        args: valuesToSet
      });
      
      showToast(`${label} 更新成功！`, 'success');
    } catch (e: any) {
      showToast(e.shortMessage || "更新失敗", "error");
    }
  };

  // 顯示邏輯保持不變，依然使用 formatEther 來美化顯示
  const displayValue = isLoading ? (
    <LoadingSpinner size="h-4 w-4" />
  ) : currentValue === undefined || currentValue === null ? (
    'N/A'
  ) : unit === 'USD' || unit === 'BNB' ? (
    `${formatEther(currentValue ?? 0n)}`
  ) : unit === '‱' ? (
    `${(Number(currentValue ?? 0n) / 100).toFixed(2)}%`
  ) : (
    currentValue.toString()
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
      <label className="text-gray-300 md:col-span-1" title={`讀取來源: ${readSource}`}>
        {label}
      </label>
      <div className="font-mono text-sm bg-black/20 p-2 rounded md:col-span-1 break-all">
        當前值: <span className="text-yellow-400">{displayValue}</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 md:col-span-1">
        {inputValues.map((val, index) => (
          <input
            key={index}
            type="text"
            value={val}
            onChange={(e) => {
              const newValues = [...inputValues];
              newValues[index] = e.target.value;
              setInputValues(newValues);
            }}
            className="input-field w-full"
            placeholder={placeholders[index]}
          />
        ))}
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