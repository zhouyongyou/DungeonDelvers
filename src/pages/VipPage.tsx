// src/pages/VipPage.tsx (重構版)

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
import { useVipStatus } from '../hooks/useVipStatus'; // ★ 核心改動：導入新 Hook
import { bsc, bscTestnet } from 'wagmi/chains';

// VIP 卡片 SVG 顯示元件
const VipCardDisplay: React.FC<{ tokenId: bigint | undefined, chainId: number | undefined }> = ({ tokenId, chainId }) => {
    // ... (此元件程式碼未變更)
    if (!chainId || (chainId !== bsc.id && chainId !== bscTestnet.id)) {
        return <div className="w-full aspect-square bg-gray-900/50 rounded-xl flex items-center justify-center text-gray-500">網路不支援</div>;
    }
    // 型別安全呼叫 getContract
    const vipStakingContract = chainId === bsc.id ? getContract(bsc.id, 'vipStaking') : chainId === bscTestnet.id ? getContract(bscTestnet.id as any, 'vipStaking') : null;
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
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    const queryClient = useQueryClient();

    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState<'stake' | 'unstake'>('stake');
    
    // ★ 核心改動：使用 useVipStatus Hook 獲取所有狀態，使元件邏輯極度簡化
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
        allowance
    } = useVipStatus();

    const { writeContractAsync, isPending: isTxPending } = useWriteContract();
    
    const needsApproval = useMemo(() => {
        if (mode !== 'stake' || !amount) return false;
        try {
            const parsedAmount = parseEther(amount);
            return typeof allowance === 'bigint' && allowance < parsedAmount;
        } catch {
            return false;
        }
    }, [allowance, amount, mode]);
    
    const invalidateVipQueries = () => {
        // ★ 優化：使用 queryClient.invalidateQueries({ queryKey: [...] }) 替代手動 refetch，更符合 react-query 的模式
        queryClient.invalidateQueries({ queryKey: ['userStakes', address, chainId] });
        queryClient.invalidateQueries({ queryKey: ['unstakeQueue', address, chainId] });
        queryClient.invalidateQueries({ queryKey: ['balance', address, chainId] });
        queryClient.invalidateQueries({ queryKey: ['allowance', address, chainId] });
        queryClient.invalidateQueries({ queryKey: ['getVipLevel', address, chainId] });
        queryClient.invalidateQueries({ queryKey: ['getVipTaxReduction', address, chainId] });
    };

    const handleAction = async (action: 'approve' | 'stake' | 'requestUnstake' | 'claim') => {
        if (!vipStakingContract || !soulShardContract) return;
        try {
            let txHash: `0x${string}` | undefined;
            let description = '';

            switch(action) {
                case 'approve':
                    txHash = await writeContractAsync({ ...soulShardContract, functionName: 'approve', args: [vipStakingContract.address, maxUint256] });
                    description = '批准 VIP 合約使用代幣';
                    break;
                case 'stake':
                    if (!amount) return;
                    txHash = await writeContractAsync({ ...vipStakingContract, functionName: 'stake', args: [parseEther(amount)] });
                    description = `質押 ${amount} $SoulShard`;
                    break;
                case 'requestUnstake':
                    if (!amount) return;
                    txHash = await writeContractAsync({ ...vipStakingContract, functionName: 'requestUnstake', args: [parseEther(amount)] });
                    description = `請求取消質押 ${amount} $SoulShard`;
                    break;
                case 'claim':
                    txHash = await writeContractAsync({ ...vipStakingContract, functionName: 'claimUnstaked' });
                    description = '領取已取消質押的代幣';
                    break;
            }
            if(txHash) {
                addTransaction({ hash: txHash, description });
                setAmount('');
                // ★ 優化：等待一小段時間再刷新，給予 RPC 節點同步的時間
                setTimeout(() => invalidateVipQueries(), 3000);
            }
        } catch (e: any) {
            if (!e.message.includes('User rejected')) showToast(e.shortMessage || `${action} 失敗`, "error");
        }
    };
    
    const handlePercentageClick = (percentage: number) => {
        const balance = mode === 'stake' ? soulShardBalance : stakedAmount;
        if (balance === 0n) return;
        const calculatedAmount = (balance * BigInt(percentage)) / 100n;
        setAmount(formatEther(calculatedAmount));
    };

    const renderActionPanel = () => (
        <div className="space-y-4">
            <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-lg">
                <button onClick={() => { setMode('stake'); setAmount(''); }} className={`w-full py-2 text-sm font-medium rounded-md transition ${mode === 'stake' ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}>質押</button>
                <button onClick={() => { setMode('unstake'); setAmount(''); }} className={`w-full py-2 text-sm font-medium rounded-md transition ${mode === 'unstake' ? 'bg-red-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`} disabled={stakedAmount === 0n}>取消質押</button>
            </div>
            <div className="flex items-center gap-2">
                <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    placeholder={`輸入要${mode === 'stake' ? '質押' : '取消質押'}的數量`}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none h-12 bg-gray-800 border-gray-700"
                />
            </div>
            <div className="flex justify-between gap-2 text-xs">
                {[25, 50, 75, 100].map(p => (
                    <button key={p} onClick={() => handlePercentageClick(p)} className="flex-1 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-md transition">{p}%</button>
                ))}
            </div>
            <p className="text-xs text-right text-gray-500 -mt-2">
                {mode === 'stake' ? `錢包餘額: ${formatEther(soulShardBalance)}` : `可取消質押: ${formatEther(stakedAmount)}`}
            </p>
            {needsApproval ? (
                <ActionButton onClick={() => handleAction('approve')} isLoading={isTxPending} className="w-full h-12">授權</ActionButton>
            ) : (
                <ActionButton onClick={() => handleAction(mode === 'stake' ? 'stake' : 'requestUnstake')} isLoading={isTxPending} disabled={!amount || Number(amount) <= 0} className="w-full h-12">
                    {mode === 'stake' ? '質押' : '請求取消質押'}
                </ActionButton>
            )}
        </div>
    );

    const isSupportedChain = (chainId: number | undefined): chainId is (typeof bsc.id | typeof bscTestnet.id) => {
        return chainId === bsc.id || chainId === bscTestnet.id;
    }

    if (!isSupportedChain(chainId)) {
        return (
            <section className="space-y-8">
                <h2 className="page-title">VIP 質押中心</h2>
                <div className="card-bg p-10 rounded-xl text-center text-gray-500 dark:text-gray-400">
                    <p>請連接到支援的網路以使用 VIP 功能。</p>
                </div>
            </section>
        );
    }
    
    const hasStaked = stakedAmount > 0n;

    return (
        <section className="space-y-8">
            <h2 className="page-title">VIP 質押中心</h2>
            <p className="text-center text-gray-500 dark:text-gray-400 max-w-2xl mx-auto -mt-4">
                質押您的 $SoulShard 代幣以提升 VIP 等級，享受提現稅率減免等尊榮禮遇。
            </p>

            {hasStaked ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-1">
                        <VipCardDisplay tokenId={tokenId} chainId={chainId} />
                    </div>
                    <div className="lg:col-span-2 card-bg p-6 rounded-2xl space-y-6">
                        <div>
                            <h3 className="section-title text-xl">我的 VIP 狀態</h3>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div><div className="text-sm text-gray-500 dark:text-gray-400">質押總額</div><div className="font-bold text-2xl text-gray-800 dark:text-white">{isLoading ? <LoadingSpinner /> : typeof stakedAmount === 'bigint' ? formatEther(stakedAmount) : '...'}</div></div>
                                <div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">VIP 等級</div>
                                    <div className="font-bold text-2xl text-yellow-500 dark:text-yellow-400">
                                        LV {isLoading ? '...' : (typeof vipLevel === 'number' ? vipLevel : '...')}
                                    </div>
                                </div>
                                <div><div className="text-sm text-gray-500 dark:text-gray-400">稅率減免</div><div className="font-bold text-2xl text-green-600 dark:text-green-400">{isLoading ? '...' : typeof taxReduction === 'bigint' ? (Number(taxReduction) / 100).toFixed(2) + '%' : '...'}</div></div>
                            </div>
                        </div>
                        {pendingUnstakeAmount > 0n && (
                            <div className="bg-yellow-100 dark:bg-yellow-900/50 p-4 rounded-lg text-center">
                                <h4 className="font-bold text-yellow-800 dark:text-yellow-300">待領取請求</h4>
                                <p className="text-2xl font-mono text-gray-800 dark:text-white">{formatEther(pendingUnstakeAmount)} $SoulShard</p>
                                {isCooldownOver ? (
                                    <ActionButton onClick={() => handleAction('claim')} isLoading={isTxPending} className="mt-2 w-full h-10">立即領取</ActionButton>
                                ) : (
                                    <p className="text-sm text-yellow-600 dark:text-yellow-400">可領取倒數: {countdown}</p>
                                )}
                            </div>
                        )}
                        {renderActionPanel()}
                    </div>
                </div>
            ) : (
                <div className="max-w-xl mx-auto card-bg p-8 rounded-2xl space-y-6">
                    <h3 className="section-title text-2xl text-center">成為 VIP 會員</h3>
                    <p className="text-center text-gray-600 dark:text-gray-400">質押 $SoulShard 即可鑄造您的專屬 VIP 卡，並開始累積福利！</p>
                    {renderActionPanel()}
                </div>
            )}
        </section>
    );
};

export default VipPage;