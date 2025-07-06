import { useAccount } from 'wagmi';
import { useWatchContractEvent } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { decodeEventLog, type Log } from 'viem';
import { getContract } from '../config/contracts';
import { useAppToast } from './useAppToast';
import { useExpeditionResult } from '../contexts/ExpeditionContext';
import type { AllNftCollections } from '../types/nft'; // ★ 修正：移除未使用的 AnyNft
import { bsc, bscTestnet } from 'wagmi/chains';

// ★ 修正：為解碼後的日誌定義一個清晰的型別
type DecodedLogWithArgs = {
    eventName: string;
    args: any;
};

export const useContractEvents = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { showExpeditionResult } = useExpeditionResult();
    const queryClient = useQueryClient();
    
    if (!chainId || (chainId !== bsc.id && chainId !== bscTestnet.id)) {
        return; 
    }

    const heroContract = getContract(chainId, 'hero');
    const relicContract = getContract(chainId, 'relic');
    const partyContract = getContract(chainId, 'party');
    const dungeonMasterContract = getContract(chainId, 'dungeonMaster');
    const playerVaultContract = getContract(chainId, 'playerVault');
    const altarOfAscensionContract = getContract(chainId, 'altarOfAscension');

    const invalidateAllUserData = () => {
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

    // ★ 修正：讓 handler 函式接收我們定義的強型別
    const handleLogsForUser = (logs: Log[], contract: any, eventName: string, handler: (decodedLog: DecodedLogWithArgs) => void) => {
        if (!contract || !address) return;
        logs.forEach(log => {
            try {
                // ★ 修正：將解碼結果斷言為我們定義的型別，解決 'unknown' 錯誤
                const decodedLog = decodeEventLog({ abi: contract.abi, ...log }) as DecodedLogWithArgs;
                if (decodedLog.eventName === eventName) {
                    const args = decodedLog.args;
                    const userField = args.owner || args.player || args.user;
                    if (userField && userField.toLowerCase() === address.toLowerCase()) {
                        handler(decodedLog);
                    }
                }
            } catch (e) { console.error(`解析事件 ${eventName} 失敗:`, e); }
        });
    };
    
    const handlePartySpecificEvent = (logs: Log[], contract: any, eventName: string, handler: (decodedLog: DecodedLogWithArgs) => void) => {
        if (!contract || !address) return;
        const ownedNftsData = queryClient.getQueryData<AllNftCollections>(['ownedNfts', address, chainId]);
        const myPartyIds = ownedNftsData?.parties.map(p => p.id) ?? [];

        logs.forEach(log => {
            try {
                const decodedLog = decodeEventLog({ abi: contract.abi, ...log }) as DecodedLogWithArgs;
                if (decodedLog.eventName === eventName) {
                    const { partyId } = decodedLog.args;
                    if (partyId && myPartyIds.includes(partyId)) {
                        handler(decodedLog);
                    }
                }
            } catch (e) { console.error(`解析事件 ${eventName} 失敗:`, e); }
        });
    };

    useWatchContractEvent({ ...heroContract, eventName: 'HeroMinted', onLogs: (logs) => handleLogsForUser(logs, heroContract, 'HeroMinted', (log) => { showToast(`英雄 #${log.args.tokenId?.toString()} 鑄造成功！`, 'success'); invalidateAllUserData(); }) });
    useWatchContractEvent({ ...relicContract, eventName: 'RelicMinted', onLogs: (logs) => handleLogsForUser(logs, relicContract, 'RelicMinted', (log) => { showToast(`聖物 #${log.args.tokenId?.toString()} 鑄造成功！`, 'success'); invalidateAllUserData(); }) });
    useWatchContractEvent({ ...partyContract, eventName: 'PartyCreated', onLogs: (logs) => handleLogsForUser(logs, partyContract, 'PartyCreated', (log) => { showToast(`隊伍 #${log.args.partyId?.toString()} 創建成功！`, 'success'); invalidateAllUserData(); }) });
    useWatchContractEvent({ ...dungeonMasterContract, eventName: 'ExpeditionFulfilled', onLogs: (logs) => handlePartySpecificEvent(logs, dungeonMasterContract, 'ExpeditionFulfilled', (log) => { const { success, reward, expGained } = log.args; showExpeditionResult({ success, reward, expGained }); invalidateAllUserData(); }) });
    useWatchContractEvent({ ...dungeonMasterContract, eventName: 'PartyRested', onLogs: (logs) => handlePartySpecificEvent(logs, dungeonMasterContract, 'PartyRested', (log) => { showToast(`隊伍 #${log.args.partyId?.toString()} 已恢復活力！`, 'success'); invalidateAllUserData(); }) });
    
    // ★ 修正：將未使用的 'log' 參數改為 '_log'，消除 linter 警告
    useWatchContractEvent({ ...playerVaultContract, eventName: 'Deposited', onLogs: (logs) => handleLogsForUser(logs, playerVaultContract, 'Deposited', (_log) => { showToast(`獎勵已存入金庫！`, 'success'); invalidateAllUserData(); }) });
    
    useWatchContractEvent({ ...playerVaultContract, eventName: 'Withdrawn', onLogs: (logs) => handleLogsForUser(logs, playerVaultContract, 'Withdrawn', (_log) => { showToast(`金庫提領成功！`, 'success'); invalidateAllUserData(); }) });
    
    useWatchContractEvent({ ...altarOfAscensionContract, eventName: 'UpgradeProcessed', onLogs: (logs) => handleLogsForUser(logs, altarOfAscensionContract, 'UpgradeProcessed', (log) => {
        const { targetRarity, outcome } = log.args;
        const outcomeMessages = { 3: `⚜️ 大成功！獲得 2 個 ${targetRarity}★ NFT！`, 2: `✨ 升星成功！獲得 1 個 ${targetRarity}★ NFT！`, 1: `💔 升星失敗，但返還了部分材料。`, 0: `💀 升星完全失敗，所有材料已銷毀。` };
        const message = outcomeMessages[outcome as keyof typeof outcomeMessages] || "升星處理完成。";
        const type = outcome >= 2 ? 'success' : 'info';
        showToast(message, type);
        invalidateAllUserData();
    })});
};
