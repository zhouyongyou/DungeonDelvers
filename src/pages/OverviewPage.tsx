// src/pages/OverviewPage.tsx

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { formatSoul, formatLargeNumber } from '../utils/formatters';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import type { Page } from '../types/page';
import { useAppToast } from '../contexts/SimpleToastContext';
import { useTransactionWithProgress } from '../hooks/useTransactionWithProgress';
import { TransactionProgressModal } from '../components/ui/TransactionProgressModal';
import { Icons } from '../components/ui/icons';
import { bsc } from 'wagmi/chains';
import { TownBulletin } from '../components/ui/TownBulletin';
import { ExpeditionTracker } from '../components/ExpeditionTracker';
import { LocalErrorBoundary, LoadingState, ErrorState } from '../components/ui/ErrorBoundary';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { generateProfileSVG, type ProfileData } from '../utils/svgGenerators';
import { logger } from '../utils/logger';
import { THE_GRAPH_API_URL } from '../config/graphConfig';
import { graphQLRateLimiter } from '../utils/rateLimiter';

// =================================================================
// Section: GraphQL 查詢
// =================================================================

const GET_PLAYER_OVERVIEW_QUERY = `
  query GetPlayerOverview($owner: ID!) {
    player(id: $owner) {
      id
      profile {
        id
        level
        experience
        name
        successfulExpeditions
        totalRewardsEarned
        createdAt
      }
      heros {
        id
      }
      relics {
        id
      }
      parties {
        id
        unclaimedRewards
      }
      vip {
        id
        tier
        stakingAmount
      }
      vault {
        id
        pendingRewards
      }
    }
    playerVaults(where: { owner: $owner }) {
      id
      pendingRewards
      claimedRewards
    }
  }
`;

// =================================================================
// Section: Hooks
// =================================================================

const usePlayerOverview = () => {
    const { address, chainId } = useAccount();
    
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['playerOverview', address, chainId],
        queryFn: async () => {
            if (!address || !THE_GRAPH_API_URL) return null;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            try {
                const response = await graphQLRateLimiter.execute(async () => {
                    return fetch(THE_GRAPH_API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            query: GET_PLAYER_OVERVIEW_QUERY,
                            variables: { owner: address.toLowerCase() },
                        }),
                        signal: controller.signal
                    });
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) throw new Error('Network response was not ok');
                const { data, errors } = await response.json();
                
                if (errors) {
                    logger.error('GraphQL errors:', errors);
                    throw new Error(errors[0]?.message || 'GraphQL error');
                }
                
                return data;
            } catch (error) {
                logger.error('Error fetching dashboard stats:', error);
                throw error;
            }
        },
        enabled: !!address && !!THE_GRAPH_API_URL,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchInterval: 60 * 1000,
    });

    return { data, isLoading, isError, refetch };
};

// =================================================================
// Section: Components
// =================================================================

const StatCard: React.FC<{
    title: string;
    value: string;
    icon: React.ReactNode;
    description?: string;
    action?: React.ReactNode;
}> = ({ title, value, icon, description, action }) => (
    <div className="bg-gray-800 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-2">
            <div className="text-gray-400 flex items-center gap-2">
                {icon}
                <span className="text-sm">{title}</span>
            </div>
            {action}
        </div>
        <p className="text-2xl font-bold text-white">{value}</p>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
);

// =================================================================
// Section: Main Component
// =================================================================

interface OverviewPageProps {
    setActivePage: (page: Page) => void;
}

const OverviewPage: React.FC<OverviewPageProps> = ({ setActivePage }) => {
    const { address, isConnected } = useAccount();
    const [showProfileSVG, setShowProfileSVG] = useState(false);
    const { showToast } = useAppToast();
    const { data, isLoading, isError, refetch } = usePlayerOverview();
    
    // Contract reads
    const playerProfileContract = getContract('PLAYERPROFILE');
    const dungeonMasterContract = getContract('DUNGEONMASTER');
    
    // Read player level from contract
    const { data: levelData } = useReadContract({
        address: playerProfileContract.address,
        abi: playerProfileContract.abi,
        functionName: 'getPlayerLevel',
        args: address ? [address] : undefined,
        query: { enabled: !!address }
    });
    
    // Read vault balance from contract
    const { data: vaultBalance } = useReadContract({
        address: dungeonMasterContract.address,
        abi: dungeonMasterContract.abi,
        functionName: 'getPlayerVaultBalance',
        args: address ? [address] : undefined,
        query: { enabled: !!address }
    });
    
    // Transaction hooks
    const claimVaultTx = useTransactionWithProgress({
        contractCall: {
            address: dungeonMasterContract.address,
            abi: dungeonMasterContract.abi,
            functionName: 'withdrawFromVault',
            args: []
        },
        actionName: '領取金庫獎勵',
        onSuccess: () => {
            showToast('成功領取金庫獎勵！', 'success');
            refetch();
        },
        onError: (error) => {
            showToast(error, 'error');
        }
    });

    // Parse data
    const player = data?.player;
    const playerVaults = data?.playerVaults?.[0];
    const heroCount = player?.heros?.length || 0;
    const relicCount = player?.relics?.length || 0;
    const partyCount = player?.parties?.length || 0;
    const level = levelData ? Number(levelData) : (player?.profile?.level || 0);
    const pendingVaultRewards = vaultBalance ? formatEther(vaultBalance as bigint) : '0';
    const vipTier = player?.vip?.tier || 0;
    
    // Calculate unclaimed party rewards
    const unclaimedPartyRewards = useMemo(() => {
        if (!player?.parties) return '0';
        const total = player.parties.reduce((sum: bigint, party: any) => 
            sum + BigInt(party.unclaimedRewards || 0), BigInt(0)
        );
        return formatEther(total);
    }, [player?.parties]);
    
    // Profile data for SVG
    const profileData: ProfileData = {
        name: player?.profile?.name || `Player ${address?.slice(0, 6)}`,
        level,
        successfulExpeditions: player?.profile?.successfulExpeditions || 0,
        totalRewardsEarned: player?.profile?.totalRewardsEarned || '0',
        joinDate: player?.profile?.createdAt || Math.floor(Date.now() / 1000).toString()
    };
    
    if (isLoading) return <LoadingState />;
    if (isError) return <ErrorState onRetry={refetch} />;
    if (!isConnected) return <EmptyState message="請先連接錢包" />;

    return (
        <LocalErrorBoundary>
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">玩家總覽</h1>
                        <p className="text-gray-400 mt-1">管理您的英雄和追蹤進度</p>
                    </div>
                    <div className="flex gap-2">
                        <ActionButton
                            onClick={() => setShowProfileSVG(!showProfileSVG)}
                            className="px-4 py-2"
                        >
                            {showProfileSVG ? '隱藏' : '顯示'}檔案卡片
                        </ActionButton>
                        <ActionButton
                            onClick={() => refetch()}
                            className="px-4 py-2"
                        >
                            <Icons.RefreshCw className="h-4 w-4" />
                        </ActionButton>
                    </div>
                </div>

                {/* Profile SVG Card */}
                {showProfileSVG && (
                    <div className="bg-gray-800 rounded-lg p-4 flex justify-center">
                        <div 
                            className="w-full max-w-md"
                            dangerouslySetInnerHTML={{ 
                                __html: generateProfileSVG(profileData) 
                            }} 
                        />
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard
                        title="等級"
                        value={`LV ${level}`}
                        icon={<Icons.TrendingUp className="h-5 w-5" />}
                        description={`經驗值：${player?.profile?.experience || 0}`}
                    />
                    
                    <StatCard
                        title="英雄數量"
                        value={heroCount.toString()}
                        icon={<Icons.Users className="h-5 w-5" />}
                        action={
                            <ActionButton
                                onClick={() => setActivePage('mint')}
                                className="text-xs px-2 py-1"
                            >
                                鑄造更多
                            </ActionButton>
                        }
                    />
                    
                    <StatCard
                        title="聖物數量"
                        value={relicCount.toString()}
                        icon={<Icons.Shield className="h-5 w-5" />}
                        action={
                            <ActionButton
                                onClick={() => setActivePage('mint')}
                                className="text-xs px-2 py-1"
                            >
                                鑄造聖物
                            </ActionButton>
                        }
                    />
                    
                    <StatCard
                        title="隊伍數量"
                        value={partyCount.toString()}
                        icon={<Icons.Users className="h-5 w-5" />}
                        action={
                            <ActionButton
                                onClick={() => setActivePage('myAssets')}
                                className="text-xs px-2 py-1"
                            >
                                管理隊伍
                            </ActionButton>
                        }
                    />
                    
                    <StatCard
                        title="金庫餘額"
                        value={`${formatSoul(pendingVaultRewards)} SOUL`}
                        icon={<Icons.DollarSign className="h-5 w-5" />}
                        action={
                            Number(pendingVaultRewards) > 0 && (
                                <ActionButton
                                    onClick={() => claimVaultTx.execute()}
                                    isLoading={claimVaultTx.isLoading}
                                    className="text-xs px-2 py-1"
                                >
                                    領取
                                </ActionButton>
                            )
                        }
                    />
                    
                    <StatCard
                        title="VIP 等級"
                        value={vipTier > 0 ? `VIP ${vipTier}` : '未加入'}
                        icon={<Icons.Crown className="h-5 w-5" />}
                        action={
                            vipTier === 0 && (
                                <ActionButton
                                    onClick={() => setActivePage('vip')}
                                    className="text-xs px-2 py-1"
                                >
                                    成為 VIP
                                </ActionButton>
                            )
                        }
                    />
                </div>

                {/* Expedition Tracker */}
                <ExpeditionTracker />

                {/* Town Bulletin */}
                <TownBulletin />

                {/* Actions Section */}
                <div className="bg-gray-800 rounded-lg p-6">
                    <h2 className="text-xl font-bold text-white mb-4">快速行動</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <ActionButton
                            onClick={() => setActivePage('mint')}
                            className="py-3"
                        >
                            <Icons.Plus className="h-5 w-5 mr-2" />
                            鑄造英雄
                        </ActionButton>
                        <ActionButton
                            onClick={() => setActivePage('dungeon')}
                            className="py-3"
                        >
                            <Icons.Map className="h-5 w-5 mr-2" />
                            探索地城
                        </ActionButton>
                        <ActionButton
                            onClick={() => setActivePage('altar')}
                            className="py-3"
                        >
                            <Icons.Star className="h-5 w-5 mr-2" />
                            升級英雄
                        </ActionButton>
                        <ActionButton
                            onClick={() => setActivePage('myAssets')}
                            className="py-3"
                        >
                            <Icons.Package className="h-5 w-5 mr-2" />
                            查看資產
                        </ActionButton>
                    </div>
                </div>
            </div>

            {/* Transaction Progress Modal */}
            <TransactionProgressModal
                isOpen={claimVaultTx.showProgress}
                onClose={() => claimVaultTx.setShowProgress(false)}
                status={claimVaultTx.status}
                error={claimVaultTx.error}
                txHash={claimVaultTx.txHash}
                actionName={claimVaultTx.actionName}
            />
        </LocalErrorBoundary>
    );
};

export default OverviewPage;