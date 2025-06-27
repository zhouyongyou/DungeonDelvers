import type { HeroNft, RelicNft } from '../types/nft';
import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { useAppToast } from '../hooks/useAppToast';
import { getContract } from '../config/contracts';
import { fetchAllOwnedNfts } from '../api/nfts';
import { ActionButton } from '../components/ui/ActionButton';
import { NftCard } from '../components/ui/NftCard';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const AltarPage: React.FC = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const queryClient = useQueryClient();

    const altarContract = useMemo(() => getContract(chainId, 'altarOfAscension'), [chainId]);
    const heroContract = useMemo(() => getContract(chainId, 'hero'), [chainId]);
    const relicContract = useMemo(() => getContract(chainId, 'relic'), [chainId]);

    // --- 狀態管理 ---
    const [tab, setTab] = useState<'hero' | 'relic'>('hero');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [targetRarity, setTargetRarity] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [upgradeTxHash, setUpgradeTxHash] = useState<`0x${string}` | undefined>();
    const [approvalTxHash, setApprovalTxHash] = useState<`0x${string}` | undefined>();

    // --- Wagmi Hooks ---
    const { writeContractAsync } = useWriteContract();
    const { data: ownedNfts, isLoading: isLoadingNfts } = useQuery({
        queryKey: ['ownedNfts', address, chainId, 'all'],
        queryFn: () => {
            if (!address || !chainId) return { heroes: [], relics: [], parties: [] };
            return fetchAllOwnedNfts(address, chainId);
        },
        enabled: !!address && !!chainId,
    });

    // 【修改】在 enabled 條件中對合約地址進行更嚴格的檢查，以解決型別問題
    const { data: isApprovedHero, refetch: refetchHeroApproval } = useReadContract({
        abi: heroContract?.abi,
        address: heroContract?.address, // 明確傳遞地址
        functionName: 'isApprovedForAll',
        args: [address!, altarContract?.address!],
        query: { enabled: !!address && !!heroContract?.address && !!altarContract?.address }
    });

    const { data: isApprovedRelic, refetch: refetchRelicApproval } = useReadContract({
        abi: relicContract?.abi,
        address: relicContract?.address, // 明確傳遞地址
        functionName: 'isApprovedForAll',
        args: [address!, altarContract?.address!],
        query: { enabled: !!address && !!relicContract?.address && !!altarContract?.address }
    });

    const { data: upgradeRuleData } = useReadContract({
        abi: altarContract?.abi,
        address: altarContract?.address, // 明確傳遞地址
        functionName: 'upgradeRules',
        args: [BigInt(targetRarity)],
        query: { enabled: !!altarContract?.address }
    });
    
    // --- 派生狀態 ---
    const isApproved = tab === 'hero' ? isApprovedHero : isApprovedRelic;
    const materials: (HeroNft | RelicNft)[] = useMemo(() => {
        const nfts = tab === 'hero' ? ownedNfts?.heroes : ownedNfts?.relics;
        return nfts?.filter((nft): nft is HeroNft | RelicNft => !!nft && 'rarity' in nft && nft.rarity === targetRarity) ?? [];
    }, [ownedNfts, tab, targetRarity]);
    
    const upgradeRule = useMemo(() => {
        if (!upgradeRuleData || !Array.isArray(upgradeRuleData)) return null;
        const data = upgradeRuleData.slice();
        return {
            materialsRequired: Number(data[0]),
            nativeFee: data[1] as bigint,
            greatSuccessChance: Number(data[2]),
            successChance: Number(data[3]),
            partialFailChance: Number(data[4]),
        };
    }, [upgradeRuleData]);

    const requiredCount = upgradeRule?.materialsRequired ?? 0;
    const fee = upgradeRule?.nativeFee ?? 0n;

    // --- 事件監聽與處理 ---
    useWatchContractEvent({
        abi: altarContract?.abi,
        address: altarContract?.address, // 確保傳遞有效的地址
        eventName: 'UpgradeFulfilled',
        onLogs(logs: any[]) {
            const myLog = logs.find(log => log.args.player === address);
            if (myLog) {
                const outcome = myLog.args.outcome;
                let message = '升級完成！';
                if(outcome === 3) message = '✨ 大成功！恭喜獲得雙倍獎勵！';
                else if(outcome === 2) message = '✨ 恭喜！升星成功！';
                else if(outcome === 1) message = '💔 可惜，返還了部分材料。';
                else if(outcome === 0) message = '💀 運氣不佳，所有材料都消失了。';
                
                showToast(message, 'info');
                queryClient.invalidateQueries({ queryKey: ['ownedNfts'] });
                setSelectedIds(new Set());
                setUpgradeTxHash(undefined);
                setIsProcessing(false);
            }
        },
    });
    
    const { isLoading: isConfirmingUpgrade } = useWaitForTransactionReceipt({ hash: upgradeTxHash });
    const { isLoading: isApproving, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approvalTxHash });

    useEffect(() => {
        if (isApprovalSuccess) {
            showToast('授權成功！正在刷新狀態...', 'success');
            if (tab === 'hero') refetchHeroApproval();
            else refetchRelicApproval();
            setApprovalTxHash(undefined);
        }
    }, [isApprovalSuccess, tab, refetchHeroApproval, refetchRelicApproval]);

    // --- 函式 ---
    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) newSelection.delete(id);
        else if (newSelection.size < requiredCount) newSelection.add(id);
        setSelectedIds(newSelection);
    };

    const handleApprove = async () => {
        const contractToApprove = tab === 'hero' ? heroContract : relicContract;
        if (!contractToApprove?.address || !altarContract?.address) return;
        
        try {
            const hash = await writeContractAsync({ 
                abi: contractToApprove.abi,
                address: contractToApprove.address,
                functionName: 'setApprovalForAll', 
                args: [altarContract.address, true] 
            });
            setApprovalTxHash(hash);
            showToast('授權請求已送出，請稍候確認...', 'info');
        } catch (e: any) { 
            showToast(e.message.split('\n')[0], 'error'); 
        }
    };

    const handleUpgrade = async () => {
        const contractToUpgrade = tab === 'hero' ? heroContract : relicContract;
        if (!contractToUpgrade?.address || !altarContract?.address) return;
        if (selectedIds.size !== requiredCount) {
            showToast(`請選擇 ${requiredCount} 個 ${targetRarity}星 材料`, 'error');
            return;
        }

        setIsProcessing(true);
        try {
            const hash = await writeContractAsync({
                abi: altarContract.abi,
                address: altarContract.address,
                functionName: 'upgradeNFTs',
                args: [contractToUpgrade.address, Array.from(selectedIds).map(id => BigInt(id))],
                value: fee
            });
            setUpgradeTxHash(hash);
            showToast('已將祭品獻上，正在等待交易確認...', 'info');
        } catch (e: any) {
            showToast(e.message.split('\n')[0], 'error');
            setIsProcessing(false);
        }
    };

    const isActionLoading = isProcessing || isConfirmingUpgrade || isApproving;

    return (
        <section>
            <h2 className="page-title">升星祭壇</h2>
            <div className="flex justify-center mb-6">
                <div className="tabs tabs-boxed">
                    <a className={`tab ${tab === 'hero' ? 'tab-active' : ''}`} onClick={() => { setTab('hero'); setSelectedIds(new Set()); }}>英雄升星</a>
                    <a className={`tab ${tab === 'relic' ? 'tab-active' : ''}`} onClick={() => { setTab('relic'); setSelectedIds(new Set()); }}>聖物升星</a>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="section-title">選擇材料 ({selectedIds.size} / {requiredCount > 0 ? requiredCount : '...'})</h3>
                        <select value={targetRarity} onChange={e => { setTargetRarity(Number(e.target.value)); setSelectedIds(new Set()); }} className="select select-bordered select-sm">
                            <option value={1}>升級 ★</option>
                            <option value={2}>升級 ★★</option>
                            <option value={3}>升級 ★★★</option>
                            <option value={4}>升級 ★★★★</option>
                        </select>
                    </div>
                    {isLoadingNfts ? <div className="text-center p-8"><LoadingSpinner /></div> : (
                        materials.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {materials.map(nft => (
                                    <div key={nft.id} onClick={() => toggleSelection(nft.id.toString())} className={`cursor-pointer transition-all duration-200 ${selectedIds.has(nft.id.toString()) ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100 rounded-lg' : ''}`}>
                                        <NftCard nft={nft} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState message={`您沒有 ${targetRarity}星 的${tab === 'hero' ? '英雄' : '聖物'}可供升級。`} />
                        )
                    )}
                </div>

                <div>
                    <div className="card-bg p-6 rounded-xl sticky top-24">
                        <h3 className="section-title">祭壇獻祭</h3>
                        <p className="text-sm my-2">將 {requiredCount > 0 ? requiredCount : '...'} 個 {targetRarity}星 {tab === 'hero' ? '英雄' : '聖物'} 獻祭，嘗試獲得 {targetRarity + 1}星 資產。</p>
                        <p className="text-sm font-bold">費用: {formatEther(fee)} BNB</p>
                        <div className="divider"></div>
                        {isApproved ? (
                            <ActionButton 
                                onClick={handleUpgrade} 
                                isLoading={isActionLoading} 
                                disabled={isActionLoading || selectedIds.size !== requiredCount} 
                                className="w-full"
                            >
                                {isProcessing || isConfirmingUpgrade ? '正在獻祭...' : '開始升級'}
                            </ActionButton>
                        ) : (
                            <ActionButton 
                                onClick={handleApprove} 
                                isLoading={isApproving}
                                disabled={isApproving}
                                className="w-full"
                            >
                                {isApproving ? '正在授權...' : '授權祭壇操作材料'}
                            </ActionButton>
                        )}
                        <div className="text-xs text-gray-500 mt-4">
                            {upgradeRule ? (<>
                                <p>• 大成功機率: {upgradeRule.greatSuccessChance}% (獲得x2獎勵)</p>
                                <p>• 成功機率: {upgradeRule.successChance}%</p>
                                <p>• 失敗返還機率: {upgradeRule.partialFailChance}%</p>
                                <p>• 失敗全損機率: {100 - (upgradeRule.greatSuccessChance + upgradeRule.successChance + upgradeRule.partialFailChance)}%</p>
                            </>) : <p>正在讀取規則...</p>}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AltarPage;