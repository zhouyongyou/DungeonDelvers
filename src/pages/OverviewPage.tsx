// src/pages/OverviewPage.tsx

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import ProjectIntroduction from '../components/ProjectIntroduction';
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
import { Modal } from '../components/ui/Modal';
import { useUnassignedAssets } from '../hooks/useUnassignedAssets';
import { LeaderboardSystem } from '../components/leaderboard/LeaderboardSystem';
import { AnalyticsDashboard } from '../components/analytics/AnalyticsDashboard';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useSoulPrice } from '../hooks/useSoulPrice';
import { SkeletonStats, SkeletonCard } from '../components/ui/SkeletonLoader';
import { usePlayerVaultV4 } from '../hooks/usePlayerVaultV4';
import { GameInfoSection } from '../components/GameInfoSection';

// =================================================================
// Section: Components
// =================================================================

const StatCard: React.FC<{
    title: string;
    value: string;
    icon: React.ReactNode;
    description?: React.ReactNode;
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
        {description && <div className="text-xs text-gray-500 mt-1">{description}</div>}
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
    const [showProjectIntro, setShowProjectIntro] = useState(false);
    const [showFullIntro, setShowFullIntro] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
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
    const playerVaultContract = getContractWithABI('PLAYERVAULT', 56);
    
    // Read player level from contract with caching
    const { data: levelData } = useCachedReadContract({
        address: playerProfileContract.address,
        abi: playerProfileContract.abi,
        functionName: 'getLevel',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
        cacheKey: `playerLevel-${address}`,
        cacheTime: 300000 // 5 分鐘緩存
    });
    
    // Use new PlayerVault v4.0 hook for enhanced functionality
    const { 
        withdrawableBalance: vaultBalance, 
        commissionBalance, 
        totalCommissionPaid,
        isLoading: isVaultLoading,
        refetchAll: refetchVault
    } = usePlayerVaultV4();
    // 注意：formatSoulToUsd 已經在上面的 useSoulPrice() 中定義了
    
    // 智能提領狀態
    const [showSmartWithdraw, setShowSmartWithdraw] = useState(false);
    const [withdrawUsdAmount, setWithdrawUsdAmount] = useState('');
    const [customWithdrawAmount, setCustomWithdrawAmount] = useState<bigint>(0n);
    
    // 原有的全額提領（保留作為備用）
    const claimVaultTx = useTransactionWithProgress({
        contractCall: {
            address: dungeonMasterContract.address,
            abi: dungeonMasterContract.abi,
            functionName: 'withdrawFromVault',
            args: []
        },
        actionName: '領取金庫獎勵（全額）',
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
            
            // 延遲重新獲取數據，等待區塊鏈狀態更新
            setTimeout(() => {
                refetch();
            }, 3000);
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
    const playerProfile = data?.playerProfile;
    const playerStats = data?.playerStats;
    const playerVault = data?.playerVault;
    const expeditions = data?.expeditions || [];
    const upgradeAttempts = player?.upgradeAttempts || [];
    
    // 獲取未分配資產數據
    const { data: assetData, isLoading: isLoadingAssets } = useUnassignedAssets(address);
    
    // 使用未分配的英雄/聖物數量，如果還在載入則顯示子圖數據
    const heroCount = isLoadingAssets 
        ? (player?.heros?.length || 0)
        : (assetData?.unassignedHeroes || 0);
    const relicCount = isLoadingAssets
        ? (player?.relics?.length || 0)
        : (assetData?.unassignedRelics || 0);
    const partyCount = assetData?.totalParties || player?.parties?.length || 0;
    
    // 處理 500+ 的情況
    const displayHeroCount = player?.heros?.length >= 500 ? '500+' : heroCount.toString();
    const displayRelicCount = player?.relics?.length >= 500 ? '500+' : relicCount.toString();
    const displayPartyCount = player?.parties?.length >= 500 ? '500+' : partyCount.toString();
    const level = levelData ? Number(levelData) : (playerProfile?.level || 0);
    const pendingVaultRewards = vaultBalance ? formatEther(vaultBalance as bigint) : '0';
    // 使用合約讀取的 VIP 等級，而非子圖的 tier
    const vipTier = vipLevel || 0;
    
    // 從合約讀取真實的稅率參數
    const { data: contractStandardRate } = useReadContract({
        address: playerVaultContract?.address,
        abi: playerVaultContract?.abi,
        functionName: 'standardInitialRate',
        chainId: bsc.id,
    });
    
    const { data: contractLargeRate } = useReadContract({
        address: playerVaultContract?.address,
        abi: playerVaultContract?.abi,
        functionName: 'largeWithdrawInitialRate',
        chainId: bsc.id,
    });
    
    const { data: freeWithdrawThresholdUsd } = useReadContract({
        address: playerVaultContract?.address,
        abi: playerVaultContract?.abi,
        functionName: 'freeWithdrawThresholdUSD',
        chainId: bsc.id,
    });
    
    const { data: largeWithdrawThresholdUsd } = useReadContract({
        address: playerVaultContract?.address,
        abi: playerVaultContract?.abi,
        functionName: 'largeWithdrawThresholdUSD',
        chainId: bsc.id,
    });
    
    // 獲取玩家資訊（包含 lastWithdrawTimestamp）
    const { data: playerInfo } = useReadContract({
        address: playerVaultContract?.address,
        abi: playerVaultContract?.abi,
        functionName: 'playerInfo',
        args: [address],
        chainId: bsc.id,
    });
    
    // 獲取時間減免參數
    const { data: decreaseRatePerPeriod } = useReadContract({
        address: playerVaultContract?.address,
        abi: playerVaultContract?.abi,
        functionName: 'decreaseRatePerPeriod',
        chainId: bsc.id,
    });
    
    const { data: periodDuration } = useReadContract({
        address: playerVaultContract?.address,
        abi: playerVaultContract?.abi,
        functionName: 'periodDuration',
        chainId: bsc.id,
    });
    
    // 計算實際稅率（包含時間衰減）
    const standardBaseTaxRate = contractStandardRate ? Number(contractStandardRate) / 100 : 25; // 一般金額基礎稅率（百分比）
    const largeBaseTaxRate = contractLargeRate ? Number(contractLargeRate) / 100 : 40; // 大額金額基礎稅率（百分比）
    const vipDiscount = taxReduction ? Number(taxReduction) / 100 : 0; // VIP 減免（百分比）
    const levelDiscount = Math.floor(level / 10); // 等級減免，每 10 級減 1%（百分比）
    
    // 時間衰減計算 - 與合約邏輯保持一致
    const lastWithdrawTimestamp = playerInfo ? Number(playerInfo[1]) : 0;
    const currentTime = Math.floor(Date.now() / 1000);
    
    // 判斷是否為首次提領或超過 10 天
    const isFirstWithdraw = lastWithdrawTimestamp === 0;
    const timePassed = isFirstWithdraw ? 0 : (currentTime - lastWithdrawTimestamp);
    const periodsPassed = Math.floor(timePassed / (periodDuration ? Number(periodDuration) : 24 * 60 * 60));
    const timeDecay = Math.min(periodsPassed * (decreaseRatePerPeriod ? Number(decreaseRatePerPeriod) / 100 : 5), 100); // 每天 5%，最高 100%
    
    // 總減免最高不超過 100%
    const totalDiscount = Math.min(vipDiscount + levelDiscount + timeDecay, 100);
    const actualTaxRate = Math.max(0, standardBaseTaxRate - totalDiscount); // 百分比格式 (0-100)
    const actualLargeTaxRate = Math.max(0, largeBaseTaxRate - totalDiscount); // 百分比格式 (0-100)
    
    // Debug 日誌 - 幫助追蹤稅率計算問題
    if (import.meta.env.DEV) {
        console.log('🧮 稅率計算 Debug:', {
            lastWithdrawTimestamp,
            currentTime,
            timePassed,
            periodsPassed,
            '基礎稅率': standardBaseTaxRate + '%',
            'VIP減免': vipDiscount + '%',
            '等級減免': levelDiscount + '%',
            '時間衰減': timeDecay + '%',
            '總減免': totalDiscount + '%',
            '最終稅率': actualTaxRate + '%',
            'playerInfo': playerInfo,
            'VIP等級': vipTier,
            '玩家等級': level
        });
    }
    
    // 顯示稅率說明模態框
    const showTaxInfo = () => {
        setShowTaxModal(true);
    };
    
    // 智能提領交易
    const smartWithdrawTx = useTransactionWithProgress({
        onSuccess: () => {
            // 交易成功後延遲關閉 Modal，讓用戶看到成功狀態
            setTimeout(() => {
                setShowSmartWithdraw(false);
                setWithdrawUsdAmount('');
                setCustomWithdrawAmount(0n);
            }, 2000); // 2秒後關閉
            
            // 重新獲取金庫數據（包括更新後的 lastWithdrawTimestamp）
            setTimeout(() => {
                refetchVault();
                refetch();
            }, 3000); // 3秒後刷新數據
        },
        successMessage: '提領成功！',
        errorMessage: '提領失敗，請重試'
    });
    
    // USD轉SOUL計算
    const calculateSoulAmount = (usdValue: string): bigint => {
        const usd = parseFloat(usdValue || '0');
        if (usd <= 0 || !priceInUsd) return 0n;
        const soulAmount = usd / priceInUsd;
        return BigInt(Math.floor(soulAmount * 1e18)); // 轉換為wei單位
    };
    
    // 預設金額選項
    const presetAmounts = [
        { label: '$19 (免稅)', value: '19', highlight: true },
        { label: '$100', value: '100' },
        { label: '$500', value: '500' },
        { label: '$999 (避免大額稅)', value: '999', highlight: true },
        { label: '$1500', value: '1500' },
    ];
    
    // 處理智能提領
    const handleSmartWithdraw = async (usdAmount?: string) => {
        const amount = usdAmount || withdrawUsdAmount;
        if (!amount || parseFloat(amount) <= 0) {
            showToast('請輸入有效的USD金額', 'warning');
            return;
        }
        
        const soulAmount = calculateSoulAmount(amount);
        // 正確處理 pendingVaultRewards 的 BigInt 轉換
        const maxBalance = BigInt(Math.floor(parseFloat(pendingVaultRewards || '0') * 1e18));
        
        if (soulAmount > maxBalance) {
            showToast(`金庫餘額不足。最大可提領約 $${formatSoulToUsd(pendingVaultRewards)} USD`, 'warning');
            return;
        }
        
        // Debug 日誌 - 提領前的狀態
        if (import.meta.env.DEV) {
            console.log('💰 提領前狀態:', {
                '提領金額USD': amount,
                '提領金額SOUL': formatEther(soulAmount),
                '當前lastWithdrawTimestamp': lastWithdrawTimestamp,
                '預期稅率': actualTaxRate + '%',
                '是否首次提領': lastWithdrawTimestamp === 0
            });
        }
        
        try {
            setCustomWithdrawAmount(soulAmount);
            setWithdrawUsdAmount(amount);
            
            await smartWithdrawTx.execute({
                address: playerVaultContract.address,
                abi: playerVaultContract.abi,
                functionName: 'withdraw',
                args: [soulAmount]
            }, `智能提領 $${amount}`);
        } catch (error) {
            console.error('智能提領失敗:', error);
        }
    };
    
    // 原提取按鈕點擊（現在打開智能提領界面）
    const handleWithdrawClick = () => {
        // 總是打開智能提領界面，即使餘額為0也可以查看
        setShowSmartWithdraw(true);
    };
    
    // 全額提領（備用功能）
    const handleFullWithdraw = async () => {
        if (Number(pendingVaultRewards) > 0) {
            try {
                // 使用更精確的轉換方式，避免浮點數精度問題
                const soulAmount = parseFloat(pendingVaultRewards);
                // 減去 0.1% 以避免精度錯誤，更安全
                const safeAmount = soulAmount * 0.999; // 減去 0.1% 以避免精度問題
                const amountInWei = BigInt(Math.floor(safeAmount * 1e18));
                const usdValue = formatSoulToUsd(pendingVaultRewards);
                
                setCustomWithdrawAmount(amountInWei);
                setWithdrawUsdAmount(usdValue);
                
                // 執行交易
                await smartWithdrawTx.execute({
                    address: playerVaultContract.address,
                    abi: playerVaultContract.abi,
                    functionName: 'withdraw',
                    args: [amountInWei]
                }, `提領全部 $${usdValue}`);
            } catch (error) {
                console.error('提領失敗:', error);
            }
        }
    };
    
    // Debug log - 只在初次載入或重要數據變化時記錄
    // Removed to reduce log spam
    
    // Calculate unclaimed party rewards
    const unclaimedPartyRewards = useMemo(() => {
        if (!player?.parties) return '0';
        const total = player.parties.reduce((sum: bigint, party: any) => 
            sum + BigInt(party.unclaimedRewards || 0), BigInt(0)
        );
        return formatEther(total);
    }, [player?.parties]);
    
    // Profile data for SVG
    // 根據合約邏輯計算經驗值：Level = sqrt(exp / 100) + 1
    // 反推每個等級需要的經驗值：Level N 需要 (N-1)² × 100 總經驗
    const currentExp = BigInt(player?.profile?.experience || 0);
    const getRequiredExpForLevel = (targetLevel: number): bigint => {
        if (targetLevel <= 1) return BigInt(0);
        return BigInt(Math.pow(targetLevel - 1, 2) * 100);
    };
    
    const currentLevelRequiredExp = getRequiredExpForLevel(level); // 達到當前等級需要的總經驗
    const nextLevelRequiredExp = getRequiredExpForLevel(level + 1); // 達到下一等級需要的總經驗
    const progress = Number(currentExp) < 100 ? 
        Math.floor((Number(currentExp) / 100) * 100) : // Level 1 的進度
        Math.floor((Number(currentExp) / Number(nextLevelRequiredExp)) * 100); // 其他等級的進度
    
    const profileData: ProfileData = {
        address: address || '0x0000000000000000000000000000000000000000',
        level,
        experience: currentExp,
        nextLevelExp: nextLevelRequiredExp,
        currentLevelExp: currentLevelRequiredExp,
        progress,
        heroCount: heroCount,
        relicCount: relicCount,
        partyCount: partyCount,
        expeditionCount: playerProfile?.successfulExpeditions || 0,
        totalRewards: BigInt(playerProfile?.totalRewardsEarned || 0)
    };
    
    // 改進的載入狀態 - 使用骨架屏
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="h-8 w-48 bg-gray-700 animate-pulse rounded mb-2" />
                        <div className="h-4 w-64 bg-gray-700 animate-pulse rounded" />
                    </div>
                </div>
                <SkeletonStats />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            </div>
        );
    }
    if (isError) return <ErrorState onRetry={refetch} />;
    
    // 未連接錢包時顯示項目介紹
    if (!isConnected) {
        return (
            <div className="min-h-screen">
                {/* 頂部橫幅 */}
                <div className="bg-gradient-to-r from-purple-900 via-blue-900 to-purple-900 py-3 sm:py-4 mb-6 sm:mb-8">
                    <div className="container mx-auto px-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 sm:space-x-4">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0"></div>
                                <span className="text-white font-semibold text-xs sm:text-sm md:text-base">
                                    v1 已上線 <span className="hidden sm:inline">| 所有系統運行正常</span>
                                </span>
                            </div>
                            
                            <div className="flex items-center space-x-2 text-yellow-300">
                                <span className="text-xs sm:text-sm">連接錢包</span>
                                <Icons.ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 -rotate-90" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-0 md:px-4">
                    <div className="space-y-6 md:space-y-8">
                        {/* 歡迎標題 */}
                        <div className="text-center py-6 md:py-8 lg:py-12 px-4">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 md:mb-6">
                                歡迎來到 <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent block sm:inline">DungeonDelvers</span>
                            </h1>
                            <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 md:mb-8 max-w-2xl mx-auto px-4">
                                探索地下城，收集英雄，賺取獎勵。體驗真正的 Web3 遊戲樂趣。
                            </p>
                            
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <ActionButton
                                    onClick={() => {
                                        // 觸發錢包連接邏輯
                                        showToast('請點擊右上角連接錢包', 'info');
                                    }}
                                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-3 px-6 sm:py-4 sm:px-8 rounded-lg hover:from-purple-700 hover:to-blue-700 text-sm sm:text-base"
                                >
                                    <div className="flex items-center space-x-2">
                                        <Icons.Dungeon className="h-4 w-4 sm:h-5 sm:w-5" />
                                        <span>連接錢包開始遊戲</span>
                                    </div>
                                </ActionButton>
                            </div>
                        </div>

                        {/* 項目介紹組件 */}
                        <ProjectIntroduction variant="full" showCallToAction={true} />
                        
                        {/* 遊戲重要資訊 - 在電腦版使用 full variant */}
                        <div className="mt-8 md:mt-12">
                            <GameInfoSection variant="full" />
                        </div>
                        
                        <div className="text-center mt-8">
                            <h3 className="text-lg font-bold text-white mb-4">加入我們的世界</h3>
                            <p className="text-gray-300 text-sm mb-6">一個偉大的遊戲世界需要熱情的玩家共同塑造。與開發團隊直接交流，見證嶄新遊戲品牌的誕生！</p>
                            
                            <ActionButton
                                onClick={() => {
                                    showToast('請點擊右上角連接錢包', 'info');
                                }}
                                className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-full px-6 py-3"
                            >
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-white text-sm font-semibold">立即開始遊戲</span>
                            </ActionButton>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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
                {/* 佣金提醒 */}
                {commissionBalance > 0n && (
                    <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Icons.Users className="h-6 w-6 text-green-400" />
                                <div>
                                    <h3 className="text-lg font-bold text-green-300">有佣金待提取！</h3>
                                    <p className="text-sm text-gray-400">
                                        您有 <span className="text-green-400 font-semibold">{formatSoul(commissionBalance)} SOUL</span> 的推薦佣金可以提取
                                    </p>
                                </div>
                            </div>
                            <ActionButton
                                onClick={() => window.location.hash = '#/referral'}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm"
                            >
                                提取佣金 →
                            </ActionButton>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard
                        title="等級"
                        value={`LV ${level}`}
                        icon={<Icons.TrendingUp className="h-5 w-5" />}
                        description={
                            <>
                                <div>透過挑戰地城獲得經驗值提升等級</div>
                                <div className="text-green-400 mt-1">
                                    稅率減免: {Math.floor(level / 10)}% (每 10 級 -1%)
                                </div>
                            </>
                        }
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
                                
                                {/* 首次提領免稅提示 */}
                                {(isFirstWithdraw || actualTaxRate === 0) && (
                                    <div className="text-xs text-green-400 bg-green-900/20 p-2 rounded border border-green-600/30 mb-1">
                                        <p className="font-medium flex items-center gap-1">
                                            <span>🎉</span>
                                            <span>{isFirstWithdraw ? '首次提領免稅優惠！' : '稅率已降至 0%！'}</span>
                                        </p>
                                        <p className="text-[10px] text-green-300 mt-0.5">您的提領將享受 0% 稅率</p>
                                    </div>
                                )}
                                
                                <div className="text-xs text-gray-500 space-y-1">
                                    <p>
                                        提款稅率：{actualTaxRate.toFixed(1)}% / {actualLargeTaxRate.toFixed(1)}%
                                    </p>
                                    <p className="text-xs text-yellow-400">
                                        (一般 / 大額≥$1000)
                                    </p>
                                    
                                    {/* 詳細減免計算 */}
                                    {(vipTier > 0 || levelDiscount > 0) && (
                                        <div className="text-xs text-green-400 space-y-1 bg-green-900/10 p-2 rounded border border-green-600/20">
                                            <p className="font-medium">稅率減免明細：</p>
                                            <div className="space-y-0.5 text-[10px]">
                                                <p>基礎稅率：{standardBaseTaxRate.toFixed(1)}% / {largeBaseTaxRate.toFixed(1)}%</p>
                                                {vipTier > 0 && (
                                                    <p>VIP {vipTier} 減免：-{vipDiscount.toFixed(1)}%</p>
                                                )}
                                                {levelDiscount > 0 && (
                                                    <p>等級 {level} 減免：-{levelDiscount.toFixed(1)}% (每10級-1%)</p>
                                                )}
                                                {timeDecay > 0 && !isFirstWithdraw && (
                                                    <p>時間衰減：-{timeDecay.toFixed(1)}% ({periodsPassed} 天)</p>
                                                )}
                                                {isFirstWithdraw && (
                                                    <p className="text-green-300">首次提領免稅：-100%</p>
                                                )}
                                                <p className="text-green-300 font-medium">
                                                    最終稅率：{actualTaxRate.toFixed(1)}% / {actualLargeTaxRate.toFixed(1)}%
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="text-xs text-blue-400 mt-1">
                                        每天減少 5% 稅率（時間衰減）
                                    </div>
                                    
                                    {/* 首次提領備註 */}
                                    {isFirstWithdraw && (
                                        <div className="text-xs text-green-400 bg-green-900/20 p-2 rounded border border-green-600/30 mt-2">
                                            🎉 首次提領免稅優惠！
                                        </div>
                                    )}
                                </div>
                            </div>
                        }
                        action={
                            <div className="flex gap-1">
                                <ActionButton
                                    onClick={handleWithdrawClick}
                                    isLoading={smartWithdrawTx.isLoading}
                                    className="text-xs px-2 py-1"
                                    title="智能提領 - 精確控制稅率和金額"
                                >
                                    智能提領
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
                                ? (
                                    <div className="space-y-1">
                                        <div className="text-xs text-gray-400">已獲得加成</div>
                                        <div className="text-green-400 text-xs space-y-1">
                                            <p>• 稅率減免: -{vipDiscount.toFixed(1)}% (每級 -0.5%)</p>
                                            <p>• 地城成功率: +{vipTier}% (每級 +1%)</p>
                                            <p>• 祭壇升星: +{vipTier}% (每級 +1%)</p>
                                        </div>
                                        <div className="text-yellow-400 text-xs mt-1">
                                            已質押 {(Number(stakedAmount || 0n) / 1e18).toFixed(0)} SOUL
                                        </div>
                                    </div>
                                ) 
                                : stakedAmount && stakedAmount > 0n
                                    ? (
                                        <div className="space-y-1">
                                            <p className="text-yellow-400 text-xs">
                                                已質押 {(Number(stakedAmount) / 1e18).toFixed(2)} SOUL
                                            </p>
                                            <p className="text-gray-500 text-xs">
                                                正在計算VIP等級...
                                            </p>
                                        </div>
                                    )
                                    : (
                                        <div className="space-y-1">
                                            <p className="text-gray-400 text-xs">質押 SoulShard 可獲得</p>
                                            <div className="text-blue-400 text-xs space-y-1">
                                                <p>• 提款稅率減免 (每級 -0.5%)</p>
                                                <p>• 地城成功率加成 (每級 +1%)</p>
                                                <p>• 祭壇升星成功率加成 (每級 +1%)</p>
                                            </div>
                                        </div>
                                    )
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

                {/* Analytics Dashboard - Lazy Loaded */}
                <div className="bg-gray-800 rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span>📊</span> 個人數據分析
                        </h2>
                        <ActionButton
                            onClick={() => setActivePage('gameData')}
                            className="text-sm"
                        >
                            查看排行榜 →
                        </ActionButton>
                    </div>
                    {showAnalytics ? (
                        <AnalyticsDashboard />
                    ) : (
                        <div className="text-center py-8">
                            <button
                                onClick={() => setShowAnalytics(true)}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center gap-2 mx-auto"
                            >
                                <Icons.BarChart className="h-5 w-5" />
                                <span>展開數據分析</span>
                            </button>
                            <p className="text-sm text-gray-400 mt-2">點擊查看詳細的遊戲數據統計</p>
                        </div>
                    )}
                </div>

                {/* Detailed Stats Section */}
                <div className="bg-gray-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white">詳細統計</h2>
                        {(expeditions.length === 0 && (playerProfile?.successfulExpeditions || 0) === 0) && (
                            <div className="flex items-center text-yellow-400 text-sm">
                                <Icons.Info className="h-4 w-4 mr-1" />
                                <span>開始遊戲後將顯示統計</span>
                            </div>
                        )}
                    </div>
                    {(expeditions.length > 0 || (playerProfile?.successfulExpeditions || 0) > 0) ? (
                        <div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-[#C0A573]">{expeditions.length}</p>
                                    <p className="text-sm text-gray-400">總遠征次數</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-500">{playerProfile?.successfulExpeditions || 0}</p>
                                    <p className="text-sm text-gray-400">成功遠征</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-purple-500">{upgradeAttempts.length || '-'}</p>
                                    <p className="text-sm text-gray-400">升級嘗試次數</p>
                                </div>
                            </div>
                            
                            {/* 額外統計行 */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-orange-500">{
                                    upgradeAttempts.filter(u => {
                                        const outcome = typeof u.outcome === 'number' ? u.outcome : Number(u.outcome);
                                        return outcome === 2 || outcome === 3; // 2=成功, 3=大成功
                                    }).length || '-'
                                }</p>
                                <p className="text-sm text-gray-400">成功升級次數</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-yellow-500">{formatSoul(playerStats?.totalRewardsEarned || playerProfile?.totalRewardsEarned || '0', 1)} SOUL</p>
                                <p className="text-sm text-gray-400">總獲得獎勵</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-cyan-500">
                                    {expeditions.length > 0 
                                        ? `${((playerProfile?.successfulExpeditions || 0) / expeditions.length * 100).toFixed(1)}%`
                                        : '0%'
                                    }
                                </p>
                                <p className="text-sm text-gray-400">遠征成功率</p>
                            </div>
                        </div>
                        {playerProfile?.inviter && (
                            <div className="mt-4 pt-4 border-t border-gray-700">
                                <p className="text-sm text-gray-400">
                                    推薦人：<span className="text-white">{playerProfile.inviter}</span>
                                </p>
                                <p className="text-sm text-gray-400">
                                    傭金收入：<span className="text-[#C0A573]">{formatSoul(playerProfile.commissionEarned || '0')} SOUL</span>
                                </p>
                            </div>
                        )}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="text-gray-400 mb-4">
                                <Icons.BarChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p className="text-lg font-medium">暫無遊戲統計</p>
                                <p className="text-sm">開始探索地城或升級NFT來產生統計數據</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-600">0</p>
                                    <p className="text-sm text-gray-400">總遠征次數</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-600">0</p>
                                    <p className="text-sm text-gray-400">成功遠征</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-600">0</p>
                                    <p className="text-sm text-gray-400">最高隊伍戰力</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-600">0</p>
                                    <p className="text-sm text-gray-400">升級嘗試次數</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-600">0</p>
                                    <p className="text-sm text-gray-400">成功升級次數</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-600">0 SOUL</p>
                                    <p className="text-sm text-gray-400">總獲得獎勵</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-600">0%</p>
                                    <p className="text-sm text-gray-400">遠征成功率</p>
                                </div>
                            </div>
                        </div>
                    )}

                {/* Expedition Tracker */}
                <ExpeditionTracker />

                {/* Town Bulletin */}
                <TownBulletin />

                {/* Game Info Section - 在手機版顯示緊湊版本 */}
                <div className="md:hidden">
                    <GameInfoSection variant="compact" />
                </div>

                {/* Project Introduction Section - 可折疊 */}
                <div className="bg-gray-800 rounded-lg">
                    <button
                        onClick={() => setShowProjectIntro(!showProjectIntro)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-700 transition-colors rounded-lg"
                    >
                        <div className="flex items-center space-x-3">
                            <Icons.Info className="h-5 w-5 text-purple-400" />
                            <h2 className="text-lg font-bold text-white">項目介紹與發展藍圖</h2>
                        </div>
                        <div className={`transform transition-transform ${showProjectIntro ? 'rotate-180' : ''}`}>
                            <Icons.ChevronDown className="h-5 w-5 text-gray-400" />
                        </div>
                    </button>
                    
                    {showProjectIntro && (
                        <div className="px-6 pb-6">
                            <div className="border-t border-gray-700 pt-6">
                                <ProjectIntroduction variant="compact" showCallToAction={false} />
                                
                                <div className="mt-6 text-center">
                                    <button
                                        onClick={() => setShowFullIntro(true)}
                                        className="text-purple-400 hover:text-purple-300 text-sm font-semibold transition-colors"
                                    >
                                        查看完整介紹 →
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

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
                isOpen={smartWithdrawTx.showProgress}
                onClose={() => smartWithdrawTx.setShowProgress(false)}
                status={smartWithdrawTx.status}
                error={smartWithdrawTx.error}
                txHash={smartWithdrawTx.txHash}
                actionName={smartWithdrawTx.actionName}
            />

            {/* Tax Rate Modal */}
            <TaxRateModal
                isOpen={showTaxModal}
                onClose={() => setShowTaxModal(false)}
                vipTier={vipTier}
                actualTaxRate={actualTaxRate}
                actualLargeTaxRate={actualLargeTaxRate}
                vipDiscount={vipDiscount}
                playerLevel={level}
                levelDiscount={levelDiscount}
                vaultBalance={pendingVaultRewards}
                lastFreeWithdrawTime={player?.lastFreeWithdrawTimestamp || 0}
                freeWithdrawThresholdUsd={freeWithdrawThresholdUsd ? Number(freeWithdrawThresholdUsd) / 10**18 : 20}
                largeWithdrawThresholdUsd={largeWithdrawThresholdUsd ? Number(largeWithdrawThresholdUsd) / 10**18 : 1000}
            />

            {/* Smart Withdraw Modal */}
            <Modal
                isOpen={showSmartWithdraw}
                onClose={() => setShowSmartWithdraw(false)}
                title="💰 智能提領 - 精確控制稅率"
                onConfirm={() => handleSmartWithdraw()}
                confirmText={Number(pendingVaultRewards) === 0 ? '餘額為空' : (withdrawUsdAmount ? `提領 $${withdrawUsdAmount}` : '請輸入金額')}
                maxWidth="lg"
                disabled={!withdrawUsdAmount || parseFloat(withdrawUsdAmount) <= 0 || smartWithdrawTx.isLoading || Number(pendingVaultRewards) === 0}
                isLoading={smartWithdrawTx.isLoading}
            >
                <div className="space-y-6">
                    {/* 當前金庫狀態 */}
                    <div className={`rounded-xl p-4 ${
                        Number(pendingVaultRewards) > 0 
                            ? "bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/30"
                            : "bg-gradient-to-r from-gray-900/30 to-gray-800/30 border border-gray-600/30"
                    }`}>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Icons.DollarSign className="h-4 w-4" />
                            <span className={Number(pendingVaultRewards) > 0 ? "text-blue-300" : "text-gray-400"}>
                                當前金庫狀態
                            </span>
                        </h4>
                        <div className="space-y-1 text-sm">
                            <p className="text-gray-300">
                                餘額：{formatSoul(pendingVaultRewards)} SOUL
                            </p>
                            <p className="text-gray-300">
                                價值：≈ ${formatSoulToUsd(pendingVaultRewards)} USD
                            </p>
                            {Number(pendingVaultRewards) > 0 ? (
                                <div className="space-y-1">
                                    {isFirstWithdraw ? (
                                        <p className="text-green-400 text-xs">
                                            🎉 首次提領免稅優惠！
                                        </p>
                                    ) : periodsPassed >= 10 ? (
                                        <p className="text-green-400 text-xs">
                                            🎉 超過 {periodsPassed} 天未提領，享受 0% 稅率！
                                        </p>
                                    ) : (
                                        <p className="text-yellow-400 text-xs">
                                            💡 策略性提領可避免高稅率！
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-orange-400 text-xs">
                                    ⚠️ 金庫餘額為空，請先完成地城探險獲得獎勵
                                </p>
                            )}
                        </div>
                    </div>

                    {/* USD 金額輸入 */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-300">
                            輸入提領金額 (USD)
                        </label>
                        <input
                            type="number"
                            value={withdrawUsdAmount}
                            onChange={(e) => setWithdrawUsdAmount(e.target.value)}
                            placeholder="輸入USD金額..."
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            step="0.01"
                        />
                        
                        {/* 實時換算顯示 */}
                        {withdrawUsdAmount && parseFloat(withdrawUsdAmount) > 0 && (
                            <div className="p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                                <p className="text-sm text-gray-300">
                                    將提領：{(calculateSoulAmount(withdrawUsdAmount) / BigInt(1e18)).toString()} SOUL
                                </p>
                                <p className="text-xs text-gray-400">
                                    當前 SOUL 價格：{priceInUsd ? `$${priceInUsd.toFixed(8)} USD` : '價格載入中...'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* 快速提領全部按鈕 - 放在這裡更顯眼 */}
                    <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-4">
                        <h4 className="font-medium text-purple-300 mb-2 flex items-center gap-2">
                            <Icons.Zap className="h-4 w-4" />
                            快速提領全部
                        </h4>
                        
                        {/* 稅率預覽 - 針對全額提領 */}
                        {Number(pendingVaultRewards) > 0 && (
                            <div className="mb-3 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                                {(() => {
                                    const usdValue = parseFloat(formatSoulToUsd(pendingVaultRewards));
                                    const canUseFree = usdValue <= 20;
                                    const isLarge = usdValue >= 1000;
                                    // 特殊情況：首次提領或超過 10 天免稅
                                    const taxRate = (isFirstWithdraw || periodsPassed >= 10) ? 0 : 
                                        (canUseFree ? 0 : (isLarge ? actualLargeTaxRate : actualTaxRate));
                                    
                                    const soulAmount = parseFloat(pendingVaultRewards);
                                    const received = Math.floor(soulAmount * (100 - taxRate) / 100);
                                    
                                    return (
                                        <div className="space-y-1 text-xs">
                                            <p className="text-gray-300">
                                                類型：
                                                <span className={`ml-1 font-medium ${
                                                    isFirstWithdraw || canUseFree || taxRate === 0 ? 'text-green-400' :
                                                    isLarge ? 'text-orange-400' : 'text-blue-400'
                                                }`}>
                                                    {
                                                        isFirstWithdraw ? '首次提領' :
                                                        canUseFree ? '免稅提領' : 
                                                        isLarge ? '大額提領' : '一般提領'
                                                    }
                                                </span>
                                                <span className={`ml-1 font-medium ${
                                                    taxRate === 0 ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                    ({taxRate.toFixed(1)}% 稅率)
                                                </span>
                                            </p>
                                            <p className="text-gray-300">
                                                到手：
                                                <span className="ml-1 font-medium text-white">
                                                    {received.toLocaleString()} SOUL
                                                </span>
                                            </p>
                                            {(isFirstWithdraw || canUseFree || periodsPassed >= 10) && (
                                                <p className="text-green-400">
                                                    🎁 {
                                                        isFirstWithdraw ? '首次提領免稅優惠！' : 
                                                        periodsPassed >= 10 ? `超過 ${periodsPassed} 天免稅！` :
                                                        '每日免稅機會！'
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                        
                        <button
                            onClick={handleFullWithdraw}
                            disabled={smartWithdrawTx.isLoading || Number(pendingVaultRewards) === 0}
                            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all"
                        >
                            {smartWithdrawTx.isLoading ? '處理中...' : '提領全部'}
                        </button>
                    </div>

                    {/* 重要提醒 - 移動到策略性提領選項上方 */}
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                        <p className="text-red-400 text-xs font-medium mb-1">⚠️ 重要提醒</p>
                        <p className="text-red-300 text-xs">
                            任何提領（包括$19免稅）都會重置稅率計算，每日5%降低會重新開始。
                        </p>
                        {!isFirstWithdraw && (
                            <p className="text-orange-300 text-xs mt-1">
                                📅 稅率減免機制：今日率 {actualTaxRate.toFixed(1)}%，已過 {periodsPassed} 天（減免 {timeDecay.toFixed(1)}%）
                            </p>
                        )}
                        <p className="text-gray-400 text-xs mt-1">
                            ℹ️ 每24小時自動降低5%，直至最低0%
                        </p>
                    </div>

                    {/* 預設金額選項 */}
                    <div className="space-y-3">
                        <h4 className="font-medium text-gray-300">策略性提領選項</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {presetAmounts.map((preset) => (
                                <button
                                    key={preset.value}
                                    onClick={() => setWithdrawUsdAmount(preset.value)}
                                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                                        preset.highlight
                                            ? 'bg-gradient-to-r from-green-700/30 to-emerald-700/30 border-green-500/40 text-green-300 hover:from-green-600/40 hover:to-emerald-600/40'
                                            : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 稅率預覽 */}
                    {withdrawUsdAmount && parseFloat(withdrawUsdAmount) > 0 && (
                        <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-lg p-4">
                            <h4 className="font-medium text-yellow-300 mb-2 flex items-center gap-2">
                                <Icons.DollarSign className="h-4 w-4" />
                                稅率預覽
                            </h4>
                            <div className="space-y-2 text-sm">
                                {(() => {
                                    const usdValue = parseFloat(withdrawUsdAmount);
                                    const canUseFree = usdValue <= 20;
                                    const isLarge = usdValue >= 1000;
                                    // 特殊情況：首次提領或超過 10 天免稅
                                    const taxRate = (isFirstWithdraw || periodsPassed >= 10) ? 0 : 
                                        (canUseFree ? 0 : (isLarge ? actualLargeTaxRate : actualTaxRate));
                                    
                                    const soulAmount = Number(calculateSoulAmount(withdrawUsdAmount)) / 1e18;
                                    const received = Math.floor(soulAmount * (100 - taxRate) / 100);
                                    
                                    return (
                                        <>
                                            <p className="text-gray-300">
                                                提領類型：
                                                <span className={`ml-1 font-medium ${
                                                    isFirstWithdraw || canUseFree || taxRate === 0 ? 'text-green-400' :
                                                    isLarge ? 'text-orange-400' : 'text-blue-400'
                                                }`}>
                                                    {
                                                        isFirstWithdraw ? '首次提領' :
                                                        canUseFree ? '免稅提領' : 
                                                        isLarge ? '大額提領' : '一般提領'
                                                    }
                                                </span>
                                            </p>
                                            <p className="text-gray-300">
                                                適用稅率：
                                                <span className={`ml-1 font-medium ${
                                                    taxRate === 0 ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                    {taxRate.toFixed(1)}%
                                                </span>
                                            </p>
                                            <p className="text-gray-300">
                                                實際到手：
                                                <span className="ml-1 font-medium text-white">
                                                    {received.toLocaleString()} SOUL
                                                </span>
                                            </p>
                                            {(canUseFree || periodsPassed >= 10) && (
                                                <p className="text-green-400 text-xs">
                                                    🎁 {
                                                        periodsPassed >= 10 ? `超過 ${periodsPassed} 天免稅！` :
                                                        '每日一次免稅提領機會！'
                                                    }
                                                </p>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
            {/* Full Project Introduction Modal */}
            <Modal
                isOpen={showFullIntro}
                onClose={() => setShowFullIntro(false)}
                title="🚀 DungeonDelvers 完整介紹"
                onConfirm={() => setShowFullIntro(false)}
                confirmText="了解了"
                maxWidth="6xl"
                showCloseButton={false}
            >
                <div className="space-y-6">
                    <ProjectIntroduction variant="full" showCallToAction={true} />
                </div>
            </Modal>
            </div>
        </LocalErrorBoundary>
    );
};

export default OverviewPage;