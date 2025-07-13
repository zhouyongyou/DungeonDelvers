// vip-config-debug.js - 檢查VIP配置和可能的修復方案

import { createPublicClient, http } from 'viem';
import { bsc } from 'wagmi/chains';

const client = createPublicClient({
    chain: bsc,
    transport: http('https://bsc-dataseed1.binance.org/')
});

const VIP_CONTRACT = '0xefdfF583944A2c6318d1597AD1E41159fCd8F6dB';
const DUNGEONCORE_CONTRACT = '0x4CbAC0E4AEC9Ef3B11C93805483c23224ed1f118';
const TEST_ADDRESS = '0x10925a7138649c7e1794ce646182eeb5bf8ba647';

async function checkVipConfiguration() {
    console.log('🔍 檢查 VIP 配置問題...');
    console.log('='.repeat(50));
    
    try {
        // 1. 檢查 DungeonCore 中是否有 VIP 相關配置
        console.log('\n1. 檢查 DungeonCore 中的 VIP 配置...');
        
        // 嘗試讀取可能的VIP配置函數
        const possibleConfigFunctions = [
            'getVipThresholds',
            'vipLevels', 
            'vipLevel',
            'getVipConfig',
            'vipConfig'
        ];
        
        for (const funcName of possibleConfigFunctions) {
            try {
                console.log(`嘗試調用 DungeonCore.${funcName}...`);
                const result = await client.readContract({
                    address: DUNGEONCORE_CONTRACT,
                    abi: [{
                        'inputs': [],
                        'name': funcName,
                        'outputs': [{'internalType': 'uint256', 'name': '', 'type': 'uint256'}],
                        'stateMutability': 'view',
                        'type': 'function'
                    }],
                    functionName: funcName
                });
                console.log(`✅ ${funcName}:`, result.toString());
            } catch (error) {
                console.log(`❌ ${funcName}: 函數不存在或調用失敗`);
            }
        }
        
        // 2. 嘗試直接從VIP合約讀取可能的配置
        console.log('\n2. 檢查 VIP 合約中的配置函數...');
        
        const vipConfigFunctions = [
            'vipLevelThresholds',
            'vipThresholds',
            'getVipThreshold',
            'levelThresholds'
        ];
        
        for (const funcName of vipConfigFunctions) {
            try {
                console.log(`嘗試調用 VIP.${funcName}...`);
                // 嘗試帶參數的版本
                for (let level = 1; level <= 5; level++) {
                    try {
                        const result = await client.readContract({
                            address: VIP_CONTRACT,
                            abi: [{
                                'inputs': [{'internalType': 'uint256', 'name': 'level', 'type': 'uint256'}],
                                'name': funcName,
                                'outputs': [{'internalType': 'uint256', 'name': '', 'type': 'uint256'}],
                                'stateMutability': 'view',
                                'type': 'function'
                            }],
                            functionName: funcName,
                            args: [level]
                        });
                        console.log(`✅ ${funcName}(${level}):`, result.toString());
                    } catch {}
                }
            } catch {}
        }
        
        // 3. 嘗試手動測試 getVipLevel 在不同條件下的行為
        console.log('\n3. 嘗試理解 getVipLevel 失敗的具體原因...');
        
        // 測試一個沒有質押的地址
        const emptyAddress = '0x0000000000000000000000000000000000000001';
        try {
            console.log('測試空地址的 getVipLevel...');
            const result = await client.readContract({
                address: VIP_CONTRACT,
                abi: [{
                    'inputs': [{'internalType': 'address', 'name': '_user', 'type': 'address'}],
                    'name': 'getVipLevel',
                    'outputs': [{'internalType': 'uint8', 'name': '', 'type': 'uint8'}],
                    'stateMutability': 'view',
                    'type': 'function'
                }],
                functionName: 'getVipLevel',
                args: [emptyAddress]
            });
            console.log('✅ 空地址 getVipLevel 成功:', result);
        } catch (error) {
            console.log('❌ 空地址 getVipLevel 也失敗:', error.message);
        }
        
        // 4. 分析解決方案
        console.log('\n4. 📋 分析和建議...');
        console.log('基於診斷結果，問題可能是：');
        console.log('');
        console.log('🔴 可能的問題：');
        console.log('1. VIP等級閾值未在合約中設置');
        console.log('2. getVipLevel 函數實現有bug（除零、溢出等）');
        console.log('3. 函數依賴的狀態變量未正確初始化');
        console.log('');
        console.log('🔧 可能的解決方案：');
        console.log('1. 【推薦】基於質押金額的本地計算（已實現）');
        console.log('2. 聯繫合約開發者修復getVipLevel函數');
        console.log('3. 升級合約以修復邏輯錯誤');
        console.log('');
        console.log('💡 建議：');
        console.log('由於合約的 getVipLevel 函數有致命錯誤，');
        console.log('目前最佳解決方案是繼續使用基於質押金額的本地計算。');
        console.log('這樣可以確保VIP功能正常工作，直到合約被修復。');
        
    } catch (error) {
        console.error('❌ VIP配置檢查失敗:', error);
    }
}

checkVipConfiguration();