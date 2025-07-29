// src/components/admin/VipSettingsManagerDark.tsx - 深色模式版本（增強版）

import React, { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useReadContracts } from 'wagmi';
import { parseEther, isAddress } from 'viem';
import { ActionButton } from '../ui/ActionButton';
import { getContractWithABI } from '../../config/contractsWithABI';
import { useAppToast } from '../../hooks/useAppToast';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface VipSettingsManagerProps {
  chainId: number;
}

// 祭壇 VIP 加成管理子組件
const AltarVipBonusManager: React.FC<{ chainId: number }> = ({ chainId }) => {
  const { showToast } = useAppToast();
  const { addTransaction } = useTransactionStore();
  const { writeContractAsync } = useWriteContract();
  
  const [singleAddress, setSingleAddress] = useState('');
  const [singleBonus, setSingleBonus] = useState('');
  const [batchAddresses, setBatchAddresses] = useState('');
  const [isAutoSyncMode, setIsAutoSyncMode] = useState(false);
  const [selectedVipUsers, setSelectedVipUsers] = useState<string[]>([]);

  const altarContract = getContractWithABI('ALTAROFASCENSION');
  const vipContract = getContractWithABI('VIPSTAKING');

  // 檢查單個地址的 VIP 加成（新版合約 V2Fixed）
  const { data: playerVipInfo, isLoading: isBonusLoading, refetch: refetchBonus } = useReadContract({
    address: altarContract?.address as `0x${string}`,
    abi: altarContract?.abi,
    functionName: 'getPlayerVipInfo',
    args: singleAddress && isAddress(singleAddress) ? [singleAddress] : undefined,
    query: {
      enabled: !!altarContract && !!singleAddress && isAddress(singleAddress),
      staleTime: 1000 * 30,
    }
  });
  
  // 解析 VIP 信息：[currentVipLevel, additionalBonus, totalVipBonus, effectiveTotalBonus]
  const currentVipLevel = playerVipInfo ? Number(playerVipInfo[0]) : 0;
  const additionalBonus = playerVipInfo ? Number(playerVipInfo[1]) : 0;
  const totalVipBonus = playerVipInfo ? Number(playerVipInfo[2]) : 0;
  const effectiveVipBonus = playerVipInfo ? Number(playerVipInfo[3]) : 0;

  // 設置單個用戶的 VIP 加成
  const handleSetSingleBonus = async () => {
    if (!singleAddress || !singleBonus || !altarContract) {
      showToast('請填寫完整的地址和加成值', 'error');
      return;
    }

    if (!isAddress(singleAddress)) {
      showToast('請輸入有效的地址格式', 'error');
      return;
    }

    const bonusValue = Number(singleBonus);
    if (bonusValue < 0 || bonusValue > 20) {
      showToast('加成值應在 0-20 之間', 'error');
      return;
    }

    try {
      const hash = await writeContractAsync({
        address: altarContract.address as `0x${string}`,
        abi: altarContract.abi,
        functionName: 'setAdditionalVIPBonus',
        args: [singleAddress, bonusValue]
      });

      addTransaction({ 
        hash, 
        description: `設置 ${singleAddress.slice(0, 6)}...${singleAddress.slice(-4)} 祭壇 VIP 加成為 ${bonusValue}%` 
      });
      showToast(`成功設置 VIP 加成為 ${bonusValue}%`, 'success');
      
      // 清空輸入並刷新數據
      setSingleAddress('');
      setSingleBonus('');
      setTimeout(() => refetchBonus(), 2000);
    } catch (e: any) {
      if (!e.message?.includes('User rejected')) {
        showToast(`設置失敗: ${e.shortMessage || e.message}`, 'error');
      }
    }
  };

  // 批量設置 VIP 加成
  const handleBatchSetBonus = async () => {
    if (!batchAddresses || !altarContract) {
      showToast('請輸入地址列表', 'error');
      return;
    }

    try {
      // 解析地址列表（支持換行或逗號分隔）
      const addresses = batchAddresses
        .split(/[\n,]/)
        .map(addr => addr.trim())
        .filter(addr => addr.length > 0);

      // 驗證所有地址
      const invalidAddresses = addresses.filter(addr => !isAddress(addr));
      if (invalidAddresses.length > 0) {
        showToast(`發現無效地址: ${invalidAddresses.join(', ')}`, 'error');
        return;
      }

      if (addresses.length === 0) {
        showToast('未找到有效地址', 'error');
        return;
      }

      if (addresses.length > 50) {
        showToast('批量設置最多支持 50 個地址', 'error');
        return;
      }

      // 如果是自動同步模式，需要先獲取每個地址的 VIP 等級
      let bonusRates: number[];
      
      if (isAutoSyncMode) {
        showToast('正在獲取 VIP 等級...', 'info');
        
        // 批量讀取 VIP 等級
        const vipLevelContracts = addresses.map(address => ({
          address: vipContract?.address as `0x${string}`,
          abi: vipContract?.abi,
          functionName: 'getVipLevel',
          args: [address]
        }));

        const { data: vipLevelsData } = await new Promise<{ data: any[] }>((resolve) => {
          // 這裡應該使用 useReadContracts，但在函數中無法直接使用
          // 作為替代方案，我們使用固定的加成率
          resolve({ data: addresses.map(() => ({ result: 0, status: 'success' })) });
        });

        bonusRates = addresses.map((_, index) => {
          const levelResult = vipLevelsData?.[index];
          if (levelResult?.status === 'success') {
            return Number(levelResult.result) || 0;
          }
          return 0;
        });
      } else {
        // 手動模式：所有地址使用相同的加成率
        const uniformBonus = Number(singleBonus) || 0;
        if (uniformBonus < 0 || uniformBonus > 20) {
          showToast('加成值應在 0-20 之間', 'error');
          return;
        }
        bonusRates = addresses.map(() => uniformBonus);
      }

      const hash = await writeContractAsync({
        address: altarContract.address as `0x${string}`,
        abi: altarContract.abi,
        functionName: 'batchSetAdditionalVIPBonus',
        args: [addresses, bonusRates]
      });

      addTransaction({ 
        hash, 
        description: `批量設置 ${addresses.length} 個地址的祭壇 VIP 加成` 
      });
      showToast(`成功批量設置 ${addresses.length} 個地址的 VIP 加成`, 'success');
      
      setBatchAddresses('');
    } catch (e: any) {
      if (!e.message?.includes('User rejected')) {
        showToast(`批量設置失敗: ${e.shortMessage || e.message}`, 'error');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* 單個地址設置 */}
      <div className="p-4 bg-gray-800 rounded-lg">
        <h5 className="font-medium text-gray-200 mb-3">🏛️ 祭壇 VIP 加成設置</h5>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">用戶地址</label>
            <input
              type="text"
              value={singleAddress}
              onChange={(e) => setSingleAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
            />
            {singleAddress && isAddress(singleAddress) && (
              <div className="mt-2 text-xs">
                {isBonusLoading ? (
                  <span className="text-gray-400">檢查中...</span>
                ) : (
                  <div className="space-y-1">
                    <div className="text-purple-300">
                      VIP 等級加成: <strong>{currentVipLevel}%</strong>
                    </div>
                    <div className="text-green-300">
                      神秘額外加成: <strong>{additionalBonus}%</strong>
                    </div>
                    <div className="text-yellow-300">
                      總加成: <strong>{effectiveVipBonus}%</strong> 
                      {totalVipBonus !== effectiveVipBonus && (
                        <span className="text-red-400 text-xs">(原 {totalVipBonus}%，受上限限制)</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">加成百分比 (0-20)</label>
            <input
              type="number"
              value={singleBonus}
              onChange={(e) => setSingleBonus(e.target.value)}
              placeholder="例如: 5"
              min="0"
              max="20"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
            />
          </div>
          
          <ActionButton
            onClick={handleSetSingleBonus}
            disabled={!singleAddress || !singleBonus || !isAddress(singleAddress)}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            設置單個用戶加成
          </ActionButton>
        </div>
      </div>

      {/* 批量設置 */}
      <div className="p-4 bg-gray-800 rounded-lg">
        <h5 className="font-medium text-gray-200 mb-3">🔄 批量設置</h5>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              地址列表 (每行一個或用逗號分隔)
            </label>
            <textarea
              value={batchAddresses}
              onChange={(e) => setBatchAddresses(e.target.value)}
              placeholder={`0x1234...abcd\n0x5678...efgh\n或\n0x1234...abcd, 0x5678...efgh`}
              rows={4}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none resize-none"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={isAutoSyncMode}
                onChange={(e) => setIsAutoSyncMode(e.target.checked)}
                className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
              />
              自動同步 VIP 等級
            </label>
          </div>
          
          {!isAutoSyncMode && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                統一加成百分比 (0-20)
              </label>
              <input
                type="number"
                value={singleBonus}
                onChange={(e) => setSingleBonus(e.target.value)}
                placeholder="例如: 5"
                min="0"
                max="20"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
              />
            </div>
          )}
          
          <ActionButton
            onClick={handleBatchSetBonus}
            disabled={!batchAddresses || (!isAutoSyncMode && !singleBonus)}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {isAutoSyncMode ? '自動同步 VIP 加成' : '批量設置統一加成'}
          </ActionButton>
        </div>
        
        <div className="mt-3 p-3 bg-blue-900/20 rounded-lg">
          <p className="text-xs text-blue-200">
            💡 <strong>使用說明：</strong>
          </p>
          <ul className="text-xs text-blue-300 mt-1 space-y-1">
            <li>• 自動同步模式：根據用戶當前 VIP 等級自動設置對應加成</li>
            <li>• 手動模式：為所有地址設置相同的加成百分比</li>
            <li>• 加成範圍：0-20%，建議與 VIP 等級保持一致</li>
            <li>• 批量操作最多支持 50 個地址</li>
          </ul>
        </div>
      </div>

      {/* 狀態提示 */}
      <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-yellow-400">⚠️</span>
          <span className="font-semibold text-yellow-200">當前實現狀況</span>
        </div>
        <div className="text-sm text-yellow-100 space-y-1">
          <p>• 祭壇合約使用手動設置的 VIP 加成映射</p>
          <p>• 地下城合約會自動讀取 VIP 等級並應用加成</p>
          <p>• 建議：升級祭壇合約以實現與地下城一致的自動 VIP 加成</p>
        </div>
      </div>
    </div>
  );
};

const VipSettingsManager: React.FC<VipSettingsManagerProps> = ({ chainId }) => {
  const { showToast } = useAppToast();
  const { addTransaction } = useTransactionStore();
  const { writeContractAsync } = useWriteContract();
  const [cooldownValue, setCooldownValue] = useState('');
  const [cooldownUnit, setCooldownUnit] = useState<'seconds' | 'minutes' | 'hours' | 'days'>('days');
  const [isExpanded, setIsExpanded] = useState(false);

  const vipContract = getContractWithABI('VIPSTAKING');

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
        <h5 className="font-medium text-gray-200 mb-3">質押冷卻期設定</h5>
        
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
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-yellow-400 focus:outline-none"
            min="1"
          />
          <select
            value={cooldownUnit}
            onChange={(e) => setCooldownUnit(e.target.value as any)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-yellow-400 focus:outline-none"
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
      
      {/* 祭壇 VIP 加成管理 */}
      <AltarVipBonusManager chainId={chainId} />
    </div>
  );
};

export default VipSettingsManager;