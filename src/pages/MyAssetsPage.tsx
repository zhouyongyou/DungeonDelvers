// src/pages/MyAssetsPage.tsx (組隊UI優化版)

import React, { useState, useMemo, useCallback, memo } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllOwnedNfts } from '../api/nfts';
import { NftCard } from '../components/ui/NftCard';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { getContract } from '../config/contracts';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import type { HeroNft, RelicNft, NftType } from '../types/nft';
import { formatEther } from 'viem';
import { bsc } from 'wagmi/chains';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { useGlobalLoading } from '../components/core/GlobalLoadingProvider';
import { logger } from '../utils/logger';
import { OptimizedNftGrid } from '../components/ui/OptimizedNftGrid';

// =================================================================
// Section: 子元件 (TeamBuilder) - 優化版
// =================================================================

interface TeamBuilderProps {
  heroes: HeroNft[];
  relics: RelicNft[];
  onCreateParty: (heroIds: bigint[], relicIds: bigint[]) => void;
  isCreating: boolean;
  platformFee?: bigint;
  isLoadingFee: boolean;
  isHeroAuthorized: boolean;
  isRelicAuthorized: boolean;
  onAuthorizeHero: () => void;
  onAuthorizeRelic: () => void;
  isAuthorizing: boolean;
}

const TeamBuilder: React.FC<TeamBuilderProps> = ({ 
  heroes, 
  relics, 
  onCreateParty, 
  isCreating, 
  platformFee, 
  isLoadingFee,
  isHeroAuthorized,
  isRelicAuthorized,
  onAuthorizeHero,
  onAuthorizeRelic,
  isAuthorizing
}: TeamBuilderProps) => {
    const [selectedHeroes, setSelectedHeroes] = useState<bigint[]>([]);
    const [selectedRelics, setSelectedRelics] = useState<bigint[]>([]);
    const [showAllRelics, setShowAllRelics] = useState(false);
    const [showAllHeroes, setShowAllHeroes] = useState(false);
    const [currentStep, setCurrentStep] = useState<'select-relic' | 'select-hero' | 'ready'>('select-relic');
    const { showToast } = useAppToast();

    const { totalPower, totalCapacity } = useMemo(() => {
        const power = selectedHeroes.reduce((acc: number, id: bigint) => {
            const hero = heroes.find(h => h.id === id);
            return acc + (hero ? Number(hero.power) : 0);
        }, 0);
        const capacity = selectedRelics.reduce((acc: number, id: bigint) => {
            const relic = relics.find(r => r.id === id);
            return acc + (relic ? Number(relic.capacity) : 0);
        }, 0);
        return { totalPower: power, totalCapacity: capacity };
    }, [selectedHeroes, selectedRelics, heroes, relics]);

    const toggleSelection = (id: bigint, type: 'hero' | 'relic') => {
        if (type === 'relic') {
            const list = selectedRelics;
            const setList = setSelectedRelics;
            const limit = 5;

            if (list.includes(id)) {
                setList(list.filter(i => i !== id));
            } else if (list.length < limit) {
                setList([...list, id]);
                // 當選擇了聖物後，自動進入下一步
                if (list.length === 0) {
                    setCurrentStep('select-hero');
                }
            } else {
                showToast(`最多只能選擇 ${limit} 個聖物`, 'error');
            }
        } else { // type === 'hero'
            const list = selectedHeroes;
            const setList = setSelectedHeroes;
            const limit = totalCapacity;

            if (list.includes(id)) {
                setList(list.filter(i => i !== id));
            } else if (totalCapacity === 0) {
                showToast('請先選擇聖物以決定隊伍容量', 'info');
            } else if (list.length < limit) {
                setList([...list, id]);
                // 當選擇了英雄後，標記為準備完成
                if (list.length === 0 && selectedRelics.length > 0) {
                    setCurrentStep('ready');
                }
            } else {
                showToast(`英雄數量已達隊伍容量上限 (${limit})`, 'error');
            }
        }
    };

    // 一鍵選擇最強英雄
    const handleAutoSelectHeroes = () => {
        if (totalCapacity === 0) {
            showToast('請先選擇聖物以決定隊伍容量', 'info');
            return;
        }
        
        const sortedHeroes = [...heroes].sort((a, b) => b.power - a.power);
        const selected = sortedHeroes.slice(0, totalCapacity).map(h => h.id);
        setSelectedHeroes(selected);
        showToast(`已自動選擇 ${selected.length} 個最強英雄`, 'success');
    };

    // 一鍵選擇最大容量聖物
    const handleAutoSelectRelics = () => {
        const sortedRelics = [...relics].sort((a, b) => b.capacity - a.capacity);
        const selected = sortedRelics.slice(0, 5).map(r => r.id);
        setSelectedRelics(selected);
        showToast(`已自動選擇 ${selected.length} 個最大容量聖物`, 'success');
    };

    const canCreate = selectedHeroes.length > 0 && selectedRelics.length > 0 && selectedHeroes.length <= totalCapacity && isHeroAuthorized && isRelicAuthorized;

    // 組合授權處理
    const handleAuthorizeAll = async () => {
        if (!isRelicAuthorized) {
            await onAuthorizeRelic();
            // 等待一下再授權英雄
            setTimeout(() => {
                if (!isHeroAuthorized) {
                    onAuthorizeHero();
                }
            }, 2000);
        } else if (!isHeroAuthorized) {
            await onAuthorizeHero();
        }
    };

    return (
        <div className="card-bg p-4 md:p-6 rounded-2xl shadow-xl">
            <h3 className="section-title">創建新隊伍</h3>
            
            {/* 步驟指引 */}
            <div className="flex items-center justify-between mb-6 bg-gray-900/50 p-3 rounded-lg">
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 ${currentStep === 'select-relic' ? 'text-yellow-400' : 'text-gray-500'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            selectedRelics.length > 0 ? 'bg-green-600' : currentStep === 'select-relic' ? 'bg-yellow-600' : 'bg-gray-600'
                        }`}>
                            {selectedRelics.length > 0 ? '✓' : '1'}
                        </div>
                        <span className="text-sm font-medium">選擇聖物</span>
                    </div>
                    <div className="text-gray-600">→</div>
                    <div className={`flex items-center gap-2 ${currentStep === 'select-hero' ? 'text-yellow-400' : 'text-gray-500'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            selectedHeroes.length > 0 ? 'bg-green-600' : currentStep === 'select-hero' ? 'bg-yellow-600' : 'bg-gray-600'
                        }`}>
                            {selectedHeroes.length > 0 ? '✓' : '2'}
                        </div>
                        <span className="text-sm font-medium">選擇英雄</span>
                    </div>
                    <div className="text-gray-600">→</div>
                    <div className={`flex items-center gap-2 ${currentStep === 'ready' ? 'text-yellow-400' : 'text-gray-500'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            canCreate ? 'bg-green-600' : 'bg-gray-600'
                        }`}>
                            {canCreate ? '✓' : '3'}
                        </div>
                        <span className="text-sm font-medium">創建隊伍</span>
                    </div>
                </div>
            </div>
            
            {/* 創建隊伍按鈕 - 移到最上方 */}
            <div className="flex justify-center mb-6">
                <ActionButton 
                    onClick={() => onCreateParty(selectedHeroes, selectedRelics)} 
                    isLoading={isCreating}
                    disabled={!canCreate || isCreating}
                    className="w-full sm:w-64 h-12 text-lg"
                >
                    {!isHeroAuthorized || !isRelicAuthorized ? '請先完成授權' : '創建隊伍'}
                </ActionButton>
            </div>
            
            {/* 狀態顯示 */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-900/50 p-4 rounded-lg mb-6">
                <div className="flex gap-6 text-center">
                    <div>
                        <p className="text-sm text-gray-400">總戰力</p>
                        <p className="text-2xl font-bold text-indigo-400">{totalPower}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">英雄/容量</p>
                        <p className={`text-2xl font-bold ${selectedHeroes.length > totalCapacity ? 'text-red-500' : 'text-teal-400'}`}>
                            {selectedHeroes.length}/{totalCapacity}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-center sm:items-end mt-4 sm:mt-0">
                    <p className="text-xs text-yellow-400 mb-1 text-center sm:text-right">注意：創建後資產將被綁定，此操作目前不可逆。</p>
                    <p className="text-xs text-gray-500 mb-2">費用: {isLoadingFee ? '讀取中...' : formatEther(platformFee ?? 0n)} BNB</p>
                </div>
            </div>

            {/* 錢包授權說明 */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <p className="text-xs text-blue-200">
                        授權彈窗的語言由您的錢包設定決定。授權完成後狀態會自動更新，約需3-10秒。
                    </p>
                </div>
            </div>

            {/* 統一授權按鈕 */}
            {(!isRelicAuthorized || !isHeroAuthorized) && (
                <div className="flex justify-center mb-6">
                    <ActionButton 
                        onClick={handleAuthorizeAll}
                        isLoading={isAuthorizing}
                        className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500"
                    >
                        {isAuthorizing ? '授權中...' : '一鍵授權所有合約'}
                    </ActionButton>
                </div>
            )}

            <div className="flex flex-col md:grid md:grid-cols-2 gap-6 mb-4">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-lg text-white">
                            {currentStep === 'select-relic' && '👉 '} 
                            步驟 1：選擇聖物 (上限: 5)
                        </h4>
                        {relics.length > 20 && (
                            <button
                                onClick={() => setShowAllRelics(!showAllRelics)}
                                className="text-xs text-blue-400 hover:text-blue-300 underline"
                            >
                                {showAllRelics ? '顯示較少' : `顯示全部 (${relics.length})`}
                            </button>
                        )}
                    </div>
                    {currentStep === 'select-relic' && (
                        <p className="text-xs text-yellow-300 mb-2 animate-pulse">
                            👆 請先選擇 1-5 個聖物，聖物的容量決定可攜帶的英雄數量
                        </p>
                    )}
                    <div className="flex justify-end mb-2">
                        <ActionButton 
                            onClick={handleAutoSelectRelics}
                            disabled={relics.length === 0}
                            className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-500"
                        >
                            一鍵選擇最大容量
                        </ActionButton>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 bg-black/20 p-2 rounded-lg min-h-[100px] max-h-[300px] overflow-y-auto">
                        {relics.length > 0 ? (showAllRelics ? relics : relics.slice(0, 20)).map(relic => (
                            <div 
                                key={`select-${relic.id}`}
                                onClick={() => toggleSelection(relic.id, 'relic')}
                                className={`cursor-pointer transition-all duration-200 ${
                                    selectedRelics.includes(relic.id) 
                                        ? 'ring-2 ring-yellow-400 scale-105' 
                                        : 'hover:scale-105'
                                }`}
                            >
                                <NftCard 
                                    nft={relic} 
                                    selected={selectedRelics.includes(relic.id)}
                                />
                            </div>
                        )) : (
                             <div className="col-span-full">
                                <EmptyState message="沒有可用的聖物">
                                     <a href="#/mint">
                                        <ActionButton className="mt-2">前往鑄造</ActionButton>
                                    </a>
                                </EmptyState>
                            </div>
                        )}
                    </div>
                </div>
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-lg text-white">
                            {currentStep === 'select-hero' && '👉 '} 
                            步驟 2：選擇英雄 (上限: {totalCapacity})
                        </h4>
                        {heroes.length > 20 && (
                            <button
                                onClick={() => setShowAllHeroes(!showAllHeroes)}
                                className="text-xs text-blue-400 hover:text-blue-300 underline"
                            >
                                {showAllHeroes ? '顯示較少' : `顯示全部 (${heroes.length})`}
                            </button>
                        )}
                    </div>
                    {currentStep === 'select-hero' && totalCapacity > 0 && (
                        <p className="text-xs text-yellow-300 mb-2 animate-pulse">
                            👆 現在選擇最多 {totalCapacity} 個英雄加入隊伍
                        </p>
                    )}
                    {totalCapacity === 0 && (
                        <p className="text-xs text-red-300 mb-2">
                            ⚠️ 請先選擇聖物，聖物容量決定可攜帶的英雄數量
                        </p>
                    )}
                    {totalCapacity > 0 && (
                        <div className="flex justify-end mb-2">
                            <ActionButton 
                                onClick={handleAutoSelectHeroes}
                                disabled={heroes.length === 0}
                                className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-500"
                            >
                                一鍵選擇最強英雄
                            </ActionButton>
                        </div>
                    )}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 bg-black/20 p-2 rounded-lg min-h-[100px] max-h-[300px] overflow-y-auto">
                        {heroes.length > 0 ? (showAllHeroes ? heroes : heroes.slice(0, 20)).map(hero => (
                            <div 
                                key={`select-${hero.id}`}
                                onClick={() => toggleSelection(hero.id, 'hero')}
                                className={`cursor-pointer transition-all duration-200 ${
                                    selectedHeroes.includes(hero.id) 
                                        ? 'ring-2 ring-yellow-400 scale-105' 
                                        : 'hover:scale-105'
                                }`}
                            >
                                <NftCard 
                                    nft={hero} 
                                    selected={selectedHeroes.includes(hero.id)}
                                />
                            </div>
                        )) : (
                            <div className="col-span-full">
                                <EmptyState message="沒有可用的英雄">
                                    <a href="#/mint">
                                        <ActionButton className="mt-2">前往鑄造</ActionButton>
                                    </a>
                                </EmptyState>
                            </div>
                        )}
                    </div>
                </div>
            </div>


        </div>
    );
};

// =================================================================
// Section: 主頁面元件
// =================================================================

const MyAssetsPageContent: React.FC = () => {
    const { setLoading } = useGlobalLoading();
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    const queryClient = useQueryClient();

    const [filter, setFilter] = useState<NftType>('party');
    const [isAuthorizing, setIsAuthorizing] = useState(false);

    // Move all hooks to be called before any early returns
    const heroContract = useMemo(() => chainId ? getContract(bsc.id, 'hero') : null, [chainId]);
    const relicContract = useMemo(() => chainId ? getContract(bsc.id, 'relic') : null, [chainId]);
    const partyContract = useMemo(() => chainId ? getContract(bsc.id, 'party') : null, [chainId]);

    const { writeContractAsync, isPending: isTxPending } = useWriteContract();

    const { data: nfts, isLoading, refetch, error } = useQuery({
        queryKey: ['ownedNfts', address, chainId],
        queryFn: async () => {
            logger.debug('開始載入 NFT 資產', { address, chainId });
            setLoading(true, '載入您的 NFT 資產...');
            try {
                const result = await fetchAllOwnedNfts(address!, chainId!);
                logger.debug('NFT 資產載入成功', { 
                    heroes: result.heros.length, 
                    relics: result.relics.length, 
                    parties: result.parties.length 
                });
                return result;
            } catch (err) {
                logger.error('載入 NFT 資產失敗', err);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        enabled: !!address && !!chainId,
        
        // 🔥 NFT缓存策略 - 内联配置以避免部署问题
        staleTime: 1000 * 60 * 30, // 30分钟内新鲜
        gcTime: 1000 * 60 * 60 * 2, // 2小时垃圾回收
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: 'always',
        retry: 3, // 增加重試次數
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // 指數退避
    });
    
    const { data: platformFee, isLoading: isLoadingFee } = useReadContract({
        address: partyContract?.address as `0x${string}`,
        abi: partyContract?.abi,
        functionName: 'platformFee',
        query: { enabled: !!partyContract }
    });

    // 檢查授權狀態
    const { data: isHeroAuthorized } = useReadContract({
        address: heroContract?.address as `0x${string}`,
        abi: heroContract?.abi,
        functionName: 'isApprovedForAll',
        args: [address!, partyContract!.address],
        query: { enabled: !!address && !!heroContract && !!partyContract }
    });

    const { data: isRelicAuthorized } = useReadContract({
        address: relicContract?.address as `0x${string}`,
        abi: relicContract?.abi,
        functionName: 'isApprovedForAll',
        args: [address!, partyContract!.address],
        query: { enabled: !!address && !!relicContract && !!partyContract }
    });

    const { availableHeroes, availableRelics } = useMemo(() => {
        if (!nfts) return { availableHeroes: [] as HeroNft[], availableRelics: [] as RelicNft[] };
        
        const heroIdsInParties = new Set(nfts.parties.flatMap((p: { heroIds: bigint[] }) => p.heroIds.map((id: bigint) => id.toString())));
        const relicIdsInParties = new Set(nfts.parties.flatMap((p: { relicIds: bigint[] }) => p.relicIds.map((id: bigint) => id.toString())));

        const sortHeroNfts = (nfts: HeroNft[]) => [...nfts].sort((a, b) => b.power - a.power);
        const sortRelicNfts = (nfts: RelicNft[]) => [...nfts].sort((a, b) => b.capacity - a.capacity);

        return {
            availableHeroes: sortHeroNfts(nfts.heros.filter((h: HeroNft) => !heroIdsInParties.has(h.id.toString()))),
            availableRelics: sortRelicNfts(nfts.relics.filter((r: RelicNft) => !relicIdsInParties.has(r.id.toString()))),
        };
    }, [nfts]);

    const filteredNfts = useMemo(() => {
        if (!nfts) return [];
        
        switch (filter) {
            case 'hero': 
                // 英雄按稀有度排序（高到低），相同稀有度按戰力排序
                return [...nfts.heros].sort((a, b) => {
                    if (b.rarity !== a.rarity) return b.rarity - a.rarity;
                    return b.power - a.power;
                });
            case 'relic': 
                // 聖物按稀有度排序（高到低），相同稀有度按容量排序
                return [...nfts.relics].sort((a, b) => {
                    if (b.rarity !== a.rarity) return b.rarity - a.rarity;
                    return b.capacity - a.capacity;
                });
            case 'party': 
                // 隊伍按稀有度排序（高到低），相同稀有度按總戰力排序
                return [...nfts.parties].sort((a, b) => {
                    if (b.partyRarity !== a.partyRarity) return b.partyRarity - a.partyRarity;
                    return Number(b.totalPower - a.totalPower);
                });
            case 'vip': 
                return nfts.vipCards;
            default: 
                return [];
        }
    }, [filter, nfts]);

    // Early return after all hooks
    if (!chainId || chainId !== bsc.id) {
        return <div className="flex justify-center items-center h-64"><EmptyState message="請連接到支援的網路 (BSC) 以檢視您的資產。" /></div>;
    }

    const handleAuthorizeHero = async () => {
        if (!heroContract || !partyContract) return;
        logger.debug('開始授權英雄合約', { heroContract: heroContract.address, partyContract: partyContract.address });
        setIsAuthorizing(true);
        try {
            const hash = await writeContractAsync({ 
                address: heroContract?.address as `0x${string}`,
                abi: heroContract?.abi,
                functionName: 'setApprovalForAll',
                args: [partyContract.address, true as any] 
            });
            logger.info('英雄授權交易已發送', { hash });
            addTransaction({ hash, description: '授權隊伍合約使用英雄' });
            showToast('英雄授權成功！請等待約 30 秒後可創建隊伍', 'success');
            
            // 延遲刷新授權狀態
            setTimeout(() => {
                logger.debug('刷新英雄授權狀態');
                queryClient.invalidateQueries({ queryKey: ['isApprovedForAll'] });
            }, 30000);
            
        } catch (error: unknown) {
            const e = error as { message?: string; shortMessage?: string };
            if (!e.message?.includes('User rejected the request')) {
                showToast(e.shortMessage || "英雄授權失敗", "error");
            }
        } finally {
            setIsAuthorizing(false);
        }
    };

    const handleAuthorizeRelic = async () => {
        if (!relicContract || !partyContract) return;
        setIsAuthorizing(true);
        try {
            const hash = await writeContractAsync({ 
                address: relicContract?.address as `0x${string}`,
                abi: relicContract?.abi,
                functionName: 'setApprovalForAll',
                args: [partyContract.address, true as any] 
            });
            addTransaction({ hash, description: '授權隊伍合約使用聖物' });
            showToast('聖物授權成功！請等待約 30 秒後可創建隊伍', 'success');
            
            // 延遲刷新授權狀態
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['isApprovedForAll'] });
            }, 30000);
            
        } catch (error: unknown) {
            const e = error as { message?: string; shortMessage?: string };
            if (!e.message?.includes('User rejected the request')) {
                showToast(e.shortMessage || "聖物授權失敗", "error");
            }
        } finally {
            setIsAuthorizing(false);
        }
    };

    const handleCreateParty = async (heroIds: bigint[], relicIds: bigint[]) => {
        if (!partyContract || !address) return;
        
        try {
            const fee = typeof platformFee === 'bigint' ? platformFee : 0n;
            const hash = await writeContractAsync({ 
                address: partyContract?.address as `0x${string}`,
                abi: partyContract?.abi,
                functionName: 'createParty',
                args: [heroIds as any, relicIds as any], 
                value: fee 
            });
            
            addTransaction({ hash, description: `創建新隊伍` });
            
            // 立即顯示詳細的成功消息
            showToast(
                '🎉 隊伍創建成功！\n⏱️ 數據同步需要約 2-3 分鐘\n🔄 頁面將自動更新', 
                'success',
                8000 // 8秒顯示時間
            );
            
            // 多階段刷新策略
            // 立即刷新一次
            queryClient.invalidateQueries({ queryKey: ['ownedNfts', address, chainId] });
            
            // 30秒後再次刷新（區塊確認）
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['ownedNfts', address, chainId] });
                refetch();
            }, 30000);
            
            // 2分鐘後最終刷新（子圖同步）
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['ownedNfts', address, chainId] });
                refetch();
                showToast('✅ 隊伍數據已同步完成！', 'info');
            }, 120000);

        } catch (error: unknown) {
            const e = error as { message?: string; shortMessage?: string };
            if (!e.message?.includes('User rejected the request')) {
                showToast(e.shortMessage || "創建隊伍失敗", "error");
            }
        }
    };
    
    const filterOptions: { key: NftType; label: string }[] = [
        { key: 'party', label: '我的隊伍' },
        { key: 'hero', label: '我的英雄' },
        { key: 'relic', label: '我的聖物' },
        { key: 'vip', label: '我的VIP卡' },
    ];

    if (error) {
        return (
            <EmptyState 
                message="載入 NFT 失敗" 
                description={(error as Error).message}
            >
                <ActionButton onClick={() => refetch()} className="mt-4">
                    重新載入
                </ActionButton>
            </EmptyState>
        );
    }

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
    }

    return (
        <section className="space-y-8">
            <h2 className="page-title">我的資產與隊伍</h2>
            
            {/* 等待提示信息 - 增強版 */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-400">ℹ️</span>
                    <span className="text-sm font-medium text-blue-300">NFT 同步提示</span>
                </div>
                <ul className="text-xs text-gray-400 space-y-1">
                    <li>• 新鑄造的 NFT 需要 <strong className="text-blue-300">2-3 分鐘</strong> 才會在此頁面顯示</li>
                    <li>• 如果您剛完成鑄造，請稍作等待或刷新頁面</li>
                    <li>• 系統正在同步區塊鏈數據和更新索引</li>
                    {nfts && (nfts.heros.length + nfts.relics.length + nfts.parties.length) > 50 && (
                        <li className="text-yellow-300">• ⚠️ 您擁有大量 NFT，載入可能需要較長時間</li>
                    )}
                </ul>
            </div>
            
            <TeamBuilder 
                heroes={availableHeroes} 
                relics={availableRelics}
                onCreateParty={handleCreateParty}
                isCreating={isTxPending}
                platformFee={typeof platformFee === 'bigint' ? platformFee : undefined}
                isLoadingFee={isLoadingFee}
                isHeroAuthorized={Boolean(isHeroAuthorized)}
                isRelicAuthorized={Boolean(isRelicAuthorized)}
                onAuthorizeHero={handleAuthorizeHero}
                onAuthorizeRelic={handleAuthorizeRelic}
                isAuthorizing={isAuthorizing}
            />

            <div className="card-bg p-4 md:p-6 rounded-2xl shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                    <h3 className="section-title">我的收藏</h3>
                    <div className="flex items-center gap-1 sm:gap-2 bg-gray-900/50 p-1 rounded-lg mt-2 sm:mt-0">
                        {filterOptions.map(({ key, label }) => (
                            <button 
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition ${filter === key ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                {filteredNfts.length > 0 ? (
                    <OptimizedNftGrid nfts={filteredNfts} pageSize={30} />
                ) : (
                    <div className="text-center py-8">
                        <EmptyState message="這裡空空如也..." />
                        <button 
                            onClick={() => refetch()}
                            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                        >
                            重新載入數據
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};

const MyAssetsPage: React.FC = () => {
    return (
        <ErrorBoundary>
            <MyAssetsPageContent />
        </ErrorBoundary>
    );
};

export default MyAssetsPage;
