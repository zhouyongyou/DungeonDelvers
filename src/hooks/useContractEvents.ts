import { useAccount } from 'wagmi';
import { useWatchContractEvent } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { decodeEventLog, type Log } from 'viem';
import { getContract, type AllNftCollections } from '../config/contracts';
import { useAppToast } from './useAppToast';
import { useExpeditionResult } from '../contexts/ExpeditionContext';
import type { AnyNft } from '../types/nft';

/**
 * @dev 一個全域的 React Hook，負責監聽所有來自核心合約的事件，
 * 並根據事件內容觸發前端的即時反應，如彈出提示、刷新數據等。
 */
export const useContractEvents = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { showExpeditionResult } = useExpeditionResult();
    const queryClient = useQueryClient();
    
    // 獲取當前鏈的所有合約實例
    const heroContract = getContract(chainId, 'hero');
    const relicContract = getContract(chainId, 'relic');
    const partyContract = getContract(chainId, 'party');
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');

    /**
     * @dev 一個輔助函式，用於刷新所有與用戶相關的鏈上數據。
     * 這可以確保 UI 在鏈上狀態變更後能及時更新。
     */
    const invalidateAllUserData = () => {
        queryClient.invalidateQueries({ queryKey: ['ownedNfts', address, chainId] });
        queryClient.invalidateQueries({ queryKey: ['balance', address, chainId] });
        queryClient.invalidateQueries({ queryKey: ['playerInfo', address, chainId] });
        queryClient.invalidateQueries({ queryKey: ['profileTokenOf', address, chainId] });
        queryClient.invalidateQueries({ queryKey: ['playerExperience'] });
        queryClient.invalidateQueries({ queryKey: ['tokenURI'] });
        queryClient.invalidateQueries({ queryKey: ['userStakes'] }); // 新增：刷新 VIP 質押狀態
    };
    
    // 監聽單個 HeroMinted 事件
    useWatchContractEvent({
        ...heroContract,
        eventName: 'HeroMinted',
        onLogs: (logs: Log[]) => {
            if (!heroContract || !address) return;
            logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: heroContract.abi, ...log });
                if (decodedLog.eventName === 'HeroMinted' && decodedLog.args?.owner?.toLowerCase() === address.toLowerCase()) {
                    showToast(`英雄 #${decodedLog.args.tokenId?.toString()} 鑄造成功！`, 'success');
                    invalidateAllUserData();
                }
            });
        },
        enabled: !!address && !!chainId && !!heroContract,
    });
    
    // 監聽單個 RelicMinted 事件
    useWatchContractEvent({
        ...relicContract,
        eventName: 'RelicMinted',
        onLogs: (logs: Log[]) => {
            if (!relicContract || !address) return;
            logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: relicContract.abi, ...log });
                if (decodedLog.eventName === 'RelicMinted' && decodedLog.args?.owner?.toLowerCase() === address.toLowerCase()) {
                    showToast(`聖物 #${decodedLog.args.tokenId?.toString()} 鑄造成功！`, 'success');
                    invalidateAllUserData();
                }
            });
        },
        enabled: !!address && !!chainId && !!relicContract,
    });

    // 【新增回來】監聽批量鑄造英雄事件 (如果合約有此事件)
    useWatchContractEvent({
        ...heroContract,
        eventName: 'BatchHeroMinted',
        onLogs: (logs: Log[]) => {
            if (!heroContract || !address) return;
            logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: heroContract.abi, ...log });
                if (decodedLog.eventName === 'BatchHeroMinted' && decodedLog.args?.to?.toLowerCase() === address.toLowerCase()) {
                    showToast(`成功批量鑄造 ${decodedLog.args.count?.toString()} 個英雄！`, 'success');
                    invalidateAllUserData();
                }
            })
        },
        enabled: !!address && !!chainId && !!heroContract,
    });

    // 【新增回來】監聽批量鑄造聖物事件 (如果合約有此事件)
    useWatchContractEvent({
        ...relicContract,
        eventName: 'BatchRelicMinted',
        onLogs: (logs: Log[]) => {
            if (!relicContract || !address) return;
            logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: relicContract.abi, ...log });
                if (decodedLog.eventName === 'BatchRelicMinted' && decodedLog.args?.to?.toLowerCase() === address.toLowerCase()) {
                    showToast(`成功批量鑄造 ${decodedLog.args.count?.toString()} 個聖物！`, 'success');
                    invalidateAllUserData();
                }
            })
        },
        enabled: !!address && !!chainId && !!relicContract,
    });

    // 【新增回來】監聽隨機種子更新事件 (主要為開發/管理員提供反饋)
    useWatchContractEvent({
        ...heroContract,
        eventName: 'SeasonSeedUpdated',
        onLogs: (logs: Log[]) => {
            if (!heroContract) return;
            const decodedLog = decodeEventLog({ abi: heroContract.abi, ...logs[0] });
            if(decodedLog.eventName === 'SeasonSeedUpdated') {
                console.log(`[事件監聽] Hero 合約隨機數種子已更新: ${decodedLog.args.newSeed}`);
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
                if(decodedLog.eventName === 'PartyCreated' && decodedLog.args?.owner?.toLowerCase() === address.toLowerCase()){
                     showToast(`隊伍 #${decodedLog.args.partyId?.toString()} 創建成功！`, 'success');
                     invalidateAllUserData();
                }
            });
        },
        enabled: !!address && !!chainId && !!partyContract,
    });

    // 監聽 PartyDisbanded 事件
    useWatchContractEvent({
        ...partyContract,
        eventName: 'PartyDisbanded',
        onLogs: (logs: Log[]) => {
             if (!partyContract || !address) return;
            logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: partyContract.abi, ...log });
                if(decodedLog.eventName === 'PartyDisbanded' && decodedLog.args?.owner?.toLowerCase() === address.toLowerCase()){
                    showToast(`隊伍 #${decodedLog.args.partyId?.toString()} 已解散！`, 'info');
                    invalidateAllUserData();
                }
            });
        },
        enabled: !!address && !!chainId && !!partyContract,
    });

    // 監聽 ExpeditionFulfilled 事件 (遠征完成)
    useWatchContractEvent({
        ...dungeonCoreContract,
        eventName: 'ExpeditionFulfilled',
        onLogs: (logs: Log[]) => {
            if (!dungeonCoreContract || !address || !chainId) return;
            
            logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: dungeonCoreContract.abi, ...log });

                if (decodedLog.eventName === 'ExpeditionFulfilled') {
                    const queryKey = ['ownedNfts', address, chainId];
                    const ownedNftsData = queryClient.getQueryData<AllNftCollections>(queryKey);
                    
                    const isMyParty = ownedNftsData?.parties.some(
                        (p: AnyNft) => p.type === 'party' && p.id === decodedLog.args.partyId
                    );

                    // 確保事件是屬於當前玩家的，並且包含所有必要參數
                    if (isMyParty && 'success' in decodedLog.args && 'reward' in decodedLog.args && 'expGained' in decodedLog.args) {
                        const { partyId, success, reward, expGained } = decodedLog.args;
                        showExpeditionResult({ success, reward, expGained });

                        let message = `隊伍 #${partyId.toString()} 遠征完成！`;
                        if (success && expGained > 0n) {
                            message += ` 獲得 ${expGained.toString()} EXP！`;
                        }
                        showToast(message, success ? 'success' : 'error');
                        
                        invalidateAllUserData();
                    }
                }
            });
        },
        enabled: !!address && !!chainId && !!dungeonCoreContract,
    });
    
    // 監聽 RewardsBanked 事件 (獎勵存入金庫)
    useWatchContractEvent({
        ...dungeonCoreContract,
        eventName: 'RewardsBanked',
        onLogs: (logs: Log[]) => {
            if (!dungeonCoreContract || !address) return;
            logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: dungeonCoreContract.abi, ...log });
                if(decodedLog.eventName === 'RewardsBanked' && decodedLog.args?.user?.toLowerCase() === address.toLowerCase()){
                    showToast(`隊伍 #${decodedLog.args.partyId?.toString()} 的獎勵已存入金庫！`, 'success');
                    invalidateAllUserData();
                }
            });
        },
        enabled: !!address && !!chainId && !!dungeonCoreContract,
    });

    // 監聽 TokensWithdrawn 事件 (從金庫提領)
    useWatchContractEvent({
        ...dungeonCoreContract,
        eventName: 'TokensWithdrawn',
        onLogs: (logs: Log[]) => {
             if (!dungeonCoreContract || !address) return;
             logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: dungeonCoreContract.abi, ...log });
                if(decodedLog.eventName === 'TokensWithdrawn' && decodedLog.args?.user?.toLowerCase() === address.toLowerCase()){
                     showToast(`金庫提領成功！`, 'success');
                     invalidateAllUserData();
                }
            });
        },
        enabled: !!address && !!chainId && !!dungeonCoreContract,
    });
};
