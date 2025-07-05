import { useAccount } from 'wagmi';
import { useWatchContractEvent } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { decodeEventLog, type Log } from 'viem';
import { getContract } from '../config/contracts';
import { useAppToast } from './useAppToast';
import { useExpeditionResult } from '../contexts/ExpeditionContext';

/**
 * @dev 一個全域的 React Hook，負責監聽所有來自核心合約的事件，
 * 並根據事件內容觸發前端的即時反應，如彈出提示、刷新數據等。
 */
export const useContractEvents = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { showExpeditionResult } = useExpeditionResult();
    const queryClient = useQueryClient();
    
    // 獲取所有需要監聽的合約實例
    const heroContract = getContract(chainId, 'hero');
    const relicContract = getContract(chainId, 'relic');
    const partyContract = getContract(chainId, 'party');
    const dungeonMasterContract = getContract(chainId, 'dungeonMaster');
    const playerVaultContract = getContract(chainId, 'playerVault');
    const altarOfAscensionContract = getContract(chainId, 'altarOfAscension');

    /**
     * @dev 一個輔助函式，用於刷新所有與用戶相關的鏈上數據。
     */
    const invalidateAllUserData = () => {
        // 使用 queryKey 的前綴來批量刷新相關的查詢
        queryClient.invalidateQueries({ queryKey: ['ownedNfts'] });
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

    // 統一的事件處理邏輯
    const handleLogs = (logs: Log[], contract: any, eventName: string, handler: (decodedLog: any) => void) => {
        if (!contract || !address) return;
        logs.forEach(log => {
            try {
                const decodedLog = decodeEventLog({ abi: contract.abi, ...log });
                if (decodedLog.eventName === eventName) {
                    // 檢查事件是否與當前用戶相關
                    const userField = (decodedLog.args as any).owner || (decodedLog.args as any).player || (decodedLog.args as any).user;
                    if (userField && userField.toLowerCase() === address.toLowerCase()) {
                        handler(decodedLog);
                    }
                }
            } catch (e) {
                console.error(`解析事件 ${eventName} 失敗:`, e);
            }
        });
    };
    
    // --- 監聽 NFT 鑄造事件 ---
    useWatchContractEvent({
        ...heroContract,
        eventName: 'HeroMinted',
        onLogs: (logs) => handleLogs(logs, heroContract, 'HeroMinted', (log) => {
            showToast(`英雄 #${log.args.tokenId?.toString()} 鑄造成功！`, 'success');
            invalidateAllUserData();
        }),
    });
    
    useWatchContractEvent({
        ...relicContract,
        eventName: 'RelicMinted',
        onLogs: (logs) => handleLogs(logs, relicContract, 'RelicMinted', (log) => {
            showToast(`聖物 #${log.args.tokenId?.toString()} 鑄造成功！`, 'success');
            invalidateAllUserData();
        }),
    });

    // --- 監聽隊伍相關事件 ---
    useWatchContractEvent({
        ...partyContract,
        eventName: 'PartyCreated',
        onLogs: (logs) => handleLogs(logs, partyContract, 'PartyCreated', (log) => {
            showToast(`隊伍 #${log.args.partyId?.toString()} 創建成功！`, 'success');
            invalidateAllUserData();
        }),
    });

    // --- 監聽遠征與金庫事件 ---
    useWatchContractEvent({
        ...dungeonMasterContract,
        eventName: 'ExpeditionFulfilled',
        onLogs: (logs) => handleLogs(logs, dungeonMasterContract, 'ExpeditionFulfilled', (log) => {
            const { partyId, success, reward, expGained } = log.args;
            showExpeditionResult({ success, reward, expGained });
            invalidateAllUserData();
        }),
    });
    
    useWatchContractEvent({
        ...dungeonMasterContract,
        eventName: 'PartyRested',
        onLogs: (logs) => handleLogs(logs, dungeonMasterContract, 'PartyRested', (log) => {
            showToast(`隊伍 #${log.args.partyId?.toString()} 已恢復活力！`, 'success');
            invalidateAllUserData();
        }),
    });

    useWatchContractEvent({
        ...playerVaultContract,
        eventName: 'Withdrawn',
        onLogs: (logs) => handleLogs(logs, playerVaultContract, 'Withdrawn', (log) => {
            showToast(`金庫提領成功！`, 'success');
            invalidateAllUserData();
        }),
    });

    // --- 監聽升星事件 ---
    useWatchContractEvent({
        ...altarOfAscensionContract,
        eventName: 'UpgradeProcessed',
        onLogs: (logs) => handleLogs(logs, altarOfAscensionContract, 'UpgradeProcessed', (log) => {
            const { targetRarity, outcome } = log.args;
            const outcomeMessages = {
                3: `⚜️ 大成功！獲得 2 個 ${targetRarity}★ NFT！`,
                2: `✨ 升星成功！獲得 1 個 ${targetRarity}★ NFT！`,
                1: `💔 升星失敗，但返還了部分材料。`,
                0: `💀 升星完全失敗，所有材料已銷毀。`,
            };
            const message = outcomeMessages[outcome as keyof typeof outcomeMessages] || "升星處理完成。";
            const type = outcome >= 2 ? 'success' : 'info';
            showToast(message, type);
            invalidateAllUserData();
        }),
    });
};
