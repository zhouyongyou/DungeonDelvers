import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, useReadContract, useWriteContract } from 'wagmi';
import { formatEther, type Address } from "viem"; 
import { useAppToast } from '../hooks/useAppToast';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
// 【第1步：導入 store】
import { useTransactionStore } from '../stores/useTransactionStore';

const DashboardPage: React.FC = () => {
  const { address, chainId } = useAccount();
  const { showToast } = useAppToast();
  // 【第2步：獲取 addTransaction 函式】
  const { addTransaction } = useTransactionStore();

  const soulShardContract = getContract(chainId, 'soulShard');
  const dungeonCoreContract = getContract(chainId, 'dungeonCore');

  const { data: tokenBalance, isLoading: isLoadingTokenBalance } = useBalance({
    address,
    token: soulShardContract?.address as Address | undefined,
  });

  const { data, isLoading: isLoadingPlayerInfo } = useReadContract({
    abi: dungeonCoreContract?.abi,
    address: dungeonCoreContract?.address,
    functionName: 'playerInfo',
    args: [address!],
    query: { enabled: !!address && !!dungeonCoreContract },
  });
  
  const playerInfo = Array.isArray(data) ? data : [0n, 0n, true];
  const [withdrawableBalance, lastWithdrawTimestamp, isFirstWithdraw] = playerInfo;

  // 【修改】移除 isPending，因為交易追蹤系統會處理
  const { writeContractAsync, isPending: isWithdrawing } = useWriteContract();

  const handleWithdraw = async () => {
    if (withdrawableBalance > 0n && dungeonCoreContract) {
      try {
        const hash = await writeContractAsync({ 
            abi: dungeonCoreContract.abi,
            address: dungeonCoreContract.address,
            functionName: 'withdraw', 
            args: [withdrawableBalance] 
        });
        // 【第3步：記錄交易】
        addTransaction({ hash, description: '從金庫提領獎勵' });
      } catch (e: any) {
        if (!e.message.includes('User rejected the request')) {
          showToast(e.message.split('\n')[0], 'error');
        }
      }
    } else {
      showToast('沒有可提領的餘額', 'info');
    }
  };
  
  // ... (useEffect 計算稅率的邏輯保持不變) ...
  const [currentTax, setCurrentTax] = useState<number>(0);

  useEffect(() => {
    if (isFirstWithdraw) {
      setCurrentTax(0);
      return;
    }
    const TAX_PERIOD = 24 * 3600; 
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
  }, [playerInfo, isFirstWithdraw, lastWithdrawTimestamp]);

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
        <div className="card-bg p-6 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <a href="https://web3.okx.com/zh-hans/nft" target="_blank" rel="noreferrer" className="btn-primary py-3 rounded-lg">交易英雄</a>
          <a href="https://web3.okx.com/zh-hans/nft" target="_blank" rel="noreferrer" className="btn-primary py-3 rounded-lg">交易聖物</a>
          <a href="https://web3.okx.com/zh-hans/nft" target="_blank" rel="noreferrer" className="btn-primary py-3 rounded-lg">交易隊伍</a>
        </div>
      </div>
    </section>
  );
};

export default DashboardPage;