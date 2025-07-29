// src/pages/MyAssetsPageEnhanced.tsx

import React, { useState, useMemo, useCallback, memo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useContractBatchRead } from '../hooks/useContractBatchRead';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllOwnedNfts } from '../api/nfts';
import { NftCard } from '../components/ui/NftCard';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { getContract } from '../config/contracts';
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

// Import TeamBuilder from original file
import { TeamBuilder } from './MyAssetsPage';

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
      tier
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
      tier
      category
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
            if (!THE_GRAPH_API_URL) return null;
            
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
    const { address } = useAccount();
    const [activeTab, setActiveTab] = useState<'myHeroes' | 'myRelics' | 'myParties' | 'marketHeroes' | 'marketRelics'>('myHeroes');
    const [showTeamBuilder, setShowTeamBuilder] = useState(false);
    const { showToast } = useAppToast();
    const queryClient = useQueryClient();
    
    // Fetch owned NFTs
    const { data: nftsData, isLoading: isLoadingNfts, refetch: refetchNfts } = useQuery({
        queryKey: ['ownedNfts', address],
        queryFn: () => fetchAllOwnedNfts(address!),
        enabled: !!address,
        gcTime: 5 * 60 * 1000,
        staleTime: 30 * 1000,
    });
    
    // Market browser hooks
    const marketHeroes = useMarketBrowser('hero');
    const marketRelics = useMarketBrowser('relic');
    
    // Party contract
    const partyContract = getContract('PARTYV3');
    const heroContract = getContract('HERO');
    const relicContract = getContract('RELIC');
    
    // Platform fee
    const { data: platformFeeData, isLoading: isLoadingFee } = useReadContract({
        address: partyContract.address,
        abi: partyContract.abi,
        functionName: 'getPlatformFee',
        chainId: bsc.id,
    });
    
    // Authorization checks
    const { data: isHeroAuthorized } = useReadContract({
        address: heroContract.address,
        abi: heroContract.abi,
        functionName: 'isApprovedForAll',
        args: address ? [address, partyContract.address] : undefined,
        query: { enabled: !!address }
    });
    
    const { data: isRelicAuthorized } = useReadContract({
        address: relicContract.address,
        abi: relicContract.abi,
        functionName: 'isApprovedForAll',
        args: address ? [address, partyContract.address] : undefined,
        query: { enabled: !!address }
    });
    
    // Authorization transactions
    const authorizeHeroTx = useTransactionWithProgress({
        contractCall: {
            address: heroContract.address,
            abi: heroContract.abi,
            functionName: 'setApprovalForAll',
            args: [partyContract.address, true]
        },
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
        contractCall: {
            address: relicContract.address,
            abi: relicContract.abi,
            functionName: 'setApprovalForAll',
            args: [partyContract.address, true]
        },
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
        
        createPartyTx.setContractCall({
            address: partyContract.address,
            abi: partyContract.abi,
            functionName: 'createParty',
            args: [heroIds, relicIds],
            value: platformFeeData as bigint
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
        
        const { heroes, relics, parties } = nftsData;
        
        switch (activeTab) {
            case 'myHeroes':
                return heroes.length === 0 ? (
                    <EmptyState message="您還沒有英雄" />
                ) : (
                    <OptimizedNftGrid
                        nfts={heroes}
                        onViewDetails={(nft) => {
                            showToast(`查看英雄 #${nft.tokenId} 詳情`, 'info');
                        }}
                    />
                );
                
            case 'myRelics':
                return relics.length === 0 ? (
                    <EmptyState message="您還沒有聖物" />
                ) : (
                    <OptimizedNftGrid
                        nfts={relics}
                        onViewDetails={(nft) => {
                            showToast(`查看聖物 #${nft.tokenId} 詳情`, 'info');
                        }}
                    />
                );
                
            case 'myParties':
                return parties.length === 0 ? (
                    <EmptyState message="您還沒有隊伍" />
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
        { key: 'myHeroes' as const, label: '我的英雄', icon: Icons.Users, count: nftsData?.heroes.length || 0 },
        { key: 'myRelics' as const, label: '我的聖物', icon: Icons.Shield, count: nftsData?.relics.length || 0 },
        { key: 'myParties' as const, label: '我的隊伍', icon: Icons.Users, count: nftsData?.parties.length || 0 },
        { key: 'marketHeroes' as const, label: '英雄市場', icon: Icons.ShoppingCart },
        { key: 'marketRelics' as const, label: '聖物市場', icon: Icons.ShoppingCart },
    ];
    
    return (
        <ErrorBoundary>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">我的資產</h1>
                        <p className="text-gray-400 mt-1">管理您的英雄、聖物和隊伍</p>
                    </div>
                    <div className="flex gap-2">
                        {activeTab === 'myHeroes' || activeTab === 'myRelics' ? (
                            <ActionButton
                                onClick={() => setShowTeamBuilder(!showTeamBuilder)}
                                className="px-4 py-2"
                            >
                                <Icons.Plus className="h-4 w-4 mr-2" />
                                創建隊伍
                            </ActionButton>
                        ) : null}
                        <ActionButton
                            onClick={() => refetchNfts()}
                            className="px-4 py-2"
                        >
                            <Icons.RefreshCw className="h-4 w-4" />
                        </ActionButton>
                    </div>
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
                            <tab.icon className="h-4 w-4" />
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
                            heroes={nftsData.heroes}
                            relics={nftsData.relics}
                            onCreateParty={handleCreateParty}
                            isCreating={createPartyTx.isLoading}
                            platformFee={platformFeeData as bigint}
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