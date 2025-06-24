import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { useAppToast } from '../hooks/useAppToast';
import { getContract } from '../config/contracts';
import { fetchAllOwnedNfts } from '../api/nfts';
import { ActionButton } from '../components/ui/ActionButton';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import type { PartyNft, AnyNft } from '../types/nft';

const DungeonPage: React.FC = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');

    const [selectedPartyId, setSelectedPartyId] = useState<string>('');
    const [actionState, setActionState] = useState<{ type: 'dispatch' | 'claim', id: string, isLoading: boolean} | null>(null);

    // 讀取 BNB 探索費用
    const { data: explorationFee, isLoading: isLoadingFee } = useReadContract({
        ...dungeonCoreContract,
        functionName: 'explorationFee',
        query: { enabled: !!dungeonCoreContract }
    });

    // 獲取玩家擁有的隊伍
    const { data: ownedParties, isLoading: isLoadingParties } = useQuery({
        queryKey: ['ownedNfts', address, chainId, 'partiesOnly'],
        queryFn: async () => (await fetchAllOwnedNfts(address!, chainId!)).parties,
        enabled: !!address && !!chainId,
    });
    
    // 一次性獲取所有地城的數據
    const { data: dungeonsData, isLoading: isLoadingDungeons } = useReadContracts({
        contracts: Array.from({ length: 10 }, (_, i) => ({
            ...dungeonCoreContract,
            functionName: 'dungeons',
            args: [BigInt(i + 1)],
        })),
        query: { enabled: !!dungeonCoreContract }
    });
    const dungeons = useMemo(() => dungeonsData?.map((d, i) => ({ ...(d.result as any), id: i + 1 })).filter(d => d.isInitialized) ?? [], [dungeonsData]);
    const { writeContractAsync } = useWriteContract({
      mutation: {
        onSuccess: (hash, vars) => showToast(`${vars.functionName === 'requestExpedition' ? '遠征' : '領取獎勵'}請求已送出`, 'success'),
        onError: (err) => showToast(err.message.split('\n')[0], 'error')
      }
    });
    const handleDispatch = async (dungeonId: number) => {
        if (!selectedPartyId) return showToast('請先選擇一個隊伍', 'error');
        if (typeof explorationFee === 'undefined') return showToast('無法讀取探索費用，請稍後再試', 'error');
        if (!dungeonCoreContract) return;
        
        setActionState({ type: 'dispatch', id: dungeonId.toString(), isLoading: true });
        try {
            await writeContractAsync({ ...dungeonCoreContract, functionName: 'buyProvisions', args: [BigInt(selectedPartyId), 1n]});
            showToast('儲備購買成功，正在派遣！', 'info');
            
            await writeContractAsync({ 
                ...dungeonCoreContract, 
                functionName: 'requestExpedition', 
                args: [BigInt(selectedPartyId), BigInt(dungeonId)],
                value: explorationFee
            });
        } catch (e: any) {
             // 錯誤已在 writeContractAsync 中處理
        } finally {
            setActionState(null);
        }
    };
    const handleClaimRewards = async () => {
        if (!selectedPartyId) return showToast('請選擇隊伍以領取獎勵', 'error');
        if (!dungeonCoreContract) return;
        setActionState({ type: 'claim', id: selectedPartyId, isLoading: true });
        try {
            await writeContractAsync({ ...dungeonCoreContract, functionName: 'claimRewards', args: [BigInt(selectedPartyId)] });
        } catch (e: any) {
            // 錯誤已在 writeContractAsync 中處理
        } finally {
            setActionState(null);
        }
    };
    const getDungeonName = (id: number) => ["", "新手礦洞", "哥布林洞穴", "食人魔山谷", "蜘蛛巢穴", "石化蜥蜴沼澤", "巫妖墓穴", "奇美拉之巢", "惡魔前哨站", "巨龍之巔", "混沌深淵"][id] || "未知地城";
    return (
        <section>
            <h2 className="page-title">地下城入口</h2>
            <div className="mb-8 card-bg p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="w-full">
                    <h3 className="section-title">選擇隊伍</h3>
                    <select value={selectedPartyId} onChange={e => setSelectedPartyId(e.target.value)} className="w-full p-2 border rounded-lg bg-white/80 h-10">
                        <option value="">{isLoadingParties ? '正在加載您的隊伍...' : '請選擇一個隊伍'}</option>
                        {ownedParties?.map((p: AnyNft) => (
                            <option key={(p as PartyNft).id.toString()} value={(p as PartyNft).id.toString()}>
                                {p.name || `隊伍 #${p.id.toString()}`} (戰力: {(p as PartyNft).totalPower.toString()})
                            </option>
                        ))}
                    </select>
                </div>
                <div className="w-full md:w-auto flex-shrink-0">
                    <h3 className="section-title invisible hidden md:block">操作</h3>
                    <ActionButton 
                        onClick={handleClaimRewards} 
                        disabled={!selectedPartyId || actionState?.isLoading}
                        isLoading={actionState?.type === 'claim' && actionState.isLoading}
                        className="w-full h-10 px-4"
                    >
                        領取獎勵
                    </ActionButton>
                </div>
            </div>
            {isLoadingDungeons ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dungeons.map(d => (
                        <div key={d.id} className="card-bg p-4 rounded-xl shadow-lg flex flex-col">
                            <h4 className="text-xl font-bold font-serif">{getDungeonName(d.id)}</h4>
                            <div className="flex-grow mt-2 text-sm">
                                <p>要求戰力: {d.requiredPower.toString()}</p>
                                <p>基礎獎勵: ~$ {parseFloat(formatEther(d.rewardAmountUSD)).toFixed(2)}</p>
                                <p>成功率: {d.baseSuccessRate}%</p>
                            </div>
                            <ActionButton 
                                onClick={() => handleDispatch(d.id)} 
                                isLoading={actionState?.type === 'dispatch' && actionState.id === d.id.toString() && actionState.isLoading}
                                className="w-full mt-4 h-10 py-2 rounded-lg"
                            >
                                派遣遠征
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