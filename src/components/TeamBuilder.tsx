// TeamBuilder component extracted from MyAssetsPage
import React, { useState, useEffect, useMemo, memo } from 'react';
import type { HeroNft, RelicNft } from '../types/nft';
import { useAppToast } from '../contexts/SimpleToastContext';
import { logger } from '../utils/logger';
import { formatEther } from 'viem';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { ActionButton } from './ui/ActionButton';
import { EmptyState } from './ui/EmptyState';
import { OptimizedNftGrid } from './ui/OptimizedNftGrid';

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

export const TeamBuilder = memo<TeamBuilderProps>(({ 
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
            showToast('沒有可用的聖物', 'error');
            return;
        }
        
        // 依照容量排序，選擇最大的5個
        const sortedRelics = [...relics].sort((a, b) => b.capacity - a.capacity);
        const selected = sortedRelics.slice(0, 5).map(r => r.id);
        
        logger.info(`[handleAutoSelectRelics] 已選擇聖物:`, selected);
        
        setSelectedRelics(selected);
        setCurrentStep('select-hero');
        showToast(`已自動選擇 ${selected.length} 個最大容量聖物`, 'success');
    };

    const handleCreateParty = async () => {
        if (selectedHeroes.length === 0 || selectedRelics.length === 0) {
            showToast('請選擇英雄和聖物', 'error');
            return;
        }

        if (!isHeroAuthorized || !isRelicAuthorized) {
            showToast('請先授權合約使用您的 NFT', 'error');
            return;
        }

        await onCreateParty(selectedHeroes, selectedRelics);
        // 創建成功後清空選擇
        setSelectedHeroes([]);
        setSelectedRelics([]);
        setCurrentStep('select-relic');
    };

    const handleAuthorize = async () => {
        if (!isHeroAuthorized) {
            await onAuthorizeHero();
        } else if (!isRelicAuthorized) {
            await onAuthorizeRelic();
        }
        setHasJustAuthorized(true);
    };

    const needsAuthorization = !isHeroAuthorized || !isRelicAuthorized;
    const canCreateParty = selectedHeroes.length > 0 && selectedRelics.length > 0 && isHeroAuthorized && isRelicAuthorized;

    // 根據篩選狀態過濾NFT
    const filteredRelics = showAllRelics ? relics : relics.filter(r => !r.party || r.party === '0x0000000000000000000000000000000000000000');
    const filteredHeroes = showAllHeroes ? heroes : heroes.filter(h => !h.party || h.party === '0x0000000000000000000000000000000000000000');

    return (
        <div className="space-y-6">
            {/* 步驟指示器 */}
            <div className="flex items-center justify-center space-x-4 mb-6">
                <div className={`flex items-center space-x-2 ${currentStep === 'select-relic' ? 'text-purple-400' : 'text-gray-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'select-relic' ? 'bg-purple-500' : 'bg-gray-700'}`}>
                        1
                    </div>
                    <span>選擇聖物</span>
                </div>
                <div className="w-8 h-px bg-gray-600" />
                <div className={`flex items-center space-x-2 ${currentStep === 'select-hero' ? 'text-purple-400' : 'text-gray-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'select-hero' ? 'bg-purple-500' : 'bg-gray-700'}`}>
                        2
                    </div>
                    <span>選擇英雄</span>
                </div>
                <div className="w-8 h-px bg-gray-600" />
                <div className={`flex items-center space-x-2 ${currentStep === 'ready' ? 'text-green-400' : 'text-gray-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'ready' ? 'bg-green-500' : 'bg-gray-700'}`}>
                        3
                    </div>
                    <span>創建隊伍</span>
                </div>
            </div>

            {/* 選擇統計 */}
            <div className="bg-gray-800/50 backdrop-blur-md rounded-lg p-4 border border-gray-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-gray-400 text-sm">已選英雄</p>
                        <p className="text-xl font-bold">{selectedHeroes.length}/{totalCapacity || '?'}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">已選聖物</p>
                        <p className="text-xl font-bold">{selectedRelics.length}/5</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">總戰力</p>
                        <p className="text-xl font-bold text-yellow-400">{totalPower}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">隊伍容量</p>
                        <p className="text-xl font-bold text-blue-400">{totalCapacity}</p>
                    </div>
                </div>
            </div>

            {/* 聖物選擇區 */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        聖物選擇 
                        <span className="text-sm text-gray-400">
                            ({selectedRelics.length}/5)
                        </span>
                    </h3>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={showAllRelics}
                                onChange={(e) => setShowAllRelics(e.target.checked)}
                                className="rounded"
                            />
                            顯示已在隊伍中的聖物
                        </label>
                        <ActionButton
                            onClick={handleAutoSelectRelics}
                            variant="secondary"
                            size="sm"
                        >
                            自動選擇最大容量
                        </ActionButton>
                    </div>
                </div>
                {filteredRelics.length === 0 ? (
                    <EmptyState message="沒有可用的聖物" />
                ) : (
                    <OptimizedNftGrid
                        nfts={filteredRelics}
                        nftType="relic"
                        onSelect={(id) => toggleSelection(id, 'relic')}
                        selectedIds={selectedRelics}
                        gridClassName="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                    />
                )}
            </div>

            {/* 英雄選擇區 */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        英雄選擇 
                        <span className="text-sm text-gray-400">
                            ({selectedHeroes.length}/{totalCapacity || '?'})
                        </span>
                    </h3>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={showAllHeroes}
                                onChange={(e) => setShowAllHeroes(e.target.checked)}
                                className="rounded"
                            />
                            顯示已在隊伍中的英雄
                        </label>
                        <ActionButton
                            onClick={handleAutoSelectHeroes}
                            variant="secondary"
                            size="sm"
                            disabled={totalCapacity === 0}
                        >
                            自動選擇最強英雄
                        </ActionButton>
                    </div>
                </div>
                {totalCapacity === 0 ? (
                    <EmptyState message="請先選擇聖物以決定隊伍容量" />
                ) : filteredHeroes.length === 0 ? (
                    <EmptyState message="沒有可用的英雄" />
                ) : (
                    <OptimizedNftGrid
                        nfts={filteredHeroes}
                        nftType="hero"
                        onSelect={(id) => toggleSelection(id, 'hero')}
                        selectedIds={selectedHeroes}
                        gridClassName="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                    />
                )}
            </div>

            {/* 操作按鈕區 */}
            <div className="bg-gray-800/50 backdrop-blur-md rounded-lg p-6 border border-gray-700">
                <div className="space-y-4">
                    {/* 費用顯示 */}
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">創建費用</span>
                        <span className="text-white font-medium">
                            {isLoadingFee ? (
                                <LoadingSpinner size="h-4 w-4" />
                            ) : platformFee !== undefined ? (
                                `${formatEther(platformFee)} BNB`
                            ) : (
                                '加載中...'
                            )}
                        </span>
                    </div>

                    {/* 授權狀態 */}
                    {needsAuthorization && (
                        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                            <p className="text-yellow-200 text-sm mb-2">
                                需要授權合約使用您的 NFT：
                            </p>
                            <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className={isHeroAuthorized ? 'text-green-400' : 'text-gray-400'}>
                                        {isHeroAuthorized ? '✓' : '○'} 英雄 NFT 授權
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={isRelicAuthorized ? 'text-green-400' : 'text-gray-400'}>
                                        {isRelicAuthorized ? '✓' : '○'} 聖物 NFT 授權
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 操作按鈕 */}
                    <div className="flex gap-3">
                        {needsAuthorization ? (
                            <ActionButton
                                onClick={handleAuthorize}
                                variant="primary"
                                className="flex-1"
                                disabled={isAuthorizing}
                                isLoading={isAuthorizing}
                            >
                                {isAuthorizing ? '授權中...' : 
                                 !isHeroAuthorized ? '授權英雄 NFT' : '授權聖物 NFT'}
                            </ActionButton>
                        ) : (
                            <ActionButton
                                onClick={handleCreateParty}
                                variant="primary"
                                className="flex-1"
                                disabled={!canCreateParty || isCreating}
                                isLoading={isCreating}
                            >
                                {isCreating ? '創建中...' : '創建隊伍'}
                            </ActionButton>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

TeamBuilder.displayName = 'TeamBuilder';