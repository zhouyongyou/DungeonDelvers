#!/usr/bin/env node

// V19 部署驗證腳本

import fetch from 'node-fetch';

const V19_ADDRESSES = {
  ORACLE: '0x54Ff2524C996d7608CaE9F3D9dd2075A023472E9',
  DUNGEONCORE: '0x4D353aFC420E6187bfA5F99f0DdD8F7F137c20E9',
  HERO: '0x141F081922D4015b3157cdA6eE970dff34bb8AAb',
  RELIC: '0xB1eb505426e852B8Dca4BF41454a7A22D2B6F3D3',
  PARTY: '0xf240c4fD2651Ba41ff09eB26eE01b21f42dD9957',
  PLAYERVAULT: '0xF68cEa7E171A5caF151A85D7BEb2E862B83Ccf78',
  PLAYERPROFILE: '0x1d36C2F3f0C9212422B94608cAA72080CBf34A41',
  VIPSTAKING: '0x43A6C6cC9D15f2C68C7ec98deb01f2b69a618470',
  DUNGEONSTORAGE: '0x6B85882ab32471Ce4a6599A7256E50B8Fb1fD43e',
  DUNGEONMASTER: '0xd34ddc336071FE7Da3c636C3Df7C3BCB77B1044a',
  ALTAROFASCENSION: '0xb53c51Dc426c2Bd29da78Ac99426c55A6D6a51Ab'
};

async function verifyDeployment() {
  console.log('🔍 驗證 V19 部署狀態...\n');
  
  const results = {
    frontend: { status: '❓', message: '待驗證' },
    backend: { status: '❓', message: '待驗證' },
    subgraph: { status: '❓', message: '待驗證' },
    config: { status: '❓', message: '待驗證' }
  };

  // 1. 檢查前端配置
  console.log('1️⃣ 檢查前端配置...');
  try {
    const response = await fetch('https://dungeondelvers.xyz/config/v19.json');
    const data = await response.json();
    if (data.version === 'V19') {
      results.frontend.status = '✅';
      results.frontend.message = 'V19 配置已部署';
      
      // 驗證地址
      const configAddresses = data.contracts.mainnet;
      let allMatch = true;
      for (const [key, value] of Object.entries(V19_ADDRESSES)) {
        if (configAddresses[`${key}_ADDRESS`] !== value) {
          allMatch = false;
          break;
        }
      }
      if (!allMatch) {
        results.frontend.status = '⚠️';
        results.frontend.message = '配置存在但地址不匹配';
      }
    }
  } catch (error) {
    results.frontend.status = '❌';
    results.frontend.message = `無法載入配置: ${error.message}`;
  }

  // 2. 檢查後端 API
  console.log('\n2️⃣ 檢查後端 API...');
  try {
    // 檢查合約地址
    const contractsResponse = await fetch('https://dungeon-delvers-metadata-server.onrender.com/api/contracts');
    const contractsData = await contractsResponse.json();
    if (contractsData.hero === V19_ADDRESSES.HERO) {
      results.backend.status = '✅';
      results.backend.message = 'V19 地址已更新';
    } else {
      results.backend.status = '⚠️';
      results.backend.message = '地址尚未更新（可能需要等待部署）';
    }
    
    // 測試 metadata
    const metadataResponse = await fetch('https://dungeon-delvers-metadata-server.onrender.com/api/hero/1');
    if (metadataResponse.status === 200) {
      console.log('   ✓ Metadata API 正常運作');
    }
  } catch (error) {
    results.backend.status = '❌';
    results.backend.message = `API 錯誤: ${error.message}`;
  }

  // 3. 檢查 CDN 配置
  console.log('\n3️⃣ 檢查 CDN 配置...');
  try {
    const cdnResponse = await fetch('https://dungeondelvers.xyz/config/v19.json');
    const cdnData = await cdnResponse.json();
    if (cdnData.version === 'V19') {
      results.config.status = '✅';
      results.config.message = 'CDN 配置已更新';
    }
  } catch (error) {
    results.config.status = '❌';
    results.config.message = `CDN 載入失敗: ${error.message}`;
  }

  // 4. 檢查子圖狀態
  console.log('\n4️⃣ 檢查子圖狀態...');
  console.log('   ⚠️  請手動檢查 The Graph Studio:');
  console.log('   https://thegraph.com/studio/subgraph/dungeon-delvers/');
  results.subgraph.status = '🔄';
  results.subgraph.message = '需要手動驗證';

  // 顯示結果
  console.log('\n📊 驗證結果總結：');
  console.log('=====================================');
  console.log(`前端配置: ${results.frontend.status} ${results.frontend.message}`);
  console.log(`後端 API: ${results.backend.status} ${results.backend.message}`);
  console.log(`CDN 配置: ${results.config.status} ${results.config.message}`);
  console.log(`子圖狀態: ${results.subgraph.status} ${results.subgraph.message}`);
  console.log('=====================================');

  // 後續步驟
  console.log('\n📋 後續步驟：');
  if (results.backend.status === '⚠️') {
    console.log('1. 等待 Render 完成部署（約 5-10 分鐘）');
  }
  console.log('2. 部署子圖到 The Graph:');
  console.log('   cd DDgraphql/dungeon-delvers');
  console.log('   export GRAPH_ACCESS_TOKEN=your_token');
  console.log('   ./deploy-v19.sh');
  console.log('3. 在前端測試價格顯示（應顯示約 33,944 SOUL）');
  console.log('4. 測試鑄造功能是否正常');
}

// 執行驗證
verifyDeployment().catch(console.error);