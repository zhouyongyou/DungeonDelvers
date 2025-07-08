// src/pages/VipPage.tsx (最終修正版)

import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useWriteContract, usePublicClient, useReadContract, useBalance } from 'wagmi';
import { formatEther, maxUint256, parseEther } from 'viem';
import { Buffer } from 'buffer';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useCountdown } from '../hooks/useCountdown';
import { bsc } from 'wagmi/chains';

// =================================================================
// Section: 數據獲取 Hook (RPC-First Approach)
// =================================================================

/**
 * @notice 專門用於獲取和管理 VIP 頁面所有狀態的自定義 Hook。
 * @dev ★★★【核心修正】★★★
 * 此版本採用「RPC 優先」策略。所有關鍵數據（質押數量、TokenID、等級）
 * 都直接透過 useReadContract 從鏈上讀取，確保交易後的即時一致性，
 * 徹底解決了 The Graph 索引延遲導致的 UI 更新問題。
 */
const useVipStatus = () => {
    const { address, chainId } = useAccount();

    const isSupportedChain = chainId === bsc.id;

    // 依賴鏈 ID 獲取合約實例
    const vipStakingContract = useMemo(() => isSupportedChain ? getContract(chainId, 'vipStaking') : null, [chainId, isSupportedChain]);
    const soulShardContract = useMemo(() => isSupportedChain ? getContract(chainId, 'soulShard') : null, [chainId, isSupportedChain]);

    // 1. 直接從鏈上讀取 userStakes，獲取最即時的質押數量和 tokenId
    const { data: stakeInfo, isLoading: isLoadingStakeInfo, refetch: refetchStakeInfo } = useReadContract({
        ...vipStakingContract,
        functionName: 'userStakes',
        args: [address!],
        query: { enabled: !!address && !!vipStakingContract }
    });

    // 2. 直接從鏈上讀取其他所有相關數據
    const { data: soulShardBalance, isLoading: isLoadingBalance, refetch: refetchBalance } = useBalance({ address, token: soulShardContract?.address, query: { enabled: !!address && !!soulShardContract } });
    const { data: vipLevel, isLoading: isLoadingVipLevel, refetch: refetchVipLevel } = useReadContract({ ...vipStakingContract, functionName: 'getVipLevel', args: [address!], query: { enabled: !!address && !!vipStakingContract } });
    const { data: taxReduction, isLoading: isLoadingTax, refetch: refetchTaxReduction } = useReadContract({ ...vipStakingContract, functionName: 'getVipTaxReduction', args: [address!], query: { enabled: !!address && !!vipStakingContract } });
    const { data: unstakeQueue, isLoading: isLoadingQueue, refetch: refetchUnstakeQueue } = useReadContract({ ...vipStakingContract, functionName: 'unstakeQueue', args: [address!], query: { enabled: !!address && !!vipStakingContract } });
    const { data: allowance, isLoading: isLoadingAllowance, refetch: refetchAllowance } = useReadContract({ ...soulShardContract, functionName: 'allowance', args: [address!, vipStakingContract?.address!], query: { enabled: !!address && !!vipStakingContract && !!soulShardContract } });

    // 3. 從讀取到的數據中計算衍生狀態
    const stakedAmount = useMemo(() => (stakeInfo as readonly [bigint, bigint])?.[0] ?? 0n, [stakeInfo]);
    const tokenId = useMemo(() => (stakeInfo as readonly [bigint, bigint])?.[1], [stakeInfo]);
    const pendingUnstakeAmount = useMemo(() => (unstakeQueue as readonly [bigint, bigint])?.[0] ?? 0n, [unstakeQueue]);
    const unstakeAvailableAt = useMemo(() => Number((unstakeQueue as readonly [bigint, bigint])?.[1] ?? 0n), [unstakeQueue]);

    const { isOver: isCooldownOver, formatted: countdown } = useCountdown(unstakeAvailableAt);

    // 4. 提供一個統一的刷新函式，方便在交易後更新所有數據
    const refetchAll = () => {
        refetchStakeInfo();
        refetchBalance();
        refetchVipLevel();
        refetchTaxReduction();
        refetchUnstakeQueue();
        refetchAllowance();
    };

    return {
        isLoading: isLoadingStakeInfo || isLoadingBalance || isLoadingVipLevel || isLoadingTax || isLoadingQueue || isLoadingAllowance,
        vipStakingContract,
        soulShardContract,
        soulShardBalance: soulShardBalance?.value ?? 0n,
        stakedAmount,
        tokenId,
        vipLevel: vipLevel ?? 0,
        taxReduction: taxReduction ?? 0n,
        pendingUnstakeAmount,
        isCooldownOver,
        countdown,
        allowance: allowance ?? 0n,
        refetchAll,
    };
};


// =================================================================
// Section: 子元件與主頁面
// =================================================================

const VipCardDisplay: React.FC<{ tokenId: bigint | null, chainId: number | undefined }> = ({ tokenId, chainId }) => {
    // ... (此元件程式碼保持不變)
    if (!chainId || (chainId !== bsc.id)) {
        return <div className="w-full aspect-square bg-gray-900/50 rounded-xl flex items-center justify-center text-gray-500">網路不支援</div>;
    }
    const vipStakingContract = getContract(chainId as any, 'vipStaking');
    
    const { data: tokenURI, isLoading } = useReadContract({
        ...vipStakingContract,
        functionName: 'tokenURI',
        args: [tokenId!],
        query: { enabled: !!tokenId && tokenId > 0n && !!vipStakingContract },
    });

    const svgImage = useMemo(() => {
        if (!tokenURI) return null;
        try {
            const uriString = typeof tokenURI === 'string' ? tokenURI : '';
            const decodedUri = Buffer.from(uriString.substring('data:application/json;base64,'.length), 'base64').toString();
            const metadata = JSON.parse(decodedUri);
            return metadata.image;
        } catch (e) {
            console.error("解析 VIP 卡 SVG 失敗:", e);
            return null;
        }
    }, [tokenURI]);

    if (isLoading) return <div className="w-full aspect-square bg-gray-900/50 rounded-xl flex items-center justify-center"><LoadingSpinner /></div>;
    if (!svgImage) return <div className="w-full aspect-square bg-gray-900/50 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500">無 VIP 卡</div>;
    
    return <img src={svgImage} alt="VIP Card" className="w-full h-auto rounded-xl shadow-lg" />;
};

const VipPage: React.FC = () => {
    const { chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    const publicClient = usePublicClient();

    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState<'stake' | 'unstake'>('stake');
    const [isAwaitingStakeAfterApproval, setIsAwaitingStakeAfterApproval] = useState(false);
    
    // ★★★【核心修正】★★★
    // 使用我們新的、基於 RPC 的 Hook
    const {
        isLoading, vipStakingContract, soulShardContract,
        soulShardBalance, stakedAmount, tokenId, vipLevel, taxReduction,
        pendingUnstakeAmount, isCooldownOver, countdown, allowance, refetchAll
    } = useVipStatus();

    const getTxDescription = (functionName: string, txAmount: string): string => {
        switch(functionName) {
            case 'approve': return '批准 VIP 合約';
            case 'stake': return `質押 ${txAmount} $SoulShard`;
            case 'requestUnstake': return `請求贖回 ${txAmount} $SoulShard`;
            case 'claimUnstaked': return '領取已贖回的代幣';
            default: return 'VIP 相關交易';
        }
    };

    const { writeContractAsync, isPending: isTxPending } = useWriteContract({
        mutation: {
            onSuccess: async (hash, variables) => {
                const { functionName } = variables;
                addTransaction({ hash, description: getTxDescription(functionName as string, amount) });
                await publicClient?.waitForTransactionReceipt({ hash });
                if (functionName === 'approve') {
                    showToast('授權成功！將自動為您質押...', 'success');
                    setIsAwaitingStakeAfterApproval(true);
                } else {
                    showToast(`${getTxDescription(functionName as string, amount)} 已成功！`, 'success');
                    if (functionName !== 'approve') setAmount('');
                    refetchAll(); // ★★★【核心修正】★★★ 交易成功後，刷新所有鏈上數據
                }
            },
            onError: (error: any) => { if (!error.message.includes('User rejected')) showToast(error.shortMessage || "交易失敗", "error"); }
        }
    });
    
    // 授權成功後自動觸發質押
    useEffect(() => {
        async function Cb() {
            if (isAwaitingStakeAfterApproval && !isTxPending) {
                await refetchAll(); // 先刷新一次確保 allowance 更新
                setIsAwaitingStakeAfterApproval(false);
                if (mode === 'stake' && amount) handleStake();
            }
        }
        Cb();
    }, [isAwaitingStakeAfterApproval, isTxPending, allowance]);

    const needsApproval = useMemo(() => {
        if (mode !== 'stake' || !amount) return false;
        try { return typeof allowance === 'bigint' && allowance < parseEther(amount); } catch { return false; }
    }, [allowance, amount, mode]);

    const handleApprove = () => writeContractAsync({ ...soulShardContract!, functionName: 'approve', args: [vipStakingContract!.address, maxUint256] });
    const handleStake = () => writeContractAsync({ ...vipStakingContract!, functionName: 'stake', args: [parseEther(amount)] });
    const handleRequestUnstake = () => writeContractAsync({ ...vipStakingContract!, functionName: 'requestUnstake', args: [parseEther(amount)] });
    const handleClaim = () => writeContractAsync({ ...vipStakingContract!, functionName: 'claimUnstaked' });
    const handleMainAction = () => { if (mode === 'stake') { if (needsApproval) handleApprove(); else handleStake(); } else { handleRequestUnstake(); } };
    const handlePercentageClick = (percentage: number) => {
        const balance = mode === 'stake' ? soulShardBalance : stakedAmount;
        if (balance > 0n) setAmount(formatEther((balance * BigInt(percentage)) / 100n));
    };

    const renderActionPanel = () => (
        <div className="space-y-4">
            <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-lg">
                <button onClick={() => { setMode('stake'); setAmount(''); }} className={`w-full py-2 text-sm font-medium rounded-md transition ${mode === 'stake' ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}>質押</button>
                <button onClick={() => { setMode('unstake'); setAmount(''); }} className={`w-full py-2 text-sm font-medium rounded-md transition ${mode === 'unstake' ? 'bg-red-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`} disabled={stakedAmount === 0n}>贖回</button>
            </div>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`輸入要${mode === 'stake' ? '質押' : '贖回'}的數量`} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none h-12 bg-gray-800 border-gray-700" />
            <div className="flex justify-between gap-2 text-xs">
                {[25, 50, 75, 100].map(p => (<button key={p} onClick={() => handlePercentageClick(p)} className="flex-1 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-md transition">{p}%</button>))}
            </div>
            <p className="text-xs text-right text-gray-500 -mt-2">{mode === 'stake' ? `錢包餘額: ${formatEther(soulShardBalance)}` : `可贖回: ${formatEther(stakedAmount)}`}</p>
            <ActionButton onClick={handleMainAction} isLoading={isTxPending} disabled={!amount || Number(amount) <= 0} className="w-full h-12">{isTxPending ? '請在錢包確認...' : (needsApproval ? '授權' : (mode === 'stake' ? '質押' : '請求贖回'))}</ActionButton>
        </div>
    );

    if (!chainId || chainId !== bsc.id) {
        return <section><h2 className="page-title">VIP 質押中心</h2><div className="card-bg p-10 rounded-xl text-center text-gray-400"><p>請連接到支援的網路以使用 VIP 功能。</p></div></section>;
    }
    
    const hasStaked = stakedAmount > 0n || (tokenId !== null && tokenId > 0n);

    return (
        <section className="space-y-8 max-w-5xl mx-auto">
            <h2 className="page-title">VIP 質押中心</h2>
            <p className="text-center text-gray-500 dark:text-gray-400 max-w-2xl mx-auto -mt-4">質押您的 $SoulShard 代幣以提升 VIP 等級，享受提現稅率減免等尊榮禮遇。</p>
            {isLoading && !tokenId ? <div className="flex justify-center"><LoadingSpinner /></div> : hasStaked ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="lg:col-span-1"><h3 className="section-title text-xl text-center mb-4">我的 VIP 卡</h3><VipCardDisplay tokenId={tokenId} chainId={chainId} /></div>
                    <div className="lg:col-span-1 card-bg p-6 rounded-2xl space-y-6">
                        <h3 className="section-title text-xl">我的 VIP 狀態</h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div><div className="text-sm text-gray-400">質押總額</div><div className="font-bold text-2xl text-white">{isLoading ? <LoadingSpinner /> : parseFloat(formatEther(stakedAmount)).toFixed(2)}</div></div>
                            <div><div className="text-sm text-gray-400">VIP 等級</div><div className="font-bold text-2xl text-yellow-400">LV {isLoading ? '...' : (vipLevel as any).toString()}</div></div>
                            <div><div className="text-sm text-gray-400">稅率減免</div><div className="font-bold text-2xl text-green-400">{isLoading ? '...' : `${Number(taxReduction) / 100}%`}</div></div>
                        </div>
                        {pendingUnstakeAmount > 0n && (
                            <div className="bg-yellow-900/50 p-4 rounded-lg text-center">
                                <h4 className="font-bold text-yellow-300">待領取請求</h4>
                                <p className="text-2xl font-mono text-white">{formatEther(pendingUnstakeAmount)} $SoulShard</p>
                                {isCooldownOver ? (<ActionButton onClick={handleClaim} isLoading={isTxPending} className="mt-2 w-full h-10">立即領取</ActionButton>) : (<p className="text-sm text-yellow-400">可領取倒數: {countdown}</p>)}
                            </div>
                        )}
                        {renderActionPanel()}
                    </div>
                </div>
            ) : (
                <div className="max-w-xl mx-auto card-bg p-8 rounded-2xl space-y-6">
                    <h3 className="section-title text-2xl text-center">成為 VIP 會員</h3>
                    <p className="text-center text-gray-400">質押 $SoulShard 即可鑄造您的專屬 VIP 卡，並開始累積福利！</p>
                    {renderActionPanel()}
                </div>
            )}
        </section>
    );
};

export default VipPage;
