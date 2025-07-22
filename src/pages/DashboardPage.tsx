// src/pages/DashboardPage.tsx (The Graph 改造版)

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { formatSoul, formatLargeNumber } from '../utils/formatters';
import { getContract, contracts } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import type { Page } from '../types/page';
import { useAppToast } from '../contexts/SimpleToastContext';
import { useTransactionWithProgress } from '../hooks/useTransactionWithProgress';
import { TransactionProgressModal } from '../components/ui/TransactionProgressModal';
import { useOptimisticUpdate } from '../hooks/useOptimisticUpdate';
import { Icons } from '../components/ui/icons';
import { bsc } from 'wagmi/chains';
import { TownBulletin } from '../components/ui/TownBulletin';
import { ExpeditionTracker } from '../components/ExpeditionTracker';
import { LocalErrorBoundary, LoadingState, ErrorState } from '../components/ui/ErrorBoundary';

// =================================================================
// Section: GraphQL 查詢與數據獲取 Hook
// =================================================================

import { THE_GRAPH_API_URL } from '../config/graphConfig';
import { graphQLRateLimiter } from '../utils/rateLimiter';

// 專為儀表板設計的 GraphQL 查詢
const GET_DASHBOARD_STATS_QUERY = `
  query GetDashboardStats($owner: ID!) {
    player(id: $owner) {
      id
      heros {
        id
      }
      relics {
        id
      }
      parties {
        id
      }
      profile {
        level
      }
      vip {
        id
      }
      vault {
        withdrawableBalance
      }
    }
  }
`;

// 簡化的 Hook，只獲取必要的金庫和等級數據
const useDashboardStats = () => {
    const { address, chainId } = useAccount();
    
    // 等級查詢已移除，節省資源 - 只在個人檔案頁面顯示

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['dashboardSimpleStats', address, chainId],
        queryFn: async () => {
            if (!address || !THE_GRAPH_API_URL) return null;
            
            // 簡化的查詢，獲取金庫和隊伍未領取獎勵
            const simplifiedQuery = `
                query GetSimpleStats($owner: ID!) {
                    playerVaults(where: { owner: $owner }) {
                        id
                        pendingRewards
                        claimedRewards
                    }
                    parties(where: { owner: $owner }) {
                        id
                        unclaimedRewards
                    }
                }
            `;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            try {
                const response = await graphQLRateLimiter.execute(async () => {
                    return fetch(THE_GRAPH_API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            query: simplifiedQuery,
                            variables: { owner: address.toLowerCase() },
                        }),
                        signal: controller.signal
                    });
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) throw new Error('Network response was not ok');
                const { data, errors } = await response.json();
                
                if (errors) {
                    throw new Error(`GraphQL errors: ${errors.map((e: { message: string }) => e.message).join(', ')}`);
                }
                
                return data;
            } catch (error) {
                clearTimeout(timeoutId);
                if (error instanceof Error && error.name === 'AbortError') {
                    throw new Error('請求超時，請稍後再試');
                }
                throw error;
            }
        },
        enabled: !!address && chainId === bsc.id && !!THE_GRAPH_API_URL,
        staleTime: 1000 * 60, // 1分鐘（減少快取時間）
        retry: 2, // 減少重試次數
        retryDelay: (attemptIndex: number) => Math.min(2000 * 2 ** attemptIndex, 8000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
    });

    // 簡化的統計數據
    const stats = useMemo(() => {
        // 計算金庫中的待領取獎勵
        const vault = data?.playerVaults?.[0];
        const vaultPendingRewards = vault?.pendingRewards ? BigInt(vault.pendingRewards) : 0n;
        
        // 計算所有隊伍中的未領取獎勵總額
        const partyUnclaimedRewards = data?.parties?.reduce((total, party) => {
            return total + (party.unclaimedRewards ? BigInt(party.unclaimedRewards) : 0n);
        }, 0n) || 0n;
        
        return {
            level: 1, // 預設值，實際等級請查看個人檔案頁面
            withdrawableBalance: vaultPendingRewards + partyUnclaimedRewards, // 總可獲得獎勵
        };
    }, [data]);

    return { stats, isLoading, isError, refetch, data };
};


// 輔助函式與子元件 (保持不變)
const StatCard: React.FC<{ title: string; value: string | number; isLoading?: boolean, icon: React.ReactNode, className?: string }> = ({ title, value, isLoading, icon, className }) => (
    <div className={`card-bg p-4 rounded-xl shadow-lg flex items-center gap-4 ${className}`}>
        <div className="text-indigo-400 bg-black/10 p-3 rounded-lg">{icon}</div>
        <div>
            <p className="text-sm text-gray-400">{title}</p>
            {isLoading ? <div className="h-7 w-20 bg-gray-700 rounded-md animate-pulse mt-1"></div> : <p className="text-2xl font-bold text-white">{value}</p>}
        </div>
    </div>
);

const QuickActionButton: React.FC<{ title: string; description: string; onAction: () => void; icon: React.ReactNode }> = ({ title, description, onAction, icon }) => (
    <button onClick={onAction} className="card-bg p-4 rounded-xl text-left w-full hover:bg-gray-700/70 transition-colors duration-200 flex items-center gap-4">
        <div className="text-yellow-400">{icon}</div>
        <div>
            <p className="font-bold text-lg text-white">{title}</p>
            <p className="text-xs text-gray-400">{description}</p>
        </div>
    </button>
);

const ExternalLinkButton: React.FC<{ title: string; url: string; icon: React.ReactNode }> = ({ title, url, icon }) => (
    <a href={url} target="_blank" rel="noopener noreferrer" className="card-bg p-4 rounded-xl text-left w-full hover:bg-gray-700/70 transition-colors duration-200 flex items-center gap-4">
        <div className="text-gray-400">{icon}</div>
        <div>
            <p className="font-bold text-lg text-white">{title}</p>
            <p className="text-xs text-gray-500">在 OKX 市場交易</p>
        </div>
        <Icons.ExternalLink className="w-4 h-4 ml-auto text-gray-500" />
    </a>
);

// 獲取稅率相關參數的 Hook (簡化版)
const useTaxParams = () => {
    const { address, chainId } = useAccount();
    const isChainSupported = chainId === bsc.id;

    const dungeonCoreContract = getContract(isChainSupported ? chainId! : bsc.id, 'dungeonCore');
    const playerVaultContract = getContract(isChainSupported ? chainId! : bsc.id, 'playerVault');
    const vipStakingContract = getContract(isChainSupported ? chainId! : bsc.id, 'vipStaking');
    const playerProfileContract = getContract(isChainSupported ? chainId! : bsc.id, 'playerProfile');
    
    // 這個 Hook 現在只負責獲取合約層級的設定，不再獲取玩家個人數據
    const contractsToRead = useMemo(() => {
        if (!isChainSupported || !playerVaultContract || !vipStakingContract || !playerProfileContract || !address) return [];
        return [
            { ...playerVaultContract, functionName: 'playerInfo', args: [address] }, // 仍然需要 lastWithdrawTimestamp
            { ...playerVaultContract, functionName: 'smallWithdrawThresholdUSD' },
            { ...playerVaultContract, functionName: 'largeWithdrawThresholdUSD' },
            { ...playerVaultContract, functionName: 'standardInitialRate' },
            { ...playerVaultContract, functionName: 'largeWithdrawInitialRate' },
            { ...playerVaultContract, functionName: 'decreaseRatePerPeriod' },
            { ...playerVaultContract, functionName: 'periodDuration' },
            { ...vipStakingContract, functionName: 'getVipTaxReduction', args: [address] },
        ];
    }, [isChainSupported, playerVaultContract, vipStakingContract, playerProfileContract, address]);

    const { data: taxParams, isLoading: isLoadingTaxParams } = useReadContracts({
        contracts: contractsToRead,
        query: { enabled: contractsToRead.length > 0 }
    });

    return { taxParams, isLoadingTaxParams, dungeonCoreContract };
};

// =================================================================
// Section: 主儀表板元件
// =================================================================

const DashboardPage: React.FC<{ setActivePage: (page: Page) => void }> = ({ setActivePage }) => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const queryClient = useQueryClient();
    
    const [showProgressModal, setShowProgressModal] = useState(false);
    
    const { stats, isLoading: isLoadingStats, refetch: refetchStats, data } = useDashboardStats();
    const { taxParams, isLoadingTaxParams, dungeonCoreContract } = useTaxParams();
    
    // 交易進度 Hook - 提領功能
    const { execute: executeWithdraw, progress: withdrawProgress, reset: resetWithdraw } = useTransactionWithProgress({
        onSuccess: () => {
            showToast('提領成功！$SoulShard 已轉入您的錢包', 'success');
            // 刷新儀表板數據
            refetchStats();
            queryClient.invalidateQueries({ queryKey: ['dashboardSimpleStats'] });
            setShowProgressModal(false);
            confirmWithdrawUpdate();
        },
        onError: () => {
            rollbackWithdrawUpdate();
        },
        successMessage: '提領成功！',
        errorMessage: '提領失敗',
    });
    
    // 樂觀更新 - 提領
    const { optimisticUpdate: optimisticWithdrawUpdate, confirmUpdate: confirmWithdrawUpdate, rollback: rollbackWithdrawUpdate } = useOptimisticUpdate({
        queryKey: ['dashboardSimpleStats'],
        updateFn: (oldData: any) => {
            if (!oldData) return oldData;
            
            // 立即將可提領餘額設為 0
            return {
                ...oldData,
                vault: {
                    ...oldData.vault,
                    pendingRewards: '0'
                }
            };
        }
    });

    // 分別計算金庫餘額和隊伍獎勵
    const vault = data?.playerVaults?.[0];
    const vaultBalance = vault?.pendingRewards ? BigInt(vault.pendingRewards) : 0n;
    const partyRewards = data?.parties?.reduce((total, party) => {
        const rewards = party.unclaimedRewards ? BigInt(party.unclaimedRewards) : 0n;
        // 過濾掉極小值（小於 0.0001 SOUL = 100000000000000 wei）
        return rewards > 100000000000000n ? total + rewards : total;
    }, 0n) || 0n;
    const totalDisplayBalance = vaultBalance + partyRewards;

    // 先獲取 SoulShard 價值的 USD 金額
    const { data: withdrawableBalanceInUSD } = useReadContract({ 
        address: dungeonCoreContract?.address as `0x${string}`,
        abi: dungeonCoreContract?.abi,
        functionName: 'getUSDForSoulShardAmount',  // 改為正確的函數名
        args: [vaultBalance], 
        query: { enabled: !!dungeonCoreContract && vaultBalance > 0n } 
    });
    
    const currentTaxRate = useMemo(() => {
        if (!taxParams || !stats) return 0;
        const [ playerInfo, smallWithdrawThresholdUSD, largeWithdrawThresholdUSD, standardInitialRate, largeWithdrawInitialRate, decreaseRatePerPeriod, periodDuration, vipTaxReduction ] = taxParams.map(item => item.result);
        if (!playerInfo || !Array.isArray(playerInfo)) return 0;

        const lastWithdrawTimestamp = typeof playerInfo[1] === 'bigint' ? playerInfo[1] : 0n;
        const lastFreeWithdrawTimestamp = typeof playerInfo[2] === 'bigint' ? playerInfo[2] : 0n;
        const amountUSD = typeof withdrawableBalanceInUSD === 'bigint' ? withdrawableBalanceInUSD : 0n;
        const smallUSD = typeof smallWithdrawThresholdUSD === 'bigint' ? smallWithdrawThresholdUSD : 0n;
        const largeUSD = typeof largeWithdrawThresholdUSD === 'bigint' ? largeWithdrawThresholdUSD : 0n;
        const stdInit = typeof standardInitialRate === 'bigint' ? standardInitialRate : 0n;
        const largeInit = typeof largeWithdrawInitialRate === 'bigint' ? largeWithdrawInitialRate : 0n;
        const decRate = typeof decreaseRatePerPeriod === 'bigint' ? decreaseRatePerPeriod : 0n;
        const period = typeof periodDuration === 'bigint' ? periodDuration : 1n;
        const vipRed = typeof vipTaxReduction === 'bigint' ? vipTaxReduction : 0n;
        const levelReduction = BigInt(Math.floor(stats.level / 10)) * 100n;
        
        const oneDay = 24n * 60n * 60n;
        if (amountUSD <= smallUSD && BigInt(Math.floor(Date.now() / 1000)) >= lastFreeWithdrawTimestamp + oneDay) return 0;
        
        const initialRate = (amountUSD > largeUSD) ? largeInit : stdInit;
        const timeSinceLast = BigInt(Math.floor(Date.now() / 1000)) - lastWithdrawTimestamp;
        const periodsPassed = timeSinceLast / period;
        const timeDecay = periodsPassed * decRate;
        
        const totalReduction = timeDecay + vipRed + levelReduction;
        if (totalReduction >= initialRate) return 0;
        return Number(initialRate - totalReduction) / 100;
    }, [taxParams, stats, withdrawableBalanceInUSD]);
    
    const externalMarkets = useMemo(() => {
        if (!chainId || chainId !== bsc.id) return [];
        const currentContracts = contracts[bsc.id];
        if (!currentContracts) return [];
        return [
            { title: '英雄市場', address: currentContracts.hero?.address ?? '', icon: <Icons.Hero className="w-8 h-8"/> },
            { title: '聖物市場', address: currentContracts.relic?.address ?? '', icon: <Icons.Relic className="w-8 h-8"/> },
            { title: '隊伍市場', address: currentContracts.party?.address ?? '', icon: <Icons.Party className="w-8 h-8"/> },
            // VIP市場已移除，因為VIP卡是靈魂代幣，無法轉移
        ].filter(m => m.address && typeof m.address === 'string' && !m.address.includes('YOUR_'));
    }, [chainId]);

    const handleWithdraw = async () => {
        if (!chainId || chainId !== bsc.id) return;
        const playerVaultContract = getContract(chainId, 'playerVault');
        if (!playerVaultContract || vaultBalance === 0n) return;
        
        setShowProgressModal(true);
        resetWithdraw();
        
        // 立即執行樂觀更新
        optimisticWithdrawUpdate();
        
        try {
            console.log('提領嘗試:', {
                address: playerVaultContract.address,
                amount: vaultBalance.toString(),
                amountInEther: formatEther(vaultBalance)
            });
            
            await executeWithdraw(
                {
                    address: playerVaultContract.address as `0x${string}`,
                    abi: playerVaultContract.abi,
                    functionName: 'withdraw',
                    args: [vaultBalance]
                },
                `從金庫提領 ${parseFloat(formatEther(vaultBalance)).toFixed(4)} $SoulShard`
            );
        } catch (error) {
            console.error('提領失敗詳情:', error);
            // 錯誤已在 hook 中處理
        }
    };

    if (!chainId || chainId !== bsc.id) {
        return <div className="flex justify-center items-center h-64"><p className="text-lg text-gray-500">請連接到支援的網路 (BSC) 以檢視儀表板。</p></div>;
    }
    
    const isLoading = isLoadingStats || isLoadingTaxParams;

    return (
        <section className="space-y-8">
            <TransactionProgressModal
                isOpen={showProgressModal}
                onClose={() => setShowProgressModal(false)}
                progress={withdrawProgress}
                title="提領進度"
            />
            
            <h2 className="page-title">玩家總覽中心</h2>
            
            <LocalErrorBoundary 
                fallback={
                    <ErrorState 
                        message="儀表板數據載入失敗" 
                        onRetry={refetchStats}
                    />
                }
            >
                {isLoading && !stats ? (
                    <LoadingState message="載入儀表板數據..." />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 card-bg p-6 rounded-xl flex flex-col sm:flex-row items-center gap-6">
                            {/* 等級顯示已移除，節省查詢資源 - 可在個人檔案頁面查看 */}
                            <div className="w-full">
                                <h3 className="section-title text-xl mb-2">我的檔案</h3>
                                <p className="font-mono text-xs break-all bg-black/20 p-2 rounded">{address}</p>
                            </div>
                        </div>
                        <div className="card-bg p-6 rounded-xl flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="section-title text-xl">我的金庫</h3>
                                <div className="group relative">
                                    <span className="text-gray-500 hover:text-gray-300 cursor-help text-sm">ⓘ</span>
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-300 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                                        <p className="font-semibold text-white mb-1">金庫餘額說明：</p>
                                        <p>• 包含可提領餘額</p>
                                        <p>• 包含隊伍未領取獎勵</p>
                                        <p>• 不包含其他玩家的推薦獎勵</p>
                                        <p className="mt-1 text-yellow-400">總獎勵 = 金庫餘額 + 已提領 + 推薦獎勵</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-teal-400">{formatSoul(totalDisplayBalance)}</p>
                            {partyRewards > 0n && (
                                <p className="text-xs text-yellow-400">
                                    包含隊伍未領取獎勵 {formatSoul(partyRewards)} SOUL
                                </p>
                            )}
                            {vaultBalance > 0n && (
                                <p className="text-xs text-green-400">
                                    可提領: {formatSoul(vaultBalance)} SOUL
                                </p>
                            )}
                            <p className="text-xs text-red-400">當前預估稅率: {currentTaxRate.toFixed(2)}%</p>
                            {/* 手動刷新按鈕 */}
                            <button
                                onClick={() => refetchStats()}
                                className="text-xs text-gray-400 hover:text-white underline mt-1"
                            >
                                刷新數據
                            </button>
                            <ActionButton 
                                onClick={handleWithdraw} 
                                isLoading={withdrawProgress.status !== 'idle' && withdrawProgress.status !== 'error'} 
                                disabled={vaultBalance === 0n} 
                                className="mt-2 h-10 w-full"
                            >
                                {vaultBalance > 0n ? `提領 ${parseFloat(formatEther(vaultBalance)).toFixed(4)} SOUL` : '請先領取隊伍獎勵'}
                            </ActionButton>
                            
                            {/* 隊伍獎勵領取按鈕 */}
                            {partyRewards > 0n && (
                                <div className="mt-2 space-y-1">
                                    <p className="text-xs text-gray-400">需要在地下城頁面逐個領取隊伍獎勵</p>
                                    <ActionButton 
                                        onClick={() => setActivePage('dungeon')}
                                        className="w-full h-8 text-sm bg-yellow-600 hover:bg-yellow-500"
                                    >
                                        前往地下城領取獎勵
                                    </ActionButton>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </LocalErrorBoundary>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <TownBulletin />
                </div>
                <div className="lg:col-span-1">
                    <ExpeditionTracker />
                </div>
            </div>

            <div>
                <h3 className="section-title">快捷操作</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <QuickActionButton title="鑄造 NFT" description="獲取新的英雄與聖物" onAction={() => setActivePage('mint')} icon={<Icons.Mint className="w-8 h-8"/>} />
                    {/* <QuickActionButton title="升星祭壇" description="提升你的 NFT 星級" onAction={() => setActivePage('altar')} icon={<Icons.Altar className="w-8 h-8"/>}/> */}
                    <QuickActionButton title="資產管理" description="創建隊伍、查看資產" onAction={() => setActivePage('party')} icon={<Icons.Assets className="w-8 h-8"/>}/>
                    <QuickActionButton title="前往地下城" description="開始你的冒險" onAction={() => setActivePage('dungeon')} icon={<Icons.Dungeon className="w-8 h-8"/>}/>
                </div>
            </div>

            <div>
                <h3 className="section-title">外部市場 (OKX NFT)</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {externalMarkets.map(market => (
                        market.address ? (
                            <ExternalLinkButton
                                key={market.title}
                                title={market.title}
                                url={`https://www.okx.com/web3/nft/markets/collection/bscn/${market.address}`}
                                icon={market.icon}
                            />
                        ) : null
                    ))}
                </div>
            </div>
        </section>
    );
};

export default DashboardPage;
