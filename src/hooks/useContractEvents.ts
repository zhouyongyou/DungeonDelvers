import { useAccount } from 'wagmi';
import { useWatchContractEvent } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { decodeEventLog, type Log } from 'viem';
import { getContract } from '../config/contracts';
import { useAppToast } from './useAppToast';
import { useExpeditionResult } from '../contexts/ExpeditionContext';
import { type AnyNft } from '../types/nft';

export const useContractEvents = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { showExpeditionResult } = useExpeditionResult();
    const queryClient = useQueryClient();
    
    const heroContract = getContract(chainId, 'hero');
    const relicContract = getContract(chainId, 'relic');
    const partyContract = getContract(chainId, 'party');
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');

    const invalidateQueries = () => {
        queryClient.invalidateQueries({ queryKey: ['ownedNfts', address, chainId] });
        queryClient.invalidateQueries({ queryKey: ['balance', address, chainId] });
        queryClient.invalidateQueries({ queryKey: ['playerInfo', address, chainId] });
        queryClient.invalidateQueries({ queryKey: ['profileTokenOf', address, chainId] });
        queryClient.invalidateQueries({ queryKey: ['playerExperience'] });
        queryClient.invalidateQueries({ queryKey: ['tokenURI'] });
    };
    
    // 監聽 HeroMinted 事件
    useWatchContractEvent({
        ...heroContract,
        eventName: 'HeroMinted',
        onLogs: (logs: Log[]) => {
            if (!heroContract || !address) return;
            logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: heroContract.abi, ...log });
                if (decodedLog.eventName === 'HeroMinted' && decodedLog.args.owner?.toLowerCase() === address.toLowerCase()) {
                    showToast(`英雄 #${decodedLog.args.tokenId?.toString()} 鑄造成功！`, 'success');
                    invalidateQueries();
                }
            });
        },
        enabled: !!address && !!chainId && !!heroContract,
    });
    
    // 監聽 RelicMinted 事件
    useWatchContractEvent({
        ...relicContract,
        eventName: 'RelicMinted',
        onLogs: (logs: Log[]) => {
            if (!relicContract || !address) return;
            logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: relicContract.abi, ...log });
                if (decodedLog.eventName === 'RelicMinted' && decodedLog.args.owner?.toLowerCase() === address.toLowerCase()) {
                    showToast(`聖物 #${decodedLog.args.tokenId?.toString()} 鑄造成功！`, 'success');
                    invalidateQueries();
                }
            });
        },
        enabled: !!address && !!chainId && !!relicContract,
    });
    
    // 監聽批量鑄造事件
    useWatchContractEvent({
        ...heroContract,
        eventName: 'BatchHeroMinted',
        onLogs: (logs: Log[]) => {
            if (!heroContract || !address) return;
            logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: heroContract.abi, ...log });
                if (decodedLog.eventName === 'BatchHeroMinted' && decodedLog.args.to?.toLowerCase() === address.toLowerCase()) {
                    showToast(`成功批量鑄造 ${decodedLog.args.count?.toString()} 個英雄！`, 'success');
                    invalidateQueries();
                }
            })
        },
        enabled: !!address && !!chainId && !!heroContract,
    });

    useWatchContractEvent({
        ...relicContract,
        eventName: 'BatchRelicMinted',
        onLogs: (logs: Log[]) => {
            if (!relicContract || !address) return;
            logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: relicContract.abi, ...log });
                if (decodedLog.eventName === 'BatchRelicMinted' && decodedLog.args.to?.toLowerCase() === address.toLowerCase()) {
                    showToast(`成功批量鑄造 ${decodedLog.args.count?.toString()} 個聖物！`, 'success');
                    invalidateQueries();
                }
            })
        },
        enabled: !!address && !!chainId && !!relicContract,
    });

    // 監聽種子更新事件
    useWatchContractEvent({
        ...heroContract,
        eventName: 'SeasonSeedUpdated',
        onLogs: (logs: Log[]) => {
            if (!heroContract) return;
            const decodedLog = decodeEventLog({ abi: heroContract.abi, ...logs[0] });
            if(decodedLog.eventName === 'SeasonSeedUpdated') {
                console.log(`[Hero] New season seed updated: ${decodedLog.args.newSeed}`);
                showToast('英雄合約隨機數種子已更新！', 'info');
            }
        },
        enabled: !!chainId && !!heroContract
    });

    // 監聽 PartyCreated 事件
    useWatchContractEvent({
        ...partyContract,
        eventName: 'PartyCreated',
        onLogs: (logs: Log[]) => {
            if (!partyContract || !address) return;
            logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: partyContract.abi, ...log });
                if(decodedLog.eventName === 'PartyCreated' && decodedLog.args.owner?.toLowerCase() === address.toLowerCase()){
                     showToast(`隊伍 #${decodedLog.args.partyId?.toString()} 創建成功！`, 'success');
                     invalidateQueries();
                }
            });
        },
        enabled: !!address && !!chainId && !!partyContract,
    });

    // [新增] 監聽隊伍解散事件
    useWatchContractEvent({
        ...partyContract,
        eventName: 'PartyDisbanded',
        onLogs: (logs: Log[]) => {
             if (!partyContract || !address) return;
            logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: partyContract.abi, ...log });
                if(decodedLog.eventName === 'PartyDisbanded' && decodedLog.args.owner?.toLowerCase() === address.toLowerCase()){
                    showToast(`隊伍 #${decodedLog.args.partyId?.toString()} 已解散！`, 'info');
                    invalidateQueries();
                }
            });
        },
        enabled: !!address && !!chainId && !!partyContract,
    });

    // 監聽 ExpeditionFulfilled 事件 (整合經驗值系統)
    useWatchContractEvent({
        ...dungeonCoreContract,
        eventName: 'ExpeditionFulfilled',
        onLogs: (logs: Log[]) => {
            if (!dungeonCoreContract || !address || !chainId) return;
            
            logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: dungeonCoreContract.abi, ...log });

                if (decodedLog.eventName === 'ExpeditionFulfilled') {
                    const queryKey = ['ownedNfts', address, chainId];
                    // [修正 1] 確保從快取讀取出的資料結構是我們預期的
                    const ownedNftsData = queryClient.getQueryData<{ heroes: AnyNft[], relics: AnyNft[], parties: AnyNft[] }>(queryKey);
                    
                    // [修正 1] 在正確的 'parties' 陣列上呼叫 .some
                    const isMyParty = ownedNftsData?.parties.some(
                        (p: AnyNft) => p.type === 'party' && p.id === decodedLog.args.partyId
                    );

                    // [修正 2] 增加一個型別守衛 (Type Guard)，確保 expGained 存在
                    if (isMyParty && 'expGained' in decodedLog.args) {
                        const { partyId, success, reward, expGained } = decodedLog.args;
                        showExpeditionResult({ success, reward, expGained });

                        let message = `隊伍 #${partyId.toString()} 遠征完成！`;
                        if (success && expGained > 0n) { // 使用 bigint 比較
                            message += ` 獲得 ${expGained.toString()} EXP！`;
                        }
                        showToast(message, success ? 'success' : 'error');
                        
                        invalidateQueries();
                    }
                }
            });
        },
        enabled: !!address && !!chainId && !!dungeonCoreContract,
    });
    
    // [新增] 監聽領取獎勵到金庫事件
    useWatchContractEvent({
        ...dungeonCoreContract,
        eventName: 'RewardsBanked',
        onLogs: (logs: Log[]) => {
            if (!dungeonCoreContract || !address) return;
            logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: dungeonCoreContract.abi, ...log });
                if(decodedLog.eventName === 'RewardsBanked' && decodedLog.args.user?.toLowerCase() === address.toLowerCase()){
                    showToast(`隊伍 #${decodedLog.args.partyId?.toString()} 的獎勵已領取！`, 'success');
                    invalidateQueries();
                }
            });
        },
        enabled: !!address && !!chainId && !!dungeonCoreContract,
    });

    // [新增] 監聽從金庫提領事件
    useWatchContractEvent({
        ...dungeonCoreContract,
        eventName: 'TokensWithdrawn',
        onLogs: (logs: Log[]) => {
             if (!dungeonCoreContract || !address) return;
             logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: dungeonCoreContract.abi, ...log });
                if(decodedLog.eventName === 'TokensWithdrawn' && decodedLog.args.user?.toLowerCase() === address.toLowerCase()){
                     showToast(`金庫提領成功！`, 'success');
                     invalidateQueries();
                }
            });
        },
        enabled: !!address && !!chainId && !!dungeonCoreContract,
    });
};
