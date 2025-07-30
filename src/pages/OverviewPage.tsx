// src/pages/OverviewPage.tsx

import React, { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { useCachedReadContract } from '../hooks/useCachedReadContract';
import { formatEther } from 'viem';
import { formatSoul, formatLargeNumber } from '../utils/formatters';
import { getContractWithABI } from '../config/contractsWithABI';
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
import { usePlayerOverview } from '../hooks/usePlayerOverview';
import { useVipStatus } from '../hooks/useVipStatus';
import { WithdrawalHistoryButton } from '../components/ui/WithdrawalHistory';
import { useTransactionHistory, createTransactionRecord } from '../stores/useTransactionPersistence';
import { TaxRateModal } from '../components/ui/TaxRateModal';
import { useUnassignedAssets } from '../hooks/useUnassignedAssets';
import { useSoulPrice } from '../hooks/useSoulPrice';

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
    const [showTaxModal, setShowTaxModal] = useState(false);
    const { showToast } = useAppToast();
    const { data, isLoading, isError, refetch } = usePlayerOverview(address);
    const { addTransaction, updateTransaction } = useTransactionHistory(address);
    
    // 使用合約直接讀取 VIP 等級和稅率資訊
    const { vipLevel, taxReduction, stakedAmount, isLoading: isLoadingVip, error: vipError } = useVipStatus();
    
    // SOUL 價格數據
    const { priceInUsd, formatSoulToUsd } = useSoulPrice();
    
    // Contract reads
    const playerProfileContract = getContractWithABI('PLAYERPROFILE');
    const dungeonMasterContract = getContractWithABI('DUNGEONMASTER');
    
    // Read player level from contract with caching
    const { data: levelData } = useCachedReadContract({
        address: playerProfileContract.address,
        abi: playerProfileContract.abi,
        functionName: 'getPlayerLevel',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
        cacheKey: `playerLevel-${address}`,
        cacheTime: 300000 // 5 分鐘緩存
    });
    
    // Read vault balance from contract with caching
    const { data: vaultBalance } = useCachedReadContract({
        address: dungeonMasterContract.address,
        abi: dungeonMasterContract.abi,
        functionName: 'getPlayerVaultBalance',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
        cacheKey: `vaultBalance-${address}`,
        cacheTime: 60000 // 1 分鐘緩存（金庫餘額變化較頻繁）
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
        onSuccess: (txHash) => {
            showToast('成功領取金庫獎勵！', 'success');
            
            // 記錄成功的提取交易
            if (address) {
                const txRecord = createTransactionRecord(
                    'claim',
                    `成功提取金庫獎勵 ${formatSoul(pendingVaultRewards)} SOUL`,
                    address,
                    56,
                    { amount: pendingVaultRewards }
                );
                const txId = addTransaction(txRecord);
                // 立即更新為成功狀態
                updateTransaction(txId, {
                    status: 'success',
                    hash: txHash,
                    confirmedAt: Date.now()
                });
            }
            
            refetch();
        },
        onError: (error) => {
            showToast(error, 'error');
            
            // 記錄失敗的提取交易
            if (address) {
                const txRecord = createTransactionRecord(
                    'claim',
                    `提取金庫獎勵失敗 ${formatSoul(pendingVaultRewards)} SOUL`,
                    address,
                    56,
                    { amount: pendingVaultRewards, error }
                );
                const txId = addTransaction(txRecord);
                updateTransaction(txId, {
                    status: 'failed',
                    error: error
                });
            }
        }
    });

    // Parse data
    const player = data?.player;
    const playerVaults = data?.playerVaults?.[0];
    
    // 獲取未分配資產數據
    const { data: assetData, isLoading: isLoadingAssets } = useUnassignedAssets(address);
    
    // 使用未分配的英雄/聖物數量，如果還在載入則顯示子圖數據
    const heroCount = isLoadingAssets 
        ? (player?.stats?.totalHeroes || player?.heros?.length || 0)
        : (assetData?.unassignedHeroes || 0);
    const relicCount = isLoadingAssets
        ? (player?.stats?.totalRelics || player?.relics?.length || 0)
        : (assetData?.unassignedRelics || 0);
    const partyCount = assetData?.totalParties || player?.stats?.totalParties || player?.parties?.length || 0;
    
    // 處理 500+ 的情況
    const displayHeroCount = player?.heros?.length >= 500 ? '500+' : heroCount.toString();
    const displayRelicCount = player?.relics?.length >= 500 ? '500+' : relicCount.toString();
    const displayPartyCount = player?.parties?.length >= 500 ? '500+' : partyCount.toString();
    const level = levelData ? Number(levelData) : (player?.profile?.level || 0);
    const pendingVaultRewards = vaultBalance ? formatEther(vaultBalance as bigint) : '0';
    // 使用合約讀取的 VIP 等級，而非子圖的 tier
    const vipTier = vipLevel || 0;
    
    // 計算實際稅率
    const baseTaxRate = 25; // 基礎 25%
    const vipDiscount = taxReduction ? Number(taxReduction) / 100 : 0; // 轉換為百分比
    const actualTaxRate = Math.max(0, baseTaxRate - vipDiscount);
    
    // 顯示稅率說明模態框
    const showTaxInfo = () => {
        setShowTaxModal(true);
    };
    
    // 處理提取按鈕點擊
    const handleWithdrawClick = () => {
        if (Number(pendingVaultRewards) > 0) {
            claimVaultTx.execute();
        } else {
            showToast('金庫餘額為 0 SOUL，無法提取。\n\n💡 完成地城探險可獲得獎勵！', 'warning');
        }
    };
    
    // Debug log
    if (import.meta.env.DEV) {
        console.log('Overview Page Data:', {
            vipLevel,
            vipTier,
            taxReduction: taxReduction?.toString(),
            stakedAmount: stakedAmount?.toString(),
            isLoadingVip,
            vipError,
            player,
            heroCount,
            relicCount,
            stats: player?.stats,
            rawVipData: player?.vip,
            rawHeroData: player?.heros,
            rawRelicData: player?.relics
        });
    }
    
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
        address: address || '0x0000000000000000000000000000000000000000',
        level,
        experience: BigInt(player?.profile?.experience || 0),
        nextLevelExp: BigInt(level * 100), // 假設值
        currentLevelExp: BigInt(player?.profile?.experience || 0),
        progress: 0, // 假設值
        heroCount: heroCount,
        relicCount: relicCount,
        partyCount: partyCount,
        expeditionCount: player?.profile?.successfulExpeditions || 0,
        totalRewards: BigInt(player?.profile?.totalRewardsEarned || 0)
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
                            onClick={() => {
                                refetch();
                                showToast('正在刷新數據...', 'info');
                            }}
                            className="px-4 py-2"
                            title="刷新數據"
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
                        description="透過挑戰地城獲得經驗值提升等級"
                    />
                    
                    <StatCard
                        title="英雄數量"
                        value={displayHeroCount}
                        icon={<Icons.Users className="h-5 w-5" />}
                        description={isLoadingAssets ? "載入中..." : `未分配到隊伍的英雄`}
                        action={
                            <ActionButton
                                onClick={() => setActivePage('mint')}
                                className="text-xs px-2 py-1"
                            >
                                鑄造英雄
                            </ActionButton>
                        }
                    />
                    
                    <StatCard
                        title="聖物數量"
                        value={displayRelicCount}
                        icon={<Icons.Shield className="h-5 w-5" />}
                        description={isLoadingAssets ? "載入中..." : `可用聖物`}
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
                        value={displayPartyCount}
                        icon={<Icons.Users className="h-5 w-5" />}
                        action={
                            <ActionButton
                                onClick={() => setActivePage('myAssets')}
                                className="text-xs px-2 py-1"
                            >
                                組隊
                            </ActionButton>
                        }
                    />
                    
                    <StatCard
                        title="金庫餘額"
                        value={`${formatSoul(pendingVaultRewards)} SOUL`}
                        icon={<Icons.DollarSign className="h-5 w-5" />}
                        description={
                            <div className="space-y-1">
                                <p className="text-xs text-gray-500">≈ ${formatSoulToUsd(pendingVaultRewards)} USD</p>
                                <p className="text-xs text-gray-500">提款稅率：{actualTaxRate.toFixed(1)}% {vipTier > 0 ? `(VIP ${vipTier})` : ''}</p>
                            </div>
                        }
                        action={
                            <div className="flex gap-1">
                                <ActionButton
                                    onClick={handleWithdrawClick}
                                    isLoading={claimVaultTx.isLoading}
                                    className="text-xs px-2 py-1"
                                    disabled={Number(pendingVaultRewards) === 0}
                                    title={Number(pendingVaultRewards) > 0 ? '提取金庫餘額' : '金庫餘額為空'}
                                >
                                    提取
                                </ActionButton>
                                <ActionButton
                                    onClick={showTaxInfo}
                                    className="text-xs px-2 py-1"
                                    title="查看稅率資訊和減免說明"
                                >
                                    稅率
                                </ActionButton>
                                <WithdrawalHistoryButton userAddress={address} />
                            </div>
                        }
                    />
                    
                    <StatCard
                        title="VIP 等級"
                        value={
                            isLoadingVip 
                                ? '讀取中...' 
                                : vipTier > 0 
                                    ? `VIP ${vipTier}` 
                                    : stakedAmount && stakedAmount > 0n 
                                        ? '計算中...' 
                                        : '未加入'
                        }
                        icon={<Icons.Crown className="h-5 w-5" />}
                        description={
                            vipTier > 0 
                                ? `質押獲得：祭壇加成、稅率減免、地城加成`
                                : stakedAmount && stakedAmount > 0n
                                    ? `已質押 ${(Number(stakedAmount) / 1e18).toFixed(2)} SOUL`
                                    : "質押 SoulShard 獲得多重收益加成"
                        }
                        action={
                            <ActionButton
                                onClick={() => setActivePage('vip')}
                                className="text-xs px-2 py-1"
                                disabled={isLoadingVip}
                            >
                                {vipTier > 0 ? '管理 VIP' : '成為 VIP'}
                            </ActionButton>
                        }
                    />
                </div>

                {/* Detailed Stats Section */}
                {player?.stats && (
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-bold text-white mb-4">詳細統計</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-[#C0A573]">{player.stats.totalExpeditions || 0}</p>
                                <p className="text-sm text-gray-400">總遠征次數</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-green-500">{player.stats.successfulExpeditions || 0}</p>
                                <p className="text-sm text-gray-400">成功遠征</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-blue-500">{formatLargeNumber(player.stats.highestPartyPower || 0)}</p>
                                <p className="text-sm text-gray-400">最高隊伍戰力</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-purple-500">{player.stats.totalUpgradeAttempts || 0}</p>
                                <p className="text-sm text-gray-400">升級嘗試次數</p>
                            </div>
                        </div>
                        
                        {/* 額外統計行 */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-orange-500">{player.stats.successfulUpgrades || 0}</p>
                                <p className="text-sm text-gray-400">成功升級次數</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-yellow-500">{formatSoul(player.stats.totalRewardsEarned || 0)} SOUL</p>
                                <p className="text-sm text-gray-400">總獲得獎勵</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-cyan-500">
                                    {player.stats.totalExpeditions > 0 
                                        ? `${Math.round((player.stats.successfulExpeditions / player.stats.totalExpeditions) * 100)}%`
                                        : '0%'
                                    }
                                </p>
                                <p className="text-sm text-gray-400">遠征成功率</p>
                            </div>
                        </div>
                        {player.profile?.inviter && (
                            <div className="mt-4 pt-4 border-t border-gray-700">
                                <p className="text-sm text-gray-400">
                                    推薦人：<span className="text-white">{player.profile.inviter}</span>
                                </p>
                                <p className="text-sm text-gray-400">
                                    傭金收入：<span className="text-[#C0A573]">{formatSoul(player.profile.commissionEarned || '0')} SOUL</span>
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Expedition Tracker */}
                <ExpeditionTracker />

                {/* Town Bulletin */}
                <TownBulletin />

                {/* Actions Section */}
                <div className="bg-gray-800 rounded-lg p-6">
                    <h2 className="text-xl font-bold text-white mb-4">快速行動</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button
                            onClick={() => setActivePage('mint')}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105 hover:shadow-lg"
                        >
                            <span className="text-2xl">🎯</span>
                            <span className="font-medium">鑄造NFT</span>
                        </button>
                        <button
                            onClick={() => setActivePage('altar')}
                            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105 hover:shadow-lg"
                        >
                            <span className="text-2xl">⭐</span>
                            <span className="font-medium">升級NFT</span>
                        </button>
                        <button
                            onClick={() => setActivePage('myAssets')}
                            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105 hover:shadow-lg"
                        >
                            <span className="text-2xl">📊</span>
                            <span className="font-medium">查看資產</span>
                        </button>
                        <button
                            onClick={() => setActivePage('dungeon')}
                            className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105 hover:shadow-lg"
                        >
                            <span className="text-2xl">🏰</span>
                            <span className="font-medium">探索地城</span>
                        </button>
                    </div>
                </div>

                {/* Project Introduction Section */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-white mb-2">🌟 踏入 Soulbound Saga，譜寫您的數位傳奇</h2>
                        <p className="text-gray-400">完全上鏈的 Roguelike 傳奇，每個決策都被永恆記錄，每個成就都無法被奪走</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <div className="text-center">
                            <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-2xl">⚔️</span>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">召喚英雄</h3>
                            <p className="text-sm text-gray-400">召喚靈魂綁定的英雄 NFT，每個都擁有獨特的靈魂契約和能力</p>
                        </div>

                        <div className="text-center">
                            <div className="bg-gradient-to-br from-purple-500 to-pink-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-2xl">🛡️</span>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">鍛造魂器</h3>
                            <p className="text-sm text-gray-400">鍛造神秘的魂器聖物，提升英雄力量並解鎖新的靈魂能力</p>
                        </div>

                        <div className="text-center">
                            <div className="bg-gradient-to-br from-green-500 to-teal-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-2xl">🏰</span>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">探索靈境</h3>
                            <p className="text-sm text-gray-400">組建隊伍進入程序生成的靈境地城，挑戰靈魂守護者</p>
                        </div>

                        <div className="text-center">
                            <div className="bg-gradient-to-br from-orange-500 to-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-2xl">💰</span>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">收集 $SOUL</h3>
                            <p className="text-sm text-gray-400">通過靈境探索和戰鬥收集珍貴的 $SOUL 代幣，築建您的數位財富</p>
                        </div>
                    </div>

                    <div className="border-t border-gray-700 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-gray-700/50 rounded-lg p-4">
                                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                                    <span className="text-blue-400">⛓️</span>
                                    上鏈機制
                                </h4>
                                <ul className="text-sm text-gray-400 space-y-1">
                                    <li>• 完全上鏈的 Roguelike 機制</li>
                                    <li>• 可驗證的隨機性和透明度</li>
                                    <li>• 靈魂綁定的 NFT 資產</li>
                                    <li>• 不可篡改的遊戲成就</li>
                                </ul>
                            </div>

                            <div className="bg-gray-700/50 rounded-lg p-4">
                                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                                    <span className="text-green-400">💎</span>
                                    $SOUL 經濟
                                </h4>
                                <ul className="text-sm text-gray-400 space-y-1">
                                    <li>• 通縮性 $SOUL 代幣經濟</li>
                                    <li>• 靈魂質押 VIP 系統</li>
                                    <li>• 可持續的遊戲即收益</li>
                                    <li>• 社群驅動的 DAO 治理</li>
                                </ul>
                            </div>

                            <div className="bg-gray-700/50 rounded-lg p-4">
                                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                                    <span className="text-purple-400">🌐</span>
                                    社群連結
                                </h4>
                                <div className="space-y-2">
                                    <a href="https://t.me/Soulbound_Saga" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 text-sm block transition-colors">
                                        📱 Telegram 社群
                                    </a>
                                    <a href="https://x.com/Soulbound_Saga" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 text-sm block transition-colors">
                                        🐦 Twitter 官方
                                    </a>
                                    <a href="https://soulshard.gitbook.io/dungeon-delvers/" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 text-sm block transition-colors">
                                        📘 遊戲文檔
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-center mt-6 pt-4 border-t border-gray-700">
                        <p className="text-gray-400 text-sm">
                            🌟 現在就踏入 Soulbound Saga！連接錢包並召喚您的第一個靈魂英雄
                        </p>
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

            {/* Tax Rate Modal */}
            <TaxRateModal
                isOpen={showTaxModal}
                onClose={() => setShowTaxModal(false)}
                vipTier={vipTier}
                actualTaxRate={actualTaxRate}
                vipDiscount={vipDiscount}
            />
        </LocalErrorBoundary>
    );
};

export default OverviewPage;