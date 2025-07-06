// src/pages/AltarPage.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useReadContracts, useWriteContract } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { fetchAllOwnedNfts } from '../api/nfts';
import { getContract } from '../config/contracts';
import { NftCard } from '../components/ui/NftCard';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import type { HeroNft, RelicNft, NftType } from '../types/nft';
import { bsc, bscTestnet } from 'wagmi/chains'; // 導入支援的鏈

// =================================================================
// Section: 型別定義與輔助元件
// =================================================================

// 用於顯示升級規則和機率的卡片
const UpgradeInfoCard: React.FC<{
  rule: any;
  isLoading: boolean;
}> = ({ rule, isLoading }) => {
  if (isLoading) {
    return <div className="card-bg p-4 rounded-xl animate-pulse h-48"><LoadingSpinner /></div>;
  }
  if (!rule || !rule.materialsRequired) {
    return (
      <div className="card-bg p-4 rounded-xl text-center text-gray-500">
        請先選擇要升級的星級
      </div>
    );
  }

  const totalChance = rule.greatSuccessChance + rule.successChance + rule.partialFailChance;

  return (
    <div className="card-bg p-6 rounded-2xl text-sm">
      <h4 className="section-title text-xl">升星規則</h4>
      <div className="space-y-2">
        <p>所需材料: <span className="font-bold text-white">{rule.materialsRequired.toString()} 個</span></p>
        <p>所需費用: <span className="font-bold text-yellow-400">{formatEther(rule.nativeFee)} BNB</span></p>
        <hr className="border-gray-700 my-3" />
        <p className="text-green-400">⚜️ 大成功 (獲得2個): {rule.greatSuccessChance}%</p>
        <p className="text-sky-400">✨ 普通成功 (獲得1個): {rule.successChance}%</p>
        <p className="text-orange-400">💔 一般失敗 (返還部分): {rule.partialFailChance}%</p>
        <p className="text-red-500">💀 完全失敗 (全部損失): {100 - totalChance}%</p>
      </div>
    </div>
  );
};

// =================================================================
// Section: AltarPage 主元件
// =================================================================

const AltarPage: React.FC = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();

    const [nftType, setNftType] = useState<NftType>('hero');
    const [rarity, setRarity] = useState<number>(1);
    const [selectedNfts, setSelectedNfts] = useState<bigint[]>([]);

    // ★ 核心修正: 在元件頂部加入型別防衛
    if (!chainId || (chainId !== bsc.id && chainId !== bscTestnet.id)) {
        return (
            <section>
                <h2 className="page-title">升星祭壇</h2>
                <div className="card-bg p-10 rounded-xl text-center text-gray-400">
                    <p>請先連接到支援的網路 (BSC 或 BSC 測試網) 以使用升星祭壇。</p>
                </div>
            </section>
        );
    }

    const altarContract = getContract(chainId, 'altarOfAscension');
    const heroContract = getContract(chainId, 'hero');
    const relicContract = getContract(chainId, 'relic');

    const { writeContractAsync, isPending: isTxPending } = useWriteContract();

    // 獲取玩家的所有 NFT
    const { data: nfts, isLoading: isLoadingNfts } = useQuery({
        queryKey: ['ownedNfts', address, chainId],
        queryFn: () => fetchAllOwnedNfts(address!, chainId),
        enabled: !!address && !!chainId,
    });

    // 一次性讀取所有升級規則
    const { data: upgradeRulesData, isLoading: isLoadingRules } = useReadContracts({
        contracts: [1, 2, 3, 4].map(r => ({
            ...altarContract,
            functionName: 'upgradeRules',
            args: [r],
        })),
        query: { enabled: !!altarContract },
    });
    
    // 根據當前選擇的稀有度，獲取對應的規則
    const currentRule = useMemo(() => {
        if (!upgradeRulesData || rarity < 1 || rarity > 4) return null;
        const ruleResult = upgradeRulesData[rarity - 1];
        if (ruleResult.status === 'success') {
            const [materialsRequired, nativeFee, greatSuccessChance, successChance, partialFailChance] = ruleResult.result as readonly [number, bigint, number, number, number];
            return { materialsRequired, nativeFee, greatSuccessChance, successChance, partialFailChance };
        }
        return null;
    }, [upgradeRulesData, rarity]);

    // 根據選擇的類型和稀有度，過濾出可用的 NFT
    const availableNfts = useMemo(() => {
        if (!nfts) return [];
        const sourceNfts = nftType === 'hero' ? nfts.heroes : nfts.relics;
        return sourceNfts.filter(nft => nft.rarity === rarity);
    }, [nfts, nftType, rarity]);

    const handleSelectNft = (id: bigint) => {
        setSelectedNfts(prev => {
            if (prev.includes(id)) {
                return prev.filter(i => i !== id);
            }
            if (currentRule && prev.length < currentRule.materialsRequired) {
                return [...prev, id];
            }
            showToast(`最多只能選擇 ${currentRule?.materialsRequired} 個材料`, 'error');
            return prev;
        });
    };
    
    // 重置選擇
    const resetSelections = () => {
        setSelectedNfts([]);
    };
    
    useEffect(resetSelections, [nftType, rarity]);

    const handleUpgrade = async () => {
        if (!currentRule || !altarContract) return;
        if (selectedNfts.length !== currentRule.materialsRequired) {
            return showToast(`需要 ${currentRule.materialsRequired} 個材料`, 'error');
        }

        const tokenContractAddress = nftType === 'hero' ? heroContract?.address : relicContract?.address;
        if (!tokenContractAddress) return showToast('合約地址未設定', 'error');

        try {
            const hash = await writeContractAsync({
                ...altarContract,
                functionName: 'upgradeNFTs',
                args: [tokenContractAddress, selectedNfts],
                value: currentRule.nativeFee,
            });
            addTransaction({ hash, description: `升星 ${rarity}★ ${nftType === 'hero' ? '英雄' : '聖物'}` });
            resetSelections();
        } catch (e: any) {
            if (!e.message.includes('User rejected the request')) {
                showToast(e.shortMessage || "升星失敗", "error");
            }
        }
    };

    const isLoading = isLoadingNfts || isLoadingRules;

    return (
        <section className="space-y-8">
            <h2 className="page-title">升星祭壇</h2>
            <p className="text-center text-gray-400 max-w-2xl mx-auto -mt-4">
                將多個同星級的 NFT 作為祭品，有機會合成更高星級的強大資產！結果由鏈上隨機數決定，絕對公平。
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* 左側：操作與資訊區 */}
                <div className="lg:col-span-1 space-y-6 sticky top-24">
                    <div className="card-bg p-6 rounded-2xl">
                        <h3 className="section-title text-xl">1. 選擇升級目標</h3>
                        <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-lg mb-4">
                            {(['hero', 'relic'] as const).map(t => (
                                <button key={t} onClick={() => setNftType(t)} className={`w-full py-2 text-sm font-medium rounded-md transition ${nftType === t ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}>
                                    {t === 'hero' ? '英雄' : '聖物'}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-lg">
                            {[1, 2, 3, 4].map(r => (
                                <button key={r} onClick={() => setRarity(r)} className={`w-full py-2 text-sm font-medium rounded-md transition ${rarity === r ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}>
                                    {r} ★
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <UpgradeInfoCard rule={currentRule} isLoading={isLoadingRules} />

                    <ActionButton 
                        onClick={handleUpgrade} 
                        isLoading={isTxPending} 
                        disabled={isTxPending || !currentRule || selectedNfts.length !== currentRule.materialsRequired}
                        className="w-full h-14 text-lg"
                    >
                        開始升星
                    </ActionButton>
                </div>

                {/* 右側：NFT 選擇區 */}
                <div className="lg:col-span-2 card-bg p-6 rounded-2xl">
                    <h3 className="section-title">2. 選擇材料 ({selectedNfts.length} / {currentRule?.materialsRequired ?? '...'})</h3>
                    {isLoading ? <div className="flex justify-center h-64 items-center"><LoadingSpinner /></div> : 
                     availableNfts.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {availableNfts.map(nft => (
                                <NftCard
                                    key={nft.id.toString()}
                                    nft={nft as HeroNft | RelicNft}
                                    onSelect={() => handleSelectNft(nft.id)}
                                    isSelected={selectedNfts.includes(nft.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState message={`沒有可用的 ${rarity}★ ${nftType === 'hero' ? '英雄' : '聖物'}`} />
                    )}
                </div>
            </div>
        </section>
    );
};

export default AltarPage;
