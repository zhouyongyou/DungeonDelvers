#!/usr/bin/env node

/**
 * PlayerProfile 存儲槽詳細分析工具
 * 詳細分析合約存儲槽中的數據
 */

import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';

// 合約地址配置
const CONTRACTS = {
  DUNGEONCORE: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
  DUNGEONMASTER: '0x446f80c6562a9b0A33b48F74F7Dbf10b53Fe2703',
  PLAYERPROFILE: '0xCf352E394fD2Ff27D65bB525C032a2c03Bd79AC7'
};

// 創建公共客戶端
const publicClient = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-dataseed1.binance.org/')
});

function parseStorageValue(value) {
  if (!value || value === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    return { type: 'zero', value: '0' };
  }
  
  // 嘗試解析為地址 (最後20字節)
  const possibleAddress = '0x' + value.slice(-40);
  if (possibleAddress.length === 42 && possibleAddress !== '0x0000000000000000000000000000000000') {
    return { type: 'address', value: possibleAddress };
  }
  
  // 嘗試解析為數字
  const num = BigInt(value);
  if (num > 0 && num < BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')) {
    return { type: 'number', value: num.toString() };
  }
  
  // 嘗試解析為字符串 (去除尾隨零)
  try {
    const hex = value.slice(2);
    const bytes = hex.match(/.{2}/g) || [];
    const chars = bytes.map(byte => {
      const charCode = parseInt(byte, 16);
      return charCode > 31 && charCode < 127 ? String.fromCharCode(charCode) : null;
    }).filter(char => char !== null);
    
    if (chars.length > 0) {
      return { type: 'string', value: chars.join('') };
    }
  } catch (e) {
    // 忽略字符串解析錯誤
  }
  
  return { type: 'raw', value: value };
}

async function analyzeStorageSlots() {
  console.log('🔍 開始詳細分析 PlayerProfile 存儲槽...\n');
  
  const results = [];
  
  // 分析前20個存儲槽
  for (let slot = 0; slot < 20; slot++) {
    try {
      const storageValue = await publicClient.getStorageAt({
        address: CONTRACTS.PLAYERPROFILE,
        slot: `0x${slot.toString(16).padStart(64, '0')}`
      });
      
      const parsed = parseStorageValue(storageValue);
      results.push({ slot, raw: storageValue, parsed });
      
      console.log(`Slot ${slot.toString().padStart(2, ' ')}: ${storageValue}`);
      console.log(`         ${parsed.type.padEnd(8, ' ')}: ${parsed.value}`);
      
      // 檢查是否與已知地址匹配
      if (parsed.type === 'address') {
        if (parsed.value.toLowerCase() === CONTRACTS.DUNGEONMASTER.toLowerCase()) {
          console.log(`         ✅ 匹配 DungeonMaster 地址！`);
        } else if (parsed.value.toLowerCase() === CONTRACTS.DUNGEONCORE.toLowerCase()) {
          console.log(`         ✅ 匹配 DungeonCore 地址！`);
        } else if (parsed.value.toLowerCase() === CONTRACTS.PLAYERPROFILE.toLowerCase()) {
          console.log(`         ✅ 匹配 PlayerProfile 地址！`);
        } else if (parsed.value.toLowerCase() === '0x10925a7138649c7e1794ce646182eeb5bf8ba647') {
          console.log(`         ✅ 匹配合約所有者地址！`);
        }
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`Slot ${slot}: 讀取失敗 - ${error.message}`);
    }
  }
  
  // 分析結果
  console.log('\n📊 存儲槽分析總結:');
  console.log('═'.repeat(80));
  
  const addressSlots = results.filter(r => r.parsed.type === 'address');
  console.log(`找到 ${addressSlots.length} 個地址槽:`);
  
  addressSlots.forEach(slot => {
    console.log(`   Slot ${slot.slot}: ${slot.parsed.value}`);
  });
  
  console.log('\n🔍 關鍵發現:');
  
  // 檢查是否有 DungeonMaster 相關的地址
  const dungeonMasterSlot = addressSlots.find(slot => 
    slot.parsed.value.toLowerCase() === CONTRACTS.DUNGEONMASTER.toLowerCase()
  );
  
  if (dungeonMasterSlot) {
    console.log(`✅ 在存儲槽 ${dungeonMasterSlot.slot} 找到 DungeonMaster 地址`);
  } else {
    console.log('❌ 未在任何存儲槽找到 DungeonMaster 地址');
    
    // 檢查 Slot 8 的特殊情況 - 可能是被截斷的地址
    const slot8 = results.find(r => r.slot === 8);
    if (slot8 && slot8.raw) {
      console.log('\n🔍 檢查 Slot 8 的特殊情況:');
      console.log(`   原始值: ${slot8.raw}`);
      console.log(`   可能是被截斷的地址: 0x${slot8.raw.slice(2).padStart(40, '0')}`);
      
      // 嘗試不同的地址解析方式
      const paddedAddress = '0x' + slot8.raw.slice(2).padStart(40, '0');
      const truncatedAddress = '0x' + slot8.raw.slice(-40);
      const frontPaddedAddress = '0x' + slot8.raw.slice(2, 42);
      
      console.log(`   前置補零: ${paddedAddress}`);
      console.log(`   後20字節: ${truncatedAddress}`);
      console.log(`   前20字節: ${frontPaddedAddress}`);
      
      // 檢查這些是否與 DungeonMaster 匹配
      const addresses = [paddedAddress, truncatedAddress, frontPaddedAddress];
      addresses.forEach((addr, i) => {
        const names = ['前置補零', '後20字節', '前20字節'];
        if (addr.toLowerCase() === CONTRACTS.DUNGEONMASTER.toLowerCase()) {
          console.log(`   ✅ ${names[i]} 匹配 DungeonMaster 地址！`);
        }
      });
    }
  }
  
  return results;
}

// 執行分析
analyzeStorageSlots()
  .then(results => {
    console.log('\n🎯 存儲槽分析完成');
  })
  .catch(error => {
    console.error('執行失敗:', error);
    process.exit(1);
  });

export { analyzeStorageSlots };