#!/usr/bin/env node

/**
 * PlayerProfile 權限檢查調試工具
 * 檢查 PlayerProfile 合約的權限配置
 */

import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';

// 合約地址配置
const CONTRACTS = {
  DUNGEONCORE: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
  DUNGEONMASTER: '0x446f80c6562a9b0A33b48F74F7Dbf10b53Fe2703',
  PLAYERPROFILE: '0xCf352E394fD2Ff27D65bB525C032a2c03Bd79AC7'
};

// PlayerProfile ABI - 包含需要檢查的函數
const PLAYERPROFILE_ABI = [
  {
    "inputs": [],
    "name": "dungeonMaster",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "authorizedCallers",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// 創建公共客戶端
const publicClient = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-dataseed1.binance.org/')
});

async function debugPlayerProfilePermissions() {
  console.log('🔍 開始檢查 PlayerProfile 權限配置...\n');
  
  try {
    const results = {};

    // 1. 檢查 PlayerProfile 中的 dungeonMaster 設置
    console.log('📖 檢查 PlayerProfile.dungeonMaster()...');
    try {
      results.dungeonMasterInProfile = await publicClient.readContract({
        address: CONTRACTS.PLAYERPROFILE,
        abi: PLAYERPROFILE_ABI,
        functionName: 'dungeonMaster'
      });
    } catch (error) {
      console.log('   ⚠️ dungeonMaster() 函數不存在或調用失敗');
      results.dungeonMasterInProfile = null;
      results.dungeonMasterError = error.message;
    }

    // 2. 檢查合約所有者
    console.log('📖 檢查 PlayerProfile.owner()...');
    try {
      results.owner = await publicClient.readContract({
        address: CONTRACTS.PLAYERPROFILE,
        abi: PLAYERPROFILE_ABI,
        functionName: 'owner'
      });
    } catch (error) {
      console.log('   ⚠️ owner() 函數不存在或調用失敗');
      results.owner = null;
      results.ownerError = error.message;
    }

    // 3. 檢查 DungeonMaster 是否為授權調用者
    console.log('📖 檢查 PlayerProfile.authorizedCallers(DungeonMaster)...');
    try {
      results.isDungeonMasterAuthorized = await publicClient.readContract({
        address: CONTRACTS.PLAYERPROFILE,
        abi: PLAYERPROFILE_ABI,
        functionName: 'authorizedCallers',
        args: [CONTRACTS.DUNGEONMASTER]
      });
    } catch (error) {
      console.log('   ⚠️ authorizedCallers() 函數不存在或調用失敗');
      results.isDungeonMasterAuthorized = null;
      results.authorizedCallersError = error.message;
    }

    // 4. 檢查 DungeonCore 是否為授權調用者
    console.log('📖 檢查 PlayerProfile.authorizedCallers(DungeonCore)...');
    try {
      results.isDungeonCoreAuthorized = await publicClient.readContract({
        address: CONTRACTS.PLAYERPROFILE,
        abi: PLAYERPROFILE_ABI,
        functionName: 'authorizedCallers',
        args: [CONTRACTS.DUNGEONCORE]
      });
    } catch (error) {
      console.log('   ⚠️ authorizedCallers(DungeonCore) 調用失敗');
      results.isDungeonCoreAuthorized = null;
    }

    // 分析結果
    console.log('\n📊 PlayerProfile 權限分析結果:');
    console.log('═'.repeat(80));
    console.log(`   PlayerProfile 地址:             ${CONTRACTS.PLAYERPROFILE}`);
    console.log(`   DungeonMaster 地址:             ${CONTRACTS.DUNGEONMASTER}`);
    console.log(`   DungeonCore 地址:               ${CONTRACTS.DUNGEONCORE}`);
    console.log('─'.repeat(80));
    
    if (results.dungeonMasterInProfile) {
      console.log(`   PlayerProfile.dungeonMaster():  ${results.dungeonMasterInProfile}`);
      const dmMatches = results.dungeonMasterInProfile.toLowerCase() === CONTRACTS.DUNGEONMASTER.toLowerCase();
      console.log(`   DungeonMaster 地址匹配:         ${dmMatches ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log(`   PlayerProfile.dungeonMaster():  ❌ 無法讀取`);
    }
    
    if (results.owner) {
      console.log(`   PlayerProfile.owner():          ${results.owner}`);
    } else {
      console.log(`   PlayerProfile.owner():          ❌ 無法讀取`);
    }
    
    if (results.isDungeonMasterAuthorized !== null) {
      console.log(`   DungeonMaster 授權狀態:         ${results.isDungeonMasterAuthorized ? '✅ 已授權' : '❌ 未授權'}`);
    } else {
      console.log(`   DungeonMaster 授權狀態:         ❌ 無法檢查`);
    }
    
    if (results.isDungeonCoreAuthorized !== null) {
      console.log(`   DungeonCore 授權狀態:           ${results.isDungeonCoreAuthorized ? '✅ 已授權' : '❌ 未授權'}`);
    } else {
      console.log(`   DungeonCore 授權狀態:           ❌ 無法檢查`);
    }

    console.log('═'.repeat(80));

    // 提供建議
    console.log('\n💡 問題診斷與建議:');
    
    if (results.dungeonMasterInProfile && 
        results.dungeonMasterInProfile.toLowerCase() !== CONTRACTS.DUNGEONMASTER.toLowerCase()) {
      console.log('❌ PlayerProfile.dungeonMaster() 地址不匹配！');
      console.log('   需要調用 PlayerProfile.setDungeonMaster() 更新地址');
    }
    
    if (results.isDungeonMasterAuthorized === false) {
      console.log('❌ DungeonMaster 未被授權調用 PlayerProfile！');
      console.log('   需要調用 PlayerProfile.addAuthorizedCaller(DungeonMaster) 授權');
    }
    
    if (results.isDungeonCoreAuthorized === false) {
      console.log('❌ DungeonCore 未被授權調用 PlayerProfile！');
      console.log('   需要調用 PlayerProfile.addAuthorizedCaller(DungeonCore) 授權');
    }
    
    if (results.isDungeonMasterAuthorized === true && 
        results.dungeonMasterInProfile && 
        results.dungeonMasterInProfile.toLowerCase() === CONTRACTS.DUNGEONMASTER.toLowerCase()) {
      console.log('✅ PlayerProfile 權限配置看起來正確');
      console.log('   如果仍有問題，可能是：');
      console.log('   - 交易發送邏輯問題');
      console.log('   - Gas 估算問題');
      console.log('   - 合約執行邏輯問題');
    }

    return results;

  } catch (error) {
    console.error('❌ 調試過程發生錯誤:', error.message);
    return { error: error.message };
  }
}

// 執行調試
debugPlayerProfilePermissions()
  .then(result => {
    if (result.error) {
      process.exit(1);
    }
    console.log('\n🎯 權限檢查完成');
  })
  .catch(error => {
    console.error('執行失敗:', error);
    process.exit(1);
  });

export { debugPlayerProfilePermissions };