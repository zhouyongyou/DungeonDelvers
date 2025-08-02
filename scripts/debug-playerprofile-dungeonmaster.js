#!/usr/bin/env node

/**
 * PlayerProfile 內部 DungeonMaster 地址檢查工具
 * 檢查 PlayerProfile 合約內部存儲的 DungeonMaster 地址
 */

import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';

// 合約地址配置
const CONTRACTS = {
  DUNGEONCORE: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
  DUNGEONMASTER: '0x446f80c6562a9b0A33b48F74F7Dbf10b53Fe2703',
  PLAYERPROFILE: '0xCf352E394fD2Ff27D65bB525C032a2c03Bd79AC7'
};

// PlayerProfile ABI - 包含所有可能的 DungeonMaster 相關函數
const PLAYERPROFILE_ABI = [
  // 標準函數
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  // 可能的 DungeonMaster 相關函數
  {
    "inputs": [],
    "name": "dungeonMaster",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "dungeonMasterAddress",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDungeonMaster",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  // 設置函數
  {
    "inputs": [{"internalType": "address", "name": "_dungeonMaster", "type": "address"}],
    "name": "setDungeonMaster",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// 創建公共客戶端
const publicClient = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-dataseed1.binance.org/')
});

async function debugPlayerProfileDungeonMaster() {
  console.log('🔍 開始檢查 PlayerProfile 內部 DungeonMaster 地址設置...\n');
  
  const results = {};
  const functions = [
    'dungeonMaster',
    'dungeonMasterAddress', 
    'getDungeonMaster'
  ];

  // 1. 嘗試所有可能的 DungeonMaster 獲取函數
  for (const functionName of functions) {
    console.log(`📖 嘗試調用 PlayerProfile.${functionName}()...`);
    try {
      const result = await publicClient.readContract({
        address: CONTRACTS.PLAYERPROFILE,
        abi: PLAYERPROFILE_ABI,
        functionName: functionName
      });
      console.log(`   ✅ ${functionName}(): ${result}`);
      results[functionName] = result;
      
      // 檢查是否匹配
      const isMatching = result.toLowerCase() === CONTRACTS.DUNGEONMASTER.toLowerCase();
      console.log(`   ${isMatching ? '✅' : '❌'} 與實際 DungeonMaster 地址匹配: ${isMatching}`);
      
    } catch (error) {
      console.log(`   ❌ ${functionName}() 函數不存在或調用失敗`);
      results[functionName] = null;
    }
  }

  // 2. 檢查合約狀態變量 (通過存儲槽讀取)
  console.log('\n📖 嘗試直接讀取存儲槽...');
  try {
    // 嘗試讀取一些常見的存儲槽
    for (let slot = 0; slot < 10; slot++) {
      const storageValue = await publicClient.getStorageAt({
        address: CONTRACTS.PLAYERPROFILE,
        slot: `0x${slot.toString(16).padStart(64, '0')}`
      });
      
      // 檢查是否是地址格式 (最後20字節非零)
      if (storageValue && storageValue !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        const possibleAddress = '0x' + storageValue.slice(-40);
        if (possibleAddress.length === 42 && possibleAddress !== '0x0000000000000000000000000000000000') {
          console.log(`   Slot ${slot}: ${possibleAddress}`);
          
          // 檢查是否匹配 DungeonMaster 地址
          if (possibleAddress.toLowerCase() === CONTRACTS.DUNGEONMASTER.toLowerCase()) {
            console.log(`   ✅ 找到匹配的 DungeonMaster 地址在存儲槽 ${slot}`);
            results.correctSlot = slot;
          }
        }
      }
    }
  } catch (error) {
    console.log(`   ❌ 存儲槽讀取失敗: ${error.message}`);
  }

  // 3. 分析結果
  console.log('\n📊 PlayerProfile DungeonMaster 地址分析:');
  console.log('═'.repeat(80));
  console.log(`   PlayerProfile 地址:             ${CONTRACTS.PLAYERPROFILE}`);
  console.log(`   實際 DungeonMaster 地址:        ${CONTRACTS.DUNGEONMASTER}`);
  console.log('─'.repeat(80));
  
  let foundCorrectAddress = false;
  for (const [functionName, address] of Object.entries(results)) {
    if (address && typeof address === 'string' && address.startsWith('0x')) {
      const isMatching = address.toLowerCase() === CONTRACTS.DUNGEONMASTER.toLowerCase();
      console.log(`   ${functionName}(): ${address} ${isMatching ? '✅' : '❌'}`);
      if (isMatching) foundCorrectAddress = true;
    }
  }
  
  console.log('═'.repeat(80));

  // 4. 提供解決方案
  console.log('\n💡 問題診斷與解決方案:');
  
  if (!foundCorrectAddress) {
    console.log('❌ PlayerProfile 合約中未找到正確的 DungeonMaster 地址！');
    console.log('\n🔧 解決方案:');
    console.log('1. 如果合約有 setDungeonMaster() 函數，需要調用它來設置正確地址：');
    console.log(`   PlayerProfile.setDungeonMaster("${CONTRACTS.DUNGEONMASTER}")`);
    console.log('\n2. 需要使用合約所有者地址來調用設置函數');
    console.log(`   當前所有者: 0x10925A7138649C7E1794CE646182eeb5BF8ba647`);
    console.log('\n3. 如果合約沒有設置函數，可能需要重新部署合約');
  } else {
    console.log('✅ PlayerProfile 合約中找到了正確的 DungeonMaster 地址');
    console.log('   但是 addExperience 仍然失敗，可能的原因：');
    console.log('   - 權限檢查邏輯有問題');
    console.log('   - 需要檢查合約源代碼中的具體實現');
  }

  // 5. 嘗試調用 setDungeonMaster (模擬調用)
  console.log('\n📖 測試 setDungeonMaster 函數是否存在...');
  try {
    await publicClient.simulateContract({
      address: CONTRACTS.PLAYERPROFILE,
      abi: PLAYERPROFILE_ABI,
      functionName: 'setDungeonMaster',
      args: [CONTRACTS.DUNGEONMASTER],
      account: '0x10925A7138649C7E1794CE646182eeb5BF8ba647' // 使用所有者地址
    });
    console.log('   ✅ setDungeonMaster 函數存在且可以調用');
    results.canSetDungeonMaster = true;
  } catch (error) {
    if (error.message.includes('function "setDungeonMaster" not found')) {
      console.log('   ❌ setDungeonMaster 函數不存在');
    } else {
      console.log(`   ❌ setDungeonMaster 調用失敗: ${error.message}`);
    }
    results.canSetDungeonMaster = false;
  }

  return results;
}

// 執行調試
debugPlayerProfileDungeonMaster()
  .then(result => {
    console.log('\n🎯 PlayerProfile DungeonMaster 地址檢查完成');
  })
  .catch(error => {
    console.error('執行失敗:', error);
    process.exit(1);
  });

export { debugPlayerProfileDungeonMaster };