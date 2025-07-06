import React, { useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatEther } from 'viem'; // ★ 修正：移除未使用的 'Address'
import { getContract, contracts, playerVaultABI } from '../config/contracts';
import { fetchAllOwnedNfts } from '../api/nfts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { Page } from '../types/page';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useAppToast } from '../hooks/useAppToast';
import { Icons } from '../components/ui/icons';
import { bsc, bscTestnet } from 'wagmi/chains'; // ★ 新增：導入 bsc 和 bscTestnet 以便進行型別防衛

// =================================================================
// Section: 輔助函式與子元件 (保持不變)
// =================================================================

const getLevelFromExp = (exp: bigint): number => {
    if (exp < 100n) return 1;
    return Math.floor(Math.sqrt(Number(exp) / 100)) + 1;
};

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


// =================================================================
// Section: 新增的自定義 Hook，用於封裝複雜的金庫與稅率邏輯
// =================================================================
const useVaultAndTax = () => {
    const { address, chainId } = useAccount();

    // 再次加入型別防衛，確保此 Hook 內部也是型別安全的
    if (!chainId || (chainId !== bsc.id && chainId !== bscTestnet.id)) {
        return {
            playerVaultContract: null,
            vaultInfo: undefined,
            currentTaxRate: 0,
            isLoading: true,
        };
    }

    const dungeonCoreContract = getContract(chainId, 'dungeonCore');
    const playerProfileContract = getContract(chainId, 'playerProfile');
    const vipStakingContract = getContract(chainId, 'vipStaking');

    const { data: playerVaultAddress } = useReadContract({
        ...dungeonCoreContract,
        functionName: 'playerVaultAddress',
        query: { enabled: !!dungeonCoreContract },
    });
    
    const playerVaultContract = useMemo(() => {
        if (!playerVaultAddress) return null;
        return { address: playerVaultAddress, abi: playerVaultABI };
    }, [playerVaultAddress]);

    const { data: taxParams, isLoading: isLoadingTaxParams } = useReadContracts({
        contracts: [
            { ...playerVaultContract, functionName: 'playerInfo', args: [address!] },
            { ...playerVaultContract, functionName: 'smallWithdrawThresholdUSD' },
            { ...playerVaultContract, functionName: 'largeWithdrawThresholdUSD' },
            { ...playerVaultContract, functionName: 'standardInitialRate' },
            { ...playerVaultContract, functionName: 'largeWithdrawInitialRate' },
            { ...playerVaultContract, functionName: 'decreaseRatePerPeriod' },
            { ...playerVaultContract, functionName: 'periodDuration' },
            { ...vipStakingContract, functionName: 'getVipTaxReduction', args: [address!] },
            { ...playerProfileContract, functionName: 'getLevel', args: [address!] },
        ],
        query: { enabled: !!address && !!playerVaultContract && !!vipStakingContract && !!playerProfileContract }
    });

    const [
        playerInfo,
        smallWithdrawThresholdUSD,
        largeWithdrawThresholdUSD,
        standardInitialRate,
        largeWithdrawInitialRate,
        decreaseRatePerPeriod,
        periodDuration,
        vipTaxReduction,
        playerLevel
    ] = useMemo(() => taxParams?.map(item => item.result) ?? [], [taxParams]);
    
    const withdrawableBalance = useMemo(() => (playerInfo as any)?.[0] as bigint | 0n, [playerInfo]);

    const { data: withdrawableBalanceInUSD, isLoading: isLoadingUsdValue } = useReadContract({
        ...dungeonCoreContract,
        functionName: 'getSoulShardAmountForUSD',
        args: [withdrawableBalance],
        query: { enabled: !!dungeonCoreContract && withdrawableBalance > 0n }
    });
    
    const currentTaxRate = useMemo(() => {
        if (!taxParams || !playerInfo) return 0;
        
        const info = playerInfo as readonly [bigint, bigint, bigint];
        const lastWithdrawTimestamp = info[1];
        const lastFreeWithdrawTimestamp = info[2];
        const amountUSD = withdrawableBalanceInUSD ?? 0n;

        const oneDay = 24n * 60n * 60n;
        if (amountUSD <= (smallWithdrawThresholdUSD as bigint) && BigInt(Math.floor(Date.now() / 1000)) >= lastFreeWithdrawTimestamp + oneDay) {
            return 0;
        }
        
        let initialRate = (amountUSD > (largeWithdrawThresholdUSD as bigint)) ? (largeWithdrawInitialRate as bigint) : (standardInitialRate as bigint);

        const timeSinceLast = BigInt(Math.floor(Date.now() / 1000)) - lastWithdrawTimestamp;
        const periodsPassed = timeSinceLast / (periodDuration as bigint);
        const timeDecay = periodsPassed * (decreaseRatePerPeriod as bigint);

        const vipReduction = vipTaxReduction as bigint ?? 0n;
        const levelReduction = (playerLevel ? BigInt(Math.floor(Number(playerLevel) / 10)) : 0n) * 100n;

        const totalReduction = timeDecay + vipReduction + levelReduction;
        
        if (totalReduction >= initialRate) return 0;

        return Number(initialRate - totalReduction) / 100;

    }, [taxParams, playerInfo, withdrawableBalanceInUSD]);

    return {
        playerVaultContract,
        vaultInfo: playerInfo as readonly [bigint, bigint, bigint] | undefined,
        currentTaxRate,
        isLoading: isLoadingTaxParams || isLoadingUsdValue,
    };
};


// =================================================================
// Section: DashboardPage 主元件
// =================================================================

const DashboardPage: React.FC<{ setActivePage: (page: Page) => void }> = ({ setActivePage }) => {
    const { address, chainId } = useAccount();
    const queryClient = useQueryClient();
    const { addTransaction } = useTransactionStore();
    const { showToast } = useAppToast();

    // ★★★ 核心修正：在元件渲染的開頭加入型別防衛 ★★★
    if (!chainId || (chainId !== bsc.id && chainId !== bscTestnet.id)) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-lg text-gray-500">請連接到支援的網路 (BSC 或 BSC 測試網) 以檢視儀表板。</p>
            </div>
        );
    }

    const { playerVaultContract, vaultInfo, currentTaxRate, isLoading: isLoadingVaultAndTax } = useVaultAndTax();
    const withdrawableBalance = vaultInfo?.[0] ?? 0n;

    const playerProfileContract = getContract(chainId, 'playerProfile');
    const vipStakingContract = getContract(chainId, 'vipStaking');

    const { data: profileTokenId } = useReadContract({
        ...playerProfileContract,
        functionName: 'profileTokenOf',
        args: [address!],
        query: { enabled: !!address && !!playerProfileContract },
    });

    const { data: experience, isLoading: isLoadingProfile } = useReadContract({
        ...playerProfileContract,
        functionName: 'playerExperience',
        args: [profileTokenId!],
        query: { enabled: !!profileTokenId && typeof profileTokenId === 'bigint' && profileTokenId > 0n },
    });
    
    // 現在這個呼叫是型別安全的，因為上面的防衛確保了 chainId 是 56 或 97
    const { data: nfts, isLoading: isLoadingNfts } = useQuery({
        queryKey: ['ownedNfts', address, chainId],
        queryFn: () => fetchAllOwnedNfts(address!, chainId),
        enabled: !!address && !!chainId
    });

    const { data: vipStake, isLoading: isLoadingVip } = useReadContract({
        ...vipStakingContract,
        functionName: 'userStakes',
        args: [address!],
        query: {
            enabled: !!address && !!vipStakingContract,
            select: (data: unknown) => (Array.isArray(data) && (data[0] as bigint) > 0n) ? '質押中' : '未質押',
        },
    });
    
    const { writeContractAsync, isPending: isWithdrawing } = useWriteContract();

    const level = useMemo(() => experience ? getLevelFromExp(experience) : 1, [experience]);

    const externalMarkets = useMemo(() => {
        const currentContracts = contracts[chainId];
        if (!currentContracts) return [];
        return [
            { title: '英雄市場', address: currentContracts.hero.address, icon: <Icons.Hero className="w-8 h-8"/> },
            { title: '聖物市場', address: currentContracts.relic.address, icon: <Icons.Relic className="w-8 h-8"/> },
            { title: '隊伍市場', address: currentContracts.party.address, icon: <Icons.Party className="w-8 h-8"/> },
            { title: 'VIP 市場', address: currentContracts.vipStaking.address, icon: <Icons.Vip className="w-8 h-8"/> },
        ];
    }, [chainId]);

    const handleWithdraw = async () => {
        if (!playerVaultContract || !vaultInfo || withdrawableBalance === 0n) return;
        try {
            const hash = await writeContractAsync({ 
                ...playerVaultContract, 
                functionName: 'withdraw', 
                args: [withdrawableBalance] 
            });
            addTransaction({ hash, description: '從金庫提領 $SoulShard' });
            setTimeout(() => queryClient.invalidateQueries({ queryKey: ['playerInfo', address] }), 2000);
        } catch(e: any) { 
            showToast(e.shortMessage || "提領失敗", "error"); 
        }
    };

    const isLoading = isLoadingProfile || isLoadingNfts || isLoadingVip || isLoadingVaultAndTax;

    if (isLoading && !vaultInfo) {
        return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
    }

    return (
        <section className="space-y-8">
            <h2 className="page-title">玩家總覽中心</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 card-bg p-6 rounded-xl flex flex-col sm:flex-row items-center gap-6">
                    <div className="text-center flex-shrink-0">
                        <p className="text-sm text-gray-400">等級</p>
                        <p className="text-6xl font-bold text-yellow-400">{level}</p>
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
                    <ActionButton onClick={handleWithdraw} isLoading={isWithdrawing} disabled={!vaultInfo || withdrawableBalance === 0n} className="mt-2 h-10 w-full">
                        全部提領
                    </ActionButton>
                </div>
            </div>

            <div>
                <h3 className="section-title">資產快照</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard title="英雄總數" value={nfts?.heroes.length ?? 0} isLoading={isLoadingNfts} icon={<Icons.Hero className="w-6 h-6"/>} />
                    <StatCard title="聖物總數" value={nfts?.relics.length ?? 0} isLoading={isLoadingNfts} icon={<Icons.Relic className="w-6 h-6"/>} />
                    <StatCard title="隊伍總數" value={nfts?.parties.length ?? 0} isLoading={isLoadingNfts} icon={<Icons.Party className="w-6 h-6"/>} />
                    <StatCard title="VIP 狀態" value={vipStake ?? '讀取中...'} isLoading={isLoadingVip} icon={<Icons.Vip className="w-6 h-6"/>} />
                </div>
            </div>

            <div>
                <h3 className="section-title">快捷操作</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <QuickActionButton title="鑄造 NFT" description="獲取新的英雄與聖物" onAction={() => setActivePage('mint')} icon={<Icons.Mint className="w-8 h-8"/>} />
                    <QuickActionButton title="升星祭壇" description="提升你的 NFT 星級" onAction={() => setActivePage('altar')} icon={<Icons.Altar className="w-8 h-8"/>}/>
                    <QuickActionButton title="管理隊伍" description="創建、解散、查看資產" onAction={() => setActivePage('party')} icon={<Icons.Assets className="w-8 h-8"/>}/>
                    <QuickActionButton title="前往地下城" description="開始你的冒險" onAction={() => setActivePage('dungeon')} icon={<Icons.Dungeon className="w-8 h-8"/>}/>
                </div>
            </div>

            <div>
                <h3 className="section-title">外部市場 (OKX NFT)</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {externalMarkets.map(market => (
                        market.address && !market.address.includes('YOUR_') ? (
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
