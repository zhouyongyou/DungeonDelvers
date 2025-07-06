// src/pages/DungeonPage.tsx (RPC 優化版)

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContracts, useReadContract, useWriteContract } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { fetchAllOwnedNfts } from '../api/nfts';
import { getContract, dungeonStorageABI } from '../config/contracts';
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

// 僅支援主網 chainId 型別

type SupportedChainId = typeof bsc.id; // 56

interface Dungeon {
  id: number;
  name: string;
  requiredPower: bigint;
  rewardAmountUSD: bigint;
  baseSuccessRate: number;
  isInitialized: boolean;
}

interface PartyStatusCardProps {
  party: PartyNft;
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

    // 僅在 chainId === bsc.id 時才呼叫 getContract
    const dungeonMasterContract = chainId === bsc.id ? getContract(bsc.id, 'dungeonMaster') : null;
    const dungeonStorageContract = chainId === bsc.id ? getContract(bsc.id, 'dungeonStorage') : null;

    const { data: partyStatus, isLoading: isLoadingStatus } = useReadContract({
        ...dungeonStorageContract,
        functionName: 'getPartyStatus',
        args: [party.id],
        query: { enabled: !!dungeonStorageContract }
    });
    
    const { data: explorationFee } = useReadContract({
        ...dungeonMasterContract,
        functionName: 'explorationFee',
        query: { enabled: !!dungeonMasterContract }
    });

    const { isOnCooldown, fatigueLevel, effectivePower, provisionsRemaining } = useMemo(() => {
        if (!partyStatus) return { isOnCooldown: false, fatigueLevel: 0, effectivePower: BigInt(party.totalPower), provisionsRemaining: 0n };
        const [provisions, cooldownEndsAt, , fatigue] = partyStatus as unknown as readonly [bigint, bigint, bigint, number];
        const power = BigInt(party.totalPower);
        const effPower = power * (100n - BigInt(fatigue) * 2n) / 100n;
        return {
            isOnCooldown: BigInt(Math.floor(Date.now() / 1000)) < cooldownEndsAt,
            fatigueLevel: fatigue,
            effectivePower: effPower,
            provisionsRemaining: provisions
        };
    }, [partyStatus, party.totalPower]);

    const renderStatus = () => {
        if (isLoadingStatus) return <span className="text-gray-400">讀取狀態...</span>;
        if (isAnyTxPendingForThisParty) return <span className="px-3 py-1 text-sm font-medium text-purple-300 bg-purple-900/50 rounded-full flex items-center gap-2"><LoadingSpinner size="h-3 w-3" />遠征中</span>;
        if (isOnCooldown) return <span className="px-3 py-1 text-sm font-medium text-yellow-300 bg-yellow-900/50 rounded-full">冷卻中...</span>;
        if (provisionsRemaining === 0n) return <span className="px-3 py-1 text-sm font-medium text-orange-400 bg-orange-900/50 rounded-full">需要儲備</span>;
        if (fatigueLevel > 0) return <span className="px-3 py-1 text-sm font-medium text-blue-300 bg-blue-900/50 rounded-full">需要休息</span>;
        return <span className="px-3 py-1 text-sm font-medium text-green-300 bg-green-900/50 rounded-full">準備就緒</span>;
    };

    const renderAction = () => {
        if (isLoadingStatus) return <div className="h-10 w-full rounded-lg bg-gray-700 animate-pulse"></div>;
        if (isOnCooldown || isAnyTxPendingForThisParty) return <ActionButton disabled className="w-full h-10">{isAnyTxPendingForThisParty ? '遠征中' : '冷卻中'}</ActionButton>;
        if (provisionsRemaining === 0n) return <ActionButton onClick={() => onBuyProvisions(party.id)} className="w-full h-10 bg-orange-600 hover:bg-orange-500">購買儲備</ActionButton>;
        if (fatigueLevel > 0) return <ActionButton onClick={() => onRest(party.id)} isLoading={isTxPending} className="w-full h-10 bg-blue-600 hover:bg-blue-500">休息</ActionButton>;
        
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
                <div><p className="text-sm text-gray-400">疲勞度</p><p className="font-bold text-xl text-red-400">{fatigueLevel} / 45</p></div>
            </div>
            <p className="text-center text-xs text-gray-400 mb-2">剩餘儲備: {provisionsRemaining.toString()}</p>
            <div className="mb-4">
                <label className="text-xs text-gray-400">選擇地城:</label>
                <select 
                    value={selectedDungeonId.toString()} 
                    onChange={(e) => setSelectedDungeonId(BigInt(e.target.value))}
                    className="w-full p-2 border rounded-lg bg-gray-900/80 border-gray-700 text-white mt-1"
                    disabled={provisionsRemaining === 0n || isOnCooldown || isAnyTxPendingForThisParty}
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

const DungeonPage: React.FC<{ setActivePage: (page: Page) => void; }> = ({ setActivePage }) => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction, transactions } = useTransactionStore();

    const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
    const [selectedPartyForProvision, setSelectedPartyForProvision] = useState<bigint | null>(null);

    // 僅支援主網
    if (chainId !== bsc.id) {
        return <div className="flex justify-center items-center h-64"><p className="text-lg text-gray-500">請連接到支援的網路</p></div>;
    }

    const dungeonMasterContract = getContract(bsc.id, 'dungeonMaster');
    
    const { data: dungeonStorageAddress } = useReadContract({ ...dungeonMasterContract, functionName: 'dungeonStorage', query: { enabled: !!dungeonMasterContract } });

    const dungeonStorageContract = useMemo(() => {
        if (!dungeonStorageAddress) return null;
        return { address: dungeonStorageAddress as `0x${string}`, abi: dungeonStorageABI, chainId: bsc.id };
    }, [dungeonStorageAddress]);
    
    const { writeContractAsync, isPending: isTxPending } = useWriteContract();

    const { data: nfts, isLoading: isLoadingNfts } = useQuery({
        queryKey: ['ownedNfts', address, chainId],
        queryFn: () => fetchAllOwnedNfts(address!, chainId),
        enabled: !!address,
    });

    const { data: dungeonsData, isLoading: isLoadingDungeons } = useReadContracts({
        contracts: dungeonStorageContract ? Array.from({ length: 10 }, (_, i) => ({ ...dungeonStorageContract, functionName: 'getDungeon', args: [BigInt(i + 1)] })) : [],
        query: { enabled: !!dungeonStorageContract }
    });

    const dungeons: Dungeon[] = useMemo(() => {
        const getDungeonName = (id: number) => ["", "新手礦洞", "哥布林洞穴", "食人魔山谷", "蜘蛛巢穴", "石化蜥蜴沼澤", "巫妖墓穴", "奇美拉之巢", "惡魔前哨站", "巨龍之巔", "混沌深淵"][id] || "未知地城";
        if (!dungeonsData) return [];
        return dungeonsData.map((d, i) => {
            if (d.status !== 'success' || !Array.isArray(d.result)) return null;
            // 型別轉換加嚴: 先 unknown 再 as
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

    const isLoading = isLoadingNfts || isLoadingDungeons;

    if (isLoading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;

    return (
        <section className="space-y-8">
            <Modal isOpen={isProvisionModalOpen} onClose={() => setIsProvisionModalOpen(false)} title="購買遠征儲備" onConfirm={() => {}} confirmText="關閉">
                <ProvisionsPage preselectedPartyId={selectedPartyForProvision} onPurchaseSuccess={() => setIsProvisionModalOpen(false)} />
            </Modal>
            <div>
                <h2 className="page-title">遠征指揮中心</h2>
                {(!nfts || nfts.parties.length === 0) ? (
                    <EmptyState message="您還沒有任何隊伍可以派遣。">
                        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
                            <ActionButton onClick={() => setActivePage('party')} className="w-48 h-12">
                                前往創建隊伍
                            </ActionButton>
                            <ActionButton onClick={() => setActivePage('mint')} className="w-48 h-12 bg-teal-600 hover:bg-teal-500">
                                前往鑄造
                            </ActionButton>
                        </div>
                    </EmptyState>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {nfts.parties.map(party => (
                            <PartyStatusCard
                                key={party.id.toString()}
                                party={party}
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