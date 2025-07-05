// src/pages/DungeonPage.tsx (最終修正版)

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContracts, useReadContract, useWriteContract } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatEther, type Abi } from 'viem';
import { fetchAllOwnedNfts } from '../api/nfts';
import { getContract, dungeonMasterABI, dungeonStorageABI } from '../config/contracts';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ActionButton } from '../components/ui/ActionButton';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import type { Page } from '../types/page';
import type { PartyNft } from '../types/nft';
import { Modal } from '../components/ui/Modal';
import ProvisionsPage from './ProvisionsPage';

// 地城資訊的型別定義
interface Dungeon {
  id: number;
  name: string;
  requiredPower: bigint;
  rewardAmountUSD: bigint;
  baseSuccessRate: number;
  isInitialized: boolean;
}

// 單個隊伍卡片的 Props 型別
interface PartyStatusCardProps {
  party: PartyNft;
  dungeons: Dungeon[];
  onStartExpedition: (partyId: bigint, dungeonId: bigint, fee: bigint) => void;
  onRest: (partyId: bigint) => void;
  onBuyProvisions: (partyId: bigint) => void;
  isTxPending: boolean;
}

/**
 * 隊伍狀態卡片元件
 * 負責顯示單一隊伍的狀態，並提供相應的操作按鈕。
 */
const PartyStatusCard: React.FC<PartyStatusCardProps> = ({ party, dungeons, onStartExpedition, onRest, onBuyProvisions, isTxPending }) => {
    const { chainId } = useAccount();
    const dungeonMasterContract = getContract(chainId, 'dungeonMaster');
    const [selectedDungeonId, setSelectedDungeonId] = useState<bigint>(1n);

    // 讀取隊伍的即時狀態 (儲備、冷卻、獎勵、疲勞度)
    const { data: partyStatus, isLoading: isLoadingStatus } = useReadContract({
        ...getContract(chainId, 'dungeonStorage'),
        functionName: 'getPartyStatus',
        args: [party.id],
        query: { enabled: !!chainId, refetchInterval: 5000 } // 每 5 秒自動刷新
    });
    
    // 讀取遠征所需的固定費用
    const { data: explorationFee } = useReadContract({
        ...dungeonMasterContract,
        functionName: 'explorationFee',
        query: { enabled: !!dungeonMasterContract }
    });

    // 使用 useMemo 來計算衍生狀態，避免不必要的重複計算
    const { isOnCooldown, fatigueLevel, effectivePower, provisionsRemaining } = useMemo(() => {
        if (!partyStatus) return { isOnCooldown: false, fatigueLevel: 0, effectivePower: party.totalPower, provisionsRemaining: 0n };
        
        // ★★★ 核心修正：現在可以安全地解構回傳的四個值 ★★★
        const [provisions, cooldownEndsAt, , fatigue] = partyStatus as readonly [bigint, bigint, bigint, number];
        
        const power = BigInt(party.totalPower);
        // 根據疲勞度計算有效戰力 (每點疲勞降低 2% 戰力)
        const effPower = power * (100n - BigInt(fatigue) * 2n) / 100n;

        return {
            isOnCooldown: BigInt(Math.floor(Date.now() / 1000)) < cooldownEndsAt,
            fatigueLevel: fatigue,
            effectivePower: effPower,
            provisionsRemaining: provisions
        };
    }, [partyStatus, party.totalPower]);

    // 根據不同狀態顯示對應的標籤
    const renderStatus = () => {
        if (isLoadingStatus) return <span className="text-gray-400">讀取狀態...</span>;
        if (isOnCooldown) return <span className="px-3 py-1 text-sm font-medium text-yellow-300 bg-yellow-900/50 rounded-full">冷卻中...</span>;
        if (provisionsRemaining === 0n) return <span className="px-3 py-1 text-sm font-medium text-orange-400 bg-orange-900/50 rounded-full">需要儲備</span>;
        if (fatigueLevel > 0) return <span className="px-3 py-1 text-sm font-medium text-blue-300 bg-blue-900/50 rounded-full">需要休息</span>;
        return <span className="px-3 py-1 text-sm font-medium text-green-300 bg-green-900/50 rounded-full">準備就緒</span>;
    };

    // 根據不同狀態顯示對應的操作按鈕
    const renderAction = () => {
        if (isLoadingStatus) return <div className="h-10 w-full rounded-lg bg-gray-700 animate-pulse"></div>;
        if (isOnCooldown) return <ActionButton disabled className="w-full h-10">冷卻中</ActionButton>;
        if (provisionsRemaining === 0n) return <ActionButton onClick={() => onBuyProvisions(party.id)} className="w-full h-10 bg-orange-600 hover:bg-orange-500">購買儲備</ActionButton>;
        if (fatigueLevel > 0) return <ActionButton onClick={() => onRest(party.id)} isLoading={isTxPending} className="w-full h-10 bg-blue-600 hover:bg-blue-500">休息</ActionButton>;
        
        return (
            <ActionButton onClick={() => onStartExpedition(party.id, selectedDungeonId, explorationFee ?? 0n)} isLoading={isTxPending} className="w-full h-10">
                開始遠征
            </ActionButton>
        );
    };

    return (
        <div className={`card-bg p-4 rounded-2xl flex flex-col h-full border-2 ${isOnCooldown ? 'border-yellow-500/50' : 'border-transparent'}`}>
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
                    disabled={provisionsRemaining === 0n || isOnCooldown}
                >
                    {dungeons.map(d => <option key={d.id} value={d.id.toString()}>{d.id}. {d.name} (要求: {d.requiredPower.toString()})</option>)}
                </select>
            </div>
            {renderAction()}
        </div>
    );
};

// 地城資訊卡片元件
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

/**
 * 地下城頁面主元件
 */
const DungeonPage: React.FC<{ setActivePage: (page: Page) => void; }> = ({ setActivePage }) => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();

    const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
    const [selectedPartyForProvision, setSelectedPartyForProvision] = useState<bigint | null>(null);

    const dungeonMasterContract = getContract(chainId, 'dungeonMaster');
    
    // 獲取 DungeonStorage 的地址
    const { data: dungeonStorageAddress } = useReadContract({
        ...dungeonMasterContract,
        functionName: 'dungeonStorage',
        query: { enabled: !!dungeonMasterContract }
    });

    // 根據地址動態建立 DungeonStorage 合約實例
    const dungeonStorageContract = useMemo(() => {
        if (!dungeonStorageAddress) return null;
        return { address: dungeonStorageAddress, abi: dungeonStorageABI };
    }, [dungeonStorageAddress]);
    
    const { writeContractAsync, isPending: isTxPending } = useWriteContract();

    // 獲取玩家擁有的所有 NFT
    const { data: nfts, isLoading: isLoadingNfts } = useQuery({
        queryKey: ['ownedNfts', address, chainId],
        queryFn: () => fetchAllOwnedNfts(address!, chainId!),
        enabled: !!address && !!chainId,
    });

    // 獲取所有地城的資訊
    const { data: dungeonsData, isLoading: isLoadingDungeons } = useReadContracts({
        contracts: Array.from({ length: 10 }, (_, i) => ({
            ...dungeonStorageContract,
            functionName: 'getDungeon',
            args: [BigInt(i + 1)],
        })),
        query: { enabled: !!dungeonStorageContract }
    });

    // 將地城數據轉換為前端易於使用的格式
    const dungeons: Dungeon[] = useMemo(() => {
        const getDungeonName = (id: number) => ["", "新手礦洞", "哥布林洞穴", "食人魔山谷", "蜘蛛巢穴", "石化蜥蜴沼澤", "巫妖墓穴", "奇美拉之巢", "惡魔前哨站", "巨龍之巔", "混沌深淵"][id] || "未知地城";
        if (!dungeonsData) return [];
        return dungeonsData.map((d, i) => {
            if (d.status !== 'success' || !Array.isArray(d.result)) return null;
            const [requiredPower, rewardAmountUSD, baseSuccessRate, isInitialized] = d.result as [bigint, bigint, number, boolean];
            return { id: i + 1, name: getDungeonName(i + 1), requiredPower, rewardAmountUSD, baseSuccessRate, isInitialized };
        }).filter((d): d is Dungeon => d !== null && d.isInitialized);
    }, [dungeonsData]);

    const handleStartExpedition = async (partyId: bigint, dungeonId: bigint, fee: bigint) => {
        if (!dungeonMasterContract) return;
        try {
            const hash = await writeContractAsync({
                ...dungeonMasterContract,
                functionName: 'requestExpedition',
                args: [partyId, dungeonId],
                value: fee,
            });
            addTransaction({ hash, description: `隊伍 #${partyId.toString()} 遠征地城 #${dungeonId}` });
        } catch (e: any) {
            if (!e.message.includes('User rejected the request')) {
                showToast(e.shortMessage || "遠征請求失敗", "error");
            }
        }
    };

    const handleRest = async (partyId: bigint) => {
        if (!dungeonMasterContract) return;
        try {
            const hash = await writeContractAsync({
                ...dungeonMasterContract,
                functionName: 'restParty',
                args: [partyId],
            });
            addTransaction({ hash, description: `隊伍 #${partyId.toString()} 正在休息` });
        } catch (e: any) {
            if (!e.message.includes('User rejected the request')) {
                showToast(e.shortMessage || "休息失敗", "error");
            }
        }
    };

    const handleBuyProvisions = (partyId: bigint) => {
        setSelectedPartyForProvision(partyId);
        setIsProvisionModalOpen(true);
    };

    const isLoading = isLoadingNfts || isLoadingDungeons;

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
    }

    return (
        <section className="space-y-8">
            <Modal
                isOpen={isProvisionModalOpen}
                onClose={() => setIsProvisionModalOpen(false)}
                title="購買遠征儲備"
                onConfirm={() => {}} 
                confirmText="" // 隱藏預設按鈕，由 ProvisionsPage 內部處理
            >
                <ProvisionsPage 
                    preselectedPartyId={selectedPartyForProvision} 
                    onPurchaseSuccess={() => setIsProvisionModalOpen(false)}
                />
            </Modal>

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
                                key={party.id.toString()}
                                party={party}
                                dungeons={dungeons}
                                onStartExpedition={handleStartExpedition}
                                onRest={handleRest}
                                onBuyProvisions={handleBuyProvisions}
                                isTxPending={isTxPending}
                            />
                        ))}
                    </div>
                )}
            </div>

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
