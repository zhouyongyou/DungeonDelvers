// src/pages/MyAssetsPage.tsx (組隊UI優化版)

import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllOwnedNfts } from '../api/nfts';
import { NftCard } from '../components/ui/NftCard';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { getContractWithABI as getContract } from '../config/contractsWithABI';
import { useAppToast } from '../contexts/SimpleToastContext';
import { useTransactionWithProgress } from '../hooks/useTransactionWithProgress';
import { TransactionProgressModal } from '../components/ui/TransactionProgressModal';
import { useOptimisticUpdate } from '../hooks/useOptimisticUpdate';
import type { HeroNft, RelicNft, NftType, PartyNft } from '../types/nft';
import { formatEther } from 'viem';
import { bsc } from 'wagmi/chains';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
// import { useGlobalLoading } from '../components/core/GlobalLoadingProvider'; // 移除未使用的 Provider
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
    // 預設顯示全部，避免用戶困惑
    const [showAllRelics, setShowAllRelics] = useState(true);
    const [showAllHeroes, setShowAllHeroes] = useState(true);
    const [currentStep, setCurrentStep] = useState<'select-relic' | 'select-hero' | 'ready'>('select-relic');
    const [hasJustAuthorized, setHasJustAuthorized] = useState(false);
    const { showToast } = useAppToast();
    
    // 追蹤授權狀態變化
    useEffect(() => {
        if (isHeroAuthorized && isRelicAuthorized && hasJustAuthorized) {
            // 授權完成，顯示成功提示
            showToast('授權已完成！如果按鈕仍無法點擊，請刷新頁面', 'success');
            setHasJustAuthorized(false);
        }
    }, [isHeroAuthorized, isRelicAuthorized, hasJustAuthorized]);

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
        setCurrentStep('ready');
        showToast(`已自動選擇 ${selected.length} 個最強英雄`, 'success');
    };

    // 一鍵選擇最大容量聖物
    const handleAutoSelectRelics = () => {
        logger.info('[handleAutoSelectRelics] 開始自動選擇聖物');
        logger.info(`[handleAutoSelectRelics] 可用聖物數量: ${relics.length}`);
        
        if (relics.length === 0) {
            showToast('沒有可選擇的聖物', 'error');
            return;
        }
        
        const sortedRelics = [...relics].sort((a, b) => b.capacity - a.capacity);
        const selected = sortedRelics.slice(0, 5).map(r => r.id);
        
        logger.info(`[handleAutoSelectRelics] 選擇了 ${selected.length} 個聖物:`, selected);
        
        setSelectedRelics(selected);
        showToast(`已自動選擇 ${selected.length} 個最大容量聖物`, 'success');
        setCurrentStep('select-hero');
    };

    const canCreate = selectedHeroes.length > 0 && selectedRelics.length > 0 && selectedHeroes.length <= totalCapacity && isHeroAuthorized && isRelicAuthorized;

    // 組合授權處理
    const handleAuthorizeAll = async () => {
        setHasJustAuthorized(true);
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
            <div className="flex flex-col items-center mb-6">
                <ActionButton 
                    onClick={() => onCreateParty(selectedHeroes, selectedRelics)} 
                    isLoading={isCreating}
                    disabled={!canCreate || isCreating}
                    className="w-full sm:w-64 h-12 text-lg"
                >
                    {!isHeroAuthorized || !isRelicAuthorized ? '請先完成授權' : '創建隊伍'}
                </ActionButton>
                {/* 授權後提示刷新 */}
                {(isHeroAuthorized && isRelicAuthorized && !canCreate && selectedHeroes.length > 0 && selectedRelics.length > 0) && (
                    <p className="text-xs text-yellow-400 mt-2 animate-pulse">
                        如果按鈕仍為灰色，請手動刷新頁面更新狀態
                    </p>
                )}
                
                {/* 創建成功後的提醒 */}
                {canCreate && selectedHeroes.length > 0 && selectedRelics.length > 0 && (
                    <div className="mt-2 text-center">
                        <p className="text-xs text-green-400">
                            ✅ 準備就緒！創建後需等待 3-5 分鐘同步
                        </p>
                    </div>
                )}
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


            {/* 收益最大化策略提醒 */}
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-white text-xs">💰</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <p className="text-xs text-purple-200 font-medium">
                            收益最大化組隊策略
                        </p>
                        <ul className="text-xs text-purple-100 space-y-1 list-disc list-inside">
                            <li>建議每個帳號培養 <span className="font-semibold text-purple-50">一個精華隊伍</span>，戰力達到 <span className="font-semibold text-purple-50">3000+</span></li>
                            <li>優先組建能挑戰「混沌深淵」（3000 戰力需求）的隊伍，可獲得最高收益</li>
                            <li>選擇高容量聖物（4-5 星）搭配高戰力英雄，確保隊伍總戰力最大化</li>
                            <li>一般需要約 100 個聖物和 200 個英雄，才能篩選出最強組合</li>
                            <li className="text-orange-300">⚠️ <span className="font-semibold">技術限制</span>：為確保頁面流暢度，建議單一地址擁有的英雄和聖物數量各不超過 1000 個</li>
                        </ul>
                    </div>
                </div>
            </div>

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
                    <div className="flex justify-between mb-2">
                        {/* 診斷信息 - 生產環境請移除 */}
                        {import.meta.env.DEV && relics.length > 0 && (
                            <div className="text-xs text-gray-400">
                                聖物總數: {relics.length} | 
                                容量分布: {[1,2,3,4,5].map(cap => {
                                    const count = relics.filter(r => r.capacity === cap).length;
                                    return count > 0 ? `${cap}星:${count}` : null;
                                }).filter(Boolean).join(', ')}
                            </div>
                        )}
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
    // const { setLoading } = useGlobalLoading(); // 移除未使用的 hook
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const queryClient = useQueryClient();

    const [filter, setFilter] = useState<NftType>('party');
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [currentTransactionType, setCurrentTransactionType] = useState<'hero' | 'relic' | 'party'>('hero');
    const [currentPartyData, setCurrentPartyData] = useState<{ heroIds: bigint[], relicIds: bigint[] } | null>(null);

    // Move all hooks to be called before any early returns
    const heroContract = useMemo(() => chainId ? getContract(bsc.id, 'hero') : null, [chainId]);
    const relicContract = useMemo(() => chainId ? getContract(bsc.id, 'relic') : null, [chainId]);
    const partyContract = useMemo(() => chainId ? getContract(bsc.id, 'party') : null, [chainId]);

    const { data: nfts, isLoading, refetch, error } = useQuery({
        queryKey: ['ownedNfts', address, chainId],
        queryFn: async () => {
            logger.debug('開始載入 NFT 資產', { address, chainId });
            // setLoading(true, '載入您的 NFT 資產...'); // 移除未使用的 loading
            try {
                const result = await fetchAllOwnedNfts(address!, chainId!);
                logger.debug('NFT 資產載入成功', { 
                    heros: result.heros.length, 
                    relics: result.relics.length, 
                    parties: result.parties.length 
                });
                return result;
            } catch (err) {
                logger.error('載入 NFT 資產失敗', err);
                throw err;
            } finally {
                // setLoading(false); // 移除未使用的 loading
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
        query: { 
            enabled: !!partyContract,
            staleTime: 1000 * 60 * 30, // 30分鐘 - 平台費用變更頻率低
            gcTime: 1000 * 60 * 60,    // 60分鐘
            refetchOnWindowFocus: false,
            retry: 2,
        }
    });

    // 交易進度 Hooks - 英雄授權
    const { execute: executeHeroAuth, progress: heroAuthProgress, reset: resetHeroAuth } = useTransactionWithProgress({
        onSuccess: async () => {
            showToast('英雄授權成功！', 'success');
            setShowProgressModal(false);
            confirmHeroAuthUpdate();
            
            // 多次重試刷新授權狀態
            const refreshAuth = async () => {
                for (let i = 0; i < 5; i++) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    const result = await refetchHeroAuth();
                    if (result.data === true) {
                        showToast('英雄授權狀態已更新', 'info');
                        break;
                    }
                }
            };
            refreshAuth();
        },
        onError: () => {
            rollbackHeroAuthUpdate();
        },
        successMessage: '英雄授權成功！',
        errorMessage: '英雄授權失敗',
    });

    // 交易進度 Hooks - 聖物授權
    const { execute: executeRelicAuth, progress: relicAuthProgress, reset: resetRelicAuth } = useTransactionWithProgress({
        onSuccess: async () => {
            showToast('聖物授權成功！', 'success');
            setShowProgressModal(false);
            confirmRelicAuthUpdate();
            
            // 多次重試刷新授權狀態
            const refreshAuth = async () => {
                for (let i = 0; i < 5; i++) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    const result = await refetchRelicAuth();
                    if (result.data === true) {
                        showToast('聖物授權狀態已更新', 'info');
                        break;
                    }
                }
            };
            refreshAuth();
        },
        onError: () => {
            rollbackRelicAuthUpdate();
        },
        successMessage: '聖物授權成功！',
        errorMessage: '聖物授權失敗',
    });

    // 交易進度 Hooks - 創建隊伍
    const { execute: executeCreateParty, progress: createPartyProgress, reset: resetCreateParty } = useTransactionWithProgress({
        onSuccess: () => {
            showToast(
                '🎉 隊伍創建成功！正在同步數據...', 
                'success',
                5000
            );
            
            // 延遲 2 秒後顯示刷新提醒
            setTimeout(() => {
                showToast(
                    '💡 提示：建議手動刷新頁面以確保看到最新隊伍', 
                    'info',
                    7000
                );
            }, 2000);
            
            // 立即刷新資料
            queryClient.invalidateQueries({ queryKey: ['ownedNfts', address, chainId] });
            queryClient.invalidateQueries({ queryKey: ['playerParties', address, chainId] });
            
            // 持續刷新策略 - 每3秒檢查一次，最多檢查10次
            let checkCount = 0;
            const checkInterval = setInterval(() => {
                checkCount++;
                queryClient.invalidateQueries({ queryKey: ['ownedNfts', address, chainId] });
                queryClient.invalidateQueries({ queryKey: ['playerParties', address, chainId] });
                refetch();
                
                if (checkCount >= 10) {
                    clearInterval(checkInterval);
                    showToast('✅ 隊伍應該已經創建完成！如仍未看到，請手動刷新頁面', 'info');
                }
            }, 3000);
            
            // 30秒後確保停止
            setTimeout(() => {
                clearInterval(checkInterval);
            }, 30000);
            
            setShowProgressModal(false);
            confirmCreatePartyUpdate();
            setCurrentPartyData(null);
        },
        onError: () => {
            rollbackCreatePartyUpdate();
            setCurrentPartyData(null);
        },
        successMessage: '隊伍創建成功！',
        errorMessage: '創建隊伍失敗',
    });

    // 樂觀更新 - 英雄授權
    const { optimisticUpdate: optimisticHeroAuthUpdate, confirmUpdate: confirmHeroAuthUpdate, rollback: rollbackHeroAuthUpdate } = useOptimisticUpdate({
        queryKey: ['isApprovedForAll'],
        updateFn: () => true // 立即設為已授權
    });

    // 樂觀更新 - 聖物授權
    const { optimisticUpdate: optimisticRelicAuthUpdate, confirmUpdate: confirmRelicAuthUpdate, rollback: rollbackRelicAuthUpdate } = useOptimisticUpdate({
        queryKey: ['isApprovedForAll'],
        updateFn: () => true // 立即設為已授權
    });

    // 樂觀更新 - 創建隊伍
    const { optimisticUpdate: optimisticCreatePartyUpdate, confirmUpdate: confirmCreatePartyUpdate, rollback: rollbackCreatePartyUpdate } = useOptimisticUpdate({
        queryKey: ['ownedNfts', address, chainId],
        updateFn: (oldData: any) => {
            if (!oldData || !currentPartyData) return oldData;
            
            // 創建臨時隊伍數據
            const tempParty: PartyNft = {
                id: BigInt(Date.now()), // 臨時ID
                tokenId: BigInt(Date.now()),
                name: `新隊伍 (創建中...)`,
                image: '',
                description: '隊伍創建中，請稍候...',
                attributes: [],
                contractAddress: partyContract?.address ?? '0x',
                type: 'party',
                totalPower: BigInt(currentPartyData.heroIds.length) * 100n, // 估算值
                totalCapacity: BigInt(currentPartyData.heroIds.length),
                heroIds: currentPartyData.heroIds,
                relicIds: currentPartyData.relicIds,
                partyRarity: 1,
            };
            
            // 更新可用英雄和聖物列表（移除已選擇的）
            const updatedHeroes = oldData.heros.filter((h: HeroNft) => 
                !currentPartyData.heroIds.includes(h.id)
            );
            const updatedRelics = oldData.relics.filter((r: RelicNft) => 
                !currentPartyData.relicIds.includes(r.id)
            );
            
            return {
                ...oldData,
                heros: updatedHeroes,
                relics: updatedRelics,
                parties: [...oldData.parties, tempParty]
            };
        }
    });

    // 獲取當前進度
    const currentProgress = currentTransactionType === 'hero' ? heroAuthProgress : 
                           currentTransactionType === 'relic' ? relicAuthProgress : 
                           createPartyProgress;

    // 檢查授權狀態
    const { data: isHeroAuthorized, refetch: refetchHeroAuth } = useReadContract({
        address: heroContract?.address as `0x${string}`,
        abi: heroContract?.abi,
        functionName: 'isApprovedForAll',
        args: [address!, partyContract!.address],
        query: { 
            enabled: !!address && !!heroContract && !!partyContract,
            staleTime: 1000 * 60 * 5, // 5分鐘 - 授權狀態需要較新
            gcTime: 1000 * 60 * 15,   // 15分鐘
            refetchOnWindowFocus: false,
            retry: 2,
        }
    });

    const { data: isRelicAuthorized, refetch: refetchRelicAuth } = useReadContract({
        address: relicContract?.address as `0x${string}`,
        abi: relicContract?.abi,
        functionName: 'isApprovedForAll',
        args: [address!, partyContract!.address],
        query: { 
            enabled: !!address && !!relicContract && !!partyContract,
            staleTime: 1000 * 60 * 5, // 5分鐘 - 授權狀態需要較新
            gcTime: 1000 * 60 * 15,   // 15分鐘
            refetchOnWindowFocus: false,
            retry: 2,
        }
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
        setCurrentTransactionType('hero');
        setShowProgressModal(true);
        resetHeroAuth();
        
        // 立即執行樂觀更新
        optimisticHeroAuthUpdate();
        
        try {
            await executeHeroAuth(
                {
                    address: heroContract.address as `0x${string}`,
                    abi: heroContract.abi,
                    functionName: 'setApprovalForAll',
                    args: [partyContract.address, true]
                },
                '授權隊伍合約使用英雄'
            );
        } catch (error) {
            // 錯誤已在 hook 中處理
        }
    };

    const handleAuthorizeRelic = async () => {
        if (!relicContract || !partyContract) return;
        
        setCurrentTransactionType('relic');
        setShowProgressModal(true);
        resetRelicAuth();
        
        // 立即執行樂觀更新
        optimisticRelicAuthUpdate();
        
        try {
            await executeRelicAuth(
                {
                    address: relicContract.address as `0x${string}`,
                    abi: relicContract.abi,
                    functionName: 'setApprovalForAll',
                    args: [partyContract.address, true]
                },
                '授權隊伍合約使用聖物'
            );
        } catch (error) {
            // 錯誤已在 hook 中處理
        }
    };

    const handleCreateParty = async (heroIds: bigint[], relicIds: bigint[]) => {
        if (!partyContract || !address) return;
        
        setCurrentTransactionType('party');
        setCurrentPartyData({ heroIds, relicIds });
        setShowProgressModal(true);
        resetCreateParty();
        
        // 立即執行樂觀更新
        optimisticCreatePartyUpdate();
        
        try {
            const fee = typeof platformFee === 'bigint' ? platformFee : 0n;
            await executeCreateParty(
                {
                    address: partyContract.address as `0x${string}`,
                    abi: partyContract.abi,
                    functionName: 'createParty',
                    args: [heroIds, relicIds],
                    value: fee
                },
                `創建新隊伍`
            );
        } catch (error) {
            // 錯誤已在 hook 中處理
        }
    };
    
    // 只顯示隊伍，避免載入太多 NFT 導致卡死
    const filterOptions: { key: NftType; label: string }[] = [
        { key: 'party', label: '我的隊伍' },
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
            
            <TransactionProgressModal
                isOpen={showProgressModal}
                onClose={() => setShowProgressModal(false)}
                progress={currentProgress}
                title={
                    currentTransactionType === 'hero' ? '英雄授權進度' :
                    currentTransactionType === 'relic' ? '聖物授權進度' :
                    '創建隊伍進度'
                }
            />
            
            <TeamBuilder 
                heroes={availableHeroes} 
                relics={availableRelics}
                onCreateParty={handleCreateParty}
                isCreating={createPartyProgress.status !== 'idle' && createPartyProgress.status !== 'error'}
                platformFee={typeof platformFee === 'bigint' ? platformFee : undefined}
                isLoadingFee={isLoadingFee}
                isHeroAuthorized={Boolean(isHeroAuthorized)}
                isRelicAuthorized={Boolean(isRelicAuthorized)}
                onAuthorizeHero={handleAuthorizeHero}
                onAuthorizeRelic={handleAuthorizeRelic}
                isAuthorizing={heroAuthProgress.status !== 'idle' || relicAuthProgress.status !== 'idle'}
            />

            <div className="card-bg p-4 md:p-6 rounded-2xl shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                    <h3 className="section-title">我的隊伍</h3>
                    <div className="text-sm text-gray-400">
                        共 {filteredNfts.length} 支隊伍
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
