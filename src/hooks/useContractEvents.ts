// src/hooks/useContractEvents.ts (Refactored)

import { useAccount, useWatchContractEvent } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { decodeEventLog, type Log, type Abi } from 'viem';
import { getContract } from '../config/contracts';
import { useAppToast } from './useAppToast';
import { useExpeditionResult } from '../contexts/ExpeditionContext';
import type { AllNftCollections, PartyNft } from '../types/nft';
import { bsc, bscTestnet } from 'wagmi/chains';

// 定義解碼後日誌的通用型別
type DecodedLogWithArgs = {
    eventName: string;
    args: any;
};

/**
 * @notice 一個高階工廠函式，用於創建通用的事件處理器。
 * @param contract 要監聽的合約物件。
 * @param eventName 要監聽的事件名稱。
 * @param userAddress 當前用戶的地址。
 * @param callback 處理事件的回呼函式。
 * @param checkPartyOwnership 是否需要檢查隊伍所有權 (專為隊伍相關事件設計)。
 * @param queryClient 用於獲取快取數據的 queryClient 實例。
 * @returns 一個 onLogs 函式，可直接傳遞給 useWatchContractEvent。
 */
function createContractEventHandler(
    contract: ReturnType<typeof getContract>,
    eventName: string,
    userAddress: `0x${string}` | undefined,
    callback: (decodedLog: DecodedLogWithArgs) => void,
    checkPartyOwnership: boolean = false,
    queryClient?: ReturnType<typeof useQueryClient>
) {
    return (logs: Log[]) => {
        if (!contract || !userAddress) return;

        // 如果需要檢查隊伍所有權，先從快取中獲取玩家擁有的隊伍 ID
        const myPartyIds = checkPartyOwnership && queryClient
            ? (queryClient.getQueryData<AllNftCollections>(['ownedNfts', userAddress, contract.chainId])?.parties.map((p: PartyNft) => p.id) ?? [])
            : [];

        logs.forEach(log => {
            try {
                const decodedLog = decodeEventLog({ abi: contract.abi as Abi, ...log }) as DecodedLogWithArgs;
                
                if (decodedLog.eventName === eventName) {
                    const args = decodedLog.args;

                    // 檢查是否為隊伍特定事件
                    if (checkPartyOwnership) {
                        if (args.partyId && myPartyIds.includes(args.partyId)) {
                            callback(decodedLog);
                        }
                        return;
                    }

                    // 通用檢查，涵蓋 owner, player, user 等常見欄位
                    const userField = args.owner || args.player || args.user;
                    if (userField && userField.toLowerCase() === userAddress.toLowerCase()) {
                        callback(decodedLog);
                    }
                }
            } catch (e) {
                console.error(`解析事件 ${eventName} 失敗:`, e);
            }
        });
    };
}


export const useContractEvents = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { showExpeditionResult } = useExpeditionResult();
    const queryClient = useQueryClient();
    
    // 進行網路檢查，確保在支援的鏈上
    if (!chainId || (chainId !== bsc.id && chainId !== bscTestnet.id)) {
        return; 
    }

    // 獲取所有需要的合約實例
    const heroContract = getContract(chainId, 'hero');
    const relicContract = getContract(chainId, 'relic');
    const partyContract = getContract(chainId, 'party');
    const dungeonMasterContract = getContract(chainId, 'dungeonMaster');
    const playerVaultContract = getContract(chainId, 'playerVault');
    const altarOfAscensionContract = getContract(chainId, 'altarOfAscension');

    // 通用的數據刷新函式
    const invalidateAllUserData = () => {
        // 使用 queryClient 讓相關的快取失效，觸發數據重新獲取
        queryClient.invalidateQueries({ queryKey: ['ownedNfts', address, chainId] });
        queryClient.invalidateQueries({ queryKey: ['balance'] });
        queryClient.invalidateQueries({ queryKey: ['playerInfo'] });
        queryClient.invalidateQueries({ queryKey: ['profileTokenOf'] });
        queryClient.invalidateQueries({ queryKey: ['playerExperience'] });
        queryClient.invalidateQueries({ queryKey: ['tokenURI'] });
        queryClient.invalidateQueries({ queryKey: ['userStakes'] });
        queryClient.invalidateQueries({ queryKey: ['partyStatuses'] });
        queryClient.invalidateQueries({ queryKey: ['allowance'] });
        queryClient.invalidateQueries({ queryKey: ['getRestCost'] });
    };

    // 使用工廠函式創建事件處理器
    useWatchContractEvent({ ...heroContract, chainId, eventName: 'HeroMinted', onLogs: createContractEventHandler(heroContract, 'HeroMinted', address, (log) => { showToast(`英雄 #${log.args.tokenId?.toString()} 鑄造成功！`, 'success'); invalidateAllUserData(); }) });
    useWatchContractEvent({ ...relicContract, chainId, eventName: 'RelicMinted', onLogs: createContractEventHandler(relicContract, 'RelicMinted', address, (log) => { showToast(`聖物 #${log.args.tokenId?.toString()} 鑄造成功！`, 'success'); invalidateAllUserData(); }) });
    useWatchContractEvent({ ...partyContract, chainId, eventName: 'PartyCreated', onLogs: createContractEventHandler(partyContract, 'PartyCreated', address, (log) => { showToast(`隊伍 #${log.args.partyId?.toString()} 創建成功！`, 'success'); invalidateAllUserData(); }) });
    useWatchContractEvent({ ...playerVaultContract, chainId, eventName: 'Deposited', onLogs: createContractEventHandler(playerVaultContract, 'Deposited', address, () => { showToast(`獎勵已存入金庫！`, 'success'); invalidateAllUserData(); }) });
    useWatchContractEvent({ ...playerVaultContract, chainId, eventName: 'Withdrawn', onLogs: createContractEventHandler(playerVaultContract, 'Withdrawn', address, () => { showToast(`金庫提領成功！`, 'success'); invalidateAllUserData(); }) });

    // 處理隊伍特定事件
    useWatchContractEvent({ ...dungeonMasterContract, chainId, eventName: 'ExpeditionFulfilled', onLogs: createContractEventHandler(dungeonMasterContract, 'ExpeditionFulfilled', address, (log) => { const { success, reward, expGained } = log.args; showExpeditionResult({ success, reward, expGained }); invalidateAllUserData(); }, true, queryClient) });
    useWatchContractEvent({ ...dungeonMasterContract, chainId, eventName: 'PartyRested', onLogs: createContractEventHandler(dungeonMasterContract, 'PartyRested', address, (log) => { showToast(`隊伍 #${log.args.partyId?.toString()} 已恢復活力！`, 'success'); invalidateAllUserData(); }, true, queryClient) });
    
    // 處理升星祭壇事件
    useWatchContractEvent({ ...altarOfAscensionContract, chainId, eventName: 'UpgradeProcessed', onLogs: createContractEventHandler(altarOfAscensionContract, 'UpgradeProcessed', address, (log) => {
        const { targetRarity, outcome } = log.args;
        const outcomeMessages: Record<number, string> = { 3: `⚜️ 大成功！獲得 2 個 ${targetRarity}★ NFT！`, 2: `✨ 升星成功！獲得 1 個 ${targetRarity}★ NFT！`, 1: `💔 升星失敗，但返還了部分材料。`, 0: `💀 升星完全失敗，所有材料已銷毀。` };
        const message = outcomeMessages[outcome] || "升星處理完成。";
        const type = outcome >= 2 ? 'success' : 'info';
        showToast(message, type);
        invalidateAllUserData();
    })});
};
