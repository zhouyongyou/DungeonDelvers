// src/pages/VipPage.tsx (The Graph 改造版)

import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useWriteContract, usePublicClient, useReadContract, useBalance } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
// Section: GraphQL 查詢與數據獲取 Hooks
// =================================================================

const THE_GRAPH_API_URL = import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL;

// 查詢玩家的 VIP 核心數據
const GET_VIP_DATA_QUERY = `
  query GetVipData($owner: ID!) {
    player(id: $owner) {
      vip {
        tokenId
        stakedAmount
      }
    }
  }
`;

// ★ 核心改造：新的 Hook，用於獲取 VIP 數據
const useVipData = () => {
    const { address, chainId } = useAccount();
    const vipStakingContract = getContract(chainId as any, 'vipStaking');
    const soulShardContract = getContract(chainId as any, 'soulShard');

    // 步驟 1: 從 The Graph 快速獲取基礎質押數據 (stakedAmount, tokenId)
    const { data: graphData, isLoading: isLoadingGraph, isError: isGraphError } = useQuery({
        queryKey: ['vipData', address],
        queryFn: async () => {
            if (!address || !THE_GRAPH_API_URL) return null;
            const response = await fetch(THE_GRAPH_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: GET_VIP_DATA_QUERY,
                    variables: { owner: address.toLowerCase() },
                }),
            });
            if (!response.ok) throw new Error('GraphQL Network response was not ok');
            const { data } = await response.json();
            return data.player?.vip;
        },
        enabled: !!address && chainId === bsc.id,
    });

    const stakedAmount = useMemo(() => graphData?.stakedAmount ? BigInt(graphData.stakedAmount) : 0n, [graphData]);
    const tokenId = useMemo(() => graphData?.tokenId ? BigInt(graphData.tokenId) : null, [graphData]);

    // 步驟 2: 繼續使用 RPC 獲取需要即時計算或與交易相關的數據
    const { data: soulShardBalance, isLoading: isLoadingBalance } = useBalance({ address, token: soulShardContract?.address });
    const { data: vipLevel, isLoading: isLoadingVipLevel } = useReadContract({ ...vipStakingContract, functionName: 'getVipLevel', args: [address!], query: { enabled: !!address } });
    const { data: taxReduction, isLoading: isLoadingTax } = useReadContract({ ...vipStakingContract, functionName: 'getVipTaxReduction', args: [address!], query: { enabled: !!address } });
    const { data: unstakeQueue, isLoading: isLoadingQueue } = useReadContract({ ...vipStakingContract, functionName: 'unstakeQueue', args: [address!], query: { enabled: !!address } });
    const { data: allowance, isLoading: isLoadingAllowance, refetch: refetchAllowance } = useReadContract({ ...soulShardContract, functionName: 'allowance', args: [address!, vipStakingContract?.address!], query: { enabled: !!address } });
    
    const pendingUnstakeAmount = useMemo(() => (unstakeQueue as any)?.[0] ?? 0n, [unstakeQueue]);
    const unstakeAvailableAt = useMemo(() => Number((unstakeQueue as any)?.[1] ?? 0n), [unstakeQueue]);
    const { isOver: isCooldownOver, formatted: countdown } = useCountdown(unstakeAvailableAt);

    return {
        isLoading: isLoadingGraph || isLoadingBalance || isLoadingVipLevel || isLoadingTax || isLoadingQueue || isLoadingAllowance,
        isGraphError,
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
        refetchAllowance,
    };
};

// =================================================================
// Section: 子元件與主頁面 (UI 邏輯保持不變)
// =================================================================

const VipCardDisplay: React.FC<{ tokenId: bigint | null, chainId: number | undefined }> = ({ tokenId, chainId }) => {
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
    const queryClient = useQueryClient();
    const publicClient = usePublicClient();

    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState<'stake' | 'unstake'>('stake');
    const [isAwaitingStakeAfterApproval, setIsAwaitingStakeAfterApproval] = useState(false);
    
    const {
        isLoading, isGraphError, vipStakingContract, soulShardContract,
        soulShardBalance, stakedAmount, tokenId, vipLevel, taxReduction,
        pendingUnstakeAmount, isCooldownOver, countdown, allowance, refetchAllowance
    } = useVipData();

    const invalidateVipQueries = () => {
        queryClient.invalidateQueries({ queryKey: ['vipData'] });
        queryClient.invalidateQueries({ queryKey: ['getVipLevel'] });
        queryClient.invalidateQueries({ queryKey: ['getVipTaxReduction'] });
        queryClient.invalidateQueries({ queryKey: ['unstakeQueue'] });
        queryClient.invalidateQueries({ queryKey: ['balance'] });
        queryClient.invalidateQueries({ queryKey: ['allowance'] });
        queryClient.invalidateQueries({ queryKey: ['ownedNfts'] });
    };
    
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
                    await refetchAllowance();
                    setIsAwaitingStakeAfterApproval(true);
                } else {
                    showToast(`${getTxDescription(functionName as string, amount)} 已成功！`, 'success');
                    if (functionName !== 'approve') setAmount('');
                    invalidateVipQueries();
                }
            },
            onError: (error: any) => { if (!error.message.includes('User rejected')) showToast(error.shortMessage || "交易失敗", "error"); }
        }
    });

    useEffect(() => {
        if (isAwaitingStakeAfterApproval && !isTxPending) {
            setIsAwaitingStakeAfterApproval(false);
            if (mode === 'stake' && amount) handleStake();
        }
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
    if (isGraphError) {
        return <section><h2 className="page-title">VIP 質押中心</h2><div className="card-bg p-10 rounded-xl text-center text-red-400"><h3 className="text-xl font-bold">資料載入失敗</h3><p className="mt-2">無法從 The Graph 獲取 VIP 數據，請檢查 API 端點或稍後再試。</p></div></section>;
    }
    
    const hasStaked = stakedAmount > 0n || (tokenId !== null);

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
