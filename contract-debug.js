// contract-debug.js - 系統性排查VIP合約問題

import { createPublicClient, http } from 'viem';
import { bsc } from 'wagmi/chains';

const client = createPublicClient({
    chain: bsc,
    transport: http('https://bsc-dataseed1.binance.org/')
});

const VIP_CONTRACT = '0xefdfF583944A2c6318d1597AD1E41159fCd8F6dB';
const TEST_ADDRESS = '0x10925a7138649c7e1794ce646182eeb5bf8ba647';

// 測試所有相關的合約函數
const testFunctions = [
    // 已知工作的函數
    {
        name: 'userStakes',
        abi: [{
            'inputs': [{'internalType': 'address', 'name': '', 'type': 'address'}],
            'name': 'userStakes',
            'outputs': [
                {'internalType': 'uint256', 'name': 'amount', 'type': 'uint256'},
                {'internalType': 'uint256', 'name': 'tokenId', 'type': 'uint256'}
            ],
            'stateMutability': 'view',
            'type': 'function'
        }],
        args: [TEST_ADDRESS]
    },
    // 測試問題函數 - 原始類型
    {
        name: 'getVipLevel',
        abi: [{
            'inputs': [{'internalType': 'address', 'name': '_user', 'type': 'address'}],
            'name': 'getVipLevel',
            'outputs': [{'internalType': 'uint8', 'name': '', 'type': 'uint8'}],
            'stateMutability': 'view',
            'type': 'function'
        }],
        args: [TEST_ADDRESS]
    },
    // 測試問題函數 - 嘗試不同的參數名
    {
        name: 'getVipLevel_alt',
        abi: [{
            'inputs': [{'internalType': 'address', 'name': 'user', 'type': 'address'}],
            'name': 'getVipLevel',
            'outputs': [{'internalType': 'uint8', 'name': '', 'type': 'uint8'}],
            'stateMutability': 'view',
            'type': 'function'
        }],
        args: [TEST_ADDRESS]
    },
    // 測試其他可能的函數
    {
        name: 'unstakeQueue',
        abi: [{
            'inputs': [{'internalType': 'address', 'name': '', 'type': 'address'}],
            'name': 'unstakeQueue',
            'outputs': [
                {'internalType': 'uint256', 'name': 'amount', 'type': 'uint256'},
                {'internalType': 'uint256', 'name': 'availableAt', 'type': 'uint256'}
            ],
            'stateMutability': 'view',
            'type': 'function'
        }],
        args: [TEST_ADDRESS]
    },
    // 測試基本合約信息
    {
        name: 'name',
        abi: [{
            'inputs': [],
            'name': 'name',
            'outputs': [{'internalType': 'string', 'name': '', 'type': 'string'}],
            'stateMutability': 'view',
            'type': 'function'
        }],
        args: []
    },
    // 測試 soulShardToken 地址
    {
        name: 'soulShardToken',
        abi: [{
            'inputs': [],
            'name': 'soulShardToken',
            'outputs': [{'internalType': 'contract IERC20', 'name': '', 'type': 'address'}],
            'stateMutability': 'view',
            'type': 'function'
        }],
        args: []
    }
];

async function debugContract() {
    console.log('🔍 開始系統性排查VIP合約...');
    console.log('合約地址:', VIP_CONTRACT);
    console.log('測試地址:', TEST_ADDRESS);
    console.log('='.repeat(60));
    
    const results = {};
    
    for (const test of testFunctions) {
        console.log(`\n📋 測試函數: ${test.name}`);
        console.log('函數簽名:', test.abi[0].name + '(' + test.abi[0].inputs.map(i => i.type).join(',') + ')');
        
        try {
            const result = await client.readContract({
                address: VIP_CONTRACT,
                abi: test.abi,
                functionName: test.abi[0].name,
                args: test.args
            });
            
            console.log('✅ 成功:', result);
            results[test.name] = { success: true, result };
            
        } catch (error) {
            console.log('❌ 失敗:', error.message);
            results[test.name] = { success: false, error: error.message };
            
            // 詳細錯誤分析
            if (error.message.includes('execution reverted')) {
                console.log('   💡 可能原因: 函數內部邏輯錯誤或依賴問題');
            } else if (error.message.includes('function does not exist')) {
                console.log('   💡 可能原因: 函數不存在或ABI錯誤');
            } else {
                console.log('   💡 可能原因: 網路或合約地址問題');
            }
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 測試結果總結:');
    
    const successful = Object.entries(results).filter(([_, r]) => r.success);
    const failed = Object.entries(results).filter(([_, r]) => !r.success);
    
    console.log(`✅ 成功: ${successful.length}/${testFunctions.length}`);
    console.log(`❌ 失敗: ${failed.length}/${testFunctions.length}`);
    
    if (failed.length > 0) {
        console.log('\n❌ 失敗的函數:');
        failed.forEach(([name, result]) => {
            console.log(`  - ${name}: ${result.error}`);
        });
    }
    
    // 分析模式
    console.log('\n🧠 分析模式:');
    if (results.userStakes?.success && results.unstakeQueue?.success) {
        console.log('✅ 基本讀取函數正常');
    }
    
    if (!results.getVipLevel?.success) {
        console.log('❌ getVipLevel 函數有問題');
        console.log('   可能需要檢查函數實現或依賴');
    }
    
    if (results.soulShardToken?.success) {
        console.log('✅ 合約配置正常，SoulShard地址:', results.soulShardToken.result);
    }
    
    return results;
}

debugContract().catch(console.error);