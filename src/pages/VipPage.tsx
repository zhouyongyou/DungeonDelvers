import React, { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { formatEther, maxUint256, type Abi } from 'viem';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getContract } from '../config/contracts';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { fetchAllOwnedNfts } from '../api/nfts';
import type { VipNft } from '../types/nft';

// 倒數計時器元件
const CountdownTimer: React.FC<{ unlockTime: bigint }> = ({ unlockTime }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const queryClient = useQueryClient();
  const unlockTimeMs = Number(unlockTime) * 1000;

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, unlockTimeMs - now);
      
      if (remaining === 0) {
        setTimeLeft('可以解鎖');
        queryClient.invalidateQueries({ queryKey: ['userStakes'] });
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60)).toString().padStart(2, '0');
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000).toString().padStart(2, '0');
      setTimeLeft(`${hours}:${minutes}:${seconds}`);
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, [unlockTimeMs, queryClient]);

  return <span className="font-mono text-yellow-400">{timeLeft}</span>;
};


// VIP 頁面主元件
const VipPage: React.FC = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    const queryClient = useQueryClient();
    
    const [selectedUnstakedCardId, setSelectedUnstakedCardId] = useState<bigint | null>(null);

    const vipStakingContract = getContract(chainId, 'vipStaking');
    const soulShardContract = getContract(chainId, 'soulShard');
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');

    const { data: nfts, isLoading: isLoadingNfts } = useQuery({
        queryKey: ['ownedNfts', address, chainId],
        queryFn: () => {
            if (!address || !chainId) return { heroes: [], relics: [], parties: [], vipCards: [] };
             return fetchAllOwnedNfts(address, chainId);
        },
        enabled: !!address && !!chainId,
        initialData: { heroes: [], relics: [], parties: [], vipCards: [] },
    });
    
    const { data: tokenIdCounter } = useReadContract({ 
        ...vipStakingContract, 
        functionName: '_tokenIdCounter', 
        query: { enabled: !!vipStakingContract } 
    });
    const { data: mintPrice } = useReadContract({ 
        ...vipStakingContract, 
        functionName: 'mintPriceUSD', 
        query: { enabled: !!vipStakingContract } 
    });
    const { data: soulShardPrice } = useReadContract({ 
        ...dungeonCoreContract, 
        functionName: 'getSoulShardAmountForUSD', 
        args: [mintPrice || BigInt(0)], 
        query: { enabled: !!mintPrice && !!dungeonCoreContract } 
    });
    const { data: allowance, refetch: refetchAllowance } = useReadContract({ 
        ...soulShardContract, 
        functionName: 'allowance', 
        args: [address!, vipStakingContract?.address!], 
        query: { enabled: !!address && !!vipStakingContract && !!soulShardContract }
    });
    const { data: stakedInfo } = useReadContract({ 
        ...vipStakingContract, 
        functionName: 'userStakes', 
        args: [address!], 
        query: { 
            enabled: !!address && !!vipStakingContract,
            select: (data: unknown) => {
                // 【修正】採用更安全的 select 函式，處理 wagmi 回傳的 unknown 型別
                if (Array.isArray(data) && data.length === 3 && typeof data[0] === 'bigint') {
                    return {
                        tokenId: data[0],
                        stakeTime: data[1] as bigint,
                        unlockTime: data[2] as bigint,
                    };
                }
                // 【修正】使用 BigInt() 替代 'n' 字面量
                return { tokenId: BigInt(0), stakeTime: BigInt(0), unlockTime: BigInt(0) };
            },
            refetchInterval: 5000,
        }
    });
    
    const { writeContractAsync, isPending } = useWriteContract();

    const needsApproval = useMemo(() => {
        if (typeof allowance !== 'bigint' || typeof soulShardPrice !== 'bigint') return false;
        return allowance < soulShardPrice;
    }, [allowance, soulShardPrice]);
    
    const handleTransactionSuccess = async (queryKeyToInvalidate?: readonly string[]) => {
        await queryClient.invalidateQueries({ queryKey: ['ownedNfts', address, chainId] });
        if (queryKeyToInvalidate) {
            await queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
        }
    };

    const handleApprove = async () => {
        if (!vipStakingContract || !soulShardContract) return;
        try {
            const hash = await writeContractAsync({ 
                address: soulShardContract.address,
                abi: soulShardContract.abi as Abi,
                functionName: 'approve', 
                args: [vipStakingContract.address, maxUint256]
            });
            addTransaction({ hash, description: "授權 VIP 合約" });
            showToast("授權交易已送出", "info");
            await refetchAllowance();
        } catch (e: any) { showToast(e.shortMessage || "交易失敗", "error"); }
    };

    const handleMint = async () => {
        if (!vipStakingContract) return;
        if (needsApproval) return showToast("請先完成授權", "error");
        try {
            const hash = await writeContractAsync({ ...(vipStakingContract as any), functionName: 'mint'});
            addTransaction({ hash, description: "鑄造 VIP 卡" });
            showToast("鑄造交易已送出", "info");
            await handleTransactionSuccess(['_tokenIdCounter']);
        } catch (e: any) { showToast(e.shortMessage || "交易失敗", "error"); }
    };
    
    const handleStake = async () => {
        if (!vipStakingContract) return;
        if (!selectedUnstakedCardId) return showToast("請先選擇一張要質押的 VIP 卡", "error");
        try {
            const hash = await writeContractAsync({ ...(vipStakingContract as any), functionName: 'stake', args: [selectedUnstakedCardId]});
            addTransaction({ hash, description: `質押 VIP 卡 #${selectedUnstakedCardId}` });
            showToast("質押交易已送出", "info");
            setSelectedUnstakedCardId(null);
            await handleTransactionSuccess(['userStakes']);
        } catch (e: any) { showToast(e.shortMessage || "交易失敗", "error"); }
    };

    const handleUnstake = async () => {
        if (!vipStakingContract) return;
        try {
            const hash = await writeContractAsync({ ...(vipStakingContract as any), functionName: 'unstake'});
            addTransaction({ hash, description: `取消質押 VIP 卡` });
            showToast("取消質押交易已送出", "info");
            await handleTransactionSuccess(['userStakes']);
        } catch (e: any) { showToast(e.shortMessage || "交易失敗", "error"); }
    };
    
    const unstakedVipCards = useMemo(() => {
        if (!nfts?.vipCards) return [];
        const stakedTokenId = stakedInfo?.tokenId;
        if (!stakedTokenId || stakedTokenId === BigInt(0)) return nfts.vipCards;
        return nfts.vipCards.filter((card: VipNft) => card.id !== stakedTokenId);
    }, [nfts, stakedInfo]);

    const totalSupply = useMemo(() => {
        return tokenIdCounter ? Number(tokenIdCounter) - 1 : 0;
    }, [tokenIdCounter]);
    
    const currentStakedTokenId = stakedInfo?.tokenId;
    const currentUnlockTime = stakedInfo?.unlockTime;

    return (
        <section>
            <h2 className="page-title">VIP 俱樂部</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 鑄造區 */}
                <div className="card-bg p-6 rounded-xl shadow-lg flex flex-col items-center justify-between h-full">
                    <h3 className="section-title">鑄造 VIP 會員卡</h3>
                    <p className="text-sm text-gray-400 mb-4">成為尊貴會員，享受遠征成功率加成！</p>
                    <div className="text-center my-6">
                        <p className="text-lg">限量發行: <span className="font-bold text-yellow-400">{totalSupply} / 2000</span></p>
                        {/* 【修正】增加型別檢查，確保 soulShardPrice 是 bigint 才呼叫 formatEther */}
                        <p className="text-lg mt-2">價格: <span className="font-bold text-yellow-400">{typeof soulShardPrice === 'bigint' ? parseFloat(formatEther(soulShardPrice)).toFixed(2) : '...'}</span> $SoulShard</p>
                    </div>
                    {needsApproval ? (
                        <ActionButton onClick={handleApprove} isLoading={isPending} className="w-48 h-12">授權代幣</ActionButton>
                    ) : (
                        <ActionButton onClick={handleMint} isLoading={isPending} disabled={totalSupply >= 2000} className="w-48 h-12">
                            {totalSupply >= 2000 ? "已售罄" : "立即鑄造"}
                        </ActionButton>
                    )}
                </div>

                {/* 質押管理區 */}
                <div className="card-bg p-6 rounded-xl shadow-lg h-full">
                    <h3 className="section-title">我的 VIP 狀態</h3>
                    {currentStakedTokenId && currentStakedTokenId > BigInt(0) ? (
                        <div className="text-center">
                           <p className="text-green-400 font-bold mb-2">已質押</p>
                           <p>卡片 ID: <span className="font-mono">#{currentStakedTokenId.toString()}</span></p>
                           {/* 【修正】確保傳遞給 CountdownTimer 的 unlockTime 是 bigint */}
                           <p>解鎖倒數: <CountdownTimer unlockTime={currentUnlockTime || BigInt(0)} /></p>
                           <ActionButton onClick={handleUnstake} isLoading={isPending} disabled={currentUnlockTime ? Date.now()/1000 < Number(currentUnlockTime) : true} className="w-full mt-4 h-10">取消質押</ActionButton>
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="text-gray-400 mb-4">您目前沒有質押中的 VIP 卡。</p>
                             {isLoadingNfts ? <LoadingSpinner/> : (
                                <>
                                    <select 
                                        onChange={(e) => setSelectedUnstakedCardId(e.target.value ? BigInt(e.target.value) : null)} 
                                        className="w-full p-2 border rounded-lg bg-gray-700 mb-4"
                                        defaultValue=""
                                    >
                                        <option value="">-- 選擇您要質押的卡 --</option>
                                        {unstakedVipCards.map((card: VipNft) => (
                                            <option key={card.id.toString()} value={card.id.toString()}>
                                                VIP 卡 #{card.id.toString()}
                                            </option>
                                        ))}
                                    </select>
                                    <ActionButton onClick={handleStake} isLoading={isPending} disabled={!selectedUnstakedCardId} className="w-full h-10">質押選中的卡</ActionButton>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default VipPage;
