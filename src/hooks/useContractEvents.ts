// src/hooks/useContractEvents.ts (RPC 優化核心檔案)

import { useAccount, useWatchContractEvent } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { decodeEventLog, type Log, type Abi } from 'viem';
import { getContract } from '../config/contracts';
import { useAppToast } from './useAppToast';
import { useExpeditionResult } from '../contexts/ExpeditionContext';
import type { AllNftCollections, PartyNft } from '../types/nft';
import { bsc } from 'wagmi/chains';

type DecodedLogWithArgs = {
    eventName: string;
    args: any;
};

/**
 * @notice 高階工廠函式，用於創建通用的事件處理器。
 * @dev 此函式封裝了日誌解碼、事件名稱匹配和使用者地址驗證的通用邏輯。
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
                // 忽略解析錯誤，因為一個日誌可能匹配多個事件定義
            }
        });
    };
}

/**
 * @notice 全局合約事件監聽 Hook (已重構)
 * @dev ★ 核心優化：將 `invalidateAllUserData` 拆分為多個精準的失效函式，
 * 並根據事件類型，只刷新真正需要更新的數據，從根本上解決 RPC 請求風暴。
 */
export const useContractEvents = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { showExpeditionResult } = useExpeditionResult();
    const queryClient = useQueryClient();
    
    if (!chainId || (chainId !== bsc.id)) {
        return; 
    }

    // --- 精準的 Query Invalidation 函式 ---
    
    // 使 NFT 和代幣餘額相關的查詢失效
    const invalidateNftsAndBalance = () => {
        showToast('偵測到資產變動，正在更新...', 'info');
        queryClient.invalidateQueries({ queryKey: ['ownedNfts', address, chainId] });
        queryClient.invalidateQueries({ queryKey: ['balance', address, chainId] });
    };

    // 使金庫和稅率相關的查詢失效
    const invalidateVaultAndTax = () => {
        showToast('金庫資料已更新！', 'success');
        queryClient.invalidateQueries({ queryKey: ['playerInfo', address, chainId] });
        queryClient.invalidateQueries({ queryKey: ['taxParams', address, chainId] });
        queryClient.invalidateQueries({ queryKey: ['balance', address, chainId] });
    };
    
    // 使玩家檔案 (等級/經驗) 相關的查詢失效
    const invalidateProfile = () => {
        showToast('經驗值已更新！', 'info');
        queryClient.invalidateQueries({ queryKey: ['profileTokenOf', address] });
        queryClient.invalidateQueries({ queryKey: ['playerExperience'] });
    };
    
    // 使隊伍狀態 (儲備/冷卻) 相關的查詢失效
    const invalidatePartyStatus = (partyId?: bigint) => {
        queryClient.invalidateQueries({ queryKey: ['partyStatuses', partyId?.toString()] });
        queryClient.invalidateQueries({ queryKey: ['ownedNfts', address, chainId] }); // 隊伍狀態也可能影響顯示
    };

    // --- 合約實例 ---
    const heroContract = getContract(chainId, 'hero');
    const relicContract = getContract(chainId, 'relic');
    const partyContract = getContract(chainId, 'party');
    const dungeonMasterContract = getContract(chainId, 'dungeonMaster');
    const playerVaultContract = getContract(chainId, 'playerVault');
    const altarOfAscensionContract = getContract(chainId, 'altarOfAscension');
    const playerProfileContract = getContract(chainId, 'playerProfile');

    // --- 事件監聽設定 ---
    
    // NFT 鑄造事件
    useWatchContractEvent({ ...heroContract, chainId, eventName: 'HeroMinted', onLogs: createContractEventHandler(heroContract, 'HeroMinted', address, (log) => { showToast(`英雄 #${log.args.tokenId?.toString()} 鑄造成功！`, 'success'); invalidateNftsAndBalance(); }) });
    useWatchContractEvent({ ...relicContract, chainId, eventName: 'RelicMinted', onLogs: createContractEventHandler(relicContract, 'RelicMinted', address, (log) => { showToast(`聖物 #${log.args.tokenId?.toString()} 鑄造成功！`, 'success'); invalidateNftsAndBalance(); }) });
    
    // 隊伍與金庫事件
    useWatchContractEvent({ ...partyContract, chainId, eventName: 'PartyCreated', onLogs: createContractEventHandler(partyContract, 'PartyCreated', address, (log) => { showToast(`隊伍 #${log.args.partyId?.toString()} 創建成功！`, 'success'); invalidateNftsAndBalance(); }) });
    useWatchContractEvent({ ...playerVaultContract, chainId, eventName: 'Deposited', onLogs: createContractEventHandler(playerVaultContract, 'Deposited', address, () => { invalidateVaultAndTax(); }) });
    useWatchContractEvent({ ...playerVaultContract, chainId, eventName: 'Withdrawn', onLogs: createContractEventHandler(playerVaultContract, 'Withdrawn', address, () => { invalidateVaultAndTax(); }) });

    // ★ 新增：監聽玩家檔案經驗變化事件
    useWatchContractEvent({ ...playerProfileContract, chainId, eventName: 'ExperienceAdded', onLogs: createContractEventHandler(playerProfileContract, 'ExperienceAdded', address, () => { invalidateProfile(); }) });

    // 隊伍遠征相關事件
    useWatchContractEvent({ ...dungeonMasterContract, chainId, eventName: 'ExpeditionFulfilled', onLogs: createContractEventHandler(dungeonMasterContract, 'ExpeditionFulfilled', address, (log) => { const { success, reward, expGained } = log.args; showExpeditionResult({ success, reward, expGained }); invalidatePartyStatus(log.args.partyId); invalidateProfile(); }, true, queryClient) });
    useWatchContractEvent({ ...dungeonMasterContract, chainId, eventName: 'PartyRested', onLogs: createContractEventHandler(dungeonMasterContract, 'PartyRested', address, (log) => { showToast(`隊伍 #${log.args.partyId?.toString()} 已恢復活力！`, 'success'); invalidatePartyStatus(log.args.partyId); }, true, queryClient) });
    useWatchContractEvent({ ...dungeonMasterContract, chainId, eventName: 'ProvisionsBought', onLogs: createContractEventHandler(dungeonMasterContract, 'ProvisionsBought', address, (log) => { showToast(`隊伍 #${log.args.partyId?.toString()} 儲備補充成功！`, 'success'); invalidatePartyStatus(log.args.partyId); }, true, queryClient) });
    
    // 升星祭壇事件
    useWatchContractEvent({ ...altarOfAscensionContract, chainId, eventName: 'UpgradeProcessed', onLogs: createContractEventHandler(altarOfAscensionContract, 'UpgradeProcessed', address, (log) => {
        const { outcome } = log.args;
        const outcomeMessages: Record<number, string> = { 3: `⚜️ 大成功！獲得 2 個更高星級的 NFT！`, 2: `✨ 升星成功！獲得 1 個更高星級的 NFT！`, 1: `💔 升星失敗，但返還了部分材料。`, 0: `💀 升星完全失敗，所有材料已銷毀。` };
        const message = outcomeMessages[outcome] || "升星處理完成。";
        const type = outcome >= 2 ? 'success' : 'info';
        showToast(message, type);
        invalidateNftsAndBalance();
    })});
};