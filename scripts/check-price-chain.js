#!/usr/bin/env node

// 檢查價格查詢鏈的每個環節

import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');

// 合約地址
const ADDRESSES = {
  HERO: '0x141F081922D4015b3157cdA6eE970dff34bb8AAb',
  DUNGEON_CORE: '0x4D353aFC420E6187bfA5F99f0DdD8F7F137c20E9', // 使用 Hero 合約返回的地址
  ORACLE: '0x54Ff2524C996d7608CaE9F3D9dd2075A023472E9',
  USD: '0x7C67Af4EBC6651c95dF78De11cfe325660d935FE',
  SOULSHARD: '0x4e02B4d0A6b6a90fDDFF058B8a6148BA3F909915'
};

// ABI 定義
const HERO_ABI = [
  'function getRequiredSoulShardAmount(uint256) view returns (uint256)',
  'function mintPriceUSD() view returns (uint256)',
  'function dungeonCore() view returns (address)'
];

const DUNGEON_CORE_ABI = [
  'function getSoulShardAmountForUSD(uint256) view returns (uint256)',
  'function oracleAddress() view returns (address)',
  'function usdTokenAddress() view returns (address)',
  'function usdDecimals() view returns (uint8)'
];

const ORACLE_ABI = [
  'function getAmountOut(address,uint256) view returns (uint256)',
  'function getSoulShardPriceInUSD() view returns (uint256)'
];

async function checkPriceChain() {
  console.log('🔍 檢查價格查詢鏈...\n');
  
  const hero = new ethers.Contract(ADDRESSES.HERO, HERO_ABI, provider);
  const dungeonCore = new ethers.Contract(ADDRESSES.DUNGEON_CORE, DUNGEON_CORE_ABI, provider);
  
  try {
    // 1. 檢查 Hero 合約
    console.log('📊 1. Hero 合約檢查:');
    console.log(`   地址: ${ADDRESSES.HERO}`);
    
    const mintPriceUSD = await hero.mintPriceUSD();
    console.log(`   ✅ mintPriceUSD: ${ethers.formatUnits(mintPriceUSD, 18)} USD`);
    
    const heroDungeonCore = await hero.dungeonCore();
    console.log(`   ✅ dungeonCore: ${heroDungeonCore}`);
    console.log(`   ${heroDungeonCore === ADDRESSES.DUNGEON_CORE ? '✅' : '❌'} DungeonCore 地址匹配`);
    
    // 2. 檢查 DungeonCore
    console.log('\n📊 2. DungeonCore 檢查:');
    console.log(`   地址: ${ADDRESSES.DUNGEON_CORE}`);
    
    const oracleAddress = await dungeonCore.oracleAddress();
    console.log(`   ${oracleAddress === ethers.ZeroAddress ? '❌' : '✅'} Oracle 地址: ${oracleAddress}`);
    
    if (oracleAddress === ethers.ZeroAddress) {
      console.log('   ❌ Oracle 未設置！這是問題所在');
      console.log('   💡 解決方案: DungeonCore owner 需要調用 setOracle()');
      return;
    }
    
    const usdToken = await dungeonCore.usdTokenAddress();
    const usdDecimals = await dungeonCore.usdDecimals();
    console.log(`   ✅ USD Token: ${usdToken}`);
    console.log(`   ✅ USD Decimals: ${usdDecimals}`);
    
    // 3. 測試 getSoulShardAmountForUSD
    console.log('\n📊 3. 測試 DungeonCore.getSoulShardAmountForUSD:');
    try {
      const testAmount = ethers.parseUnits('2', 18); // 2 USD
      const soulAmount = await dungeonCore.getSoulShardAmountForUSD(testAmount);
      console.log(`   ✅ 2 USD = ${ethers.formatUnits(soulAmount, 18)} SOUL`);
      
      // 檢查價格合理性
      const pricePerUSD = Number(ethers.formatUnits(soulAmount, 18)) / 2;
      console.log(`   價格: 1 USD = ${pricePerUSD} SOUL`);
      
      if (pricePerUSD < 1000 || pricePerUSD > 100000) {
        console.log(`   ⚠️ 價格可能異常 (預期 10,000-20,000 SOUL/USD)`);
      } else {
        console.log(`   ✅ 價格在合理範圍內`);
      }
    } catch (error) {
      console.log(`   ❌ getSoulShardAmountForUSD 失敗: ${error.message}`);
      
      // 如果 Oracle 地址不是零但調用失敗，檢查 Oracle
      if (oracleAddress !== ethers.ZeroAddress) {
        console.log('\n📊 4. 檢查 Oracle 合約:');
        const oracle = new ethers.Contract(oracleAddress, ORACLE_ABI, provider);
        
        try {
          const price = await oracle.getSoulShardPriceInUSD();
          console.log(`   ✅ getSoulShardPriceInUSD: ${ethers.formatUnits(price, 18)} USD/SOUL`);
        } catch (e) {
          console.log(`   ❌ getSoulShardPriceInUSD 失敗: ${e.message}`);
        }
        
        try {
          const amountOut = await oracle.getAmountOut(ADDRESSES.USD, ethers.parseUnits('2', 18));
          console.log(`   ✅ getAmountOut: ${ethers.formatUnits(amountOut, 18)} SOUL`);
        } catch (e) {
          console.log(`   ❌ getAmountOut 失敗: ${e.message}`);
        }
      }
    }
    
    // 4. 測試 Hero.getRequiredSoulShardAmount
    console.log('\n📊 5. 測試 Hero.getRequiredSoulShardAmount:');
    try {
      const requiredAmount = await hero.getRequiredSoulShardAmount(1);
      console.log(`   ✅ 1 個英雄需要: ${ethers.formatUnits(requiredAmount, 18)} SOUL`);
      
      const requiredAmount5 = await hero.getRequiredSoulShardAmount(5);
      console.log(`   ✅ 5 個英雄需要: ${ethers.formatUnits(requiredAmount5, 18)} SOUL`);
    } catch (error) {
      console.log(`   ❌ getRequiredSoulShardAmount 失敗: ${error.message}`);
    }
    
    // 總結
    console.log('\n' + '='.repeat(60));
    console.log('📋 診斷總結:');
    
    if (oracleAddress === ethers.ZeroAddress) {
      console.log('   ❌ 主要問題: DungeonCore 的 Oracle 未設置');
      console.log('   💡 解決方案:');
      console.log('      1. DungeonCore owner 調用 setOracle("0x54Ff2524C996d7608CaE9F3D9dd2075A023472E9")');
      console.log('      2. 或部署新的 Oracle 並設置');
    } else {
      console.log('   檢查 Oracle 合約是否正常運作');
    }
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ 檢查過程出錯:', error);
  }
}

checkPriceChain().catch(console.error);