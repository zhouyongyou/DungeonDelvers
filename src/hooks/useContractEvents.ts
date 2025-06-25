/**
 * @file useContractEvents.ts
 * @notice v4.4 - 最終型別安全版 (修正 ExpeditionFulfilled 擁有者判斷邏輯)
 * @dev 1. 修正了 ExpeditionFulfilled 事件的處理邏輯，不再依賴事件中不存在的 `requester` 參數。
 * 2. 改為透過查詢 React Query 快取中的 `ownedNfts`，來判斷事件中的 `partyId` 是否屬於當前使用者。
 * 3. 確保了所有事件處理邏輯的完全型別安全與執行正確性。
 */
import { useAccount } from 'wagmi';
import { useWatchContractEvent } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { decodeEventLog, type Log } from 'viem';
import { getContract } from '../config/contracts';
import { useAppToast } from './useAppToast';
import { useExpeditionResult } from '../contexts/ExpeditionContext';
import { type AnyNft } from '../types/nft'; // 引入 NFT 型別

export const useContractEvents = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { showExpeditionResult } = useExpeditionResult();
    const queryClient = useQueryClient();
    
    const heroContract = getContract(chainId, 'hero');
    const relicContract = getContract(chainId, 'relic');
    const partyContract = getContract(chainId, 'party');
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');

    const handleEvent = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
      showToast(message, type);
      // 精準刷新，而不是全部刷新
      queryClient.invalidateQueries({ queryKey: ['ownedNfts', address, chainId] });
      queryClient.invalidateQueries({ queryKey: ['balance', address, chainId] });
      queryClient.invalidateQueries({ queryKey: ['playerInfo', address, chainId] });
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
                    handleEvent(`英雄 #${decodedLog.args.tokenId?.toString()} 鑄造成功！`);
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
                    handleEvent(`聖物 #${decodedLog.args.tokenId?.toString()} 鑄造成功！`);
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
                    handleEvent(`成功批量鑄造 ${decodedLog.args.count?.toString()} 個英雄！`, 'success');
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
                    handleEvent(`成功批量鑄造 ${decodedLog.args.count?.toString()} 個聖物！`, 'success');
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
    
    // 其他事件監聽保持不變...
    useWatchContractEvent({
        ...partyContract,
        eventName: 'PartyCreated',
        onLogs: (logs: Log[]) => {
            if (!partyContract || !address) return;
            logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: partyContract.abi, ...log });
                if(decodedLog.eventName === 'PartyCreated' && decodedLog.args.owner?.toLowerCase() === address.toLowerCase()){
                     handleEvent(`隊伍 #${decodedLog.args.partyId?.toString()} 創建成功！`);
                }
            });
        },
        enabled: !!address && !!chainId && !!partyContract,
    });
    
    useWatchContractEvent({
        ...partyContract,
        eventName: 'PartyDisbanded',
        onLogs: (logs: Log[]) => {
             if (!partyContract || !address) return;
            logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: partyContract.abi, ...log });
                if(decodedLog.eventName === 'PartyDisbanded' && decodedLog.args.owner?.toLowerCase() === address.toLowerCase()){
                    handleEvent(`隊伍 #${decodedLog.args.partyId?.toString()} 已解散！`, 'info');
                }
            });
        },
        enabled: !!address && !!chainId && !!partyContract,
    });

    // 【核心修正】ExpeditionFulfilled 事件的處理邏輯
    useWatchContractEvent({
        ...dungeonCoreContract,
        eventName: 'ExpeditionFulfilled',
        onLogs: (logs: Log[]) => {
            if (!dungeonCoreContract || !address || !chainId) return;
            logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: dungeonCoreContract.abi, ...log });

                if (decodedLog.eventName === 'ExpeditionFulfilled') {
                    // 同步從快取中獲取使用者擁有的 NFT 列表
                    const queryKey = ['ownedNfts', address, chainId];
                    const ownedNftsData = queryClient.getQueryData<{ parties: AnyNft[] }>(queryKey);

                    // 判斷事件中的 partyId 是否屬於當前使用者
                    const isMyParty = ownedNftsData?.parties.some(
                        party => party.type === 'party' && party.id === decodedLog.args.partyId
                    );

                    if (isMyParty) {
                        const { partyId, success, reward } = decodedLog.args;
                        showExpeditionResult({ success, reward });
                        const message = `你的隊伍 #${partyId.toString()} 遠征已完成！`;
                        showToast(message, 'info');
                        queryClient.invalidateQueries({ queryKey: ['playerInfo', address, chainId] });
                    }
                }
            });
        },
        enabled: !!address && !!chainId && !!dungeonCoreContract,
    });

    useWatchContractEvent({
        ...dungeonCoreContract,
        eventName: 'RewardsBanked',
        onLogs: (logs: Log[]) => {
            if (!dungeonCoreContract || !address) return;
            logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: dungeonCoreContract.abi, ...log });
                if(decodedLog.eventName === 'RewardsBanked' && decodedLog.args.user?.toLowerCase() === address.toLowerCase()){
                    handleEvent(`隊伍 #${decodedLog.args.partyId?.toString()} 的獎勵已領取！`);
                }
            });
        },
        enabled: !!address && !!chainId && !!dungeonCoreContract,
    });

    useWatchContractEvent({
        ...dungeonCoreContract,
        eventName: 'TokensWithdrawn',
        onLogs: (logs: Log[]) => {
             if (!dungeonCoreContract || !address) return;
             logs.forEach(log => {
                const decodedLog = decodeEventLog({ abi: dungeonCoreContract.abi, ...log });
                if(decodedLog.eventName === 'TokensWithdrawn' && decodedLog.args.user?.toLowerCase() === address.toLowerCase()){
                     handleEvent(`金庫提領成功！`);
                }
            });
        },
        enabled: !!address && !!chainId && !!dungeonCoreContract,
    });
};
