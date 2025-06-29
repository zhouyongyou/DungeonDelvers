import React, { useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { getContract, contracts } from '../config/contracts';
import { fetchAllOwnedNfts } from '../api/nfts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { Page } from '../types/page';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useAppToast } from '../hooks/useAppToast';

// 【錯誤修復】將圖示定義移入此檔案，以解決導入錯誤
const Icons = {
    Mint: ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 0-10 10c0 4.42 2.87 8.17 6.84 9.5.6.11.82-.26.82-.57v-2.07c-2.78.6-3.37-1.34-3.37-1.34-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.08-.72.08-.72 1.2.08 1.83 1.23 1.83 1.23 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.66-.3-5.46-1.33-5.46-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23.95-.26 1.98-.39 3-.4s2.05.13 3 .4c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .31.22.69.82.57A10 10 0 0 0 22 12 10 10 0 0 0 12 2z"/></svg>,
    Altar: ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
    Assets: ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
    Dungeon: ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    Hero: ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>,
    Relic: ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
    Party: ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    Vip: ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
    ExternalLink: ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
    Okx: ({ className }: { className?: string }) => <svg className={className} role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><title>OKX</title><path d="M13.262 3.124L.276 10.33v3.34l4.16-2.522v5.138l-4.16 2.522v3.34l12.986-7.206V3.124h-.001zm.013 14.52l-8.815 4.896v-3.353l4.67-2.833-.001 5.311.001.001 4.145-2.522v-1.5zm0-7.268l-8.815 4.897v-3.353l4.67-2.833-.001 5.311.001.001 4.145-2.522v-1.5zM23.725 10.33L10.74 3.125v13.52l8.816-4.896v3.353l-4.67 2.833.001-5.31-4.146 2.52v1.5l8.815-4.896v3.353l-4.67 2.833.001-5.31 4.146-2.522v-1.5z"/></svg>,
    Element: ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm5.68,13.45L12.35,9.23a.1.1,0,0,0-.15,0L6.32,15.45a.1.1,0,0,1-.08.05H6.2a.1.1,0,0,1-.08-.18l6-6.6a.1.1,0,0,1,.15,0l5.88,6.22a.1.1,0,0,1,0,.15.1.1,0,0,1-.07.05h-.06A.1.1,0,0,1,17.68,15.45Z"/></svg>,
};


const getLevelFromExp = (exp: bigint): number => {
    const expNum = Number(exp);
    if (expNum < 100) return 1;
    return Math.floor(Math.sqrt(expNum / 100)) + 1;
};

const getExpForLevel = (level: number): bigint => {
    if (level <= 1) return 0n;
    return BigInt(level) * BigInt(level) * 100n;
};


const StatCard: React.FC<{ title: string; value: string | number; isLoading?: boolean, children?: React.ReactNode, className?: string }> = ({ title, value, isLoading, children, className }) => (
    <div className={`card-bg p-4 rounded-xl text-center shadow-lg ${className}`}>
        <p className="text-sm text-gray-400">{title}</p>
        {isLoading ? <div className="h-8 w-1/2 mx-auto bg-gray-700 rounded-md animate-pulse mt-1"></div> : <p className="text-2xl font-bold text-white">{value}</p>}
        {children}
    </div>
);

const QuickActionButton: React.FC<{ title: string; description: string; onAction: () => void; icon: React.ReactNode }> = ({ title, description, onAction, icon }) => (
    <button onClick={onAction} className="card-bg p-4 rounded-xl text-left w-full hover:bg-gray-700 transition-colors duration-200 flex items-center gap-4">
        <div className="text-yellow-400">{icon}</div>
        <div>
            <p className="font-bold text-lg text-white">{title}</p>
            <p className="text-xs text-gray-400">{description}</p>
        </div>
    </button>
);

const ExternalLinkButton: React.FC<{ title: string; url: string; icon: React.ReactNode }> = ({ title, url, icon }) => (
    <a href={url} target="_blank" rel="noopener noreferrer" className="card-bg p-4 rounded-xl text-left w-full hover:bg-gray-700 transition-colors duration-200 flex items-center gap-4">
        <div className="text-gray-400">{icon}</div>
        <div>
            <p className="font-bold text-lg text-white">{title}</p>
            <p className="text-xs text-gray-500">在 OKX 市場交易</p>
        </div>
        <Icons.ExternalLink className="w-4 h-4 ml-auto text-gray-500" />
    </a>
);


const DashboardPage: React.FC<{ setActivePage: (page: Page) => void }> = ({ setActivePage }) => {
    const { address, chainId } = useAccount();
    const queryClient = useQueryClient();
    const { addTransaction } = useTransactionStore();
    const { showToast } = useAppToast();

    const playerProfileContract = getContract(chainId, 'playerProfile');
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');
    const vipStakingContract = getContract(chainId, 'vipStaking');

    const currentContracts = chainId && contracts[chainId as keyof typeof contracts] ? contracts[chainId as keyof typeof contracts] : null;

    const { data: playerProfile, isLoading: isLoadingProfile } = useReadContract({
        ...playerProfileContract,
        functionName: 'profiles',
        args: [address!],
        query: {
            enabled: !!address && !!playerProfileContract,
            select: (data: unknown) => (Array.isArray(data) ? { level: data[0] as number, experience: data[1] as bigint } : { level: 1, experience: 0n }),
        }
    });

    const { data: vaultInfo, isLoading: isLoadingVault } = useReadContract({
        ...dungeonCoreContract,
        functionName: 'playerInfo',
        args: [address!],
        query: {
            enabled: !!address && !!dungeonCoreContract,
            select: (data: unknown) => (Array.isArray(data) && data.length >= 3 ? { withdrawableBalance: data[0] as bigint, lastWithdrawTimestamp: data[1] as bigint, isFirstWithdraw: data[2] as boolean } : { withdrawableBalance: 0n, lastWithdrawTimestamp: 0n, isFirstWithdraw: true }),
        }
    });
    
    const { data: nfts, isLoading: isLoadingNfts } = useQuery({
        queryKey: ['ownedNfts', address, chainId],
        queryFn: () => fetchAllOwnedNfts(address!, chainId!),
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

    const currentTaxRate = useMemo(() => {
        if (!vaultInfo || vaultInfo.isFirstWithdraw) return 0;
        const now = BigInt(Math.floor(Date.now() / 1000));
        const timeSinceLast = now - vaultInfo.lastWithdrawTimestamp;
        const TAX_PERIOD = 24n * 60n * 60n;
        if (timeSinceLast < TAX_PERIOD * 3n) {
            const periodsPassed = timeSinceLast / TAX_PERIOD;
            const MAX_TAX_RATE = 30n;
            const TAX_DECREASE_RATE = 10n;
            const taxReduction = periodsPassed * TAX_DECREASE_RATE;
            return Number(MAX_TAX_RATE > taxReduction ? MAX_TAX_RATE - taxReduction : 0n);
        }
        return 0;
    }, [vaultInfo]);

    const handleWithdraw = async () => {
        if (!dungeonCoreContract || !vaultInfo || vaultInfo.withdrawableBalance === 0n) return;
        try {
            const hash = await writeContractAsync({ ...dungeonCoreContract, functionName: 'withdraw', args: [vaultInfo.withdrawableBalance] });
            addTransaction({ hash, description: '從金庫提領 $SoulShard' });
            setTimeout(() => queryClient.invalidateQueries({ queryKey: ['playerInfo', address] }), 2000);
        } catch(e: any) { showToast((e as Error).message || "提領失敗", "error"); }
    };

    const level = playerProfile ? getLevelFromExp(playerProfile.experience) : 1;
    const currentLevelTotalExp = getExpForLevel(level-1);
    const nextLevelTotalExp = getExpForLevel(level);
    const expInCurrentLevel = playerProfile ? playerProfile.experience - currentLevelTotalExp : 0n;
    const expNeededForNextLevel = nextLevelTotalExp - currentLevelTotalExp;
    const expPercentage = expNeededForNextLevel > 0n ? Number((expInCurrentLevel * 10000n) / expNeededForNextLevel) / 100 : 100;
    
    const isLoading = isLoadingProfile || isLoadingVault || isLoadingNfts || isLoadingVip;

    const externalMarkets = [
        { title: '英雄市場', address: currentContracts?.hero.address, icon: <Icons.Hero className="w-8 h-8"/> },
        { title: '聖物市場', address: currentContracts?.relic.address, icon: <Icons.Relic className="w-8 h-8"/> },
        { title: '隊伍市場', address: currentContracts?.party.address, icon: <Icons.Party className="w-8 h-8"/> },
        { title: 'VIP 市場', address: currentContracts?.vipStaking.address, icon: <Icons.Vip className="w-8 h-8"/> },
    ];
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
    }

    return (
        <section>
            <h2 className="page-title">玩家總覽中心</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="card-bg p-6 rounded-xl">
                        <h3 className="section-title">我的檔案</h3>
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <div className="text-center flex-shrink-0">
                                <p className="text-sm text-gray-400">等級</p>
                                <p className="text-6xl font-bold text-yellow-400">{level}</p>
                            </div>
                            <div className="w-full">
                                <p className="text-sm text-gray-400 text-right">{`${expInCurrentLevel.toString()} / ${expNeededForNextLevel.toString()} EXP`}</p>
                                <div className="w-full bg-gray-700 rounded-full h-4 mt-1 overflow-hidden">
                                    <div className="bg-yellow-500 h-4 rounded-full transition-all duration-500" style={{ width: `${expPercentage}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">總經驗值: {playerProfile?.experience.toString() ?? '0'}</p>
                            </div>
                        </div>
                    </div>
                    <div className="card-bg p-6 rounded-xl flex flex-col sm:flex-row justify-between items-center">
                        <div>
                            <h3 className="section-title">我的金庫</h3>
                            <p className="text-sm text-gray-400">可提領的 $SoulShard 獎勵</p>
                            <p className="text-xs text-red-400 mt-1">當前稅率: {currentTaxRate}%</p>
                        </div>
                        <div className="text-center sm:text-right mt-4 sm:mt-0">
                            <p className="text-3xl font-bold text-teal-400">{parseFloat(formatEther(vaultInfo?.withdrawableBalance ?? 0n)).toFixed(4)}</p>
                            <ActionButton onClick={handleWithdraw} isLoading={isWithdrawing} disabled={!vaultInfo || vaultInfo.withdrawableBalance === 0n} className="mt-2 h-10">全部提領</ActionButton>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-1 card-bg p-6 rounded-xl">
                    <h3 className="section-title">資產快照</h3>
                    <div className="space-y-4">
                        <StatCard title="英雄總數" value={nfts?.heroes.length ?? 0} isLoading={isLoadingNfts} />
                        <StatCard title="聖物總數" value={nfts?.relics.length ?? 0} isLoading={isLoadingNfts} />
                        <StatCard title="隊伍總數" value={nfts?.parties.length ?? 0} isLoading={isLoadingNfts} />
                        <StatCard title="VIP 狀態" value={vipStake ?? '讀取中...'} isLoading={isLoadingVip} />
                    </div>
                </div>
            </div>
            <div className="mt-8">
                <h3 className="section-title">快捷操作</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <QuickActionButton title="鑄造 NFT" description="獲取新的英雄與聖物" onAction={() => setActivePage('mint')} icon={<Icons.Mint className="w-8 h-8"/>} />
                    <QuickActionButton title="升星祭壇" description="提升你的 NFT 星級" onAction={() => setActivePage('altar')} icon={<Icons.Altar className="w-8 h-8"/>}/>
                    <QuickActionButton title="我的資產" description="管理你的所有 NFT" onAction={() => setActivePage('party')} icon={<Icons.Assets className="w-8 h-8"/>}/>
                    <QuickActionButton title="前往地下城" description="開始你的冒險" onAction={() => setActivePage('dungeon')} icon={<Icons.Dungeon className="w-8 h-8"/>}/>
                </div>
            </div>
            <div className="mt-8">
                <h3 className="section-title">外部市場 (OKX NFT)</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
