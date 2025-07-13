// src/pages/AltarPage.tsx (數據讀取修正版)

import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useReadContracts, useWriteContract, usePublicClient } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatEther, decodeEventLog, type Abi } from 'viem';
import { fetchMetadata } from '../api/nfts';
import { getContract } from '../config/contracts';
import { altarOfAscensionABI, heroABI, relicABI } from '../config/abis';
import { NftCard } from '../components/ui/NftCard';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { LocalErrorBoundary, LoadingState, ErrorState } from '../components/ui/ErrorBoundary';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import type { AnyNft, HeroNft, NftAttribute, RelicNft, NftType } from '../types/nft';
import { bsc } from 'wagmi/chains';
import { Modal } from '../components/ui/Modal';
import { logger } from '../utils/logger';

// =================================================================
// Section: GraphQL 查詢與數據獲取 Hooks
// =================================================================

const THE_GRAPH_API_URL = import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL;

// ★ 核心修正: 查詢語句現在直接查詢頂層的 heros 和 relics，並使用正確的變數類型
const GET_FILTERED_NFTS_QUERY = `
  query GetFilteredNfts($owner: String!, $rarity: Int!) {
    heros(where: { owner: $owner, rarity: $rarity }, first: 1000) {
      id
      tokenId
      power
      rarity
    }
    relics(where: { owner: $owner, rarity: $rarity }, first: 1000) {
      id
      tokenId
      capacity
      rarity
    }
  }
`;

const useAltarMaterials = (nftType: NftType, rarity: number) => {
    const { address, chainId } = useAccount();

    return useQuery({
        queryKey: ['altarMaterials', address, chainId, nftType, rarity],
        queryFn: async (): Promise<AnyNft[]> => {
            if (!address || !THE_GRAPH_API_URL) return [];
            
            try {
                const result = await fetchFromGraph(GET_FILTERED_NFTS_QUERY, { owner: address.toLowerCase(), rarity });
                
                // 添加調試信息

                // 檢查 result 是否存在
                if (!result) {
                    logger.warn('GraphQL查詢返回空結果 - 可能是子圖正在同步新合約');
                    return [];
                }
                
                const assets = nftType === 'hero' ? result.heros : result.relics;

                if (!assets || !Array.isArray(assets)) {
                    logger.warn(`${nftType} 資產數組為空或不是數組:`, assets, '- 可能是子圖數據尚未同步');
                    return [];
                }

                const contractAddress = (nftType === 'hero' ? getContract(bsc.id, 'hero') : getContract(bsc.id, 'relic'))?.address;
                if (!contractAddress) {
                    logger.error(`找不到 ${nftType} 合約地址`);
                    return [];
                }

                return assets
                    .filter((asset: { tokenId: string; power?: string; capacity?: string; rarity?: string }) => {
                        // 嚴格檢查稀有度是否匹配查詢條件
                        const assetRarity = asset.rarity ? Number(asset.rarity) : null;
                        if (assetRarity !== rarity) {
                            logger.warn(`NFT #${asset.tokenId} 稀有度不匹配: 期望 ${rarity}，實際 ${assetRarity}`);
                            return false; // 過濾掉不匹配的 NFT
                        }
                        return true;
                    })
                    .map((asset: { tokenId: string; power?: string; capacity?: string; rarity?: string }) => {
                        const assetRarity = Number(asset.rarity);
                        const baseNft = {
                            id: BigInt(asset.tokenId),
                            name: `${nftType === 'hero' ? '英雄' : '聖物'} #${asset.tokenId}`,
                            image: '',
                            description: '',
                            attributes: [],
                            contractAddress: contractAddress,
                            tokenId: BigInt(asset.tokenId),
                            source: 'subgraph' as const,
                        };

                        if (nftType === 'hero') {
                            return {
                                ...baseNft,
                                type: 'hero' as const,
                                power: asset.power ? Number(asset.power) : 0,
                                rarity: assetRarity
                            } as HeroNft;
                        } else {
                            return {
                                ...baseNft,
                                type: 'relic' as const,
                                capacity: asset.capacity ? Number(asset.capacity) : 0,
                                rarity: assetRarity
                            } as RelicNft;
                        }
                    });
            } catch (error) {
                logger.error(`獲取 ${nftType} 材料失敗:`, error);
                return [];
            }
        },
        enabled: !!address && chainId === bsc.id && rarity > 0 && !!THE_GRAPH_API_URL,
        staleTime: 1000 * 30,
        retry: 2,
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 5000),
    });
};

// 獨立的 GraphQL 請求函式
const fetchFromGraph = async (query: string, variables: Record<string, unknown>) => {
    if (!THE_GRAPH_API_URL) throw new Error("The Graph API URL is not configured.");
    const response = await fetch(THE_GRAPH_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) throw new Error('GraphQL Network response was not ok');
    const { data, errors } = await response.json();
    if (errors) throw new Error(`GraphQL errors: ${JSON.stringify(errors)}`);
    return data;
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

const UpgradeInfoCard: React.FC<{ rule: { materialsRequired: number; nativeFee: bigint; greatSuccessChance: number; successChance: number; partialFailChance: number } | null; isLoading: boolean; }> = ({ rule, isLoading }) => {
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

    // Always call hooks unconditionally - move early returns after all hooks
    const altarContract = getContract(bsc.id, 'altarOfAscension');
    const heroContract = getContract(bsc.id, 'hero');
    const relicContract = getContract(bsc.id, 'relic');

    const { writeContractAsync, isPending: isTxPending } = useWriteContract();

    const { data: availableNfts, isLoading: isLoadingNfts } = useAltarMaterials(nftType, rarity);

    const { data: upgradeRulesData, isLoading: isLoadingRules } = useReadContracts({
        contracts: [1, 2, 3, 4].map(r => ({ ...altarContract, functionName: 'upgradeRules', args: [r] })),
        query: { enabled: !!altarContract && chainId === bsc.id },
    });
    
    const currentRule = useMemo(() => {
        if (!upgradeRulesData || rarity < 1 || rarity > 4) return null;
        const ruleResult = upgradeRulesData[rarity - 1];
        if (ruleResult.status === 'success' && Array.isArray(ruleResult.result)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const [materialsRequired, nativeFee, greatSuccessChance, successChance, partialFailChance] = ruleResult.result as unknown as [number, bigint, number, number, number];
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
    
    useEffect(() => {
        resetSelections();
    }, [nftType, rarity]);

    const handleUpgrade = async () => {
        if (!currentRule || !altarContract || !publicClient) return;
        if (selectedNfts.length !== currentRule.materialsRequired) return showToast(`需要 ${currentRule.materialsRequired} 個材料`, 'error');

        const tokenContract = nftType === 'hero' ? heroContract : relicContract;
        if (!tokenContract) return showToast('合約地址未設定', 'error');

        // 調試信息：檢查選中的 NFT 稀有度

            nftType,
            targetRarity: rarity,
            selectedNfts: selectedNfts.map(id => id.toString()),
            availableNfts: availableNfts?.map(nft => ({
                id: nft.id.toString(),
                rarity: 'rarity' in nft ? nft.rarity : 'N/A',
                type: nft.type
            }))
        });

        try {
                        const hash = await writeContractAsync({ address: altarContract?.address as `0x${string}`,
        abi: altarContract?.abi,
        functionName: 'upgradeNFTs',
        args: [tokenContract.address, selectedNfts], value: currentRule.nativeFee as any });
            addTransaction({ hash, description: `升星 ${rarity}★ ${nftType === 'hero' ? '英雄' : '聖物'}` });
            
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            const upgradeLog = receipt.logs.find(log => log.address.toLowerCase() === altarContract.address.toLowerCase());
            if (!upgradeLog) throw new Error("找不到升級事件");

            const decodedUpgradeLog = decodeEventLog({ abi: altarOfAscensionABI, ...upgradeLog });
            if (decodedUpgradeLog.eventName !== 'UpgradeProcessed') throw new Error("事件名稱不符");

            const outcome = Number(((decodedUpgradeLog.args as unknown) as Record<string, unknown>).outcome);
            const tokenContractAbi = nftType === 'hero' ? heroABI : relicABI;
            const mintEventName = nftType === 'hero' ? 'HeroMinted' : 'RelicMinted';
            
            const mintedLogs = receipt.logs
                .filter(log => log.address.toLowerCase() === tokenContract.address.toLowerCase())
                .map(log => { try { return decodeEventLog({ abi: tokenContractAbi, ...log }); } catch { return null; } })
                .filter((log): log is NonNullable<typeof log> => log !== null && log.eventName === mintEventName);

            const newNfts: AnyNft[] = await Promise.all(mintedLogs.map(async (log) => {
                const tokenId = ((log.args as unknown) as Record<string, unknown>).tokenId as bigint;
                const tokenUri = await publicClient.readContract({ address: tokenContract.address, abi: tokenContract.abi as Abi, functionName: 'tokenURI', args: [tokenId] }) as string;
                const metadata = await fetchMetadata(tokenUri, tokenId.toString(), tokenContract.address);
                const findAttr = (trait: string, defaultValue = 0) => metadata.attributes?.find((a: NftAttribute) => a.trait_type === trait)?.value ?? defaultValue;
                if (nftType === 'hero') return { ...metadata, id: tokenId, type: 'hero', contractAddress: tokenContract.address, power: Number(findAttr('Power')), rarity: Number(findAttr('Rarity')) };
                return { ...metadata, id: tokenId, type: 'relic', contractAddress: tokenContract.address, capacity: Number(findAttr('Capacity')), rarity: Number(findAttr('Rarity')) };
            }));

            const outcomeMessages: Record<number, string> = { 3: `大成功！您獲得了 ${newNfts.length} 個更高星級的 NFT！`, 2: `恭喜！您成功獲得了 1 個更高星級的 NFT！`, 1: `可惜，升星失敗了，但我們為您保留了 ${newNfts.length} 個材料。`, 0: '升星失敗，所有材料已銷毀。再接再厲！' };
            const statusMap: UpgradeOutcomeStatus[] = ['total_fail', 'partial_fail', 'success', 'great_success'];
            setUpgradeResult({ status: statusMap[outcome] || 'total_fail', nfts: newNfts, message: outcomeMessages[outcome] || "發生未知錯誤" });

            resetSelections();
            queryClient.invalidateQueries({ queryKey: ['ownedNfts'] });
            queryClient.invalidateQueries({ queryKey: ['altarMaterials'] });

        } catch (e) {
            const error = e as { message: string; shortMessage?: string };
            if (!error.message.includes('User rejected the request')) showToast(error.shortMessage || "升星失敗", "error");
        }
    };

    const isLoading = isLoadingNfts || isLoadingRules;

    // Move early return after all hooks
    if (!chainId || chainId !== bsc.id) {
        return <section><h2 className="page-title">升星祭壇</h2><div className="card-bg p-10 rounded-xl text-center text-gray-400"><p>請先連接到支援的網路 (BSC) 以使用升星祭壇。</p></div></section>;
    }

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
                <LocalErrorBoundary 
                    fallback={
                        <ErrorState 
                            message="材料載入失敗" 
                            onRetry={() => queryClient.invalidateQueries({ queryKey: ['altarMaterials'] })}
                        />
                    }
                >
                    <div className="lg:col-span-2 card-bg p-6 rounded-2xl">
                        <h3 className="section-title">2. 選擇材料 ({selectedNfts.length} / {currentRule?.materialsRequired ?? '...'})</h3>
                        {isLoading ? (
                            <LoadingState message="載入材料中..." />
                        ) : availableNfts && availableNfts.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {availableNfts.map(nft => (
                                    <div 
                                        key={nft.id.toString()} 
                                        onClick={() => handleSelectNft(nft.id)}
                                        className={`cursor-pointer transition-all duration-200 ${
                                            selectedNfts.includes(nft.id) 
                                                ? 'ring-2 ring-yellow-400 scale-105' 
                                                : 'hover:scale-105'
                                        }`}
                                    >
                                        <NftCard 
                                            nft={nft} 
                                            selected={selectedNfts.includes(nft.id)}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <EmptyState message={`沒有可用的 ${rarity}★ ${nftType === 'hero' ? '英雄' : '聖物'}`} />
                                <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                                    <p className="text-sm text-blue-200">
                                        📊 <strong>數據同步中</strong>
                                    </p>
                                    <p className="text-xs text-blue-300 mt-1">
                                        合約已升級至最新版本，子圖正在同步新數據。請稍後再試或檢查您的資產頁面。
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </LocalErrorBoundary>
            </div>
        </section>
    );
};

export default AltarPage;
