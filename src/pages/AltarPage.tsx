import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getContract } from '../config/contracts';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import { fetchAllOwnedNfts } from '../api/nfts';
// 【修正】修正 UI 元件的導入路徑
import { NftCard } from '../components/ui/NftCard';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { ActionButton } from '../components/ui/ActionButton';
import { EmptyState } from '../components/ui/EmptyState';
import type { AnyNft, HeroNft, RelicNft, AllNftCollections } from '../types/nft';
import { type Hash, type Abi } from 'viem';

// 定義祭壇升級的組合配方
const ASCENSION_RECIPES: { [key: string]: { requiredRarity: number; count: number } } = {
  'common-to-uncommon': { requiredRarity: 1, count: 5 },
  'uncommon-to-rare': { requiredRarity: 2, count: 5 },
  'rare-to-epic': { requiredRarity: 3, count: 4 },
  'epic-to-legendary': { requiredRarity: 4, count: 3 },
};

const AltarPage: React.FC = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    const queryClient = useQueryClient();

    const [selectedNfts, setSelectedNfts] = useState<AnyNft[]>([]);
    const [approvalTxHash, setApprovalTxHash] = useState<Hash | undefined>();

    const altarContract = getContract(chainId, 'altarOfAscension');
    const heroContract = getContract(chainId, 'hero');
    const relicContract = getContract(chainId, 'relic');

    const { data: nfts, isLoading: isLoadingNfts } = useQuery<AllNftCollections>({
        queryKey: ['ownedNfts', address, chainId],
        queryFn: () => {
             if (!address || !chainId) {
                return { heroes: [], relics: [], parties: [], vipCards: [] };
             }
             return fetchAllOwnedNfts(address, chainId);
        },
        enabled: !!address && !!chainId,
    });
    
    const { data: isHeroApproved, refetch: refetchHeroApproval } = useReadContract({
        address: heroContract?.address,
        abi: heroContract?.abi,
        functionName: 'isApprovedForAll',
        args: [address!, altarContract?.address!],
        query: { enabled: !!address && !!altarContract?.address && !!heroContract?.address },
    });

    const { data: isRelicApproved, refetch: refetchRelicApproval } = useReadContract({
        address: relicContract?.address,
        abi: relicContract?.abi,
        functionName: 'isApprovedForAll',
        args: [address!, altarContract?.address!],
        query: { enabled: !!address && !!altarContract?.address && !!relicContract?.address },
    });

    const { writeContractAsync, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: approvalTxHash });

    useEffect(() => {
        if (isConfirmed) {
            showToast('授權成功！', 'success');
            refetchHeroApproval();
            refetchRelicApproval();
        }
    }, [isConfirmed, refetchHeroApproval, refetchRelicApproval, showToast]);


    const handleSelectNft = (nft: AnyNft) => {
        setSelectedNfts(prev => {
            const isSelected = prev.some(item => item.id === nft.id && item.type === nft.type);
            if (isSelected) {
                return prev.filter(item => !(item.id === nft.id && item.type === nft.type));
            } else {
                return [...prev, nft];
            }
        });
    };

    const ascensionTarget = useMemo(() => {
        if (selectedNfts.length === 0) return null;
        const firstNft = selectedNfts[0];
        const { rarity } = firstNft as HeroNft | RelicNft;
        if (rarity >= 5) return null;

        const recipeKey = Object.keys(ASCENSION_RECIPES).find(key => ASCENSION_RECIPES[key].requiredRarity === rarity);
        if (!recipeKey) return null;

        const recipe = ASCENSION_RECIPES[recipeKey];
        if (selectedNfts.length !== recipe.count) return null;

        const allSameTypeAndRarity = selectedNfts.every(nft => {
            const currentNft = nft as HeroNft | RelicNft;
            return currentNft.type === firstNft.type && currentNft.rarity === rarity;
        });

        if (!allSameTypeAndRarity) return null;

        return {
            type: firstNft.type,
            targetRarity: rarity + 1,
            tokenIds: selectedNfts.map(nft => nft.id),
        };
    }, [selectedNfts]);
    
    const needsApproval = useMemo(() => {
        if (!ascensionTarget) return { hero: false, relic: false };
        const { type } = ascensionTarget;
        return {
            hero: type === 'hero' && !isHeroApproved,
            relic: type === 'relic' && !isRelicApproved,
        };
    }, [ascensionTarget, isHeroApproved, isRelicApproved]);

    const heroesAndRelics: (HeroNft | RelicNft)[] = useMemo(() => {
        if (!nfts) return [];
        return [...(nfts.heroes ?? []), ...(nfts.relics ?? [])];
    }, [nfts]);

    const handleAscendOrApprove = async () => {
        if (!altarContract) return;

        if (needsApproval.hero && heroContract) {
            try {
                const hash = await writeContractAsync({
                    address: heroContract.address,
                    abi: heroContract.abi as Abi,
                    functionName: 'setApprovalForAll',
                    args: [altarContract.address, true],
                });
                setApprovalTxHash(hash);
                addTransaction({ hash, description: '批准祭壇使用英雄' });
            } catch (e: any) { showToast(e.shortMessage || "授權失敗", "error"); }
            return;
        }

        if (needsApproval.relic && relicContract) {
             try {
                const hash = await writeContractAsync({
                    address: relicContract.address,
                    abi: relicContract.abi as Abi,
                    functionName: 'setApprovalForAll',
                    args: [altarContract.address, true],
                });
                setApprovalTxHash(hash);
                addTransaction({ hash, description: '批准祭壇使用聖物' });
            } catch (e: any) { showToast(e.shortMessage || "授權失敗", "error"); }
            return;
        }

        if (!ascensionTarget) return;
        const { type, tokenIds, targetRarity } = ascensionTarget;
        const functionName = type === 'hero' ? 'ascendHeroes' : 'ascendRelics';

        try {
            // 【修正】將 ABI 強制轉型為 'any' 來繞過因 ABI 設定檔不匹配造成的 TypeScript 型別錯誤。
            // 這是一個臨時解決方案，最終應確保前端的 ABI 與部署的合約完全一致。
            const hash = await writeContractAsync({
                address: altarContract.address,
                abi: altarContract.abi as any, 
                functionName,
                args: [tokenIds, targetRarity],
            });
            addTransaction({ hash, description: `升星 ${type === 'hero' ? '英雄' : '聖物'} 至 ${targetRarity} 星` });
            setSelectedNfts([]);
            queryClient.invalidateQueries({ queryKey: ['ownedNfts'] });
        } catch (e: any) {
            showToast(e.shortMessage || "升星失敗", "error");
        }
    };

    const actionButtonText = useMemo(() => {
        if (!ascensionTarget) return '配方無效';
        if (needsApproval.hero) return '批准英雄';
        if (needsApproval.relic) return '批准聖物';
        return '開始升星';
    }, [ascensionTarget, needsApproval]);


    return (
        <section>
            <h2 className="page-title">升星祭壇</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <h3 className="section-title">選擇要獻祭的資產</h3>
                    <p className="text-sm text-gray-400 mb-4">選擇 3-5 個相同類型和星級的英雄或聖物來合成更高星級的資產。</p>
                    {isLoadingNfts ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                        </div>
                    ) : heroesAndRelics.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {heroesAndRelics.map((nft: HeroNft | RelicNft) => (
                                <NftCard
                                    key={`${nft.type}-${nft.id}`}
                                    nft={nft}
                                    onSelect={() => handleSelectNft(nft)}
                                    isSelected={selectedNfts.some(item => item.id === nft.id && item.type === nft.type)}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="您沒有可用於升星的英雄或聖物。" />
                    )}
                </div>
                <div className="md:col-span-1">
                    <div className="card-bg p-6 rounded-xl shadow-lg sticky top-24">
                        <h3 className="section-title">獻祭清單</h3>
                        <div className="min-h-[200px] bg-black/20 rounded-lg p-4 space-y-2">
                            {selectedNfts.length > 0 ? (
                                selectedNfts.map(nft => <p key={`${nft.type}-${nft.id}`} className="text-sm text-gray-300">- {nft.name}</p>)
                            ) : (
                                <p className="text-sm text-gray-500">從左側選擇資產...</p>
                            )}
                        </div>
                        {ascensionTarget && (
                            <div className="mt-4 text-center">
                                <p className="text-green-400">✨ 配方有效 ✨</p>
                                <p>將合成: {ascensionTarget.targetRarity} 星 {ascensionTarget.type === 'hero' ? '英雄' : '聖物'}</p>
                            </div>
                        )}
                        <ActionButton
                            onClick={handleAscendOrApprove}
                            isLoading={isPending || isConfirming}
                            disabled={!ascensionTarget || isPending || isConfirming}
                            className="w-full mt-4"
                        >
                            {actionButtonText}
                        </ActionButton>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AltarPage;
