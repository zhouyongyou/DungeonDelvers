// src/pages/DungeonPage.tsx (The Graph 改造版)

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
// 不再需要從 nfts.ts 獲取數據
// import { fetchAllOwnedNfts } from '../api/nfts';
import { getContract, type SupportedChainId } from '../config/contracts';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ActionButton } from '../components/ui/ActionButton';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import type { Page } from '../types/page';
import type { PartyNft } from '../types/nft';
import { Modal } from '../components/ui/Modal';
import ProvisionsPage from './ProvisionsPage';
import { bsc } from 'wagmi/chains';

// =================================================================
// Section: 型別定義與 GraphQL 查詢
// =================================================================

const THE_GRAPH_API_URL = import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL;

interface Dungeon {
  id: number;
  name: string;
  requiredPower: bigint;
  rewardAmountUSD: bigint;
  baseSuccessRate: number;
  isInitialized: boolean;
}

// 查詢玩家擁有的隊伍及其詳細狀態
const GET_PLAYER_PARTIES_QUERY = `
  query GetPlayerParties($owner: ID!) {
    player(id: $owner) {
      parties {
        id
        tokenId
        totalPower
        totalCapacity
        partyRarity
        provisionsRemaining
        cooldownEndsAt
        unclaimedRewards
        fatigueLevel
        heroes {
          id
          tokenId
        }
        relics {
          id
          tokenId
        }
      }
    }
  }
`;

// =================================================================
// Section: 數據獲取 Hooks
// =================================================================

// 新的 Hook，用於從 The Graph 獲取所有隊伍的數據
const usePlayerParties = () => {
    const { address, chainId } = useAccount();
    return useQuery<PartyNft[]>({
        queryKey: ['playerParties', address, chainId],
        queryFn: async () => {
            if (!address || !THE_GRAPH_API_URL) return [];
            const response = await fetch(THE_GRAPH_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: GET_PLAYER_PARTIES_QUERY,
                    variables: { owner: address.toLowerCase() },
                }),
            });
            if (!response.ok) throw new Error('GraphQL Network response was not ok');
            const { data } = await response.json();
            
            // 將 The Graph 回傳的數據轉換為我們前端的 PartyNft 型別
            return data?.player?.parties?.map((p: any) => ({
                id: BigInt(p.tokenId),
                tokenId: BigInt(p.tokenId),
                name: `隊伍 #${p.tokenId}`,
                image: '', 
                description: '',
                attributes: [],
                contractAddress: getContract(bsc.id, 'party')?.address ?? '0x',
                type: 'party',
                totalPower: BigInt(p.totalPower),
                totalCapacity: BigInt(p.totalCapacity),
                // ★★★ 修正點：正確填充 heroIds 和 relicIds ★★★
                heroIds: p.heroes.map((h: any) => BigInt(h.tokenId)),
                relicIds: p.relics.map((r: any) => BigInt(r.tokenId)),
                partyRarity: p.partyRarity,
                // 直接從 The Graph 獲取狀態
                provisionsRemaining: BigInt(p.provisionsRemaining),
                cooldownEndsAt: BigInt(p.cooldownEndsAt),
                unclaimedRewards: BigInt(p.unclaimedRewards),
                fatigueLevel: Number(p.fatigueLevel),
            })) ?? [];
        },
        enabled: !!address && chainId === bsc.id,
    });
};

// =================================================================
// Section: 子元件 (簡化後)
// =================================================================

// PartyStatusCard 現在是一個純粹的 UI 元件
interface PartyStatusCardProps {
  party: PartyNft & { provisionsRemaining: bigint; cooldownEndsAt: bigint; fatigueLevel: number; };
  dungeons: Dungeon[];
  onStartExpedition: (partyId: bigint, dungeonId: bigint, fee: bigint) => void;
  onRest: (partyId: bigint) => void;
  onBuyProvisions: (partyId: bigint) => void;
  isTxPending: boolean;
  isAnyTxPendingForThisParty: boolean;
  chainId: SupportedChainId;
}

const PartyStatusCard: React.FC<PartyStatusCardProps> = ({ party, dungeons, onStartExpedition, onRest, onBuyProvisions, isTxPending, isAnyTxPendingForThisParty, chainId }) => {
    const [selectedDungeonId, setSelectedDungeonId] = useState<bigint>(1n);
    const dungeonMasterContract = getContract(chainId, 'dungeonMaster');
    
    const { data: explorationFee } = useReadContract({
        ...dungeonMasterContract,
        functionName: 'explorationFee',
        query: { enabled: !!dungeonMasterContract }
    });

    const { isOnCooldown, effectivePower, fatigueColorClass } = useMemo(() => {
        const power = BigInt(party.totalPower);
        const effPower = power * (100n - BigInt(party.fatigueLevel) * 2n) / 100n;
        
        // 疲勞度顏色邏輯：0-15 綠色（健康），16-30 黃色（疲勞），31-45 紅色（非常疲勞）
        let fatigueColor = 'text-green-400';
        if (party.fatigueLevel > 30) {
            fatigueColor = 'text-red-400';
        } else if (party.fatigueLevel > 15) {
            fatigueColor = 'text-yellow-400';
        }
        
        return {
            isOnCooldown: BigInt(Math.floor(Date.now() / 1000)) < party.cooldownEndsAt,
            effectivePower: effPower,
            fatigueColorClass: fatigueColor,
        };
    }, [party]);

    const renderStatus = () => {
        if (isAnyTxPendingForThisParty) return <span className="px-3 py-1 text-sm font-medium text-purple-300 bg-purple-900/50 rounded-full flex items-center gap-2"><LoadingSpinner size="h-3 w-3" />遠征中</span>;
        if (isOnCooldown) return <span className="px-3 py-1 text-sm font-medium text-yellow-300 bg-yellow-900/50 rounded-full">冷卻中...</span>;
        if (party.provisionsRemaining === 0n) return <span className="px-3 py-1 text-sm font-medium text-orange-400 bg-orange-900/50 rounded-full">需要儲備</span>;
        if (party.fatigueLevel > 30) return <span className="px-3 py-1 text-sm font-medium text-red-300 bg-red-900/50 rounded-full">急需休息</span>;
        if (party.fatigueLevel > 15) return <span className="px-3 py-1 text-sm font-medium text-yellow-300 bg-yellow-900/50 rounded-full">建議休息</span>;
        return <span className="px-3 py-1 text-sm font-medium text-green-300 bg-green-900/50 rounded-full">準備就緒</span>;
    };

    const renderAction = () => {
        if (isOnCooldown || isAnyTxPendingForThisParty) return <ActionButton disabled className="w-full h-10">{isAnyTxPendingForThisParty ? '遠征中' : '冷卻中'}</ActionButton>;
        if (party.provisionsRemaining === 0n) return <ActionButton onClick={() => onBuyProvisions(party.id)} className="w-full h-10 bg-orange-600 hover:bg-orange-500">購買儲備</ActionButton>;
        if (party.fatigueLevel > 30) return <ActionButton onClick={() => onRest(party.id)} isLoading={isTxPending} className="w-full h-10 bg-red-600 hover:bg-red-500">休息</ActionButton>;
        if (party.fatigueLevel > 15) return <ActionButton onClick={() => onRest(party.id)} isLoading={isTxPending} className="w-full h-10 bg-yellow-600 hover:bg-yellow-500">建議休息</ActionButton>;
        
        const fee = typeof explorationFee === 'bigint' ? explorationFee : 0n;
        return <ActionButton onClick={() => onStartExpedition(party.id, selectedDungeonId, fee)} isLoading={isTxPending} className="w-full h-10">開始遠征</ActionButton>;
    };

    return (
        <div className={`card-bg p-4 rounded-2xl flex flex-col h-full border-2 transition-all ${isAnyTxPendingForThisParty ? 'border-purple-500/50' : isOnCooldown ? 'border-yellow-500/50' : 'border-transparent'}`}>
            <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-lg text-white truncate pr-2">{party.name}</h4>
                {renderStatus()}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4 text-center">
                <div><p className="text-sm text-gray-400">有效戰力</p><p className="font-bold text-2xl text-indigo-400">{effectivePower.toString()}</p></div>
                <div><p className="text-sm text-gray-400">疲勞度</p><p className={`font-bold text-xl ${fatigueColorClass}`}>{party.fatigueLevel} / 45</p></div>
            </div>
            <p className="text-center text-xs text-gray-400 mb-2">剩餘儲備: {party.provisionsRemaining.toString()}</p>
            <div className="mb-4">
                <label className="text-xs text-gray-400">選擇地城:</label>
                <select 
                    value={selectedDungeonId.toString()} 
                    onChange={(e) => setSelectedDungeonId(BigInt(e.target.value))}
                    className="w-full p-2 border rounded-lg bg-gray-900/80 border-gray-700 text-white mt-1"
                    disabled={party.provisionsRemaining === 0n || isOnCooldown || isAnyTxPendingForThisParty}
                >
                    {dungeons.map(d => <option key={d.id} value={d.id.toString()}>{d.id}. {d.name} (要求: {d.requiredPower.toString()})</option>)}
                </select>
            </div>
            {renderAction()}
        </div>
    );
};

const DungeonInfoCard: React.FC<{ dungeon: Dungeon }> = ({ dungeon }) => (
    <div className="card-bg p-4 rounded-xl shadow-lg flex flex-col bg-gray-800/50">
        <h4 className="text-lg font-bold font-serif text-yellow-300">{dungeon.name}</h4>
        <div className="flex-grow mt-2 text-sm space-y-1 text-gray-300">
            <p>要求戰力: <span className="font-semibold text-white">{dungeon.requiredPower.toString()}</span></p>
            <p>基礎獎勵: <span className="font-semibold text-white">~${parseFloat(formatEther(dungeon.rewardAmountUSD)).toFixed(2)}</span></p>
            <p>成功率: <span className="font-semibold text-white">{dungeon.baseSuccessRate}%</span></p>
            <p className="font-bold text-sky-400">預計經驗: +{dungeon.id * 5 + 20} EXP</p>
        </div>
    </div>
);


// =================================================================
// Section: 主頁面元件
// =================================================================

const DungeonPage: React.FC<{ setActivePage: (page: Page) => void; }> = ({ setActivePage }) => {
    const { chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction, transactions } = useTransactionStore();

    const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
    const [selectedPartyForProvision, setSelectedPartyForProvision] = useState<bigint | null>(null);

    // ✅ 將所有Hooks調用移到組件頂部，在任何條件語句之前
    const dungeonMasterContract = getContract(bsc.id, 'dungeonMaster');
    const { writeContractAsync, isPending: isTxPending } = useWriteContract();

    // ★ 核心改造：使用新的 Hook 獲取隊伍數據
    const { data: parties, isLoading: isLoadingParties } = usePlayerParties();

    // 獲取地城資訊的邏輯保持不變，因為這是全域數據
    const { data: dungeonsData, isLoading: isLoadingDungeons } = useReadContracts({
        contracts: Array.from({ length: 10 }, (_, i) => ({
            ...getContract(bsc.id, 'dungeonStorage'),
            functionName: 'getDungeon',
            args: [BigInt(i + 1)],
        })),
        query: { enabled: !!getContract(bsc.id, 'dungeonStorage') && chainId === bsc.id }
    });

    // ✅ 條件渲染移到所有Hooks之後
    if (chainId !== bsc.id) {
        return <div className="flex justify-center items-center h-64"><p className="text-lg text-gray-500">請連接到支援的網路</p></div>;
    }

    const dungeons: Dungeon[] = useMemo(() => {
        const getDungeonName = (id: number) => ["", "新手礦洞", "哥布林洞穴", "食人魔山谷", "蜘蛛巢穴", "石化蜥蜴沼澤", "巫妖墓穴", "奇美拉之巢", "惡魔前哨站", "巨龍之巔", "混沌深淵"][id] || "未知地城";
        if (!dungeonsData) return [];
        return dungeonsData.map((d, i) => {
            if (d.status !== 'success' || !Array.isArray(d.result)) return null;
            const [requiredPower, rewardAmountUSD, baseSuccessRate, isInitialized] = d.result as unknown as [bigint, bigint, number, boolean];
            return { id: i + 1, name: getDungeonName(i + 1), requiredPower, rewardAmountUSD, baseSuccessRate, isInitialized };
        }).filter((d): d is Dungeon => d !== null && d.isInitialized);
    }, [dungeonsData]);
    
    const checkPendingTxForParty = (partyId: bigint) => {
        return transactions.some(tx => tx.status === 'pending' && tx.description.includes(`隊伍 #${partyId.toString()}`));
    };

    const handleStartExpedition = async (partyId: bigint, dungeonId: bigint, fee: bigint) => {
        if (!dungeonMasterContract) return;
        try {
            const hash = await writeContractAsync({ ...dungeonMasterContract, functionName: 'requestExpedition', args: [partyId, dungeonId], value: fee, });
            addTransaction({ hash, description: `隊伍 #${partyId.toString()} 遠征地城 #${dungeonId}` });
        } catch (e: any) { if (!e.message.includes('User rejected the request')) { showToast(e.shortMessage || "遠征請求失敗", "error"); } }
    };

    const handleRest = async (partyId: bigint) => {
        if (!dungeonMasterContract) return;
        try {
            const hash = await writeContractAsync({ ...dungeonMasterContract, functionName: 'restParty', args: [partyId], });
            addTransaction({ hash, description: `隊伍 #${partyId.toString()} 正在休息` });
        } catch (e: any) { if (!e.message.includes('User rejected the request')) { showToast(e.shortMessage || "休息失敗", "error"); } }
    };

    const handleBuyProvisions = (partyId: bigint) => {
        setSelectedPartyForProvision(partyId);
        setIsProvisionModalOpen(true);
    };

    const isLoading = isLoadingParties || isLoadingDungeons;

    if (isLoading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;

    return (
        <section className="space-y-8">
            <Modal isOpen={isProvisionModalOpen} onClose={() => setIsProvisionModalOpen(false)} title="購買遠征儲備" onConfirm={() => {}} confirmText="關閉">
                <ProvisionsPage preselectedPartyId={selectedPartyForProvision} onPurchaseSuccess={() => setIsProvisionModalOpen(false)} />
            </Modal>
            <div>
                <h2 className="page-title">遠征指揮中心</h2>
                {(!parties || parties.length === 0) ? (
                    <EmptyState message="您還沒有任何隊伍可以派遣。">
                        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
                            <ActionButton onClick={() => setActivePage('party')} className="w-48 h-12">前往創建隊伍</ActionButton>
                            <ActionButton onClick={() => setActivePage('mint')} className="w-48 h-12 bg-teal-600 hover:bg-teal-500">前往鑄造</ActionButton>
                        </div>
                    </EmptyState>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {parties.map((party) => (
                            <PartyStatusCard
                                key={party.id.toString()}
                                party={party as any} // Cast to include the status properties
                                dungeons={dungeons}
                                onStartExpedition={handleStartExpedition}
                                onRest={handleRest}
                                onBuyProvisions={handleBuyProvisions}
                                isTxPending={isTxPending}
                                isAnyTxPendingForThisParty={checkPendingTxForParty(party.id)}
                                chainId={bsc.id}
                            />
                        ))}
                    </div>
                )}
            </div>
            <div>
                <h2 className="page-title">可挑戰的地下城</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {dungeons.map(dungeon => ( <DungeonInfoCard key={dungeon.id} dungeon={dungeon} /> ))}
                </div>
            </div>
        </section>
    );
};

export default DungeonPage;
