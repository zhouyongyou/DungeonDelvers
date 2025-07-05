import React, { useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { fetchAllOwnedNfts } from '../api/nfts';
import { getContract, dungeonCoreABI } from '../config/contracts';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ActionButton } from '../components/ui/ActionButton';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import type { Page } from '../types/page';
import type { PartyNft, HeroNft, RelicNft } from '../types/nft';
import { Icons } from '../components/ui/icons';

// =================================================================
// Section: 型別定義與子元件
// =================================================================

// 【新增回來】定義地下城的資料結構
interface Dungeon {
  id: number;
  requiredPower: bigint;
  rewardAmountUSD: bigint;
  baseSuccessRate: number;
  isInitialized: boolean;
}

interface PartyStatusCardProps {
  party: PartyNft;
  allHeroes: HeroNft[];
  allRelics: RelicNft[];
  onStartExpedition: (partyId: bigint) => void;
  onRest: (partyId: bigint, cost: bigint) => void;
  isTxPending: boolean;
}

const PartyStatusCard: React.FC<PartyStatusCardProps> = ({ party, allHeroes, allRelics, onStartExpedition, onRest, isTxPending }) => {
    const { chainId } = useAccount();
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');
    const dungeonMasterContract = getContract(chainId, 'dungeonMaster');

    const { data: isOnExpedition, isLoading: isLoadingStatus } = useReadContract({
        ...dungeonCoreContract,
        functionName: 'isPartyOnExpedition',
        args: [party.id],
        query: { enabled: !!dungeonCoreContract, refetchInterval: 5000 }
    });

    const { data: restCost, isLoading: isLoadingCost } = useReadContract({
        ...dungeonMasterContract,
        functionName: 'getRestCost',
        args: [party.id],
        query: { enabled: !!dungeonMasterContract && !isOnExpedition }
    });

    const partyHeroes = party.heroIds.map(id => allHeroes.find(h => h.id === id)).filter(Boolean) as HeroNft[];
    const partyRelics = party.relicIds.map(id => allRelics.find(r => r.id === id)).filter(Boolean) as RelicNft[];

    const renderStatus = () => {
        if (isLoadingStatus) return <span className="text-gray-400">讀取狀態...</span>;
        if (isOnExpedition) return <span className="px-3 py-1 text-sm font-medium text-yellow-300 bg-yellow-900/50 rounded-full">遠征中...</span>;
        if (restCost && restCost > 0n) return <span className="px-3 py-1 text-sm font-medium text-blue-300 bg-blue-900/50 rounded-full">需要休息</span>;
        return <span className="px-3 py-1 text-sm font-medium text-green-300 bg-green-900/50 rounded-full">準備就緒</span>;
    };

    const renderAction = () => {
        if (isLoadingStatus || isLoadingCost) return <div className="h-10 w-full rounded-lg bg-gray-700 animate-pulse"></div>;
        if (isOnExpedition) return <ActionButton disabled className="w-full h-10">遠征進行中</ActionButton>;
        if (restCost && restCost > 0n) {
            return (
                <ActionButton onClick={() => onRest(party.id, restCost)} isLoading={isTxPending} className="w-full h-10">
                    休息 (花費 {parseFloat(formatEther(restCost)).toFixed(4)})
                </ActionButton>
            );
        }
        return <ActionButton onClick={() => onStartExpedition(party.id)} isLoading={isTxPending} className="w-full h-10">開始遠征</ActionButton>;
    };

    return (
        <div className={`card-bg p-4 rounded-2xl flex flex-col h-full border-2 ${isOnExpedition ? 'border-yellow-500/50' : 'border-transparent'}`}>
            <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-lg text-white truncate pr-2">{party.name}</h4>
                {renderStatus()}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4 text-center">
                <div><p className="text-sm text-gray-400">總戰力</p><p className="font-bold text-xl text-indigo-400">{party.totalPower}</p></div>
                <div><p className="text-sm text-gray-400">總容量</p><p className="font-bold text-xl text-teal-400">{party.totalCapacity}</p></div>
            </div>
            <div className="space-y-2 mb-4 flex-grow">
                <div className="flex items-center gap-2 text-sm text-gray-300"><Icons.Hero className="w-5 h-5 text-gray-500" /><div className="flex flex-wrap gap-1">{partyHeroes.map(h => <img key={h.id} src={h.image.replace('ipfs://', 'https://ipfs.io/ipfs/')} alt={h.name} className="w-8 h-8 rounded-full bg-gray-700" />)}</div></div>
                <div className="flex items-center gap-2 text-sm text-gray-300"><Icons.Relic className="w-5 h-5 text-gray-500" /><div className="flex flex-wrap gap-1">{partyRelics.map(r => <img key={r.id} src={r.image.replace('ipfs://', 'https://ipfs.io/ipfs/')} alt={r.name} className="w-8 h-8 rounded-full bg-gray-700" />)}</div></div>
            </div>
            {renderAction()}
        </div>
    );
};

// 【新增回來】地下城資訊卡片子元件
const DungeonInfoCard: React.FC<{ dungeon: Dungeon }> = ({ dungeon }) => {
    const getDungeonName = (id: number) => ["", "新手礦洞", "哥布林洞穴", "食人魔山谷", "蜘蛛巢穴", "石化蜥蜴沼澤", "巫妖墓穴", "奇美拉之巢", "惡魔前哨站", "巨龍之巔", "混沌深淵"][id] || "未知地城";
    return (
        <div className="card-bg p-4 rounded-xl shadow-lg flex flex-col bg-gray-800/50">
            <h4 className="text-lg font-bold font-serif text-yellow-300">{getDungeonName(dungeon.id)}</h4>
            <div className="flex-grow mt-2 text-sm space-y-1 text-gray-300">
                <p>要求戰力: <span className="font-semibold text-white">{dungeon.requiredPower.toString()}</span></p>
                <p>基礎獎勵: <span className="font-semibold text-white">~${parseFloat(formatEther(dungeon.rewardAmountUSD)).toFixed(2)}</span></p>
                <p>成功率: <span className="font-semibold text-white">{dungeon.baseSuccessRate}%</span></p>
                <p className="font-bold text-sky-400">預計經驗: +{dungeon.id * 10} EXP</p>
            </div>
        </div>
    );
};

// =================================================================
// Section: DungeonPage 主元件
// =================================================================

const DungeonPage: React.FC<{ setActivePage: (page: Page) => void; setPreselectedPartyId: (id: bigint | null) => void; }> = ({ setActivePage, setPreselectedPartyId }) => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();

    const dungeonCoreContract = getContract(chainId, 'dungeonCore');
    const dungeonMasterContract = getContract(chainId, 'dungeonMaster');

    const { writeContractAsync, isPending: isTxPending } = useWriteContract();

    const { data: nfts, isLoading: isLoadingNfts } = useQuery({
        queryKey: ['ownedNfts', address, chainId],
        queryFn: () => fetchAllOwnedNfts(address!, chainId!),
        enabled: !!address && !!chainId,
    });

    // 【新增回來】使用 useReadContracts 一次性獲取所有地下城資訊
    const { data: dungeonsData, isLoading: isLoadingDungeons } = useReadContracts({
        contracts: Array.from({ length: 10 }, (_, i) => ({
            ...dungeonCoreContract,
            functionName: 'dungeons',
            args: [BigInt(i + 1)],
        })),
        query: { enabled: !!dungeonCoreContract }
    });

    const dungeons: Dungeon[] = useMemo(() => {
        if (!dungeonsData) return [];
        return dungeonsData.map((d, i) => {
            if (d.status !== 'success' || !Array.isArray(d.result)) return null;
            const [requiredPower, rewardAmountUSD, baseSuccessRate, isInitialized] = d.result;
            return { id: i + 1, requiredPower, rewardAmountUSD, baseSuccessRate, isInitialized };
        }).filter((d): d is Dungeon => d !== null && d.isInitialized);
    }, [dungeonsData]);

    const handleStartExpedition = async (partyId: bigint) => {
        if (!dungeonCoreContract) return;
        try {
            const hash = await writeContractAsync({
                ...dungeonCoreContract,
                functionName: 'requestExpedition',
                args: [partyId],
            });
            addTransaction({ hash, description: `隊伍 #${partyId.toString()} 開始遠征` });
        } catch (e: any) {
            if (!e.message.includes('User rejected the request')) {
                showToast(e.shortMessage || "遠征請求失敗", "error");
            }
        }
    };

    const handleRest = async (partyId: bigint, cost: bigint) => {
        if (!dungeonMasterContract) return;
        try {
            const hash = await writeContractAsync({
                ...dungeonMasterContract,
                functionName: 'rest',
                args: [partyId],
                value: cost,
            });
            addTransaction({ hash, description: `隊伍 #${partyId.toString()} 正在休息` });
        } catch (e: any) {
            if (!e.message.includes('User rejected the request')) {
                showToast(e.shortMessage || "休息失敗", "error");
            }
        }
    };

    const isLoading = isLoadingNfts || isLoadingDungeons;

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
    }

    return (
        <section className="space-y-8">
            <div>
                <h2 className="page-title">遠征指揮中心</h2>
                {(!nfts || nfts.parties.length === 0) ? (
                    <EmptyState message="您還沒有任何隊伍可以派遣。">
                        <ActionButton onClick={() => setActivePage('party')} className="mt-4">前往創建隊伍</ActionButton>
                    </EmptyState>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {nfts.parties.map(party => (
                            <PartyStatusCard
                                key={party.id}
                                party={party}
                                allHeroes={nfts.heroes}
                                allRelics={nfts.relics}
                                onStartExpedition={handleStartExpedition}
                                onRest={handleRest}
                                isTxPending={isTxPending}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* 【新增回來】地下城資訊參考區 */}
            <div>
                <h2 className="page-title">可挑戰的地下城</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {dungeons.map(dungeon => (
                        <DungeonInfoCard key={dungeon.id} dungeon={dungeon} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default DungeonPage;
