import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatEther, maxUint256, type Abi } from 'viem';
import { fetchAllOwnedNfts } from '../api/nfts';
import { getContract } from '../config/contracts';
import { NftCard } from '../components/ui/NftCard';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import type { HeroNft, RelicNft, NftType } from '../types/nft';
import { Icons } from '../components/ui/icons';

// =================================================================
// Section: 型別定義與輔助 Hook
// =================================================================

type AscensionTarget = HeroNft | RelicNft;

/**
 * @dev 一個自定義 Hook，負責計算升星的成功率和成本。
 */
const useAscensionLogic = (mainNft: AscensionTarget | null, fodderNfts: AscensionTarget[]) => {
    const { chainId } = useAccount();
    const altarContract = getContract(chainId, 'altarOfAscension');

    // 獲取基礎的升星成本
    const { data: baseCost, isLoading: isLoadingCost } = useReadContract({
        ...altarContract,
        functionName: 'ascensionBaseCost',
        query: { enabled: !!altarContract },
    });

    // 獲取計算出的成功率
    const { data: successRate, isLoading: isLoadingRate } = useReadContract({
        ...altarContract,
        functionName: 'calculateSuccessRate',
        args: [mainNft?.id ?? 0n, fodderNfts.map(f => f.id)],
        query: { enabled: !!mainNft && !!altarContract },
    });

    return {
        cost: baseCost ?? 0n,
        successRate: successRate as number | undefined,
        isLoading: isLoadingCost || (!!mainNft && isLoadingRate),
    };
};

// =================================================================
// Section: AltarPage 主元件
// =================================================================

const AltarPage: React.FC = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();

    const [mainNft, setMainNft] = useState<AscensionTarget | null>(null);
    const [fodderNfts, setFodderNfts] = useState<AscensionTarget[]>([]);
    const [filter, setFilter] = useState<NftType>('hero');

    const altarContract = getContract(chainId, 'altarOfAscension');
    const soulShardContract = getContract(chainId, 'soulShard');
    const { writeContractAsync, isPending: isTxPending } = useWriteContract();

    const { data: nfts, isLoading: isLoadingNfts } = useQuery({
        queryKey: ['ownedNfts', address, chainId],
        queryFn: () => fetchAllOwnedNfts(address!, chainId!),
        enabled: !!address && !!chainId,
    });

    const { cost, successRate, isLoading: isLoadingLogic } = useAscensionLogic(mainNft, fodderNfts);
    
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        ...soulShardContract,
        functionName: 'allowance',
        args: [address!, altarContract?.address!],
        query: { enabled: !!address && !!altarContract }
    });
    
    const needsApproval = useMemo(() => (allowance ?? 0n) < cost, [allowance, cost]);

    const availableNfts = useMemo(() => {
        if (!nfts) return [];
        const all = filter === 'hero' ? nfts.heroes : nfts.relics;
        const fodderIds = fodderNfts.map(f => f.id);
        return all.filter(n => n.id !== mainNft?.id && !fodderIds.includes(n.id));
    }, [nfts, filter, mainNft, fodderNfts]);

    const handleSelectMain = (nft: AscensionTarget) => {
        setMainNft(nft);
        setFodderNfts([]); // 更換主卡時清空祭品
    };

    const handleSelectFodder = (nft: AscensionTarget) => {
        if (fodderNfts.some(f => f.id === nft.id)) {
            setFodderNfts(fodderNfts.filter(f => f.id !== nft.id));
        } else {
            setFodderNfts([...fodderNfts, nft]);
        }
    };

    const handleApprove = async () => {
        if (!altarContract || !soulShardContract) return;
        try {
            const hash = await writeContractAsync({
                address: soulShardContract.address,
                abi: soulShardContract.abi,
                functionName: 'approve',
                args: [altarContract.address, maxUint256]
            });
            addTransaction({ hash, description: `批准升星祭壇使用代幣` });
            setTimeout(() => refetchAllowance(), 2000);
        } catch (e: any) {
             if (!e.message.includes('User rejected the request')) {
                showToast(e.shortMessage || "授權失敗", "error");
            }
        }
    };

    const handleAscend = async () => {
        if (!mainNft || !altarContract) return;
        if (needsApproval) return showToast('請先完成授權', 'error');

        try {
            const hash = await writeContractAsync({
                ...altarContract,
                functionName: 'ascend',
                args: [mainNft.id, fodderNfts.map(f => f.id)],
            });
            addTransaction({ hash, description: `升星 ${mainNft.name}` });
            // 成功後清空選擇
            setMainNft(null);
            setFodderNfts([]);
        } catch (e: any) {
            if (!e.message.includes('User rejected the request')) {
                showToast(e.shortMessage || "升星失敗", "error");
            }
        }
    };

    const renderActionButton = () => {
        if (!mainNft) return <ActionButton disabled className="w-full h-12">請先選擇主卡</ActionButton>;
        if (needsApproval) {
            return <ActionButton onClick={handleApprove} isLoading={isTxPending} className="w-full h-12">授權 {formatEther(cost)} $SoulShard</ActionButton>;
        }
        return (
            <ActionButton onClick={handleAscend} isLoading={isTxPending} className="w-full h-12" confirmVariant="danger">
                {`開始升星 (成功率: ${successRate ?? '...'}%)`}
            </ActionButton>
        );
    };

    if (isLoadingNfts) {
        return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
    }

    return (
        <section className="space-y-8">
            <h2 className="page-title">升星祭壇</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 左側：升星操作區 */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="card-bg p-6 rounded-2xl text-center">
                        <h3 className="section-title">1. 放入主卡</h3>
                        <div className="w-48 h-48 mx-auto bg-gray-900/50 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-600">
                            {mainNft ? <NftCard nft={mainNft} /> : <p className="text-gray-500">從右側選擇</p>}
                        </div>
                        {mainNft && (
                            <div className="mt-4 text-center">
                                <p className="text-lg font-bold text-white">{mainNft.name}</p>
                                <div className="flex justify-center items-center gap-4 text-yellow-400">
                                    <p>R{mainNft.rarity}</p>
                                    <Icons.ArrowRight className="w-5 h-5" />
                                    <p className="text-green-400">R{mainNft.rarity + 1}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="card-bg p-6 rounded-2xl text-center">
                        <h3 className="section-title">2. 放入祭品</h3>
                         <div className="w-full min-h-[80px] p-2 bg-gray-900/50 rounded-xl grid grid-cols-5 gap-2 border-2 border-dashed border-gray-600">
                            {fodderNfts.map(nft => <NftCard key={`fodder-${nft.id}`} nft={nft} />)}
                        </div>
                    </div>

                    <div className="card-bg p-6 rounded-2xl text-center">
                        <h3 className="section-title">3. 開始儀式</h3>
                        <div className="my-4">
                            <p className="text-sm text-gray-400">成功率</p>
                            <p className="text-4xl font-bold text-green-400">{isLoadingLogic ? '...' : successRate ?? 0}%</p>
                            <p className="text-sm text-gray-400 mt-2">費用</p>
                            <p className="text-lg font-semibold text-yellow-400">{formatEther(cost)} $SoulShard</p>
                        </div>
                        {renderActionButton()}
                        <p className="text-xs text-red-500 mt-2">注意：無論成功與否，所有祭品和費用都將被消耗。</p>
                    </div>
                </div>

                {/* 右側：NFT 選擇區 */}
                <div className="lg:col-span-2 card-bg p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="section-title">我的收藏</h3>
                        <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-lg">
                            {(['hero', 'relic'] as NftType[]).map(f => (
                                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${filter === f ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}>
                                    {f === 'hero' ? '英雄' : '聖物'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {availableNfts.map(nft => (
                            <div key={nft.id} className="relative">
                                <NftCard nft={nft} />
                                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity rounded-xl">
                                    <button onClick={() => handleSelectMain(nft as AscensionTarget)} className="text-xs bg-green-600 text-white px-3 py-1 rounded-full">設為主卡</button>
                                    <button onClick={() => handleSelectFodder(nft as AscensionTarget)} disabled={!mainNft || mainNft.type !== nft.type} className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full disabled:bg-gray-500 disabled:cursor-not-allowed">設為祭品</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {availableNfts.length === 0 && <EmptyState message={`沒有可用的${filter === 'hero' ? '英雄' : '聖物'}`} />}
                </div>
            </div>
        </section>
    );
};

export default AltarPage;
