#!/usr/bin/env node

// 修復 Oracle 和 DungeonCore 地址不一致問題

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const BSC_RPC = 'https://bsc-dataseed.binance.org/';
const provider = new ethers.JsonRpcProvider(BSC_RPC);

// 當前混亂的地址配置
const CURRENT_ADDRESSES = {
  // Hero 合約使用的 DungeonCore
  DUNGEON_CORE_FROM_HERO: '0x4D353aFC420E6187bfA5F99f0DdD8F7F137c20E9',
  
  // 前端配置的 DungeonCore
  DUNGEON_CORE_FROM_FRONTEND: '0x3c97732E72Db4Bc9B3033cAAc08C4Be24C3fB84c',
  
  // 其他合約
  HERO: '0x141F081922D4015b3157cdA6eE970dff34bb8AAb',
  RELIC: '0xB1eb505426e852B8Dca4BF41454a7A22D2B6F3D3',
  ORACLE: '0x54Ff2524C996d7608CaE9F3D9dd2075A023472E9',
  USD: '0x7C67Af4EBC6651c95dF78De11cfe325660d935FE',
  SOULSHARD: '0x4e02B4d0A6b6a90fDDFF058B8a6148BA3F909915'
};

// ABI 定義
const DUNGEON_CORE_ABI = [
  'function getSoulShardAmountForUSD(uint256) view returns (uint256)',
  'function oracleAddress() view returns (address)',
  'function owner() view returns (address)'
];

const ORACLE_ABI = [
  'function getSoulShardPriceInUSD() view returns (uint256)',
  'function getAmountOut(address,uint256) view returns (uint256)'
];

async function diagnoseAndFix() {
  console.log('🔍 診斷 Oracle 和 DungeonCore 問題...\n');
  
  try {
    // 1. 檢查兩個 DungeonCore
    console.log('📊 1. 檢查 DungeonCore 地址不一致問題：');
    console.log(`   Hero 使用的: ${CURRENT_ADDRESSES.DUNGEON_CORE_FROM_HERO}`);
    console.log(`   前端配置的: ${CURRENT_ADDRESSES.DUNGEON_CORE_FROM_FRONTEND}`);
    
    // 檢查哪個是正確的
    const dungeonCore1 = new ethers.Contract(
      CURRENT_ADDRESSES.DUNGEON_CORE_FROM_HERO, 
      DUNGEON_CORE_ABI, 
      provider
    );
    
    const dungeonCore2 = new ethers.Contract(
      CURRENT_ADDRESSES.DUNGEON_CORE_FROM_FRONTEND, 
      DUNGEON_CORE_ABI, 
      provider
    );
    
    console.log('\n📊 2. 檢查兩個 DungeonCore 的 Oracle 設置：');
    
    try {
      const oracle1 = await dungeonCore1.oracleAddress();
      const owner1 = await dungeonCore1.owner();
      console.log(`\n   DungeonCore 1 (Hero使用):`);
      console.log(`   - Oracle: ${oracle1}`);
      console.log(`   - Owner: ${owner1}`);
      
      // 測試功能
      try {
        const result = await dungeonCore1.getSoulShardAmountForUSD(ethers.parseUnits('2', 18));
        console.log(`   - getSoulShardAmountForUSD: ✅ 成功`);
      } catch (e) {
        console.log(`   - getSoulShardAmountForUSD: ❌ 失敗`);
      }
    } catch (e) {
      console.log(`   DungeonCore 1: ❌ 無法訪問`);
    }
    
    try {
      const oracle2 = await dungeonCore2.oracleAddress();
      const owner2 = await dungeonCore2.owner();
      console.log(`\n   DungeonCore 2 (前端配置):`);
      console.log(`   - Oracle: ${oracle2}`);
      console.log(`   - Owner: ${owner2}`);
      
      // 測試功能
      try {
        const result = await dungeonCore2.getSoulShardAmountForUSD(ethers.parseUnits('2', 18));
        console.log(`   - getSoulShardAmountForUSD: ✅ 成功`);
      } catch (e) {
        console.log(`   - getSoulShardAmountForUSD: ❌ 失敗`);
      }
    } catch (e) {
      console.log(`   DungeonCore 2: ❌ 無法訪問`);
    }
    
    // 3. 檢查 Oracle 合約
    console.log('\n📊 3. 檢查 Oracle 合約功能：');
    const oracle = new ethers.Contract(CURRENT_ADDRESSES.ORACLE, ORACLE_ABI, provider);
    
    try {
      const price = await oracle.getSoulShardPriceInUSD();
      console.log(`   getSoulShardPriceInUSD: ✅ ${ethers.formatUnits(price, 18)} USD/SOUL`);
    } catch (e) {
      console.log(`   getSoulShardPriceInUSD: ❌ 函數不存在或調用失敗`);
      
      // 嘗試 getAmountOut
      try {
        const amount = await oracle.getAmountOut(CURRENT_ADDRESSES.USD, ethers.parseUnits('2', 18));
        console.log(`   getAmountOut: ✅ 2 USD = ${ethers.formatUnits(amount, 18)} SOUL`);
      } catch (e2) {
        console.log(`   getAmountOut: ❌ 也失敗了`);
      }
    }
    
    // 4. 建議解決方案
    console.log('\n' + '='.repeat(60));
    console.log('📋 診斷結果與解決方案：\n');
    
    console.log('問題 1: DungeonCore 地址不一致');
    console.log('   - Hero 合約和前端使用不同的 DungeonCore');
    console.log('   - 需要統一使用正確的 DungeonCore\n');
    
    console.log('問題 2: Oracle 缺少 public 函數');
    console.log('   - 部署的 Oracle 可能缺少 getSoulShardPriceInUSD public 函數');
    console.log('   - 導致 DungeonCore 調用失敗\n');
    
    console.log('🔧 建議步驟：');
    console.log('1. 確定正確的 DungeonCore 地址（檢查哪個有正確的 owner）');
    console.log('2. 部署新的 Oracle_Final 合約');
    console.log('3. 在正確的 DungeonCore 設置新 Oracle');
    console.log('4. 統一所有配置使用相同的地址');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ 診斷失敗:', error);
  }
}

diagnoseAndFix().catch(console.error);