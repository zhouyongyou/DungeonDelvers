// src/pages/DashboardPage.tsx (The Graph 改造版)

import React, { useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { getContract, contracts } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { Page } from '../types/page';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useAppToast } from '../hooks/useAppToast';
import { Icons } from '../components/ui/icons';
import { bsc } from 'wagmi/chains';
import { TownBulletin } from '../components/ui/TownBulletin';

// =================================================================
// Section: GraphQL 查詢與數據獲取 Hook
// =================================================================

const THE_GRAPH_API_URL = import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL;

// 專為儀表板設計的 GraphQL 查詢
const GET_DASHBOARD_STATS_QUERY = `
  query GetDashboardStats($owner: ID!) {
    player(id: $owner) {
      id
      heroes {
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

// 新的 Hook，專門用來獲取儀表板的統計數據
const useDashboardStats = () => {
    const { address, chainId } = useAccount();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['dashboardStats', address, chainId],
        queryFn: async () => {
            if (!address || !THE_GRAPH_API_URL) return null;
            const response = await fetch(THE_GRAPH_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: GET_DASHBOARD_STATS_QUERY,
                    variables: { owner: address.toLowerCase() },
                }),
            });
            if (!response.ok) throw new Error('Network response was not ok');
            const { data } = await response.json();
            return data.player;
        },
        enabled: !!address && chainId === bsc.id && !!THE_GRAPH_API_URL,
        // ★★★ 網路優化：增加 staleTime，避免不必要的重複請求 ★★★
        staleTime: 1000 * 60, // 60 秒
    });

    // 從查詢結果中解析數據
    const stats = useMemo(() => {
        return {
            level: data?.profile?.level ? Number(data.profile.level) : 1,
            heroCount: data?.heroes?.length ?? 0,
            relicCount: data?.relics?.length ?? 0,
            partyCount: data?.parties?.length ?? 0,
            isVip: !!data?.vip,
            withdrawableBalance: data?.vault?.withdrawableBalance ? BigInt(data.vault.withdrawableBalance) : 0n,
        };
    }, [data]);

    return { stats, isLoading, isError };
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

    const dungeonCoreContract = getContract(isChainSupported ? chainId : undefined, 'dungeonCore');
    const playerVaultContract = getContract(isChainSupported ? chainId : undefined, 'playerVault');
    const vipStakingContract = getContract(isChainSupported ? chainId : undefined, 'vipStaking');
    const playerProfileContract = getContract(isChainSupported ? chainId : undefined, 'playerProfile');
    
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
    const { addTransaction } = useTransactionStore();
    const { showToast } = useAppToast();
    
    const { stats, isLoading: isLoadingStats, isError: isGraphError } = useDashboardStats();
    const { taxParams, isLoadingTaxParams, dungeonCoreContract } = useTaxParams();
    
    const { writeContractAsync, isPending: isWithdrawing } = useWriteContract();

    const withdrawableBalance = stats.withdrawableBalance;

    const { data: withdrawableBalanceInUSD } = useReadContract({ ...dungeonCoreContract, functionName: 'getSoulShardAmountForUSD', args: [withdrawableBalance], query: { enabled: !!dungeonCoreContract && withdrawableBalance > 0n } });
    
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
        
        let initialRate = (amountUSD > largeUSD) ? largeInit : stdInit;
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
        const playerVaultContract = getContract(chainId as any, 'playerVault');
        if (!playerVaultContract || withdrawableBalance === 0n) return;
        try {
            const hash = await writeContractAsync({ ...playerVaultContract, functionName: 'withdraw', args: [withdrawableBalance] });
            addTransaction({ hash, description: '從金庫提領 $SoulShard' });
        } catch(e: any) { showToast(e.shortMessage || "提領失敗", "error"); }
    };

    if (!chainId || chainId !== bsc.id) {
        return <div className="flex justify-center items-center h-64"><p className="text-lg text-gray-500">請連接到支援的網路 (BSC) 以檢視儀表板。</p></div>;
    }
    
    if (isGraphError) {
         return <div className="card-bg p-10 rounded-xl text-center text-red-400"><h3 className="text-xl font-bold">儀表板載入失敗</h3><p className="mt-2">無法從 The Graph 獲取數據，請檢查 API 端點或稍後再試。</p></div>;
    }

    const isLoading = isLoadingStats || isLoadingTaxParams;
    if (isLoading && !stats) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;

    return (
        <section className="space-y-8">
            <h2 className="page-title">玩家總覽中心</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 card-bg p-6 rounded-xl flex flex-col sm:flex-row items-center gap-6">
                    <div className="text-center flex-shrink-0">
                        <p className="text-sm text-gray-400">等級</p>
                        <p className="text-6xl font-bold text-yellow-400">{stats.level}</p>
                    </div>
                    <div className="w-full">
                        <h3 className="section-title text-xl mb-2">我的檔案</h3>
                        <p className="font-mono text-xs break-all bg-black/20 p-2 rounded">{address}</p>
                    </div>
                </div>
                <div className="card-bg p-6 rounded-xl flex flex-col justify-center">
                    <h3 className="section-title text-xl">我的金庫</h3>
                    <p className="text-3xl font-bold text-teal-400">{parseFloat(formatEther(withdrawableBalance)).toFixed(4)}</p>
                    <p className="text-xs text-red-400">當前預估稅率: {currentTaxRate.toFixed(2)}%</p>
                    <ActionButton onClick={handleWithdraw} isLoading={isWithdrawing} disabled={withdrawableBalance === 0n} className="mt-2 h-10 w-full">
                        全部提領
                    </ActionButton>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <h3 className="section-title">資產快照</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard title="英雄總數" value={stats.heroCount} isLoading={isLoadingStats} icon={<Icons.Hero className="w-6 h-6"/>} />
                        <StatCard title="聖物總數" value={stats.relicCount} isLoading={isLoadingStats} icon={<Icons.Relic className="w-6 h-6"/>} />
                        <StatCard title="隊伍總數" value={stats.partyCount} isLoading={isLoadingStats} icon={<Icons.Party className="w-6 h-6"/>} />
                        <StatCard title="VIP 狀態" value={stats.isVip ? '質押中' : '未質押'} isLoading={isLoadingStats} icon={<Icons.Vip className="w-6 h-6"/>} />
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <TownBulletin />
                </div>
            </div>

            <div>
                <h3 className="section-title">快捷操作</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <QuickActionButton title="鑄造 NFT" description="獲取新的英雄與聖物" onAction={() => setActivePage('mint')} icon={<Icons.Mint className="w-8 h-8"/>} />
                    <QuickActionButton title="升星祭壇" description="提升你的 NFT 星級" onAction={() => setActivePage('altar')} icon={<Icons.Altar className="w-8 h-8"/>}/>
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
