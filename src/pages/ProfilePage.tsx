// src/pages/ProfilePage.tsx
// 獨立的個人檔案頁面，專注於顯示詳細的玩家統計和成就

import React, { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import type { Address } from 'viem';
import { formatSoul } from '../utils/formatters';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ActionButton } from '../components/ui/ActionButton';
import { Icons } from '../components/ui/icons';
import { generateProfileSVG, type ProfileData } from '../utils/svgGenerators';
import { LocalErrorBoundary, LoadingState, ErrorState } from '../components/ui/ErrorBoundary';
import { usePlayerOverview } from '../hooks/usePlayerOverview';
import type { Page } from '../types/page';

interface ProfilePageProps {
    setActivePage: (page: Page) => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ setActivePage }) => {
    const { address: connectedAddress } = useAccount();
    
    // 從 URL 獲取要顯示的地址
    const targetAddress = useMemo(() => {
        const queryParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const queryAddress = queryParams.get('address');
        
        if (queryAddress && isAddress(queryAddress)) {
            return queryAddress as Address;
        }
        return connectedAddress;
    }, [connectedAddress]);
    
    const { data, isLoading, isError, refetch } = usePlayerOverview(targetAddress);
    
    if (isLoading) return <LoadingState />;
    if (isError) return <ErrorState onRetry={refetch} />;
    if (!targetAddress) return <EmptyState message="請先連接錢包" />;
    
    const player = data?.player;
    const isOwnProfile = targetAddress === connectedAddress;
    
    // Profile data for SVG
    const profileData: ProfileData = {
        name: player?.profile?.name || `Player ${targetAddress.slice(0, 6)}`,
        level: player?.profile?.level || 0,
        successfulExpeditions: player?.profile?.successfulExpeditions || 0,
        totalRewardsEarned: player?.profile?.totalRewardsEarned || '0',
        joinDate: player?.profile?.createdAt || Math.floor(Date.now() / 1000).toString()
    };
    
    return (
        <LocalErrorBoundary>
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">
                            {isOwnProfile ? '我的檔案' : '玩家檔案'}
                        </h1>
                        <p className="text-gray-400 mt-1">
                            {targetAddress}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {isOwnProfile && (
                            <ActionButton
                                onClick={() => setActivePage('dashboard')}
                                className="px-4 py-2"
                            >
                                返回總覽
                            </ActionButton>
                        )}
                        <ActionButton
                            onClick={() => refetch()}
                            className="px-4 py-2"
                        >
                            <Icons.RefreshCw className="h-4 w-4" />
                        </ActionButton>
                    </div>
                </div>

                {/* Profile SVG Card */}
                <div className="bg-gray-800 rounded-lg p-4 flex justify-center">
                    <div 
                        className="w-full max-w-md"
                        dangerouslySetInnerHTML={{ 
                            __html: generateProfileSVG(profileData) 
                        }} 
                    />
                </div>

                {/* Detailed Stats */}
                {player?.stats && (
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-bold text-white mb-4">詳細統計</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-700 rounded">
                                <p className="text-sm text-gray-400">總英雄數</p>
                                <p className="text-2xl font-bold text-white">{player.stats.totalHeroes || 0}</p>
                            </div>
                            <div className="p-4 bg-gray-700 rounded">
                                <p className="text-sm text-gray-400">總聖物數</p>
                                <p className="text-2xl font-bold text-white">{player.stats.totalRelics || 0}</p>
                            </div>
                            <div className="p-4 bg-gray-700 rounded">
                                <p className="text-sm text-gray-400">總隊伍數</p>
                                <p className="text-2xl font-bold text-white">{player.stats.totalParties || 0}</p>
                            </div>
                            <div className="p-4 bg-gray-700 rounded">
                                <p className="text-sm text-gray-400">總遠征次數</p>
                                <p className="text-2xl font-bold text-white">{player.stats.totalExpeditions || 0}</p>
                            </div>
                            <div className="p-4 bg-gray-700 rounded">
                                <p className="text-sm text-gray-400">成功遠征次數</p>
                                <p className="text-2xl font-bold text-green-500">{player.stats.successfulExpeditions || 0}</p>
                            </div>
                            <div className="p-4 bg-gray-700 rounded">
                                <p className="text-sm text-gray-400">總獲得獎勵</p>
                                <p className="text-2xl font-bold text-[#C0A573]">{formatSoul(player.stats.totalRewardsEarned || '0')} SOUL</p>
                            </div>
                            <div className="p-4 bg-gray-700 rounded">
                                <p className="text-sm text-gray-400">最高隊伍戰力</p>
                                <p className="text-2xl font-bold text-blue-500">{player.stats.highestPartyPower || 0}</p>
                            </div>
                            <div className="p-4 bg-gray-700 rounded">
                                <p className="text-sm text-gray-400">升級嘗試次數</p>
                                <p className="text-2xl font-bold text-purple-500">{player.stats.totalUpgradeAttempts || 0}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Referral Info */}
                {player?.profile && (
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-bold text-white mb-4">推薦資訊</h2>
                        <div className="space-y-2">
                            <p className="text-gray-400">
                                推薦人：<span className="text-white">{player.profile.inviter || '無'}</span>
                            </p>
                            <p className="text-gray-400">
                                傭金收入：<span className="text-[#C0A573]">{formatSoul(player.profile.commissionEarned || '0')} SOUL</span>
                            </p>
                            <p className="text-gray-400">
                                加入時間：<span className="text-white">{new Date(Number(player.profile.createdAt) * 1000).toLocaleDateString()}</span>
                            </p>
                            <p className="text-gray-400">
                                最後更新：<span className="text-white">{new Date(Number(player.profile.lastUpdatedAt || player.profile.createdAt) * 1000).toLocaleDateString()}</span>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </LocalErrorBoundary>
    );
};

export default ProfilePage;