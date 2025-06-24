import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, useReadContract, useWriteContract } from 'wagmi';
import { formatEther } from 'viem';
import { useAppToast } from '../hooks/useAppToast';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const DashboardPage: React.FC = () => {
  const { address, chainId } = useAccount();
  const { showToast } = useAppToast();

  const soulShardContract = getContract(chainId, 'soulShardToken');
  const dungeonCoreContract = getContract(chainId, 'dungeonCore');

  const { data: tokenBalance, isLoading: isLoadingTokenBalance } = useBalance({
    address,
    token: soulShardContract?.address,
    query: { enabled: !!address && !!soulShardContract, queryKey: ['balance', address, chainId] },
  });

  const { data: playerInfo, isLoading: isLoadingPlayerInfo } = useReadContract({
    address: dungeonCoreContract?.address,
    abi: dungeonCoreContract?.abi,
    functionName: 'playerInfo',
    args: [address!],
    query: { enabled: !!address && !!dungeonCoreContract, queryKey: ['playerInfo', address, chainId] },
  });
  
  const withdrawableBalance = playerInfo?.[0] ?? 0n;

  const { writeContract, isPending: isWithdrawing } = useWriteContract({
    mutation: {
      onSuccess: () => showToast('提領請求已送出！', 'success'),
      onError: (err) => showToast(err.message.split('\n')[0], 'error'),
    }
  });

  const handleWithdraw = () => {
    if (withdrawableBalance > 0n && dungeonCoreContract) {
      writeContract({ ...dungeonCoreContract, functionName: 'withdraw', args: [withdrawableBalance] });
    } else {
      showToast('沒有可提領的餘額', 'info');
    }
  };
  
  const [currentTax, setCurrentTax] = useState<number>(0);

  // 【細節還原】使用 useEffect 來計算並更新當前稅率
  useEffect(() => {
    if (playerInfo) {
      const [, lastWithdrawTimestamp, isFirstWithdraw] = playerInfo;
      if (isFirstWithdraw) {
        setCurrentTax(0);
        return;
      }
      
      const TAX_PERIOD = 24 * 3600; // 24 小時
      const MAX_TAX_RATE = 30;
      const TAX_DECREASE_RATE = 10;
      
      const now = Math.floor(Date.now() / 1000);
      const timeSinceLast = now - Number(lastWithdrawTimestamp);
      
      let taxRate = 0;
      if (timeSinceLast < TAX_PERIOD * 3) {
        const periodsPassed = Math.floor(timeSinceLast / TAX_PERIOD);
        taxRate = Math.max(0, MAX_TAX_RATE - (periodsPassed * TAX_DECREASE_RATE));
      }
      setCurrentTax(taxRate);
    }
  }, [playerInfo]);
  
  const isLoading = isLoadingTokenBalance || isLoadingPlayerInfo;

  return (
    <section>
      <h2 className="page-title">儀表板</h2>
      <div className="card-bg p-6 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="section-title">玩家狀態</h3>
          <div className="mb-1">錢包地址: <span className="font-mono text-sm break-all">{address || '尚未連接'}</span></div>
          <div className="flex items-center">
            $SoulShard 餘額: 
            <span className={`font-bold text-yellow-600 ml-2`}>
              {isLoading ? <LoadingSpinner size="h-4 w-4" color="border-gray-500" /> : parseFloat(formatEther(tokenBalance?.value ?? 0n)).toFixed(4)}
            </span>
          </div>
        </div>
        <div>
          <h3 className="section-title">個人金庫</h3>
          <div className="flex items-center">
            可提取餘額: 
            <span className={`font-bold text-green-600 ml-2 mr-1`}>
              {isLoading ? <LoadingSpinner size="h-4 w-4" color="border-gray-500" /> : parseFloat(formatEther(withdrawableBalance)).toFixed(4)}
            </span>
             $SoulShard
          </div>
          {/* 【細節還原】顯示當前稅率 */}
          <p className="text-xs text-gray-500 mt-1">當前稅率: {currentTax}%</p>
          <div className="mt-2">
            <ActionButton 
              onClick={handleWithdraw} 
              disabled={withdrawableBalance <= 0n || isWithdrawing}
              isLoading={isWithdrawing}
              className="w-full h-9 text-sm"
            >
              全部提領
            </ActionButton>
          </div>
        </div>
      </div>
      <div className="mt-8">
        <h3 className="section-title text-center">交易市場</h3>
        {/* 【細節還原】使用您在舊版中設定的 OKX 市場連結 */}
        <div className="card-bg p-6 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <a href="https://web3.okx.com/zh-hans/nft" target="_blank" rel="noreferrer" className="btn-primary py-3 rounded-lg">交易英雄</a>
          <a href="https://web3.okx.com/zh-hans/nft" target="_blank" rel="noreferrer" className="btn-primary py-3 rounded-lg">交易聖物</a>
          <a href="https://web3.okx.com/zh-hans/nft" target="_blank" rel="noreferrer" className="btn-primary py-3 rounded-lg">交易隊伍</a>
        </div>
      </div>
    </section>
  );
};