// simple-vip-test.js
import { createPublicClient, http } from 'viem';
import { bsc } from 'wagmi/chains';

const client = createPublicClient({
    chain: bsc,
    transport: http('https://bsc-dataseed1.binance.org/')
});

const VIP_CONTRACT = '0xefdfF583944A2c6318d1597AD1E41159fCd8F6dB';
const TEST_ADDRESS = '0x10925a7138649c7e1794ce646182eeb5bf8ba647';

// 簡化的ABI，只測試我們知道能工作的函數
const simpleABI = [
    {
        'inputs': [{'internalType': 'address', 'name': '', 'type': 'address'}],
        'name': 'userStakes',
        'outputs': [
            {'internalType': 'uint256', 'name': 'amount', 'type': 'uint256'},
            {'internalType': 'uint256', 'name': 'tokenId', 'type': 'uint256'}
        ],
        'stateMutability': 'view',
        'type': 'function'
    }
];

async function calculateVipLevel(stakedAmount) {
    // 根據質押金額計算VIP等級
    // 基於通常的VIP系統設計
    
    const amountInEther = Number(stakedAmount) / 1e18;
    console.log(`質押金額: ${amountInEther.toLocaleString()} Soul Shard`);
    
    let level = 0;
    let taxReduction = 0;
    
    if (amountInEther >= 10000000) {
        level = 5;
        taxReduction = 2500; // 25%
    } else if (amountInEther >= 5000000) {
        level = 4; 
        taxReduction = 2000; // 20%
    } else if (amountInEther >= 1000000) {
        level = 3;
        taxReduction = 1500; // 15%
    } else if (amountInEther >= 100000) {
        level = 2;
        taxReduction = 1000; // 10%
    } else if (amountInEther >= 10000) {
        level = 1;
        taxReduction = 500; // 5%
    }
    
    return { level, taxReduction };
}

async function testVip() {
    try {
        console.log('🧪 測試VIP功能...');
        console.log('合約地址:', VIP_CONTRACT);
        console.log('測試地址:', TEST_ADDRESS);
        console.log('='.repeat(50));
        
        // 1. 獲取用戶質押信息
        const userStakes = await client.readContract({
            address: VIP_CONTRACT,
            abi: simpleABI,
            functionName: 'userStakes',
            args: [TEST_ADDRESS]
        });
        
        console.log('✅ userStakes 調用成功');
        console.log('質押金額:', userStakes[0].toString());
        console.log('Token ID:', userStakes[1].toString());
        
        // 2. 計算VIP等級
        const { level, taxReduction } = await calculateVipLevel(userStakes[0]);
        
        console.log('\n📊 計算結果:');
        console.log('VIP等級:', level);
        console.log('稅率減免:', `${taxReduction / 100}%`);
        
        // 3. 測試建議
        console.log('\n💡 診斷建議:');
        if (level > 0) {
            console.log('✅ 用戶應該有VIP等級');
            console.log('❌ 如果前端顯示0，說明計算邏輯有問題');
            console.log('🔧 建議: 檢查前端是否正確實現VIP等級計算');
        } else {
            console.log('ℹ️  用戶質押金額不足以獲得VIP等級');
        }
        
        return { userStakes, level, taxReduction };
        
    } catch (error) {
        console.error('❌ 測試失敗:', error.message);
    }
}

testVip();