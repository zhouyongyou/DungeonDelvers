import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { useAppToast } from '../hooks/useAppToast';
import { getContract, dungeonCoreABI } from '../config/contracts';
import { fetchAllOwnedNfts } from '../api/nfts';
import { ActionButton } from '../components/ui/ActionButton';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import type { AnyNft, PartyNft } from '../types/nft';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { Page } from '../types/page';

interface DungeonPageProps {
  setActivePage: (page: Page) => void;
  setPreselectedPartyId: (id: bigint | null) => void;
}

interface Dungeon {
    id: number;
    requiredPower: bigint;
    rewardAmountUSD: bigint;
    baseSuccessRate: number;
    isInitialized: boolean;
}

const DungeonPage: React.FC<DungeonPageProps> = ({ setActivePage, setPreselectedPartyId }) => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const queryClient = useQueryClient();
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');

    const [selectedPartyId, setSelectedPartyId] = useState<string>('');
    const [actionState, setActionState] = useState<{ type: 'dispatch' | 'claim', id: string, isLoading: boolean} | null>(null);
    const [timeLeft, setTimeLeft] = useState('');

    const { data: explorationFee, isLoading: isLoadingFee } = useReadContract({
        address: dungeonCoreContract?.address,
        abi: dungeonCoreABI,
        functionName: 'explorationFee',
        query: { enabled: !!dungeonCoreContract }
    });
    
    const displayExplorationFee = useMemo(() => explorationFee ?? 0n, [explorationFee]);

    const { data: ownedParties, isLoading: isLoadingParties } = useQuery({
        queryKey: ['ownedNfts', address, chainId, 'partiesOnly'],
        queryFn: async () => {
            if (!address || !chainId) return [];
            const result = await fetchAllOwnedNfts(address, chainId);
            return result.parties;
        },
        enabled: !!address && !!chainId,
    });
    
    const { data: partyStatusData } = useReadContract({
        address: dungeonCoreContract?.address,
        abi: dungeonCoreABI,
        functionName: 'partyStatuses',
        args: [selectedPartyId ? BigInt(selectedPartyId) : 0n],
        query: {
            enabled: !!selectedPartyId && !!dungeonCoreContract,
            refetchInterval: 15000, 
        }
    });

    const partyStatus = useMemo(() => {
        if (!partyStatusData || !Array.isArray(partyStatusData)) return null;
        return {
            provisionsRemaining: partyStatusData[0] as bigint,
            cooldownEndsAt: partyStatusData[1] as bigint,
            unclaimedRewards: partyStatusData[2] as bigint,
        };
    }, [partyStatusData]);

    const cooldownInfo = useMemo(() => {
        if (!partyStatus?.cooldownEndsAt) return { onCooldown: false, endsAt: 0 };
        const endsAt = Number(partyStatus.cooldownEndsAt) * 1000;
        return {
            onCooldown: Date.now() < endsAt,
            endsAt: endsAt,
        };
    }, [partyStatus]);

    useEffect(() => {
        if (!cooldownInfo.onCooldown) {
            setTimeLeft('');
            return;
        }
        const updateTimer = () => {
            const remaining = Math.max(0, cooldownInfo.endsAt - Date.now());
            if (remaining === 0) {
                setTimeLeft('冷卻結束');
                queryClient.invalidateQueries({ queryKey: ['partyStatuses', selectedPartyId] });
                return;
            }
            const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
            const minutes = Math.floor((remaining / 1000 / 60) % 60).toString().padStart(2, '0');
            const seconds = Math.floor((remaining / 1000) % 60).toString().padStart(2, '0');
            setTimeLeft(`${hours}:${minutes}:${seconds}`);
        };
        updateTimer();
        const intervalId = setInterval(updateTimer, 1000);
        return () => clearInterval(intervalId);
    }, [cooldownInfo, selectedPartyId, queryClient]);
    
    const { data: dungeonsData, isLoading: isLoadingDungeons } = useReadContracts({
        contracts: Array.from({ length: 10 }, (_, i) => ({
            address: dungeonCoreContract?.address,
            abi: dungeonCoreABI,
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
    
    const { writeContractAsync } = useWriteContract({
      mutation: {
        onSuccess: (_hash, vars) => showToast(`${(vars.functionName as string) === 'requestExpedition' ? '遠征' : '領取獎勵'}請求已送出`, 'success'),
        onError: (err) => showToast(err.message.split('\n')[0], 'error')
      }
    });

    const handleDispatch = async (dungeonId: number) => {
        if (!selectedPartyId || !dungeonCoreContract) return;
        if (!partyStatus || partyStatus.provisionsRemaining === 0n) {
            showToast('儲備不足！請先為您的隊伍購買儲備。', 'error');
            return;
        }
        setActionState({ type: 'dispatch', id: dungeonId.toString(), isLoading: true });
        try {
            await writeContractAsync({
                address: dungeonCoreContract.address,
                abi: dungeonCoreABI,
                functionName: 'requestExpedition',
                args: [BigInt(selectedPartyId), BigInt(dungeonId)],
                value: displayExplorationFee ?? 0n
            });
        } catch (e) {
            console.error("Dispatch failed:", e);
        } finally {
            setActionState(null);
        }
    };

    const handleClaimRewards = async () => {
        if (!selectedPartyId || !dungeonCoreContract) return;
        if (!partyStatus || partyStatus.unclaimedRewards === 0n) {
             showToast('此隊伍沒有可領取的獎勵。', 'info');
             return;
        }
        setActionState({ type: 'claim', id: selectedPartyId, isLoading: true });
        try {
             await writeContractAsync({
                address: dungeonCoreContract.address,
                abi: dungeonCoreABI,
                functionName: 'claimRewards',
                args: [BigInt(selectedPartyId)]
            });
        } catch (e) {
            console.error("Claim failed:", e);
        } finally {
             setActionState(null);
        }
    };

    const handleGoToProvisions = () => {
        if (selectedPartyId) {
            setPreselectedPartyId(BigInt(selectedPartyId));
            setActivePage('provisions');
        } else {
            showToast('請先選擇一個隊伍', 'error');
        }
    }

    const getDungeonName = (id: number) => ["", "新手礦洞", "哥布林洞穴", "食人魔山谷", "蜘蛛巢穴", "石化蜥蜴沼澤", "巫妖墓穴", "奇美拉之巢", "惡魔前哨站", "巨龍之巔", "混沌深淵"][id] || "未知地城";
    
    return (
        <section>
            <h2 className="page-title">地下城入口</h2>
            <div className="mb-8 card-bg p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="w-full">
                    <h3 className="section-title text-xl mb-2">1. 選擇出征隊伍</h3>
                    <select value={selectedPartyId} onChange={e => setSelectedPartyId(e.target.value)} className="w-full p-2 border rounded-lg bg-white/80 dark:bg-gray-700 h-10">
                        <option value="">{isLoadingParties ? '正在加載您的隊伍...' : (ownedParties && ownedParties.length > 0 ? '請選擇一個隊伍' : '您還沒有創建任何隊伍')}</option>
                        {ownedParties?.map((p: AnyNft) => (
                            <option key={(p as PartyNft).id.toString()} value={(p as PartyNft).id.toString()}>
                                {p.name || `隊伍 #${p.id.toString()}`} (戰力: {(p as PartyNft).totalPower.toString()})
                            </option>
                        ))}
                    </select>
                </div>
                <div className="w-full md:w-auto flex-shrink-0 card-bg bg-black/5 dark:bg-white/5 p-3 rounded-lg text-center">
                    <h3 className="section-title text-xl mb-2">2. 隊伍狀態</h3>
                     {(isLoadingParties && !!selectedPartyId) ? <LoadingSpinner /> : (
                         <div className="text-sm space-y-1">
                            <p>待領獎勵: <span className="font-bold text-green-500">{partyStatus ? parseFloat(formatEther(partyStatus.unclaimedRewards)).toFixed(4) : '...'}</span></p>
                             <p>剩餘儲備: <span className="font-bold">{partyStatus ? partyStatus.provisionsRemaining.toString() : '...'}</span> 次</p>
                             <ActionButton onClick={handleGoToProvisions} className="w-full h-8 text-xs mt-2 bg-green-600 hover:bg-green-500">
                                購買儲備
                            </ActionButton>
                            <ActionButton onClick={handleClaimRewards} disabled={!selectedPartyId || actionState?.isLoading} isLoading={actionState?.type === 'claim' && actionState.isLoading} className="w-full h-8 text-xs mt-1">
                                領取獎勵
                            </ActionButton>
                         </div>
                     )}
                </div>
            </div>
             <h3 className="section-title text-xl mb-4">3. 選擇目標地城</h3>
            {isLoadingDungeons ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dungeons.map(d => (
                        <div key={d.id} className="card-bg p-4 rounded-xl shadow-lg flex flex-col">
                            <h4 className="text-xl font-bold font-serif">{getDungeonName(d.id)}</h4>
                            <div className="flex-grow mt-2 text-sm space-y-1">
                                <p>要求戰力: {d.requiredPower.toString()}</p>
                                <p>基礎獎勵: ~$ {parseFloat(formatEther(d.rewardAmountUSD)).toFixed(2)}</p>
                                <p>成功率: {d.baseSuccessRate}%</p>
                                <p className="font-bold text-sky-400">預計經驗: +{d.id * 10} EXP</p>
                            </div>
                            <ActionButton 
                                onClick={() => handleDispatch(d.id)} 
                                disabled={!selectedPartyId || cooldownInfo.onCooldown || (actionState?.type === 'dispatch' && actionState.isLoading) || (isLoadingParties && !!selectedPartyId)}
                                isLoading={actionState?.type === 'dispatch' && actionState.id === d.id.toString() && actionState.isLoading}
                                className="w-full mt-4 h-10 py-2 rounded-lg"
                            >
                                {(isLoadingParties && !!selectedPartyId) ? <LoadingSpinner/> : cooldownInfo.onCooldown ? timeLeft : '派遣遠征'}
                            </ActionButton>
                            <p className="text-xs text-center mt-1 text-gray-500">
                                (費用: {isLoadingFee ? '讀取中...' : formatEther(explorationFee ?? 0n)} BNB)
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

export default DungeonPage;