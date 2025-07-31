// src/pages/MyAssetsPageEnhanced.tsx

import React, { useState, useMemo, useCallback, memo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useContractBatchRead } from '../hooks/useContractBatchRead';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNfts } from '../stores/useNftStore';
import { NftCard } from '../components/ui/NftCard';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { getContractWithABI } from '../config/contractsWithABI';
import { useAppToast } from '../contexts/SimpleToastContext';
import { useTransactionWithProgress } from '../hooks/useTransactionWithProgress';
import { TransactionProgressModal } from '../components/ui/TransactionProgressModal';
import { useOptimisticUpdate } from '../hooks/useOptimisticUpdate';
import type { HeroNft, RelicNft, NftType, PartyNft } from '../types/nft';
import { formatEther } from 'viem';
import { bsc } from 'wagmi/chains';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { logger } from '../utils/logger';
import { OptimizedNftGrid } from '../components/ui/OptimizedNftGrid';
import { Icons } from '../components/ui/icons';
import { THE_GRAPH_API_URL } from '../config/graphConfig';
import { graphQLRateLimiter } from '../utils/rateLimiter';
import { QuickActions, usePageQuickActions, PageActionBar } from '../components/ui/QuickActions';
import { NftDisplayToggleMini } from '../components/ui/NftDisplayToggle';

// Import TeamBuilder from components
import { TeamBuilder } from '../components/TeamBuilder';

// =================================================================
// Section: 移除了市場瀏覽相關的 GraphQL 查詢和 Hooks
// 用戶現在可以直接從主導航訪問獨立的市場頁面
// =================================================================

// =================================================================
// Section: Main Component
// =================================================================

// 排序選項類型
type SortOption = {
    value: string;
    label: string;
    icon?: string;
};

const sortOptions: Record<string, SortOption[]> = {
    hero: [
        { value: 'power-desc', label: '戰力高到低', icon: '⚔️' },
        { value: 'power-asc', label: '戰力低到高', icon: '🗡️' },
        { value: 'id-desc', label: 'ID 新到舊', icon: '🔢' },
        { value: 'id-asc', label: 'ID 舊到新', icon: '🔤' },
    ],
    relic: [
        { value: 'capacity-desc', label: '容量高到低', icon: '📦' },
        { value: 'capacity-asc', label: '容量低到高', icon: '📦' },
        { value: 'id-desc', label: 'ID 新到舊', icon: '🔢' },
        { value: 'id-asc', label: 'ID 舊到新', icon: '🔤' },
    ],
    party: [
        { value: 'power-desc', label: '總戰力高到低', icon: '⚔️' },
        { value: 'power-asc', label: '總戰力低到高', icon: '🗡️' },
        { value: 'id-desc', label: 'ID 新到舊', icon: '🔢' },
        { value: 'id-asc', label: 'ID 舊到新', icon: '🔤' },
    ],
};

const MyAssetsPageEnhanced: React.FC = () => {
    const { address, chainId } = useAccount();
    const [activeTab, setActiveTab] = useState<'myHeroes' | 'myRelics' | 'myParties' | 'teamBuilder'>('myHeroes');
    const { showToast } = useAppToast();
    const queryClient = useQueryClient();
    
    // 排序狀態
    const [heroSort, setHeroSort] = useState('power-desc');
    const [relicSort, setRelicSort] = useState('capacity-desc');
    const [partySort, setPartySort] = useState('power-desc');
    
    // Team Builder 顯示狀態
    const [showTeamBuilder, setShowTeamBuilder] = useState(false);
    
    // 獲取頁面級快速操作
    const quickActions = usePageQuickActions();
    
    // Fetch owned NFTs - use global store
    const { nfts: nftsData, isLoading: isLoadingNfts, refetch: refetchNfts } = useNfts(address, chainId || 56);
    
    // 市場功能已移至獨立頁面，可從主導航訪問
    
    // Party contract
    const partyContract = getContractWithABI('PARTY');
    const heroContract = getContractWithABI('HERO');
    const relicContract = getContractWithABI('RELIC');
    
    // Platform fee with error handling
    const { data: platformFeeData, isLoading: isLoadingFee, error: platformFeeError } = useReadContract({
        address: partyContract?.address,
        abi: partyContract?.abi,
        functionName: 'platformFee',
        chainId: bsc.id,
        query: { 
            enabled: !!partyContract?.address && !!partyContract?.abi,
            retry: 3,
            retryDelay: 1000
        }
    });
    
    // Log platform fee issues for debugging
    React.useEffect(() => {
        if (platformFeeError) {
            logger.error('Platform fee fetch error:', platformFeeError);
            logger.info('Party contract info:', {
                address: partyContract?.address,
                hasAbi: !!partyContract?.abi
            });
        }
    }, [platformFeeError, partyContract]);
    
    // Authorization checks
    const { data: isHeroAuthorized } = useReadContract({
        address: heroContract?.address,
        abi: heroContract?.abi,
        functionName: 'isApprovedForAll',
        args: address && partyContract ? [address, partyContract.address] : undefined,
        query: { enabled: !!address && !!heroContract && !!partyContract }
    });
    
    const { data: isRelicAuthorized } = useReadContract({
        address: relicContract?.address,
        abi: relicContract?.abi,
        functionName: 'isApprovedForAll',
        args: address && partyContract ? [address, partyContract.address] : undefined,
        query: { enabled: !!address && !!relicContract && !!partyContract }
    });
    
    // Authorization transactions
    const authorizeHeroTx = useTransactionWithProgress({
        onSuccess: async () => {
            showToast('成功授權英雄合約！正在更新資料...', 'success');
            setIsRefreshingNfts(true);
            
            try {
                queryClient.invalidateQueries({ queryKey: ['readContract'] });
                await refetchNfts();
                showToast('英雄授權狀態已更新！', 'success');
            } catch (error) {
                showToast('更新資料時發生錯誤', 'error');
            } finally {
                setIsRefreshingNfts(false);
            }
        },
        onError: (error) => {
            showToast(`授權失敗: ${error.message}`, 'error');
        }
    });
    
    const authorizeRelicTx = useTransactionWithProgress({
        onSuccess: async () => {
            showToast('成功授權聖物合約！正在更新資料...', 'success');
            setIsRefreshingNfts(true);
            
            try {
                queryClient.invalidateQueries({ queryKey: ['readContract'] });
                await refetchNfts();
                showToast('聖物授權狀態已更新！', 'success');
            } catch (error) {
                showToast('更新資料時發生錯誤', 'error');
            } finally {
                setIsRefreshingNfts(false);
            }
        },
        onError: (error) => {
            showToast(`授權失敗: ${error.message}`, 'error');
        }
    });
    
    // 新增載入狀態
    const [isRefreshingParties, setIsRefreshingParties] = useState(false);
    const [isRefreshingNfts, setIsRefreshingNfts] = useState(false);

    // Create party transaction
    const createPartyTx = useTransactionWithProgress({
        onSuccess: async () => {
            showToast('成功創建隊伍！', 'success');
            setIsRefreshingParties(true);
            
            try {
                // 立即切換到隊伍分頁並開始更新
                setActiveTab('myParties');
                
                // 等待一小段時間讓UI更新
                await new Promise(resolve => setTimeout(resolve, 500));
                
                await refetchNfts();
                showToast('新隊伍已出現在列表中！', 'success');
            } catch (error) {
                showToast('更新隊伍列表時發生錯誤', 'error');
            } finally {
                setIsRefreshingParties(false);
            }
        },
        onError: (error) => {
            showToast(`創建隊伍失敗: ${error.message}`, 'error');
        }
    });
    
    // 排序函數
    const sortNfts = <T extends any>(nfts: T[], sortOption: string, type: 'hero' | 'relic' | 'party'): T[] => {
        const sorted = [...nfts];
        
        switch (sortOption) {
            case 'power-desc':
                return sorted.sort((a, b) => {
                    const aPower = type === 'party' ? Number(a.totalPower) : a.power;
                    const bPower = type === 'party' ? Number(b.totalPower) : b.power;
                    return bPower - aPower;
                });
            case 'power-asc':
                return sorted.sort((a, b) => {
                    const aPower = type === 'party' ? Number(a.totalPower) : a.power;
                    const bPower = type === 'party' ? Number(b.totalPower) : b.power;
                    return aPower - bPower;
                });
            case 'capacity-desc':
                return sorted.sort((a, b) => b.capacity - a.capacity);
            case 'capacity-asc':
                return sorted.sort((a, b) => a.capacity - b.capacity);
            case 'id-desc':
                return sorted.sort((a, b) => Number(b.id) - Number(a.id));
            case 'id-asc':
                return sorted.sort((a, b) => Number(a.id) - Number(b.id));
            default:
                return sorted;
        }
    };
    
    const handleCreateParty = (heroIds: bigint[], relicIds: bigint[]) => {
        if (!partyContract) {
            showToast('無法取得合約配置', 'error');
            return;
        }
        
        // 即使無法獲取費用也允許創建（使用 0 作為預設）
        const fee = platformFeeData ? (platformFeeData as bigint) : BigInt(0);
        
        if (platformFeeError) {
            showToast('無法獲取平台費用，使用預設值嘗試創建', 'warning');
        }
        
        logger.info('創建隊伍參數:', {
            heroIds: heroIds.map(id => id.toString()),
            relicIds: relicIds.map(id => id.toString()),
            fee: fee.toString(),
            contract: partyContract.address
        });
        
        createPartyTx.execute({
            address: partyContract.address,
            abi: partyContract.abi,
            functionName: 'createParty',
            args: [heroIds, relicIds],
            value: fee
        }, '創建隊伍');
    };
    
    // 授權函數
    const handleAuthorizeHero = async () => {
        if (!heroContract || !partyContract) {
            showToast('無法取得合約配置', 'error');
            return;
        }
        
        await authorizeHeroTx.execute({
            address: heroContract.address,
            abi: heroContract.abi,
            functionName: 'setApprovalForAll',
            args: [partyContract.address, true]
        }, '授權英雄合約');
    };
    
    const handleAuthorizeRelic = async () => {
        if (!relicContract || !partyContract) {
            showToast('無法取得合約配置', 'error');
            return;
        }
        
        await authorizeRelicTx.execute({
            address: relicContract.address,
            abi: relicContract.abi,
            functionName: 'setApprovalForAll',
            args: [partyContract.address, true]
        }, '授權聖物合約');
    };
    
    // 一鍵授權功能
    const handleBatchAuthorize = async () => {
        try {
            if (!isHeroAuthorized) {
                await handleAuthorizeHero();
            }
            if (!isRelicAuthorized) {
                await handleAuthorizeRelic();
            }
        } catch (error) {
            logger.error('批量授權失敗:', error);
        }
    };
    
    // 排序選擇器組件
    const SortSelector: React.FC<{
        options: SortOption[];
        value: string;
        onChange: (value: string) => void;
    }> = ({ options, value, onChange }) => (
        <div className="flex items-center gap-2 mb-4">
            <span className="text-gray-400 text-sm">排序方式：</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="bg-gray-700 text-gray-300 px-3 py-1 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
                {options.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.icon} {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
    
    // Tab content renderer
    const renderTabContent = () => {
        // My assets content
        if (isLoadingNfts) return <LoadingSpinner />;
        if (!nftsData) return <EmptyState message="無法載入資產" />;
        
        const { heros: heroes, relics, parties } = nftsData;
        
        switch (activeTab) {
            case 'myHeroes':
                return !heroes || heroes.length === 0 ? (
                    <div className="text-center py-12 space-y-6">
                        <div className="text-6xl mb-4">⚔️</div>
                        <h3 className="text-xl font-semibold text-gray-300">還沒有英雄加入您的冒險</h3>
                        <p className="text-gray-400 max-w-md mx-auto">
                            英雄是地下城探索的核心！鑄造第一個英雄開始您的傳奇之旅
                        </p>
                        <div className="flex gap-3 justify-center">
                            <ActionButton
                                onClick={() => window.location.href = '/#/mint'}
                                className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 px-6 py-3 font-semibold"
                            >
                                🏺 立即鑄造英雄
                            </ActionButton>
                            <ActionButton
                                onClick={() => window.location.hash = '/marketplace'}
                                variant="secondary"
                                className="px-6 py-3 border-2 border-gray-600 hover:border-gray-500"
                            >
                                🛒 前往市場
                            </ActionButton>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* 載入提示 */}
                        {isRefreshingNfts && (
                            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="animate-spin w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
                                    <div>
                                        <p className="text-yellow-300 font-medium">正在更新英雄列表...</p>
                                        <p className="text-yellow-400/70 text-sm">資料更新中，請稍候</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <SortSelector
                            options={sortOptions.hero}
                            value={heroSort}
                            onChange={setHeroSort}
                        />
                        <OptimizedNftGrid
                            nfts={sortNfts(heroes, heroSort, 'hero')}
                            pageSize={25}
                        />
                    </>
                );
                
            case 'myRelics':
                return !relics || relics.length === 0 ? (
                    <div className="text-center py-12 space-y-6">
                        <div className="text-6xl mb-4">🛡️</div>
                        <h3 className="text-xl font-semibold text-gray-300">聖物庫房空蕩蕩</h3>
                        <p className="text-gray-400 max-w-md mx-auto">
                            聖物提供隊伍容量和特殊能力，是組建強大隊伍的關鍵裝備
                        </p>
                        <div className="flex gap-3 justify-center">
                            <ActionButton
                                onClick={() => window.location.href = '/#/mint'}
                                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 px-6 py-3 font-semibold"
                            >
                                ⚡ 立即鑄造聖物
                            </ActionButton>
                            <ActionButton
                                onClick={() => window.location.hash = '/marketplace'}
                                variant="secondary"
                                className="px-6 py-3 border-2 border-gray-600 hover:border-gray-500"
                            >
                                🛒 前往市場
                            </ActionButton>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* 載入提示 */}
                        {isRefreshingNfts && (
                            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                    <div>
                                        <p className="text-blue-300 font-medium">正在更新聖物列表...</p>
                                        <p className="text-blue-400/70 text-sm">資料更新中，請稍候</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <SortSelector
                            options={sortOptions.relic}
                            value={relicSort}
                            onChange={setRelicSort}
                        />
                        <OptimizedNftGrid
                            nfts={sortNfts(relics, relicSort, 'relic')}
                            pageSize={10}
                        />
                    </>
                );
                
            case 'myParties':
                return !parties || parties.length === 0 ? (
                    <div className="text-center py-12 space-y-6">
                        <div className="text-6xl mb-4">👥</div>
                        <h3 className="text-xl font-semibold text-gray-300">還沒有任何隊伍</h3>
                        <p className="text-gray-400 max-w-md mx-auto">
                            您可以前往「創建隊伍」分頁組建您的第一支隊伍
                        </p>
                        <div className="flex gap-3 justify-center">
                            <ActionButton
                                onClick={() => setActiveTab('teamBuilder')}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-6 py-3 font-semibold shadow-lg shadow-emerald-500/20 border border-emerald-400/30 transition-all duration-200 hover:shadow-emerald-500/30 hover:scale-105"
                            >
                                ⚔️ 前往創建隊伍
                            </ActionButton>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* 載入提示 */}
                        {isRefreshingParties && (
                            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                    <div>
                                        <p className="text-blue-300 font-medium">正在更新隊伍列表...</p>
                                        <p className="text-blue-400/70 text-sm">新創建的隊伍將在幾秒鐘內顯示</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <SortSelector
                            options={sortOptions.party}
                            value={partySort}
                            onChange={setPartySort}
                        />
                        <OptimizedNftGrid
                            nfts={sortNfts(parties, partySort, 'party')}
                            pageSize={50}
                        />
                    </>
                );
                
            case 'teamBuilder':
                return nftsData ? (
                    <div className="space-y-6">
                        {/* 檢查是否擁有英雄和聖物 */}
                        {(!nftsData.heros || nftsData.heros.length === 0) && (!nftsData.relics || nftsData.relics.length === 0) ? (
                            <div className="text-center py-12 space-y-6">
                                <div className="text-6xl mb-4">🏺</div>
                                <h3 className="text-xl font-semibold text-gray-300">需要先擁有英雄和聖物</h3>
                                <p className="text-gray-400 max-w-md mx-auto">
                                    組建隊伍需要英雄和聖物，請先前往鑄造頁面獲得它們
                                </p>
                                <ActionButton
                                    onClick={() => window.location.href = '/#/mint'}
                                    className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 px-6 py-3 font-semibold"
                                >
                                    🏺 前往鑄造頁面
                                </ActionButton>
                            </div>
                        ) : (!nftsData.heros || nftsData.heros.length === 0) ? (
                            <div className="text-center py-12 space-y-6">
                                <div className="text-6xl mb-4">⚔️</div>
                                <h3 className="text-xl font-semibold text-gray-300">需要英雄來組建隊伍</h3>
                                <p className="text-gray-400 max-w-md mx-auto">
                                    您有聖物但缺少英雄，快去鑄造一些英雄吧！
                                </p>
                                <ActionButton
                                    onClick={() => window.location.href = '/#/mint'}
                                    className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 px-6 py-3 font-semibold"
                                >
                                    🏺 鑄造英雄
                                </ActionButton>
                            </div>
                        ) : (!nftsData.relics || nftsData.relics.length === 0) ? (
                            <div className="text-center py-12 space-y-6">
                                <div className="text-6xl mb-4">🛡️</div>
                                <h3 className="text-xl font-semibold text-gray-300">需要聖物來提供隊伍容量</h3>
                                <p className="text-gray-400 max-w-md mx-auto">
                                    您有英雄但缺少聖物，快去鑄造一些聖物吧！
                                </p>
                                <ActionButton
                                    onClick={() => window.location.href = '/#/mint'}
                                    className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 px-6 py-3 font-semibold"
                                >
                                    ⚡ 鑄造聖物
                                </ActionButton>
                            </div>
                        ) : (
                            <div className="bg-gray-800/50 backdrop-blur-md rounded-xl border-2 border-emerald-500/30 overflow-hidden">
                                {/* 標題列 */}
                                <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 border-b border-emerald-500/30 p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">⚔️</span>
                                            <h2 className="text-xl font-bold text-emerald-400">
                                                組建隊伍
                                            </h2>
                                        </div>
                                        <div className="hidden sm:block w-px h-6 bg-emerald-500/30"></div>
                                        <p className="hidden sm:block text-emerald-200/70 text-sm">
                                            選擇您的英雄和聖物，組建強大的冒險隊伍
                                        </p>
                                    </div>
                                    {/* 手機版描述 */}
                                    <p className="sm:hidden text-emerald-200/70 text-sm mt-2">
                                        選擇您的英雄和聖物，組建強大的冒險隊伍
                                    </p>
                                </div>
                                
                                {/* TeamBuilder 內容區 */}
                                <div className="p-6 bg-gray-900/30">
                                    <TeamBuilder
                                        heroes={nftsData.heros}
                                        relics={nftsData.relics}
                                        onCreateParty={handleCreateParty}
                                        isCreating={createPartyTx.isLoading}
                                        platformFee={platformFeeData ? (platformFeeData as bigint) : BigInt(0)}
                                        isLoadingFee={isLoadingFee}
                                        isHeroAuthorized={!!isHeroAuthorized}
                                        isRelicAuthorized={!!isRelicAuthorized}
                                        onAuthorizeHero={handleAuthorizeHero}
                                        onAuthorizeRelic={handleAuthorizeRelic}
                                        onBatchAuthorize={handleBatchAuthorize}
                                        isAuthorizing={authorizeHeroTx.isLoading || authorizeRelicTx.isLoading}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-400">無法載入資產數據</p>
                    </div>
                );
                
            default:
                return null;
        }
    };
    
    const tabs = [
        { key: 'myHeroes' as const, label: '我的英雄', icon: Icons.Users, count: nftsData?.heros?.length || 0 },
        { key: 'myRelics' as const, label: '我的聖物', icon: Icons.Shield, count: nftsData?.relics?.length || 0 },
        { key: 'myParties' as const, label: '我的隊伍', icon: Icons.Users, count: nftsData?.parties?.length || 0 },
        { key: 'teamBuilder' as const, label: '創建隊伍', icon: Icons.Plus, count: undefined },
    ];
    
    return (
        <ErrorBoundary>
            <div className="space-y-6">
                {/* Header with Quick Actions */}
                <PageActionBar
                    title="組隊"
                    subtitle="管理您的英雄、聖物和隊伍"
                    actions={quickActions}
                    showRefresh={true}
                    onRefresh={() => refetchNfts()}
                />
                
                {/* NFT 顯示模式切換 - 暫時隱藏 */}
                {/* <div className="flex justify-end">
                    <NftDisplayToggleMini className="mb-2" />
                </div> */}
                
                {/* Tabs */}
                <div className="flex justify-between items-end border-b border-gray-700">
                    <div className="flex flex-wrap gap-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
                                    activeTab === tab.key
                                        ? 'text-[#C0A573] border-b-2 border-[#C0A573]'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {tab.icon && <tab.icon className="h-4 w-4" />}
                                {tab.label}
                                {tab.count !== undefined && (
                                    <span className="ml-1 text-xs bg-gray-700 px-2 py-0.5 rounded-full">
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    
                    {/* 創建隊伍按鈕 - 只在我的隊伍 tab 顯示 */}
                    {activeTab === 'myParties' && (
                        <div className="pb-2">
                            <ActionButton
                                onClick={() => setShowTeamBuilder(!showTeamBuilder)}
                                className={`text-sm px-3 py-1.5 ${showTeamBuilder ? 'bg-emerald-600 hover:bg-emerald-500' : ''}`}
                                size="sm"
                            >
                                <Icons.Plus className="h-4 w-4 mr-1" />
                                創建隊伍
                            </ActionButton>
                        </div>
                    )}
                </div>
                
                {/* Team Builder Expanded Section */}
                {showTeamBuilder && nftsData && (
                    <div className="mt-8 bg-gray-800/50 backdrop-blur-md rounded-xl border-2 border-emerald-500/30 overflow-hidden transition-all duration-500 ease-out transform animate-in slide-in-from-top-4">
                        {/* 可收合標題列 */}
                        <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 border-b border-emerald-500/30 p-4 cursor-pointer hover:from-emerald-900/60 hover:to-teal-900/60 transition-all duration-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">⚔️</span>
                                        <h2 className="text-xl font-bold text-emerald-400">
                                            組建隊伍
                                        </h2>
                                    </div>
                                    <div className="hidden sm:block w-px h-6 bg-emerald-500/30"></div>
                                    <p className="hidden sm:block text-emerald-200/70 text-sm">
                                        選擇您的英雄和聖物，組建強大的冒險隊伍
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowTeamBuilder(false)}
                                    className="flex items-center gap-2 text-gray-400 hover:text-emerald-300 transition-colors p-2 rounded-lg hover:bg-gray-700/50 group"
                                >
                                    <span className="text-sm hidden sm:inline group-hover:text-emerald-300">收合</span>
                                    <Icons.ChevronUp className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
                                </button>
                            </div>
                            {/* 手機版描述 */}
                            <p className="sm:hidden text-emerald-200/70 text-sm mt-2">
                                選擇您的英雄和聖物，組建強大的冒險隊伍
                            </p>
                        </div>
                        
                        {/* TeamBuilder 內容區 */}
                        <div className="p-6 bg-gray-900/30">
                            <TeamBuilder
                                heroes={nftsData.heros}
                                relics={nftsData.relics}
                                onCreateParty={handleCreateParty}
                                isCreating={createPartyTx.isLoading}
                                platformFee={platformFeeData ? (platformFeeData as bigint) : BigInt(0)}
                                isLoadingFee={isLoadingFee}
                                isHeroAuthorized={!!isHeroAuthorized}
                                isRelicAuthorized={!!isRelicAuthorized}
                                onAuthorizeHero={handleAuthorizeHero}
                                onAuthorizeRelic={handleAuthorizeRelic}
                                onBatchAuthorize={handleBatchAuthorize}
                                isAuthorizing={authorizeHeroTx.isLoading || authorizeRelicTx.isLoading}
                            />
                        </div>
                    </div>
                )}
                
                {/* Content */}
                <div className="min-h-[400px] space-y-6">
                    {renderTabContent()}
                </div>
                
                {/* Transaction Modals */}
                <TransactionProgressModal
                    isOpen={createPartyTx.showProgress}
                    onClose={() => createPartyTx.setShowProgress(false)}
                    status={createPartyTx.status}
                    error={createPartyTx.error}
                    txHash={createPartyTx.txHash}
                    actionName={createPartyTx.actionName}
                />
                <TransactionProgressModal
                    isOpen={authorizeHeroTx.showProgress}
                    onClose={() => authorizeHeroTx.setShowProgress(false)}
                    status={authorizeHeroTx.status}
                    error={authorizeHeroTx.error}
                    txHash={authorizeHeroTx.txHash}
                    actionName={authorizeHeroTx.actionName}
                />
                <TransactionProgressModal
                    isOpen={authorizeRelicTx.showProgress}
                    onClose={() => authorizeRelicTx.setShowProgress(false)}
                    status={authorizeRelicTx.status}
                    error={authorizeRelicTx.error}
                    txHash={authorizeRelicTx.txHash}
                    actionName={authorizeRelicTx.actionName}
                />
            </div>
        </ErrorBoundary>
    );
};

export default MyAssetsPageEnhanced;