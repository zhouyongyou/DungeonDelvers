// src/hooks/useContractEvents.ts

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

// ★★★ 網路優化：定義一個較長的輪詢間隔，減少 RPC 請求壓力 ★★★
const POLLING_INTERVAL = 12_000; // 12 秒

/**
 * @notice 高階工廠函式，用於創建通用的事件處理器，避免重複程式碼。
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

        // 如果需要檢查隊伍所有權，先從快取中獲取玩家擁有的隊伍 ID 列表
        const myPartyIds = checkPartyOwnership && queryClient
            ? (queryClient.getQueryData<AllNftCollections>(['ownedNfts', userAddress, contract.chainId])?.parties.map((p: PartyNft) => p.id) ?? [])
            : [];

        logs.forEach(log => {
            try {
                const decodedLog = decodeEventLog({ abi: contract.abi as Abi, ...log }) as DecodedLogWithArgs;
                
                // 只處理我們感興趣的事件
                if (decodedLog.eventName === eventName) {
                    const args = decodedLog.args;

                    // 案例1: 隊伍特定事件 (如遠征完成)，只處理屬於玩家的隊伍事件
                    if (checkPartyOwnership) {
                        if (args.partyId && myPartyIds.includes(args.partyId)) {
                            callback(decodedLog);
                        }
                        return;
                    }

                    // 案例2: 通用事件，檢查事件參數中是否包含玩家地址
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
 * @notice 全局合約事件監聽 Hook
 * @dev ★★★ RPC 優化核心 ★★★
 * 這個 Hook 是解決 RPC 爆炸問題的關鍵。它取代了所有定時輪詢。
 * 我們為每種數據類型定義了精準的刷新函式，確保只在必要時才重新獲取數據。
 */
export const useContractEvents = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { showExpeditionResult } = useExpeditionResult();
    const queryClient = useQueryClient();
    
    // 確保只在支援的鏈上運行
    if (!chainId || (chainId !== bsc.id)) {
        return; 
    }

    // --- 精準的 Query Invalidation 函式 ---
    
    // 當 NFT 資產或代幣餘額發生變化時呼叫
    const invalidateNftsAndBalance = () => {
        showToast('偵測到資產變動，正在更新...', 'info');
        // 讓 'ownedNfts' 和 'balance' 相關的查詢失效，觸發 wagmi 重新獲取數據
        queryClient.invalidateQueries({ queryKey: ['ownedNfts', address, chainId] });
        queryClient.invalidateQueries({ queryKey: ['balance', address, chainId] });
    };

    // 當金庫存入或取出時呼叫
    const invalidateVaultAndTax = () => {
        showToast('金庫資料已更新！', 'success');
        // 刷新金庫資訊、稅率參數和代幣餘額
        queryClient.invalidateQueries({ queryKey: ['playerInfo', address, chainId] });
        queryClient.invalidateQueries({ queryKey: ['taxParams', address, chainId] });
        queryClient.invalidateQueries({ queryKey: ['balance', address, chainId] });
    };
    
    // 當經驗值增加時呼叫
    const invalidateProfile = () => {
        showToast('經驗值已更新！', 'info');
        // 刷新玩家檔案相關的所有數據
        queryClient.invalidateQueries({ queryKey: ['profileTokenOf', address] });
        queryClient.invalidateQueries({ queryKey: ['playerExperience'] });
        queryClient.invalidateQueries({ queryKey: ['getLevel', address] });
    };
    
    // 當隊伍狀態 (儲備/冷卻/疲勞) 變化時呼叫
    const invalidatePartyStatus = (partyId?: bigint) => {
        // 精準地只刷新特定隊伍的狀態
        queryClient.invalidateQueries({ queryKey: ['getPartyStatus', partyId?.toString()] });
    };

    // --- 合約實例 ---
    const heroContract = getContract(chainId, 'hero');
    const relicContract = getContract(chainId, 'relic');
    const partyContract = getContract(chainId, 'party');
    const dungeonMasterContract = getContract(chainId, 'dungeonMaster');
    const playerVaultContract = getContract(chainId, 'playerVault');
    const altarOfAscensionContract = getContract(chainId, 'altarOfAscension');
    const playerProfileContract = getContract(chainId, 'playerProfile');

    // --- 事件監聽設定 (已加入 pollingInterval) ---
    
    // NFT 鑄造/創建事件 -> 刷新 NFT 列表和餘額
    useWatchContractEvent({ ...heroContract, chainId, eventName: 'HeroMinted', pollingInterval: POLLING_INTERVAL, onLogs: createContractEventHandler(heroContract, 'HeroMinted', address, (log) => { showToast(`英雄 #${log.args.tokenId?.toString()} 鑄造成功！`, 'success'); invalidateNftsAndBalance(); }) });
    useWatchContractEvent({ ...relicContract, chainId, eventName: 'RelicMinted', pollingInterval: POLLING_INTERVAL, onLogs: createContractEventHandler(relicContract, 'RelicMinted', address, (log) => { showToast(`聖物 #${log.args.tokenId?.toString()} 鑄造成功！`, 'success'); invalidateNftsAndBalance(); }) });
    useWatchContractEvent({ ...partyContract, chainId, eventName: 'PartyCreated', pollingInterval: POLLING_INTERVAL, onLogs: createContractEventHandler(partyContract, 'PartyCreated', address, (log) => { showToast(`隊伍 #${log.args.partyId?.toString()} 創建成功！`, 'success'); invalidateNftsAndBalance(); }) });
    
    // 金庫事件 -> 刷新金庫相關數據
    useWatchContractEvent({ ...playerVaultContract, chainId, eventName: 'Deposited', pollingInterval: POLLING_INTERVAL, onLogs: createContractEventHandler(playerVaultContract, 'Deposited', address, () => { invalidateVaultAndTax(); }) });
    useWatchContractEvent({ ...playerVaultContract, chainId, eventName: 'Withdrawn', pollingInterval: POLLING_INTERVAL, onLogs: createContractEventHandler(playerVaultContract, 'Withdrawn', address, () => { invalidateVaultAndTax(); }) });

    // 玩家檔案事件 -> 刷新個人檔案數據
    useWatchContractEvent({ ...playerProfileContract, chainId, eventName: 'ExperienceAdded', pollingInterval: POLLING_INTERVAL, onLogs: createContractEventHandler(playerProfileContract, 'ExperienceAdded', address, () => { invalidateProfile(); }) });

    // 隊伍遠征相關事件 -> 刷新特定隊伍的狀態和玩家檔案
    useWatchContractEvent({ ...dungeonMasterContract, chainId, eventName: 'ExpeditionFulfilled', pollingInterval: POLLING_INTERVAL, onLogs: createContractEventHandler(dungeonMasterContract, 'ExpeditionFulfilled', address, (log) => { const { success, reward, expGained } = log.args; showExpeditionResult({ success, reward, expGained }); invalidatePartyStatus(log.args.partyId); invalidateProfile(); }, true, queryClient) });
    useWatchContractEvent({ ...dungeonMasterContract, chainId, eventName: 'PartyRested', pollingInterval: POLLING_INTERVAL, onLogs: createContractEventHandler(dungeonMasterContract, 'PartyRested', address, (log) => { showToast(`隊伍 #${log.args.partyId?.toString()} 已恢復活力！`, 'success'); invalidatePartyStatus(log.args.partyId); }, true, queryClient) });
    useWatchContractEvent({ ...dungeonMasterContract, chainId, eventName: 'ProvisionsBought', pollingInterval: POLLING_INTERVAL, onLogs: createContractEventHandler(dungeonMasterContract, 'ProvisionsBought', address, (log) => { showToast(`隊伍 #${log.args.partyId?.toString()} 儲備補充成功！`, 'success'); invalidatePartyStatus(log.args.partyId); }, true, queryClient) });
    
    // 升星祭壇事件 -> 刷新 NFT 列表和餘額
    useWatchContractEvent({ ...altarOfAscensionContract, chainId, eventName: 'UpgradeProcessed', pollingInterval: POLLING_INTERVAL, onLogs: createContractEventHandler(altarOfAscensionContract, 'UpgradeProcessed', address, (log) => {
        const { outcome } = log.args;
        const outcomeMessages: Record<number, string> = { 3: `⚜️ 大成功！獲得 2 個更高星級的 NFT！`, 2: `✨ 升星成功！獲得 1 個更高星級的 NFT！`, 1: `💔 升星失敗，但返還了部分材料。`, 0: `💀 升星完全失敗，所有材料已銷毀。` };
        const message = outcomeMessages[outcome] || "升星處理完成。";
        const type = outcome >= 2 ? 'success' : 'info';
        showToast(message, type);
        invalidateNftsAndBalance();
    })});
};
