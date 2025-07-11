/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/VipPage.tsx (移除 SVG 讀取功能版)

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { formatEther, maxUint256, parseEther } from 'viem';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import { bsc } from 'wagmi/chains';
import { useVipStatus } from '../hooks/useVipStatus';

const VipCardDisplay: React.FC<{ tokenId: bigint | null, chainId: number | undefined }> = ({ tokenId, chainId }) => {
    // ✅ 條件渲染移到Hook之後
    if (!chainId || (chainId !== bsc.id)) {
        return <div className="w-full aspect-square bg-gray-900/50 rounded-xl flex items-center justify-center text-gray-500">網路不支援</div>;
    }

    if (!tokenId || tokenId === 0n) {
        return <div className="w-full aspect-square bg-gray-900/50 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500">無 VIP 卡</div>;
    }
    
    return (
        <div className="w-full aspect-square bg-gray-900/50 rounded-xl overflow-hidden flex items-center justify-center">
            <div className="text-center">
                <div className="text-4xl mb-2">👑</div>
                <div className="text-lg font-bold">VIP #{tokenId.toString()}</div>
                <div className="text-sm text-gray-400">VIP 等級卡片</div>
            </div>
        </div>
    );
};


const VipPage: React.FC = () => {
    const { chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    const publicClient = usePublicClient();

    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState<'stake' | 'unstake'>('stake');
    const [isAwaitingStakeAfterApproval, setIsAwaitingStakeAfterApproval] = useState(false);
    
    const {
        isLoading, vipStakingContract, soulShardContract,
        soulShardBalance, stakedAmount, stakedValueUSD,
        tokenId, vipLevel, taxReduction,
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
                    refetchAll();
                }
            },
            onError: (error: { message: string; shortMessage?: string }) => {
                if (!error.message.includes('User rejected')) {
                    showToast(error.shortMessage || "交易失敗", "error");
                }
            }
        }
    });
    
    const needsApproval = useMemo(() => {
        if (mode !== 'stake' || !amount) return false;
        try { return typeof allowance === 'bigint' && allowance < parseEther(amount); } catch { return false; }
    }, [allowance, amount, mode]);

    const handleApprove = useCallback(() => 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        writeContractAsync({ ...(soulShardContract as any), functionName: 'approve' as any, args: [vipStakingContract!.address, maxUint256] as any }), 
        [soulShardContract, vipStakingContract, writeContractAsync]);
    const handleStake = useCallback(() => 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        writeContractAsync({ ...(vipStakingContract as any), functionName: 'stake' as any, args: [parseEther(amount)] as any }), 
        [vipStakingContract, writeContractAsync, amount]);
    const handleRequestUnstake = useCallback(() => 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        writeContractAsync({ ...(vipStakingContract as any), functionName: 'requestUnstake' as any, args: [parseEther(amount)] as any }), 
        [vipStakingContract, writeContractAsync, amount]);
    const handleClaim = useCallback(() => 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        writeContractAsync({ ...(vipStakingContract as any), functionName: 'claimUnstaked' as any }), 
        [vipStakingContract, writeContractAsync]);
    const handleMainAction = useCallback(() => { if (mode === 'stake') { if (needsApproval) handleApprove(); else handleStake(); } else { handleRequestUnstake(); } }, [mode, needsApproval, handleApprove, handleStake, handleRequestUnstake]);
    const handlePercentageClick = useCallback((percentage: number) => {
        const balance = mode === 'stake' ? soulShardBalance : stakedAmount;
        if (balance > 0n) setAmount(formatEther((balance * BigInt(percentage)) / 100n));
    }, [mode, soulShardBalance, stakedAmount, setAmount]);

    useEffect(() => {
        async function handlePostApproval() {
            if (isAwaitingStakeAfterApproval && !isTxPending) {
                // 等待一小段時間確保區塊鏈狀態更新
                await new Promise(resolve => setTimeout(resolve, 1000));
                await refetchAll();
                setIsAwaitingStakeAfterApproval(false);
                if (mode === 'stake' && amount) {
                    // 再次檢查授權狀態
                    try {
                        const parsedAmount = parseEther(amount);
                        if (typeof allowance === 'bigint' && allowance >= parsedAmount) {
                            handleStake();
                        } else {
                            showToast('授權尚未完成，請稍後重試', 'info');
                        }
                    } catch (error) {
                        console.error('解析質押金額失敗:', error);
                    }
                }
            }
        }
        handlePostApproval();
    }, [isAwaitingStakeAfterApproval, isTxPending, allowance, mode, amount, handleStake, refetchAll, showToast]);

    const renderActionPanel = () => (
        <div className="space-y-4">
            <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-lg">
                <button 
                    onClick={() => { setMode('stake'); setAmount(''); }} 
                    className={`w-full py-2 text-sm font-medium rounded-md transition ${mode === 'stake' ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}
                >
                    質押
                </button>
                <button 
                    onClick={() => { setMode('unstake'); setAmount(''); }} 
                    className={`w-full py-2 text-sm font-medium rounded-md transition ${mode === 'unstake' ? 'bg-red-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`} 
                    disabled={stakedAmount === 0n}
                >
                    贖回
                </button>
            </div>
            <div>
                <label htmlFor="vip-amount-input" className="block text-sm font-medium text-gray-300 mb-1">
                    {mode === 'stake' ? '質押數量' : '贖回數量'}
                </label>
                <input 
                    id="vip-amount-input"
                    name="vip-amount"
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    placeholder={`輸入要${mode === 'stake' ? '質押' : '贖回'}的數量`} 
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none h-12 bg-gray-800 border-gray-700" 
                />
            </div>
            <div className="flex justify-between gap-2 text-xs">
                {[25, 50, 75, 100].map(p => (
                    <button 
                        key={p} 
                        onClick={() => handlePercentageClick(p)} 
                        className="flex-1 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-md transition"
                    >
                        {p}%
                    </button>
                ))}
            </div>
            <p className="text-xs text-right text-gray-500 -mt-2">
                {mode === 'stake' ? `錢包餘額: ${formatEther(soulShardBalance)}` : `可贖回: ${formatEther(stakedAmount)}`}
            </p>
            <ActionButton 
                onClick={handleMainAction} 
                isLoading={isTxPending || isAwaitingStakeAfterApproval} 
                disabled={!amount || Number(amount) <= 0 || isAwaitingStakeAfterApproval} 
                className="w-full h-12"
            >
                {isTxPending 
                    ? '請在錢包確認...' 
                    : isAwaitingStakeAfterApproval 
                        ? '授權完成，準備質押...'
                        : (needsApproval ? '授權' : (mode === 'stake' ? '質押' : '請求贖回'))
                }
            </ActionButton>
        </div>
    );

    if (!chainId || chainId !== bsc.id) {
        return (
            <section>
                <h2 className="page-title">VIP 質押中心</h2>
                <div className="card-bg p-10 rounded-xl text-center text-gray-400">
                    <p>請連接到支援的網路以使用 VIP 功能。</p>
                </div>
            </section>
        );
    }
    
    const hasStaked = stakedAmount > 0n || (tokenId !== null && typeof tokenId === 'bigint' && tokenId > 0n);

    return (
        <section className="space-y-8 max-w-5xl mx-auto">
            <h2 className="page-title">VIP 質押中心</h2>
            <p className="text-center text-gray-500 dark:text-gray-400 max-w-2xl mx-auto -mt-4">
                質押您的 $SoulShard 代幣以提升 VIP 等級，享受提現稅率減免等尊榮禮遇。
            </p>
            
            {/* 錢包授權說明 */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 max-w-2xl mx-auto">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <div className="text-sm text-blue-200">
                        <p className="font-medium mb-1">關於錢包授權彈窗：</p>
                        <p>授權時出現的彈窗語言由您的錢包設定決定。如需中文界面，請在錢包（如MetaMask）設定中調整語言為中文。授權完成後頁面會自動更新，無需手動刷新。</p>
                    </div>
                </div>
            </div>
            
            {isLoading && !tokenId ? (
                <div className="flex justify-center"><LoadingSpinner /></div>
            ) : hasStaked ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="lg:col-span-1 card-bg p-6 rounded-2xl space-y-6">
                        <h3 className="section-title text-xl">我的 VIP 狀態</h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-sm text-gray-400">質押總額</div>
                                <div className="font-bold text-2xl text-white">
                                    {isLoading ? <LoadingSpinner /> : parseFloat(formatEther(stakedAmount)).toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-500">
                                    ≈ ${isLoading ? '...' : parseFloat(formatEther(stakedValueUSD)).toFixed(2)} USD
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-400">VIP 等級</div>
                                <div className="font-bold text-2xl text-yellow-400">
                                    LV {isLoading ? '...' : vipLevel.toString()}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-400">稅率減免</div>
                                <div className="font-bold text-2xl text-green-400">
                                    {isLoading ? '...' : `${Number(taxReduction) / 100}%`}
                                </div>
                            </div>
                        </div>
                        
                        {pendingUnstakeAmount > 0n && (
                            <div className="bg-yellow-900/50 p-4 rounded-lg text-center">
                                <h4 className="font-bold text-yellow-300">待領取請求</h4>
                                <p className="text-2xl font-mono text-white">
                                    {formatEther(pendingUnstakeAmount)} $SoulShard
                                </p>
                                {isCooldownOver ? (
                                    <ActionButton 
                                        onClick={handleClaim} 
                                        isLoading={isTxPending} 
                                        className="mt-2 w-full h-10"
                                    >
                                        立即領取
                                    </ActionButton>
                                ) : (
                                    <p className="text-sm text-yellow-400">可領取倒數: {countdown}</p>
                                )}
                            </div>
                        )}
                        
                        {renderActionPanel()}
                    </div>
                    
                    <div className="lg:col-span-1">
                        <h3 className="section-title text-xl text-center mb-4">我的 VIP 卡</h3>
                        <VipCardDisplay tokenId={tokenId} chainId={chainId} />
                    </div>
                </div>
            ) : (
                <div className="max-w-xl mx-auto card-bg p-8 rounded-2xl space-y-6">
                    <h3 className="section-title text-2xl text-center">成為 VIP 會員</h3>
                    <p className="text-center text-gray-400">
                        質押 $SoulShard 即可鑄造您的專屬 VIP 卡，並開始累積福利！
                    </p>
                    {renderActionPanel()}
                </div>
            )}
        </section>
    );
};

export default VipPage;
