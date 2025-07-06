// src/pages/VipPage.tsx

import React, { useState, useMemo } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { formatEther, maxUint256, parseEther } from 'viem';
import { Buffer } from 'buffer';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useVipStatus } from '../hooks/useVipStatus';
import { bsc, bscTestnet } from 'wagmi/chains';

// VIP 卡片 SVG 顯示元件
const VipCardDisplay: React.FC<{ tokenId: bigint | undefined }> = ({ tokenId }) => {
    const { chainId } = useAccount();
    
    // 在呼叫 getContract 前進行型別防衛
    if (!chainId || (chainId !== bsc.id && chainId !== bscTestnet.id)) {
        return <div className="w-full aspect-square bg-gray-900/50 rounded-xl flex items-center justify-center text-gray-500">網路不支援</div>;
    }
    const vipStakingContract = getContract(chainId, 'vipStaking');

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
    if (!svgImage) return <div className="w-full aspect-square bg-gray-900/50 rounded-xl flex items-center justify-center text-gray-500">無 VIP 卡</div>;

    return <img src={svgImage} alt="VIP Card" className="w-full h-auto rounded-xl" />;
};


// =================================================================
// Section: VipPage 主元件 (已重構)
// =================================================================

const VipPage: React.FC = () => {
    const { chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    const queryClient = useQueryClient();

    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState<'stake' | 'unstake'>('stake');
    
    // ★ 核心重構：使用自定義 Hook 獲取所有 VIP 相關狀態
    const {
        isLoading,
        vipStakingContract,
        soulShardContract,
        soulShardBalance,
        stakedAmount,
        tokenId,
        vipLevel,
        taxReduction,
        pendingUnstakeAmount,
        isCooldownOver,
        countdown,
        allowance,
    } = useVipStatus();

    const { writeContractAsync, isPending: isTxPending } = useWriteContract();
    
    // 檢查是否需要授權
    const needsApproval = useMemo(() => {
        if (mode !== 'stake' || !amount) return false;
        try {
            return allowance < parseEther(amount);
        } catch {
            return false; // 如果 parseEther 失敗 (例如輸入無效)，則不需授權
        }
    }, [allowance, amount, mode]);
    
    // 通用刷新函式
    const invalidateVipQueries = () => {
        queryClient.invalidateQueries({ queryKey: ['userStakes'] });
        queryClient.invalidateQueries({ queryKey: ['unstakeQueue'] });
        queryClient.invalidateQueries({ queryKey: ['balance'] });
        queryClient.invalidateQueries({ queryKey: ['allowance'] });
        queryClient.invalidateQueries({ queryKey: ['getVipLevel'] });
        queryClient.invalidateQueries({ queryKey: ['getVipTaxReduction'] });
    };

    // --- 事件處理函式 ---
    const handleApprove = async () => {
        if (!vipStakingContract || !soulShardContract) return;
        try {
            const hash = await writeContractAsync({ ...soulShardContract, functionName: 'approve', args: [vipStakingContract.address, maxUint256] });
            addTransaction({ hash, description: '批准 VIP 合約使用代幣' });
            showToast('授權交易已送出', 'info');
            setTimeout(() => invalidateVipQueries(), 3000);
        } catch (e: any) { showToast(e.shortMessage || "授權失敗", "error"); }
    };
    
    const handleStake = async () => {
        if (!amount || !vipStakingContract) return;
        try {
            const hash = await writeContractAsync({ ...vipStakingContract, functionName: 'stake', args: [parseEther(amount)] });
            addTransaction({ hash, description: `質押 ${amount} $SoulShard` });
            setAmount('');
            setTimeout(() => invalidateVipQueries(), 3000);
        } catch (e: any) { showToast(e.shortMessage || "質押失敗", "error"); }
    };

    const handleRequestUnstake = async () => {
        if (!amount || !vipStakingContract) return;
        try {
            const hash = await writeContractAsync({ ...vipStakingContract, functionName: 'requestUnstake', args: [parseEther(amount)] });
            addTransaction({ hash, description: `請求取消質押 ${amount} $SoulShard` });
            setAmount('');
            setTimeout(() => invalidateVipQueries(), 3000);
        } catch (e: any) { showToast(e.shortMessage || "請求失敗", "error"); }
    };

    const handleClaim = async () => {
        if (!vipStakingContract) return;
        try {
            const hash = await writeContractAsync({ ...vipStakingContract, functionName: 'claimUnstaked' });
            addTransaction({ hash, description: '領取已取消質押的代幣' });
            setTimeout(() => invalidateVipQueries(), 3000);
        } catch (e: any) { showToast(e.shortMessage || "領取失敗", "error"); }
    };

    // --- UI 渲染邏輯 ---
    const renderActionButton = () => {
        if (mode === 'stake') {
            if (needsApproval) return <ActionButton onClick={handleApprove} isLoading={isTxPending} className="w-full h-12">授權</ActionButton>;
            return <ActionButton onClick={handleStake} isLoading={isTxPending} disabled={!amount} className="w-full h-12">質押</ActionButton>;
        }
        return <ActionButton onClick={handleRequestUnstake} isLoading={isTxPending} disabled={!amount} className="w-full h-12">請求取消質押</ActionButton>;
    };

    if (!chainId || (chainId !== bsc.id && chainId !== bscTestnet.id)) {
        return (
            <section className="space-y-8">
                <h2 className="page-title">VIP 質押中心</h2>
                <div className="card-bg p-10 rounded-xl text-center text-gray-400">
                    <p>請連接到支援的網路以使用 VIP 功能。</p>
                </div>
            </section>
        );
    }

    return (
        <section className="space-y-8">
            <h2 className="page-title">VIP 質押中心</h2>
            <p className="text-center text-gray-400 max-w-2xl mx-auto -mt-4">
                質押您的 $SoulShard 代幣以提升 VIP 等級，享受提現稅率減免等尊榮禮遇。
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1">
                    <VipCardDisplay tokenId={tokenId} />
                </div>

                <div className="lg:col-span-2 card-bg p-6 rounded-2xl space-y-6">
                    <div>
                        <h3 className="section-title text-xl">我的 VIP 狀態</h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div><p className="text-sm text-gray-400">質押總額</p><p className="font-bold text-2xl text-white">{isLoading ? <LoadingSpinner /> : formatEther(stakedAmount)}</p></div>
                            <div><p className="text-sm text-gray-400">VIP 等級</p><p className="font-bold text-2xl text-yellow-400">LV {isLoading ? '...' : vipLevel}</p></div>
                            <div><p className="text-sm text-gray-400">稅率減免</p><p className="font-bold text-2xl text-green-400">{isLoading ? '...' : (Number(taxReduction) / 100).toFixed(2)}%</p></div>
                        </div>
                    </div>

                    {pendingUnstakeAmount > 0n && (
                        <div className="bg-yellow-900/50 p-4 rounded-lg text-center">
                            <h4 className="font-bold text-yellow-300">待領取請求</h4>
                            <p className="text-2xl font-mono text-white">{formatEther(pendingUnstakeAmount)} $SoulShard</p>
                            {isCooldownOver ? (
                                <ActionButton onClick={handleClaim} isLoading={isTxPending} className="mt-2 w-full h-10">立即領取</ActionButton>
                            ) : (
                                <p className="text-sm text-yellow-400">可領取倒數: {countdown}</p>
                            )}
                        </div>
                    )}
                    
                    <div>
                        <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-lg mb-4">
                            <button onClick={() => setMode('stake')} className={`w-full py-2 text-sm font-medium rounded-md transition ${mode === 'stake' ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}>質押</button>
                            <button onClick={() => setMode('unstake')} className={`w-full py-2 text-sm font-medium rounded-md transition ${mode === 'unstake' ? 'bg-red-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}>取消質押</button>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                value={amount} 
                                onChange={e => setAmount(e.target.value)}
                                placeholder={`輸入要${mode === 'stake' ? '質押' : '取消質押'}的數量`}
                                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none h-12 bg-gray-800 border-gray-700"
                            />
                            <button 
                                onClick={() => setAmount(formatEther(mode === 'stake' ? soulShardBalance : stakedAmount))}
                                className="h-12 px-4 bg-gray-700 hover:bg-gray-600 rounded-md text-sm"
                            >
                                最大
                            </button>
                        </div>
                        <p className="text-xs text-right text-gray-500 mt-1">
                            {mode === 'stake' ? `錢包餘額: ${formatEther(soulShardBalance)}` : `可取消質押: ${formatEther(stakedAmount)}`}
                        </p>
                    </div>
                    {renderActionButton()}
                </div>
            </div>
        </section>
    );
};

export default VipPage;
