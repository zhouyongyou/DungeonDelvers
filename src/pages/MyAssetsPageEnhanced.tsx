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
// Section: GraphQL Queries
// =================================================================

const GET_MARKET_HEROES_QUERY = `
  query GetMarketHeroes($skip: Int, $first: Int) {
    heros(
      first: $first
      skip: $skip
      orderBy: tokenId
      orderDirection: desc
    ) {
      id
      tokenId
      owner
      power
    }
  }
`;

const GET_MARKET_RELICS_QUERY = `
  query GetMarketRelics($skip: Int, $first: Int) {
    relics(
      first: $first
      skip: $skip
      orderBy: tokenId
      orderDirection: desc
    ) {
      id
      tokenId
      owner
      capacity
    }
  }
`;

// =================================================================
// Section: Market Browser Hook
// =================================================================

const useMarketBrowser = (type: 'hero' | 'relic') => {
    const [page, setPage] = useState(0);
    const pageSize = 50;
    
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['marketBrowser', type, page],
        queryFn: async () => {
            if (!THE_GRAPH_API_URL) return { [type === 'hero' ? 'heros' : 'relics']: [] };
            
            const query = type === 'hero' ? GET_MARKET_HEROES_QUERY : GET_MARKET_RELICS_QUERY;
            
            try {
                const response = await graphQLRateLimiter.execute(async () => {
                    return fetch(THE_GRAPH_API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            query,
                            variables: { 
                                skip: page * pageSize,
                                first: pageSize 
                            },
                        }),
                    });
                });
                
                if (!response.ok) throw new Error('Network response was not ok');
                const { data, errors } = await response.json();
                
                if (errors) {
                    logger.error('GraphQL errors:', errors);
                    throw new Error(errors[0]?.message || 'GraphQL error');
                }
                
                return data;
            } catch (error) {
                logger.error(`Error fetching market ${type}s:`, error);
                throw error;
            }
        },
        enabled: !!THE_GRAPH_API_URL,
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
    });

    return { 
        data: data?.[type === 'hero' ? 'heros' : 'relics'] || [], 
        isLoading, 
        isError, 
        refetch,
        page,
        setPage,
        pageSize
    };
};

// =================================================================
// Section: Main Component
// =================================================================

const MyAssetsPageEnhanced: React.FC = () => {
    const { address, chainId } = useAccount();
    const [activeTab, setActiveTab] = useState<'myHeroes' | 'myRelics' | 'myParties' | 'marketHeroes' | 'marketRelics'>('myHeroes');
    const [showTeamBuilder, setShowTeamBuilder] = useState(false);
    const { showToast } = useAppToast();
    const queryClient = useQueryClient();
    
    // 獲取頁面級快速操作
    const quickActions = usePageQuickActions();
    
    // Fetch owned NFTs - use global store
    const { nfts: nftsData, isLoading: isLoadingNfts, refetch: refetchNfts } = useNfts(address, chainId || 56);
    
    // Market browser hooks
    const marketHeroes = useMarketBrowser('hero');
    const marketRelics = useMarketBrowser('relic');
    
    // Party contract
    const partyContract = getContractWithABI('PARTY');
    const heroContract = getContractWithABI('HERO');
    const relicContract = getContractWithABI('RELIC');
    
    // Platform fee
    const { data: platformFeeData, isLoading: isLoadingFee } = useReadContract({
        address: partyContract?.address,
        abi: partyContract?.abi,
        functionName: 'getPlatformFee',
        chainId: bsc.id,
        query: { enabled: !!partyContract }
    });
    
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
        contractCall: heroContract && partyContract ? {
            address: heroContract.address,
            abi: heroContract.abi,
            functionName: 'setApprovalForAll',
            args: [partyContract.address, true]
        } : undefined,
        actionName: '授權英雄合約',
        onSuccess: () => {
            showToast('成功授權英雄合約', 'success');
            queryClient.invalidateQueries({ queryKey: ['readContract'] });
        },
        onError: (error) => {
            showToast(`授權失敗: ${error}`, 'error');
        }
    });
    
    const authorizeRelicTx = useTransactionWithProgress({
        contractCall: relicContract && partyContract ? {
            address: relicContract.address,
            abi: relicContract.abi,
            functionName: 'setApprovalForAll',
            args: [partyContract.address, true]
        } : undefined,
        actionName: '授權聖物合約',
        onSuccess: () => {
            showToast('成功授權聖物合約', 'success');
            queryClient.invalidateQueries({ queryKey: ['readContract'] });
        },
        onError: (error) => {
            showToast(`授權失敗: ${error}`, 'error');
        }
    });
    
    // Create party transaction
    const createPartyTx = useTransactionWithProgress({
        contractCall: undefined,
        actionName: '創建隊伍',
        onSuccess: () => {
            showToast('成功創建隊伍！', 'success');
            refetchNfts();
            setShowTeamBuilder(false);
        },
        onError: (error) => {
            showToast(`創建隊伍失敗: ${error}`, 'error');
        }
    });
    
    const handleCreateParty = (heroIds: bigint[], relicIds: bigint[]) => {
        if (!platformFeeData) {
            showToast('無法獲取平台費用', 'error');
            return;
        }
        
        if (!partyContract) {
            showToast('無法取得合約配置', 'error');
            return;
        }
        
        createPartyTx.setContractCall({
            address: partyContract.address,
            abi: partyContract.abi,
            functionName: 'createParty',
            args: [heroIds, relicIds],
            value: platformFeeData ? (platformFeeData as bigint) : BigInt(0)
        });
        createPartyTx.execute();
    };
    
    // Tab content renderer
    const renderTabContent = () => {
        if (activeTab.startsWith('market')) {
            const isHero = activeTab === 'marketHeroes';
            const marketData = isHero ? marketHeroes : marketRelics;
            
            if (marketData.isLoading) return <LoadingSpinner />;
            if (marketData.isError) return <EmptyState message="無法載入市場數據" />;
            if (marketData.data.length === 0) return <EmptyState message="市場上暫無物品" />;
            
            return (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-gray-400">
                            顯示 {marketData.page * marketData.pageSize + 1} - {Math.min((marketData.page + 1) * marketData.pageSize, marketData.data.length)} 項
                        </p>
                        <div className="flex gap-2">
                            <ActionButton
                                onClick={() => marketData.setPage(Math.max(0, marketData.page - 1))}
                                disabled={marketData.page === 0}
                                className="px-3 py-1"
                            >
                                上一頁
                            </ActionButton>
                            <ActionButton
                                onClick={() => marketData.setPage(marketData.page + 1)}
                                disabled={marketData.data.length < marketData.pageSize}
                                className="px-3 py-1"
                            >
                                下一頁
                            </ActionButton>
                        </div>
                    </div>
                    <OptimizedNftGrid
                        nfts={marketData.data.map((item: any) => ({
                            ...item,
                            type: (isHero ? 'hero' : 'relic') as NftType,
                            tokenId: item.tokenId,
                            metadata: {
                                name: `${isHero ? 'Hero' : 'Relic'} #${item.tokenId}`,
                                description: '',
                                image: '',
                                attributes: []
                            }
                        }))}
                        onViewDetails={(nft) => {
                            // TODO: Implement view details modal
                            showToast(`查看 ${nft.type} #${nft.tokenId} 詳情`, 'info');
                        }}
                    />
                </div>
            );
        }
        
        // My assets tabs
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
                                onClick={() => setActiveTab('marketHeroes')}
                                variant="secondary"
                                className="px-6 py-3"
                            >
                                🛒 瀏覽英雄市場
                            </ActionButton>
                        </div>
                    </div>
                ) : (
                    <OptimizedNftGrid
                        nfts={heroes}
                        onViewDetails={(nft) => {
                            showToast(`查看英雄 #${nft.tokenId} 詳情`, 'info');
                        }}
                    />
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
                                onClick={() => setActiveTab('marketRelics')}
                                variant="secondary"
                                className="px-6 py-3"
                            >
                                🛒 瀏覽聖物市場
                            </ActionButton>
                        </div>
                    </div>
                ) : (
                    <OptimizedNftGrid
                        nfts={relics}
                        onViewDetails={(nft) => {
                            showToast(`查看聖物 #${nft.tokenId} 詳情`, 'info');
                        }}
                    />
                );
                
            case 'myParties':
                return !parties || parties.length === 0 ? (
                    <div className="text-center py-12 space-y-6">
                        <div className="text-6xl mb-4">👥</div>
                        <h3 className="text-xl font-semibold text-gray-300">準備組建您的第一支隊伍</h3>
                        <p className="text-gray-400 max-w-md mx-auto">
                            {(heroes?.length === 0 && relics?.length === 0) 
                                ? "需要先擁有英雄和聖物才能組建隊伍"
                                : heroes?.length === 0 
                                ? "需要英雄來組建隊伍，快去鑄造一些英雄吧！"
                                : relics?.length === 0
                                ? "需要聖物來提供隊伍容量，快去鑄造一些聖物吧！"
                                : "您已經擁有英雄和聖物，現在可以組建隊伍了！"
                            }
                        </p>
                        <div className="flex gap-3 justify-center">
                            {(heroes?.length === 0 || relics?.length === 0) ? (
                                <ActionButton
                                    onClick={() => window.location.href = '/#/mint'}
                                    className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 px-6 py-3 font-semibold"
                                >
                                    🏺 前往鑄造頁面
                                </ActionButton>
                            ) : (
                                <ActionButton
                                    onClick={() => setShowTeamBuilder(true)}
                                    className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 px-6 py-3 font-semibold"
                                >
                                    ⚔️ 立即組建隊伍
                                </ActionButton>
                            )}
                        </div>
                    </div>
                ) : (
                    <OptimizedNftGrid
                        nfts={parties}
                        onViewDetails={(nft) => {
                            showToast(`查看隊伍 #${nft.tokenId} 詳情`, 'info');
                        }}
                    />
                );
                
            default:
                return null;
        }
    };
    
    const tabs = [
        { key: 'myHeroes' as const, label: '我的英雄', icon: Icons.Users, count: nftsData?.heros?.length || 0 },
        { key: 'myRelics' as const, label: '我的聖物', icon: Icons.Shield, count: nftsData?.relics?.length || 0 },
        { key: 'myParties' as const, label: '我的隊伍', icon: Icons.Users, count: nftsData?.parties?.length || 0 },
        { key: 'marketHeroes' as const, label: '英雄市場', icon: Icons.ShoppingCart },
        { key: 'marketRelics' as const, label: '聖物市場', icon: Icons.ShoppingCart },
    ];
    
    return (
        <ErrorBoundary>
            <div className="space-y-6">
                {/* Header with Quick Actions */}
                <PageActionBar
                    title="我的資產"
                    subtitle="管理您的英雄、聖物和隊伍"
                    actions={[
                        {
                            id: 'createParty',
                            label: '創建隊伍',
                            icon: Icons.Plus,
                            onClick: () => setShowTeamBuilder(!showTeamBuilder)
                        },
                        ...quickActions
                    ]}
                    showRefresh={true}
                    onRefresh={() => refetchNfts()}
                />
                
                {/* NFT 顯示模式切換 */}
                <div className="flex justify-end">
                    <NftDisplayToggleMini className="mb-2" />
                </div>
                
                {/* Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-gray-700">
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
                
                {/* Team Builder */}
                {showTeamBuilder && nftsData && (
                    <div className="bg-gray-800 rounded-lg p-4">
                        <TeamBuilder
                            heroes={nftsData.heros}
                            relics={nftsData.relics}
                            onCreateParty={handleCreateParty}
                            isCreating={createPartyTx.isLoading}
                            platformFee={platformFeeData ? (platformFeeData as bigint) : BigInt(0)}
                            isLoadingFee={isLoadingFee}
                            isHeroAuthorized={!!isHeroAuthorized}
                            isRelicAuthorized={!!isRelicAuthorized}
                            onAuthorizeHero={() => authorizeHeroTx.execute()}
                            onAuthorizeRelic={() => authorizeRelicTx.execute()}
                            isAuthorizing={authorizeHeroTx.isLoading || authorizeRelicTx.isLoading}
                        />
                    </div>
                )}
                
                {/* Content */}
                <div className="min-h-[400px]">
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