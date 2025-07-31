// src/components/referral/CommissionManager.tsx
// 推薦人佣金管理組件 - 新版 PlayerVault v4.0 功能

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { ActionButton } from '../ui/ActionButton';
import { usePlayerVaultV4 } from '../../hooks/usePlayerVaultV4';
import { useContractTransaction } from '../../hooks/useContractTransaction';
import { useSoulPrice } from '../../hooks/useSoulPrice';
import { Icons } from '../ui/icons';

interface CommissionManagerProps {
  className?: string;
}

export const CommissionManager: React.FC<CommissionManagerProps> = ({ className = '' }) => {
  const { address } = useAccount();
  const { formatSoulToUsd } = useSoulPrice();
  const [showDetails, setShowDetails] = useState(false);
  
  const {
    commissionBalance,
    totalCommissionPaid,
    isCommissionLoading,
    refetchCommission,
    playerVaultContract
  } = usePlayerVaultV4();

  // 提取佣金交易
  const { executeTransaction, isPending } = useContractTransaction();

  const handleWithdrawCommission = async () => {
    if (!playerVaultContract || commissionBalance === 0n) return;

    await executeTransaction({
      contractCall: {
        address: playerVaultContract.address as `0x${string}`,
        abi: playerVaultContract.abi,
        functionName: 'withdrawCommission'
      },
      description: `提取推薦佣金 ${formatEther(commissionBalance)} SOUL`,
      successMessage: '佣金提取成功！', 
      errorMessage: '佣金提取失敗',
      loadingMessage: '正在提取佣金...',
      onSuccess: () => {
        refetchCommission();
      }
    });
  };

  const hasCommission = commissionBalance > 0n;
  const hasTotalCommission = totalCommissionPaid > 0n;

  if (!address || (!hasCommission && !hasTotalCommission)) {
    return null; // 不顯示組件如果沒有佣金相關數據
  }

  return (
    <div className={`bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icons.Users className="h-5 w-5 text-green-400" />
          <h3 className="text-lg font-bold text-green-300">推薦佣金</h3>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-green-400 hover:text-green-300 text-sm font-medium"
        >
          {showDetails ? '收起' : '詳情'} {showDetails ? '▲' : '▼'}
        </button>
      </div>

      {/* 佣金概覽 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">可提取佣金</div>
          <div className="text-xl font-bold text-green-400">
            {isCommissionLoading ? '...' : formatEther(commissionBalance)}
          </div>
          <div className="text-xs text-gray-500">
            SOUL (≈ ${formatSoulToUsd(formatEther(commissionBalance))})
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">累計總佣金</div>
          <div className="text-xl font-bold text-yellow-400">
            {formatEther(totalCommissionPaid)}
          </div>
          <div className="text-xs text-gray-500">
            SOUL (≈ ${formatSoulToUsd(formatEther(totalCommissionPaid))})
          </div>
        </div>
      </div>

      {/* 提取佣金按鈕 */}
      <ActionButton
        onClick={handleWithdrawCommission}
        disabled={!hasCommission || isPending}
        isLoading={isPending}
        className={`w-full py-3 font-medium transition-all ${
          hasCommission 
            ? 'bg-green-600 hover:bg-green-700 text-white' 
            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isPending ? '提取中...' : hasCommission ? `提取 ${formatEther(commissionBalance)} SOUL` : '暫無可提取佣金'}
      </ActionButton>

      {/* 詳細信息 */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-green-600/30">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">佣金率:</span>
              <span className="text-white">5%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">計算基礎:</span>
              <span className="text-white">被推薦人提現金額（扣稅後）</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">提取方式:</span>
              <span className="text-white">隨時可提取</span>
            </div>
          </div>
          
          <div className="mt-3 p-3 bg-green-900/30 rounded-lg">
            <p className="text-green-300 text-xs">
              💡 <strong>佣金說明</strong>：當您推薦的用戶從金庫提取資金時，您將獲得其提取金額（扣稅後）5% 的佣金。
              佣金會自動累積到您的虛擬佣金餘額中，您可以隨時提取。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionManager;