// dependency-debug.js - 檢查VIP合約的依賴問題

import { createPublicClient, http } from 'viem';
import { bsc } from 'wagmi/chains';

const client = createPublicClient({
    chain: bsc,
    transport: http('https://bsc-dataseed1.binance.org/')
});

const VIP_CONTRACT = '0xefdfF583944A2c6318d1597AD1E41159fCd8F6dB';
const EXPECTED_DUNGEONCORE = '0x4CbAC0E4AEC9Ef3B11C93805483c23224ed1f118';
const EXPECTED_SOULSHARD = '0xc88dAD283Ac209D77Bfe452807d378615AB8B94a';

async function checkDependencies() {
    console.log('🔍 檢查 VIP 合約依賴...');
    console.log('='.repeat(50));
    
    try {
        // 1. 檢查 DungeonCore 地址
        console.log('\n1. 檢查 DungeonCore 依賴...');
        const dungeonCoreResult = await client.readContract({
            address: VIP_CONTRACT,
            abi: [{
                'inputs': [],
                'name': 'dungeonCore',
                'outputs': [{'internalType': 'contract IDungeonCore', 'name': '', 'type': 'address'}],
                'stateMutability': 'view',
                'type': 'function'
            }],
            functionName: 'dungeonCore'
        });
        
        console.log('VIP合約中的DungeonCore地址:', dungeonCoreResult);
        console.log('預期的DungeonCore地址:        ', EXPECTED_DUNGEONCORE);
        console.log('地址匹配:', dungeonCoreResult.toLowerCase() === EXPECTED_DUNGEONCORE.toLowerCase() ? '✅' : '❌');
        
        // 2. 測試 DungeonCore 合約是否可訪問
        console.log('\n2. 測試 DungeonCore 合約可訪問性...');
        try {
            // 嘗試調用DungeonCore的基本函數
            const dungeonCoreTest = await client.readContract({
                address: dungeonCoreResult,
                abi: [{
                    'inputs': [],
                    'name': 'owner',
                    'outputs': [{'internalType': 'address', 'name': '', 'type': 'address'}],
                    'stateMutability': 'view',
                    'type': 'function'
                }],
                functionName: 'owner'
            });
            console.log('✅ DungeonCore 可以訪問，owner:', dungeonCoreTest);
        } catch (error) {
            console.log('❌ DungeonCore 訪問失敗:', error.message);
        }
        
        // 3. 檢查 SoulShard 代幣狀態
        console.log('\n3. 檢查 SoulShard 代幣狀態...');
        const soulShardResult = await client.readContract({
            address: VIP_CONTRACT,
            abi: [{
                'inputs': [],
                'name': 'soulShardToken',
                'outputs': [{'internalType': 'contract IERC20', 'name': '', 'type': 'address'}],
                'stateMutability': 'view',
                'type': 'function'
            }],
            functionName: 'soulShardToken'
        });
        
        console.log('VIP合約中的SoulShard地址:', soulShardResult);
        console.log('預期的SoulShard地址:        ', EXPECTED_SOULSHARD);
        console.log('地址匹配:', soulShardResult.toLowerCase() === EXPECTED_SOULSHARD.toLowerCase() ? '✅' : '❌');
        
        // 4. 測試 SoulShard 合約
        try {
            const soulShardName = await client.readContract({
                address: soulShardResult,
                abi: [{
                    'inputs': [],
                    'name': 'name',
                    'outputs': [{'internalType': 'string', 'name': '', 'type': 'string'}],
                    'stateMutability': 'view',
                    'type': 'function'
                }],
                functionName: 'name'
            });
            console.log('✅ SoulShard 代幣可訪問，名稱:', soulShardName);
        } catch (error) {
            console.log('❌ SoulShard 代幣訪問失敗:', error.message);
        }
        
        // 5. 檢查其他可能的依賴函數
        console.log('\n4. 檢查其他可能影響 getVipLevel 的狀態...');
        
        // 檢查 unstakeCooldown
        try {
            const cooldown = await client.readContract({
                address: VIP_CONTRACT,
                abi: [{
                    'inputs': [],
                    'name': 'unstakeCooldown',
                    'outputs': [{'internalType': 'uint256', 'name': '', 'type': 'uint256'}],
                    'stateMutability': 'view',
                    'type': 'function'
                }],
                functionName: 'unstakeCooldown'
            });
            console.log('unstakeCooldown:', cooldown.toString());
        } catch (error) {
            console.log('❌ unstakeCooldown 讀取失敗:', error.message);
        }
        
        // 6. 嘗試手動模擬 getVipLevel 邏輯
        console.log('\n5. 分析 getVipLevel 可能的實現邏輯...');
        console.log('根據常見的VIP系統，getVipLevel 可能的實現：');
        console.log('- 讀取用戶質押金額');
        console.log('- 從 DungeonCore 或其他地方讀取VIP等級配置');
        console.log('- 計算並返回等級');
        console.log('');
        console.log('💡 失敗可能原因：');
        console.log('1. DungeonCore 中沒有設置VIP等級配置');
        console.log('2. VIP等級計算涉及除零或溢出錯誤');
        console.log('3. 依賴的狀態變量未初始化');
        
    } catch (error) {
        console.error('❌ 依賴檢查失敗:', error);
    }
}

checkDependencies();