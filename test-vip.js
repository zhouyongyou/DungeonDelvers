// test-vip.js - 快速VIP測試腳本

import { createPublicClient, http } from 'viem';
import { bsc } from 'wagmi/chains';

// VIP合約地址和ABI (簡化版本)
const VIP_CONTRACT_ADDRESS = '0xefdfF583944A2c6318d1597AD1E41159fCd8F6dB';
const TEST_ADDRESS = '0x10925a7138649c7e1794ce646182eeb5bf8ba647';

const VIP_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        "name": "userStakes",
        "outputs": [
            {"internalType": "uint256", "name": "amount", "type": "uint256"},
            {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "_user", "type": "address"}],
        "name": "getVipLevel",
        "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "_user", "type": "address"}],
        "name": "getVipTaxReduction",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

async function testVipContract() {
    console.log('🧪 測試VIP合約功能...');
    console.log('合約地址:', VIP_CONTRACT_ADDRESS);
    console.log('測試地址:', TEST_ADDRESS);
    console.log('='.repeat(50));

    const client = createPublicClient({
        chain: bsc,
        transport: http('https://bsc-dataseed1.binance.org/')
    });

    try {
        // 1. 測試 userStakes
        console.log('\n1. 測試 userStakes...');
        const userStakes = await client.readContract({
            address: VIP_CONTRACT_ADDRESS,
            abi: VIP_ABI,
            functionName: 'userStakes',
            args: [TEST_ADDRESS]
        });
        console.log('userStakes 結果:', userStakes);

        // 2. 測試 getVipLevel
        console.log('\n2. 測試 getVipLevel...');
        const vipLevel = await client.readContract({
            address: VIP_CONTRACT_ADDRESS,
            abi: VIP_ABI,
            functionName: 'getVipLevel',
            args: [TEST_ADDRESS]
        });
        console.log('getVipLevel 結果:', vipLevel);

        // 3. 測試 getVipTaxReduction
        console.log('\n3. 測試 getVipTaxReduction...');
        const taxReduction = await client.readContract({
            address: VIP_CONTRACT_ADDRESS,
            abi: VIP_ABI,
            functionName: 'getVipTaxReduction',
            args: [TEST_ADDRESS]
        });
        console.log('getVipTaxReduction 結果:', taxReduction);

        console.log('\n📊 測試結果總結:');
        console.table({
            '質押金額': userStakes[0].toString(),
            'Token ID': userStakes[1].toString(),
            'VIP等級': vipLevel.toString(),
            '稅率減免': taxReduction.toString(),
        });

        // 分析結果
        if (vipLevel === 0n) {
            console.log('\n❌ 發現問題: VIP等級為0');
            if (userStakes[0] === 0n) {
                console.log('💡 原因: 用戶沒有質押任何代幣');
            } else {
                console.log('⚠️  可能原因: 合約邏輯問題或ABI不匹配');
            }
        } else {
            console.log('\n✅ VIP等級正常:', vipLevel.toString());
        }

    } catch (error) {
        console.error('\n❌ 測試失敗:', error.message);
        
        // 檢查常見錯誤
        if (error.message.includes('execution reverted')) {
            console.log('💡 可能原因: 合約函數不存在或ABI不匹配');
        } else if (error.message.includes('contract call failure')) {
            console.log('💡 可能原因: 合約地址錯誤或網路問題');
        }
    }
}

// 執行測試
testVipContract().catch(console.error);