#!/usr/bin/env node

// 測試 V19 價格計算

import { ethers } from 'ethers';

// V19 合約地址
const HERO_ADDRESS = '0x141F081922D4015b3157cdA6eE970dff34bb8AAb';
const ORACLE_ADDRESS = '0x54Ff2524C996d7608CaE9F3D9dd2075A023472E9';

// 簡化的 ABI
const HERO_ABI = [
  'function getRequiredSoulShardAmount(uint256 quantity) view returns (uint256)',
  'function mintPriceUSD() view returns (uint256)'
];

const ORACLE_ABI = [
  'function getLatestPrice() view returns (uint256)',
  'function getSoulShardPriceInUSD() view returns (uint256)',
  'function getRequiredSoulShardAmount(uint256 usdAmount) view returns (uint256)'
];

async function testPrices() {
  console.log('🔍 測試 V19 價格計算\n');
  
  // 連接到 BSC 主網
  const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
  
  // 創建合約實例
  const heroContract = new ethers.Contract(HERO_ADDRESS, HERO_ABI, provider);
  const oracleContract = new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, provider);
  
  try {
    // 1. 檢查 Hero 合約的 USD 價格設定
    console.log('📊 Hero 合約價格設定：');
    const mintPriceUSD = await heroContract.mintPriceUSD();
    console.log(`   鑄造價格 (USD): ${ethers.formatUnits(mintPriceUSD, 18)} USD`);
    
    // 2. 檢查 Oracle 價格
    console.log('\n📊 Oracle 價格信息：');
    try {
      const latestPrice = await oracleContract.getLatestPrice();
      console.log(`   最新價格: ${latestPrice.toString()}`);
      console.log(`   格式化: ${ethers.formatUnits(latestPrice, 18)}`);
    } catch (e) {
      console.log('   getLatestPrice 失敗:', e.message);
    }
    
    try {
      const soulPriceInUSD = await oracleContract.getSoulShardPriceInUSD();
      console.log(`   SOUL/USD 價格: ${ethers.formatUnits(soulPriceInUSD, 18)} USD`);
    } catch (e) {
      console.log('   getSoulShardPriceInUSD 失敗:', e.message);
    }
    
    // 3. 測試價格計算
    console.log('\n📊 價格計算測試：');
    const quantities = [1, 5, 10, 50];
    
    for (const qty of quantities) {
      console.log(`\n   購買 ${qty} 個英雄：`);
      
      // Hero 合約計算
      const requiredAmount = await heroContract.getRequiredSoulShardAmount(qty);
      const amountInEther = ethers.formatUnits(requiredAmount, 18);
      console.log(`   需要 SOUL: ${amountInEther}`);
      console.log(`   每個單價: ${Number(amountInEther) / qty} SOUL`);
      
      // 檢查是否合理（預期每個約 33,000 SOUL）
      const pricePerUnit = Number(amountInEther) / qty;
      if (pricePerUnit < 1000) {
        console.log(`   ⚠️  價格異常低！預期約 33,000 SOUL，實際 ${pricePerUnit} SOUL`);
      } else if (pricePerUnit > 100000) {
        console.log(`   ⚠️  價格異常高！預期約 33,000 SOUL，實際 ${pricePerUnit} SOUL`);
      } else {
        console.log(`   ✅ 價格正常`);
      }
    }
    
    // 4. 直接測試 Oracle 的計算
    console.log('\n📊 Oracle 直接計算測試：');
    const testUSDAmount = ethers.parseUnits('10', 18); // 10 USD
    try {
      const soulRequired = await oracleContract.getRequiredSoulShardAmount(testUSDAmount);
      console.log(`   10 USD = ${ethers.formatUnits(soulRequired, 18)} SOUL`);
      const rate = Number(ethers.formatUnits(soulRequired, 18)) / 10;
      console.log(`   匯率: 1 USD = ${rate} SOUL`);
      
      if (rate < 1000) {
        console.log('   ⚠️  Oracle 匯率異常低！');
      }
    } catch (e) {
      console.log('   Oracle 計算失敗:', e.message);
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

testPrices().catch(console.error);