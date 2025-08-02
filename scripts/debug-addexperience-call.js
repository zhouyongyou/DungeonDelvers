#!/usr/bin/env node

/**
 * AddExperience 調用權限調試工具
 * 模擬 DungeonMaster 調用 PlayerProfile.addExperience() 的權限檢查
 */

import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';

// 合約地址配置
const CONTRACTS = {
  DUNGEONCORE: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
  DUNGEONMASTER: '0x446f80c6562a9b0A33b48F74F7Dbf10b53Fe2703',
  PLAYERPROFILE: '0xCf352E394fD2Ff27D65bB525C032a2c03Bd79AC7'
};

// 測試用地址
const TEST_PLAYER = '0x1234567890123456789012345678901234567890';

// PlayerProfile ABI
const PLAYERPROFILE_ABI = [
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
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

// DungeonMaster ABI (檢查是否有管理功能)
const DUNGEONMASTER_ABI = [
  {
    "inputs": [],
    "name": "owner",
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

async function debugAddExperienceCall() {
  console.log('🔍 開始檢查 addExperience 調用權限...\n');
  
  try {
    const results = {};

    // 1. 檢查 PlayerProfile 合約所有者
    console.log('📖 檢查 PlayerProfile.owner()...');
    try {
      results.playerProfileOwner = await publicClient.readContract({
        address: CONTRACTS.PLAYERPROFILE,
        abi: PLAYERPROFILE_ABI,
        functionName: 'owner'
      });
      console.log(`   PlayerProfile 所有者: ${results.playerProfileOwner}`);
    } catch (error) {
      console.log(`   ❌ 無法讀取 PlayerProfile 所有者: ${error.message}`);
      results.playerProfileOwner = null;
    }

    // 2. 檢查 DungeonMaster 合約所有者
    console.log('📖 檢查 DungeonMaster.owner()...');
    try {
      results.dungeonMasterOwner = await publicClient.readContract({
        address: CONTRACTS.DUNGEONMASTER,
        abi: DUNGEONMASTER_ABI,
        functionName: 'owner'
      });
      console.log(`   DungeonMaster 所有者: ${results.dungeonMasterOwner}`);
    } catch (error) {
      console.log(`   ❌ 無法讀取 DungeonMaster 所有者: ${error.message}`);
      results.dungeonMasterOwner = null;
    }

    // 3. 使用 staticCall 測試 addExperience 調用
    console.log('📖 測試 addExperience 靜態調用...');
    try {
      // 嘗試使用 DungeonMaster 地址作為 from 模擬調用
      await publicClient.simulateContract({
        address: CONTRACTS.PLAYERPROFILE,
        abi: PLAYERPROFILE_ABI,
        functionName: 'addExperience',
        args: [TEST_PLAYER, 100],
        account: CONTRACTS.DUNGEONMASTER // 模擬從 DungeonMaster 調用
      });
      console.log('   ✅ 靜態調用成功 - DungeonMaster 有權限調用 addExperience');
      results.canCallAddExperience = true;
    } catch (error) {
      console.log(`   ❌ 靜態調用失敗: ${error.message}`);
      results.canCallAddExperience = false;
      results.addExperienceError = error.message;
      
      // 分析錯誤原因
      if (error.message.includes('Caller is not the DungeonMaster')) {
        console.log('   🔍 錯誤原因: PlayerProfile 檢查調用者不是 DungeonMaster');
      } else if (error.message.includes('Ownable: caller is not the owner')) {
        console.log('   🔍 錯誤原因: 只有合約所有者可以調用');
      } else if (error.message.includes('execution reverted')) {
        console.log('   🔍 錯誤原因: 合約執行被撤銷，可能是權限問題');
      }
    }

    // 4. 嘗試用所有者地址模擬調用
    if (results.playerProfileOwner && !results.canCallAddExperience) {
      console.log('📖 測試使用所有者地址調用...');
      try {
        await publicClient.simulateContract({
          address: CONTRACTS.PLAYERPROFILE,
          abi: PLAYERPROFILE_ABI,
          functionName: 'addExperience',
          args: [TEST_PLAYER, 100],
          account: results.playerProfileOwner
        });
        console.log('   ✅ 所有者可以調用 addExperience');
        results.ownerCanCall = true;
      } catch (error) {
        console.log(`   ❌ 所有者也無法調用: ${error.message}`);
        results.ownerCanCall = false;
      }
    }

    // 分析結果
    console.log('\n📊 addExperience 權限分析結果:');
    console.log('═'.repeat(80));
    console.log(`   PlayerProfile 地址:             ${CONTRACTS.PLAYERPROFILE}`);
    console.log(`   DungeonMaster 地址:             ${CONTRACTS.DUNGEONMASTER}`);
    console.log(`   PlayerProfile 所有者:           ${results.playerProfileOwner || '未知'}`);
    console.log(`   DungeonMaster 所有者:           ${results.dungeonMasterOwner || '未知'}`);
    console.log('─'.repeat(80));
    console.log(`   DungeonMaster 可調用 addExperience: ${results.canCallAddExperience ? '✅ YES' : '❌ NO'}`);
    console.log(`   所有者可調用 addExperience:        ${results.ownerCanCall ? '✅ YES' : '❌ NO'}`);
    console.log('═'.repeat(80));

    // 提供解決方案
    console.log('\n💡 問題診斷與解決方案:');
    
    if (!results.canCallAddExperience) {
      console.log('❌ DungeonMaster 無法調用 PlayerProfile.addExperience()');
      
      if (results.addExperienceError?.includes('Caller is not the DungeonMaster')) {
        console.log('\n🔧 解決方案 1: 更新 PlayerProfile 中的 DungeonMaster 地址');
        console.log('   - 調用 PlayerProfile.setDungeonMaster() 設置正確地址');
      } else if (results.addExperienceError?.includes('Ownable: caller is not the owner')) {
        console.log('\n🔧 解決方案 2: addExperience 函數使用 onlyOwner 修飾符');
        console.log('   - 需要從合約所有者調用，或者修改合約權限設計');
        console.log('   - 或者需要將 DungeonMaster 設置為授權調用者');
      } else {
        console.log('\n🔧 解決方案 3: 檢查合約實現');
        console.log('   - 可能是合約內部權限檢查問題');
        console.log('   - 需要查看 PlayerProfile 合約源代碼確認權限邏輯');
      }
      
      if (results.playerProfileOwner && results.dungeonMasterOwner &&
          results.playerProfileOwner.toLowerCase() === results.dungeonMasterOwner.toLowerCase()) {
        console.log('\n✅ 注意: 兩個合約有相同的所有者，可能需要透過所有者來設置權限');
      }
    } else {
      console.log('✅ DungeonMaster 可以調用 addExperience，權限設置正確');
    }

    return results;

  } catch (error) {
    console.error('❌ 調試過程發生錯誤:', error.message);
    return { error: error.message };
  }
}

// 執行調試
debugAddExperienceCall()
  .then(result => {
    if (result.error) {
      process.exit(1);
    }
    console.log('\n🎯 addExperience 權限檢查完成');
  })
  .catch(error => {
    console.error('執行失敗:', error);
    process.exit(1);
  });

export { debugAddExperienceCall };