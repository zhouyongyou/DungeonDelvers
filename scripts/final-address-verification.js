#!/usr/bin/env node

/**
 * 最終地址驗證工具
 * 確認 PlayerProfile 合約的權限檢查邏輯
 */

import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';

// 合約地址配置
const CONTRACTS = {
  DUNGEONCORE: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
  DUNGEONMASTER: '0x446f80c6562a9b0A33b48F74F7Dbf10b53Fe2703',
  PLAYERPROFILE: '0xCf352E394fD2Ff27D65bB525C032a2c03Bd79AC7'
};

// PlayerProfile ABI
const PLAYERPROFILE_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "_player", "type": "address"},
      {"internalType": "uint256", "name": "_amount", "type": "uint256"}
    ],
    "name": "addExperience",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// 測試用地址
const TEST_PLAYER = '0x1234567890123456789012345678901234567890';

// 創建公共客戶端
const publicClient = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-dataseed1.binance.org/')
});

async function finalAddressVerification() {
  console.log('🔍 最終地址驗證 - 確認 PlayerProfile 權限檢查邏輯...\n');
  
  // 從存儲分析中，我們發現 Slot 8 包含類似 DungeonCore 的地址
  const slot8Address = '0x8a2d2b1961135127228edd71ff98d6b097915a1300';
  
  console.log('📊 地址對比分析:');
  console.log('═'.repeat(80));
  console.log(`   DungeonCore 地址:               ${CONTRACTS.DUNGEONCORE}`);
  console.log(`   DungeonMaster 地址:             ${CONTRACTS.DUNGEONMASTER}`);
  console.log(`   PlayerProfile Slot 8 地址:      ${slot8Address}`);
  console.log('─'.repeat(80));
  
  // 地址比較
  const slot8LowerDC = slot8Address.toLowerCase();
  const dungeonCoreLower = CONTRACTS.DUNGEONCORE.toLowerCase();
  const dungeonMasterLower = CONTRACTS.DUNGEONMASTER.toLowerCase();
  
  console.log('🔍 地址匹配分析:');
  
  // 檢查 Slot 8 與 DungeonCore 的相似性
  const similarityDC = compareAddresses(slot8Address, CONTRACTS.DUNGEONCORE);
  const similarityDM = compareAddresses(slot8Address, CONTRACTS.DUNGEONMASTER);
  
  console.log(`   Slot 8 vs DungeonCore:          ${similarityDC.percentage}% 相似 (差異: ${similarityDC.differences} 字符)`);
  console.log(`   Slot 8 vs DungeonMaster:        ${similarityDM.percentage}% 相似 (差異: ${similarityDM.differences} 字符)`);
  
  if (similarityDC.percentage > 90) {
    console.log('   ✅ Slot 8 地址與 DungeonCore 高度相似！');
  }
  
  // 現在測試不同地址的調用權限
  const testAddresses = [
    { name: 'DungeonMaster', address: CONTRACTS.DUNGEONMASTER },
    { name: 'DungeonCore', address: CONTRACTS.DUNGEONCORE },
    { name: 'Slot 8 地址', address: slot8Address },
    { name: '合約所有者', address: '0x10925A7138649C7E1794CE646182eeb5BF8ba647' }
  ];
  
  console.log('\n📖 測試不同地址的 addExperience 調用權限:');
  console.log('─'.repeat(80));
  
  for (const testAddr of testAddresses) {
    console.log(`\n測試: ${testAddr.name} (${testAddr.address})`);
    
    try {
      await publicClient.simulateContract({
        address: CONTRACTS.PLAYERPROFILE,
        abi: PLAYERPROFILE_ABI,
        functionName: 'addExperience',
        args: [TEST_PLAYER, 100],
        account: testAddr.address
      });
      console.log(`   ✅ ${testAddr.name} 可以調用 addExperience`);
    } catch (error) {
      console.log(`   ❌ ${testAddr.name} 無法調用 addExperience`);
      console.log(`      錯誤: ${error.message.split('\n')[0]}`);
      
      if (error.message.includes('Profile: Caller is not the DungeonMaster')) {
        console.log('      🔍 權限檢查: 需要是 DungeonMaster');
      }
    }
  }
  
  console.log('\n═'.repeat(80));
  
  // 結論和建議
  console.log('\n💡 最終診斷結果:');
  
  if (similarityDC.percentage > 90) {
    console.log('🎯 問題根源確認:');
    console.log('   PlayerProfile 合約中存儲的地址與 DungeonCore 地址高度相似');
    console.log('   但可能是一個過時的或錯誤的地址版本');
    console.log('   這解釋了為什麼 "Caller is not the DungeonMaster" 錯誤持續出現');
    
    console.log('\n🔧 解決方案:');
    console.log('1. 檢查 PlayerProfile 合約源代碼，確認權限檢查邏輯');
    console.log('2. 如果合約檢查的是 DungeonCore 而不是 DungeonMaster，這是設計問題');
    console.log('3. 需要更新合約中的地址配置或修復權限檢查邏輯');
    console.log('4. 可能需要調用管理函數來更新正確的 DungeonMaster 地址');
  } else {
    console.log('⚠️ 需要進一步調查合約的權限檢查邏輯');
  }
  
  return {
    slot8Address,
    similarities: { dungeonCore: similarityDC, dungeonMaster: similarityDM },
    testResults: testAddresses
  };
}

function compareAddresses(addr1, addr2) {
  const a1 = addr1.toLowerCase().slice(2); // 移除 0x
  const a2 = addr2.toLowerCase().slice(2);
  
  let matches = 0;
  const length = Math.min(a1.length, a2.length);
  
  for (let i = 0; i < length; i++) {
    if (a1[i] === a2[i]) {
      matches++;
    }
  }
  
  const percentage = Math.round((matches / length) * 100);
  const differences = length - matches;
  
  return { percentage, differences, matches, total: length };
}

// 執行驗證
finalAddressVerification()
  .then(result => {
    console.log('\n🎯 最終地址驗證完成');
  })
  .catch(error => {
    console.error('執行失敗:', error);
    process.exit(1);
  });

export { finalAddressVerification };