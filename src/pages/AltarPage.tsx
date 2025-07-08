// src/pages/AltarPage.tsx (The Graph 改造版)

import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useReadContracts, useWriteContract, usePublicClient } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatEther, decodeEventLog, type Abi } from 'viem';
import { fetchMetadata } from '../api/nfts';
import { getContract, altarOfAscensionABI, heroABI, relicABI } from '../config/contracts';
import { NftCard } from '../components/ui/NftCard';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import type { AnyNft, HeroNft, NftAttribute, RelicNft, NftType } from '../types/nft';
import { bsc } from 'wagmi/chains';
import { Modal } from '../components/ui/Modal';

// =================================================================
// Section: GraphQL 查詢與數據獲取 Hooks
// =================================================================

const THE_GRAPH_API_URL = import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL;

// ★ 核心改造：專為祭壇設計的、可篩選星級的 GraphQL 查詢
const GET_FILTERED_NFTS_QUERY = `
  query GetFilteredNfts($owner: ID!, $rarity: Int!) {
    heroes(where: { owner: $owner, rarity: $rarity }) {
      id
      tokenId
      power
      rarity
    }
    relics(where: { owner: $owner, rarity: $rarity }) {
      id
      tokenId
      capacity
      rarity
    }
  }
`;

// 新的 Hook，根據類型和星級獲取可用於升級的 NFT
const useAltarMaterials = (nftType: NftType, rarity: number) => {
    const { address, chainId } = useAccount();

    return useQuery<(HeroNft[] | RelicNft[])>({
        queryKey: ['altarMaterials', address, chainId, nftType, rarity],
        queryFn: async () => {
            if (!address || !THE_GRAPH_API_URL) return [];
            
            const response = await fetch(THE_GRAPH_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: GET_FILTERED_NFTS_QUERY,
                    variables: { owner: address.toLowerCase(), rarity },
                }),
            });
            if (!response.ok) throw new Error('GraphQL Network response was not ok');
            const { data } = await response.json();

            const assets = nftType === 'hero' ? data.heroes : data.relics;
            if (!assets) return [];

            // 將 The Graph 的數據轉換為前端的型別
            return assets.map((asset: any) => ({
                id: BigInt(asset.tokenId),
                tokenId: BigInt(asset.tokenId),
                name: `${nftType === 'hero' ? '英雄' : '聖物'} #${asset.tokenId}`,
                image: '', // 在這個頁面我們不需要顯示圖片
                description: '',
                attributes: [],
                contractAddress: (nftType === 'hero' ? getContract(bsc.id, 'hero') : getContract(bsc.id, 'relic'))!.address,
                type: nftType,
                ...asset
            }));
        },
        enabled: !!address && chainId === bsc.id && rarity > 0,
        // ★★★ 網路優化：增加 staleTime，避免不必要的重複請求 ★★★
        staleTime: 1000 * 30, // 30 秒
    });
};


// =================================================================
// Section: 子元件 (保持不變)
// =================================================================

type UpgradeOutcomeStatus = 'great_success' | 'success' | 'partial_fail' | 'total_fail';

type UpgradeOutcome = {
  status: UpgradeOutcomeStatus;
  nfts: AnyNft[];
  message: string;
};

const UpgradeResultModal: React.FC<{ result: UpgradeOutcome | null; onClose: () => void }> = ({ result, onClose }) => {
    if (!result) return null;
    const titleMap: Record<UpgradeOutcomeStatus, string> = {
        great_success: '⚜️ 大成功！', success: '✨ 升星成功！',
        partial_fail: '💔 部分失敗...', total_fail: '💀 完全失敗',
    };
    return (
        <Modal isOpen={!!result} onClose={onClose} title={titleMap[result.status]} confirmText="太棒了！" onConfirm={onClose}>
            <div className="flex flex-col items-center">
                <p className="mb-4 text-center text-gray-300">{result.message}</p>
                {result.nfts.length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                        {result.nfts.map(nft => ( <div key={nft.id.toString()} className="w-40"><NftCard nft={nft} /></div> ))}
                    </div>
                )}
            </div>
        </Modal>
    );
};

const UpgradeInfoCard: React.FC<{ rule: any; isLoading: boolean; }> = ({ rule, isLoading }) => {
  if (isLoading) return <div className="card-bg p-4 rounded-xl animate-pulse h-48"><LoadingSpinner /></div>;
  if (!rule || !rule.materialsRequired) return <div className="card-bg p-4 rounded-xl text-center text-gray-500">請先選擇要升級的星級</div>;
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
    const { chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    const publicClient = usePublicClient();
    const queryClient = useQueryClient();

    const [nftType, setNftType] = useState<NftType>('hero');
    const [rarity, setRarity] = useState<number>(1);
    const [selectedNfts, setSelectedNfts] = useState<bigint[]>([]);
    const [upgradeResult, setUpgradeResult] = useState<UpgradeOutcome | null>(null);

    if (!chainId || chainId !== bsc.id) {
        return <section><h2 className="page-title">升星祭壇</h2><div className="card-bg p-10 rounded-xl text-center text-gray-400"><p>請先連接到支援的網路 (BSC) 以使用升星祭壇。</p></div></section>;
    }

    const altarContract = getContract(bsc.id, 'altarOfAscension');
    const heroContract = getContract(bsc.id, 'hero');
    const relicContract = getContract(bsc.id, 'relic');

    const { writeContractAsync, isPending: isTxPending } = useWriteContract();

    // ★ 核心改造：使用新的 Hook 來精準獲取材料
    const { data: availableNfts, isLoading: isLoadingNfts } = useAltarMaterials(nftType, rarity);

    const { data: upgradeRulesData, isLoading: isLoadingRules } = useReadContracts({
        contracts: [1, 2, 3, 4].map(r => ({ ...altarContract, functionName: 'upgradeRules', args: [r] })),
        query: { enabled: !!altarContract },
    });
    
    const currentRule = useMemo(() => {
        if (!upgradeRulesData || rarity < 1 || rarity > 4) return null;
        const ruleResult = upgradeRulesData[rarity - 1];
        if (ruleResult.status === 'success') {
            const [materialsRequired, nativeFee, greatSuccessChance, successChance, partialFailChance] = ruleResult.result as readonly [number, bigint, number, number, number];
            return { materialsRequired, nativeFee, greatSuccessChance, successChance, partialFailChance };
        }
        return null;
    }, [upgradeRulesData, rarity]);

    const handleSelectNft = (id: bigint) => {
        setSelectedNfts(prev => {
            if (prev.includes(id)) return prev.filter(i => i !== id);
            if (currentRule && prev.length < currentRule.materialsRequired) return [...prev, id];
            showToast(`最多只能選擇 ${currentRule?.materialsRequired} 個材料`, 'error');
            return prev;
        });
    };
    
    const resetSelections = () => setSelectedNfts([]);
    useEffect(resetSelections, [nftType, rarity]);

    const handleUpgrade = async () => {
        if (!currentRule || !altarContract || !publicClient) return;
        if (selectedNfts.length !== currentRule.materialsRequired) return showToast(`需要 ${currentRule.materialsRequired} 個材料`, 'error');

        const tokenContract = nftType === 'hero' ? heroContract : relicContract;
        if (!tokenContract) return showToast('合約地址未設定', 'error');

        try {
            const hash = await writeContractAsync({ ...altarContract, functionName: 'upgradeNFTs', args: [tokenContract.address, selectedNfts], value: currentRule.nativeFee });
            addTransaction({ hash, description: `升星 ${rarity}★ ${nftType === 'hero' ? '英雄' : '聖物'}` });
            
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            const upgradeLog = receipt.logs.find(log => log.address.toLowerCase() === altarContract.address.toLowerCase());
            if (!upgradeLog) throw new Error("找不到升級事件");

            const decodedUpgradeLog = decodeEventLog({ abi: altarOfAscensionABI, ...upgradeLog });
            if (decodedUpgradeLog.eventName !== 'UpgradeProcessed') throw new Error("事件名稱不符");

            const outcome = Number((decodedUpgradeLog.args as any).outcome);
            const tokenContractAbi = nftType === 'hero' ? heroABI : relicABI;
            const mintEventName = nftType === 'hero' ? 'HeroMinted' : 'RelicMinted';
            
            const mintedLogs = receipt.logs
                .filter(log => log.address.toLowerCase() === tokenContract.address.toLowerCase())
                .map(log => { try { return decodeEventLog({ abi: tokenContractAbi, ...log }); } catch { return null; } })
                .filter((log): log is NonNullable<typeof log> => log !== null && log.eventName === mintEventName);

            const newNfts: AnyNft[] = await Promise.all(mintedLogs.map(async (log: any) => {
                const tokenId = log.args.tokenId;
                const tokenUri = await publicClient.readContract({ address: tokenContract.address, abi: tokenContract.abi as Abi, functionName: 'tokenURI', args: [tokenId] }) as string;
                const metadata = await fetchMetadata(tokenUri);
                const findAttr = (trait: string, defaultValue: any = 0) => metadata.attributes?.find((a: NftAttribute) => a.trait_type === trait)?.value ?? defaultValue;
                if (nftType === 'hero') return { ...metadata, id: tokenId, type: 'hero', contractAddress: tokenContract.address, power: Number(findAttr('Power')), rarity: Number(findAttr('Rarity')) };
                return { ...metadata, id: tokenId, type: 'relic', contractAddress: tokenContract.address, capacity: Number(findAttr('Capacity')), rarity: Number(findAttr('Rarity')) };
            }));

            const outcomeMessages: Record<number, string> = { 3: `大成功！您獲得了 ${newNfts.length} 個更高星級的 NFT！`, 2: `恭喜！您成功獲得了 1 個更高星級的 NFT！`, 1: `可惜，升星失敗了，但我們為您保留了 ${newNfts.length} 個材料。`, 0: '升星失敗，所有材料都已銷毀。再接再厲！' };
            const statusMap: UpgradeOutcomeStatus[] = ['total_fail', 'partial_fail', 'success', 'great_success'];
            setUpgradeResult({ status: statusMap[outcome] || 'total_fail', nfts: newNfts, message: outcomeMessages[outcome] || "發生未知錯誤" });

            resetSelections();
            queryClient.invalidateQueries({ queryKey: ['ownedNfts'] });
            queryClient.invalidateQueries({ queryKey: ['altarMaterials'] });

        } catch (e: any) {
            if (!e.message.includes('User rejected the request')) showToast(e.shortMessage || "升星失敗", "error");
        }
    };

    const isLoading = isLoadingNfts || isLoadingRules;

    return (
        <section className="space-y-8">
            <UpgradeResultModal result={upgradeResult} onClose={() => setUpgradeResult(null)} />
            <h2 className="page-title">升星祭壇</h2>
            <p className="text-center text-gray-400 max-w-2xl mx-auto -mt-4">將多個同星級的 NFT 作為祭品，有機會合成更高星級的強大資產！結果由鏈上隨機數決定，絕對公平。</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1 space-y-6 sticky top-24">
                    <div className="card-bg p-6 rounded-2xl">
                        <h3 className="section-title text-xl">1. 選擇升級目標</h3>
                        <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-lg mb-4">
                            {(['hero', 'relic'] as const).map(t => (
                                <button key={t} onClick={() => setNftType(t)} className={`w-full py-2 text-sm font-medium rounded-md transition ${nftType === t ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}>{t === 'hero' ? '英雄' : '聖物'}</button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-lg">
                            {[1, 2, 3, 4].map(r => (
                                <button key={r} onClick={() => setRarity(r)} className={`w-full py-2 text-sm font-medium rounded-md transition ${rarity === r ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}>{r} ★</button>
                            ))}
                        </div>
                    </div>
                    <UpgradeInfoCard rule={currentRule} isLoading={isLoadingRules} />
                    <ActionButton onClick={handleUpgrade} isLoading={isTxPending} disabled={isTxPending || !currentRule || selectedNfts.length !== currentRule.materialsRequired} className="w-full h-14 text-lg">{isTxPending ? '正在獻祭...' : '開始升星'}</ActionButton>
                </div>
                <div className="lg:col-span-2 card-bg p-6 rounded-2xl">
                    <h3 className="section-title">2. 選擇材料 ({selectedNfts.length} / {currentRule?.materialsRequired ?? '...'})</h3>
                    {isLoading ? <div className="flex justify-center h-64 items-center"><LoadingSpinner /></div> : 
                     availableNfts && availableNfts.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {availableNfts.map(nft => (
                                <NftCard key={nft.id.toString()} nft={nft as HeroNft | RelicNft} onSelect={() => handleSelectNft(nft.id)} isSelected={selectedNfts.includes(nft.id)} />
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
