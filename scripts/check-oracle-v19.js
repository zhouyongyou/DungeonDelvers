#!/usr/bin/env node

// 檢查 V19 Oracle 合約狀態

import { ethers } from 'ethers';

const ORACLE_ADDRESS = '0x54Ff2524C996d7608CaE9F3D9dd2075A023472E9';
const UNISWAP_POOL = '0x1e5Cd5F386Fb6F39cD8788675dd3A5ceB6521C82';

// Oracle ABI
const ORACLE_ABI = [
  'function poolAddress() view returns (address)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function soulToken() view returns (address)',
  'function usdToken() view returns (address)',
  'function getLatestPrice() view returns (uint256)',
  'function getSoulShardPriceInUSD() view returns (uint256)',
  'function getRequiredSoulShardAmount(uint256 usdAmount) view returns (uint256)',
  'function owner() view returns (address)'
];

// Uniswap V3 Pool ABI
const POOL_ABI = [
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)'
];

async function checkOracle() {
  console.log('🔍 檢查 V19 Oracle 合約狀態\n');
  
  const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
  const oracleContract = new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, provider);
  const poolContract = new ethers.Contract(UNISWAP_POOL, POOL_ABI, provider);
  
  try {
    // 1. 檢查 Oracle 基本配置
    console.log('📊 Oracle 合約配置：');
    console.log(`   地址: ${ORACLE_ADDRESS}`);
    
    try {
      const owner = await oracleContract.owner();
      console.log(`   擁有者: ${owner}`);
    } catch (e) {
      console.log('   ❌ 無法讀取 owner');
    }
    
    try {
      const poolAddress = await oracleContract.poolAddress();
      console.log(`   Pool 地址: ${poolAddress}`);
      console.log(`   Pool 匹配: ${poolAddress.toLowerCase() === UNISWAP_POOL.toLowerCase() ? '✅' : '❌'}`);
    } catch (e) {
      console.log('   ❌ 無法讀取 poolAddress:', e.message);
    }
    
    try {
      const token0 = await oracleContract.token0();
      const token1 = await oracleContract.token1();
      console.log(`   Token0: ${token0}`);
      console.log(`   Token1: ${token1}`);
    } catch (e) {
      console.log('   ❌ 無法讀取 token0/token1');
    }
    
    try {
      const soulToken = await oracleContract.soulToken();
      const usdToken = await oracleContract.usdToken();
      console.log(`   SOUL Token: ${soulToken}`);
      console.log(`   USD Token: ${usdToken}`);
    } catch (e) {
      console.log('   ❌ 無法讀取 soulToken/usdToken');
    }
    
    // 2. 檢查 Uniswap Pool
    console.log('\n📊 Uniswap V3 Pool 狀態：');
    console.log(`   Pool 地址: ${UNISWAP_POOL}`);
    
    try {
      const poolToken0 = await poolContract.token0();
      const poolToken1 = await poolContract.token1();
      console.log(`   Pool Token0: ${poolToken0}`);
      console.log(`   Pool Token1: ${poolToken1}`);
      
      const slot0 = await poolContract.slot0();
      console.log(`   sqrtPriceX96: ${slot0.sqrtPriceX96}`);
      console.log(`   tick: ${slot0.tick}`);
      console.log(`   unlocked: ${slot0.unlocked ? '✅' : '❌'}`);
      
      // 計算價格
      const sqrtPriceX96 = slot0.sqrtPriceX96;
      const price = (Number(sqrtPriceX96) / (2 ** 96)) ** 2;
      console.log(`   價格 (token1/token0): ${price}`);
      console.log(`   價格 (token0/token1): ${1/price}`);
      
    } catch (e) {
      console.log('   ❌ 無法讀取 Pool 數據:', e.message);
    }
    
    // 3. 測試價格函數
    console.log('\n📊 價格函數測試：');
    
    // 測試各種調用方式
    const testFunctions = [
      { name: 'getLatestPrice()', func: () => oracleContract.getLatestPrice() },
      { name: 'getSoulShardPriceInUSD()', func: () => oracleContract.getSoulShardPriceInUSD() },
      { name: 'getRequiredSoulShardAmount(1e18)', func: () => oracleContract.getRequiredSoulShardAmount(ethers.parseUnits('1', 18)) }
    ];
    
    for (const test of testFunctions) {
      try {
        console.log(`\n   測試 ${test.name}:`);
        const result = await test.func();
        console.log(`   ✅ 成功: ${result.toString()}`);
        console.log(`   格式化: ${ethers.formatUnits(result, 18)}`);
      } catch (error) {
        console.log(`   ❌ 失敗: ${error.message}`);
        
        // 嘗試解析錯誤
        if (error.data) {
          console.log(`   錯誤數據: ${error.data}`);
        }
      }
    }
    
    // 4. 直接檢查合約代碼
    console.log('\n📊 合約部署檢查：');
    const code = await provider.getCode(ORACLE_ADDRESS);
    console.log(`   合約代碼長度: ${code.length} bytes`);
    console.log(`   是否已部署: ${code !== '0x' ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('\n❌ 檢查失敗:', error);
  }
}

checkOracle().catch(console.error);