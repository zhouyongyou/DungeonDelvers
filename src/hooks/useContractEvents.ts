import { useAccount } from 'wagmi';
import { useWatchContractEvent } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { getContract } from '../config/contracts';
import { useAppToast } from './useAppToast';
import { useExpeditionResult } from '../contexts/ExpeditionContext'; // <-- 【新】引入 Hook

export const useContractEvents = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { showExpeditionResult } = useExpeditionResult(); // <-- 【新】獲取彈窗函式
    const queryClient = useQueryClient();
    
    const heroContract = getContract(chainId, 'hero');
    const relicContract = getContract(chainId, 'relic');
    const partyContract = getContract(chainId, 'party');
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');

    const handleEvent = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
      showToast(message, type);
      queryClient.invalidateQueries({ queryKey: ['ownedNfts'] });
      queryClient.invalidateQueries({ queryKey: ['balance', address, chainId] });
      queryClient.invalidateQueries({ queryKey: ['playerInfo', address, chainId] });
    };

    const isUserRelated = (log: any, userKey: 'requester' | 'owner' | 'user' = 'owner') => {
        const userAddressInLog = log?.args?.[userKey];
        return userAddressInLog && address && userAddressInLog.toLowerCase() === address.toLowerCase();
    };

    useWatchContractEvent({
        ...heroContract,
        eventName: 'HeroMinted',
        onLogs: (logs: any) => {
            if (isUserRelated(logs[0], 'requester')) {
                handleEvent(`英雄 #${logs[0].args.tokenId?.toString()} 鑄造成功！`);
            }
        },
        enabled: !!address && !!chainId && !!heroContract,
    });
    
    useWatchContractEvent({
        ...relicContract,
        eventName: 'RelicMinted',
        onLogs: (logs: any) => {
            if (isUserRelated(logs[0], 'requester')) {
                handleEvent(`聖物 #${logs[0].args.tokenId?.toString()} 鑄造成功！`);
            }
        },
        enabled: !!address && !!chainId && !!relicContract,
    });

    useWatchContractEvent({
        ...partyContract,
        eventName: 'PartyCreated',
        onLogs: (logs: any) => {
            if (isUserRelated(logs[0])) {
                handleEvent(`隊伍 #${logs[0].args.partyId?.toString()} 創建成功！`);
            }
        },
        enabled: !!address && !!chainId && !!partyContract,
    });
    
    useWatchContractEvent({
        ...partyContract,
        eventName: 'PartyDisbanded',
        onLogs: (logs: any) => {
            if (isUserRelated(logs[0])) {
                handleEvent(`隊伍 #${logs[0].args.partyId?.toString()} 已解散！`, 'info');
            }
        },
        enabled: !!address && !!chainId && !!partyContract,
    });

    // 監聽遠征完成事件
    useWatchContractEvent({
        ...getContract(chainId, 'dungeonCore'),
        eventName: 'ExpeditionFulfilled',
        onLogs: (logs: any) => {
            if (isUserRelated(logs[0], 'requester')) {
                const { success, reward } = logs[0].args;
                
                // 【新】呼叫函式來顯示戰報彈窗，而不是 Toast
                showExpeditionResult({ success, reward });

                // 在彈窗的同時，仍然可以顯示一個簡單的 Toast 作為即時通知
                const message = `隊伍 #${logs[0].args.partyId.toString()} 遠征已完成！`;
                showToast(message, 'info');

                // 刷新相關數據
                queryClient.invalidateQueries({ queryKey: ['playerInfo', address, chainId] });
            }
        },
        enabled: !!address && !!chainId && !!getContract(chainId, 'dungeonCore'),
    });

    useWatchContractEvent({
        ...dungeonCoreContract,
        eventName: 'TokensWithdrawn',
        onLogs: (logs: any) => {
            if (isUserRelated(logs[0], 'user')) {
                handleEvent(`金庫提領成功！`);
            }
        },
        enabled: !!address && !!chainId && !!dungeonCoreContract,
    });
};