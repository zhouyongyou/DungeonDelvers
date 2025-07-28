// src/components/admin/VipSettingsManager.tsx

import React, { useState } from 'react';
import { useReadContract, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { ActionButton } from '../ui/ActionButton';
import { getContract } from '../../config/contracts';
import { useAppToast } from '../../hooks/useAppToast';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface VipSettingsManagerProps {
  chainId: number;
}

const VipSettingsManager: React.FC<VipSettingsManagerProps> = ({ chainId }) => {
  const { showToast } = useAppToast();
  const { addTransaction } = useTransactionStore();
  const { writeContractAsync } = useWriteContract();
  const [cooldownValue, setCooldownValue] = useState('');
  const [cooldownUnit, setCooldownUnit] = useState<'seconds' | 'minutes' | 'hours' | 'days'>('days');
  const [isExpanded, setIsExpanded] = useState(false);

  const vipContract = getContract('VIPSTAKING');

  // 讀取當前冷卻期
  const { data: currentCooldown, isLoading } = useReadContract({
    address: vipContract?.address as `0x${string}`,
    abi: vipContract?.abi,
    functionName: 'unstakeCooldown',
    query: { 
      enabled: !!vipContract,
      staleTime: 1000 * 60 * 20, // 20分鐘 - VIP 冷卻期設定很少變更
      gcTime: 1000 * 60 * 60,    // 60分鐘
      refetchOnWindowFocus: false,
      retry: 2,
    }
  });

  // 格式化顯示當前冷卻期
  const formatCooldownDisplay = (seconds: number): string => {
    if (seconds < 60) return `${seconds} 秒`;
    else if (seconds < 3600) return `${Math.floor(seconds / 60)} 分鐘`;
    else if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小時`;
    else return `${Math.floor(seconds / 86400)} 天`;
  };

  const currentCooldownSeconds = currentCooldown ? Number(currentCooldown) : 15;

  const handleUpdateCooldown = async () => {
    if (!cooldownValue || !vipContract) return;

    try {
      // 根據選擇的單位轉換為秒
      let cooldownSeconds = Number(cooldownValue);
      switch (cooldownUnit) {
        case 'minutes':
          cooldownSeconds *= 60;
          break;
        case 'hours':
          cooldownSeconds *= 3600;
          break;
        case 'days':
          cooldownSeconds *= 86400;
          break;
      }

      const hash = await writeContractAsync({
        address: vipContract.address,
        abi: vipContract.abi,
        functionName: 'setUnstakeCooldown',
        args: [BigInt(cooldownSeconds)]
      });
      
      const displayText = `${cooldownValue} ${
        cooldownUnit === 'seconds' ? '秒' :
        cooldownUnit === 'minutes' ? '分鐘' :
        cooldownUnit === 'hours' ? '小時' : '天'
      }`;
      
      addTransaction({ hash, description: `更新 VIP 冷卻期為 ${displayText}` });
      showToast(`VIP 冷卻期更新為 ${displayText}`, 'success');
      setCooldownValue('');
    } catch (e: any) {
      if (!e.message?.includes('User rejected')) {
        showToast(`更新冷卻期失敗: ${e.shortMessage || e.message}`, 'error');
      }
    }
  };

  return (
    <div className="space-y-4">
          {/* 冷卻期設定 */}
          <div className="p-4 bg-gray-800 rounded-lg">
            <h5 className="font-medium text-white mb-3">質押冷卻期設定</h5>
            
            <div className="mb-3 text-sm text-gray-400">
              當前冷卻期：
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <span className="text-yellow-400 font-bold ml-1">{formatCooldownDisplay(currentCooldownSeconds)}</span>
              )}
            </div>
            
            <div className="flex gap-2">
              <input
                type="number"
                value={cooldownValue}
                onChange={(e) => setCooldownValue(e.target.value)}
                placeholder="輸入數值"
                className="flex-1 px-3 py-2 bg-gray-700 rounded text-white"
                min="1"
              />
              <select
                value={cooldownUnit}
                onChange={(e) => setCooldownUnit(e.target.value as any)}
                className="px-3 py-2 bg-gray-700 rounded text-white"
              >
                <option value="seconds">秒</option>
                <option value="minutes">分鐘</option>
                <option value="hours">小時</option>
                <option value="days">天</option>
              </select>
              <ActionButton
                onClick={handleUpdateCooldown}
                disabled={!cooldownValue || Number(cooldownValue) <= 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                更新冷卻期
              </ActionButton>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              建議範圍：測試時可設定 10-60 秒，正式環境建議 3-14 天。
            </p>
          </div>
          
          {/* 其他 VIP 相關設定可以在這裡添加 */}
          <div className="p-4 bg-gray-800 rounded-lg">
            <h5 className="font-medium text-white mb-3">其他設定</h5>
            <p className="text-sm text-gray-400">
              未來可以在這裡添加：
            </p>
            <ul className="text-xs text-gray-500 mt-2 list-disc list-inside">
              <li>VIP 等級門檻調整</li>
              <li>稅率減免比例設定</li>
              <li>最低質押金額要求</li>
              <li>緊急暫停/恢復功能</li>
            </ul>
          </div>
    </div>
  );
};

export default VipSettingsManager;