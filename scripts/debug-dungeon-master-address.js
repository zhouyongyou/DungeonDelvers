#!/usr/bin/env node

/**
 * DungeonMaster 地址檢查調試工具
 * 檢查 DungeonCore 合約中的 dungeonMasterAddress() 是否與實際 DungeonMaster 合約地址匹配
 */

import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';

// 合約地址配置
const CONTRACTS = {
  DUNGEONCORE: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
  DUNGEONMASTER: '0x446f80c6562a9b0A33b48F74F7Dbf10b53Fe2703',
  PLAYERPROFILE: '0xCf352E394fD2Ff27D65bB525C032a2c03Bd79AC7'
};

// DungeonCore ABI - 只包含需要的函數
const DUNGEONCORE_ABI = [
  {
    "inputs": [],
    "name": "dungeonMasterAddress",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// 創建公共客戶端
const publicClient = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-dataseed1.binance.org/')
});

async function debugDungeonMasterAddress() {
  console.log('🔍 開始檢查 DungeonMaster 地址配置...\n');
  
  try {
    // 1. 從 DungeonCore 讀取 dungeonMasterAddress
    console.log('📖 從 DungeonCore 讀取 dungeonMasterAddress()...');
    const dungeonMasterFromCore = await publicClient.readContract({
      address: CONTRACTS.DUNGEONCORE,
      abi: DUNGEONCORE_ABI,
      functionName: 'dungeonMasterAddress'
    });

    // 2. 實際的 DungeonMaster 合約地址
    const actualDungeonMaster = CONTRACTS.DUNGEONMASTER;

    // 3. 比較結果
    const isMatching = dungeonMasterFromCore.toLowerCase() === actualDungeonMaster.toLowerCase();

    console.log('\n📊 DungeonMaster 地址分析結果:');
    console.log('═'.repeat(80));
    console.log(`   DungeonCore 地址:               ${CONTRACTS.DUNGEONCORE}`);
    console.log(`   DungeonCore.dungeonMasterAddress(): ${dungeonMasterFromCore}`);
    console.log(`   實際 DungeonMaster 合約地址:      ${actualDungeonMaster}`);
    console.log(`   PlayerProfile 地址:             ${CONTRACTS.PLAYERPROFILE}`);
    console.log('═'.repeat(80));
    console.log(`   地址是否匹配: ${isMatching ? '✅ YES' : '❌ NO'}`);

    if (!isMatching) {
      console.log('\n🚨 發現問題:');
      console.log('   DungeonCore.dungeonMasterAddress() 與實際 DungeonMaster 地址不匹配！');
      console.log('   這會導致 PlayerProfile.addExperience() 失敗，錯誤訊息: "Caller is not the DungeonMaster"');
      console.log('\n💡 解決方案:');
      console.log('   需要調用 DungeonCore.setDungeonMaster() 更新正確的地址');
      console.log(`   正確地址應該是: ${actualDungeonMaster}`);
    } else {
      console.log('\n✅ DungeonMaster 地址配置正確');
      console.log('   如果仍有授權問題，需要檢查其他因素：');
      console.log('   - PlayerProfile 合約中的 dungeonMaster 設置');
      console.log('   - 合約權限配置');
      console.log('   - 交易發送者地址');
    }

    return {
      dungeonMasterFromCore,
      actualDungeonMaster,
      isMatching,
      contracts: CONTRACTS
    };

  } catch (error) {
    console.error('❌ 調試過程發生錯誤:', error.message);
    if (error.message.includes('execution reverted')) {
      console.log('\n💡 可能的原因:');
      console.log('   - DungeonCore 合約不存在 dungeonMasterAddress() 函數');
      console.log('   - 合約地址錯誤');
      console.log('   - RPC 連接問題');
    }
    return { error: error.message };
  }
}

// 執行調試
debugDungeonMasterAddress()
  .then(result => {
    if (result.error) {
      process.exit(1);
    }
    console.log('\n🎯 調試完成');
  })
  .catch(error => {
    console.error('執行失敗:', error);
    process.exit(1);
  });

export { debugDungeonMasterAddress };