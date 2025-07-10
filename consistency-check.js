#!/usr/bin/env node

/**
 * 一致性檢查腳本
 * 用於驗證前端、子圖、伺服器之間的配置和結構一致性
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 開始檢查前端、子圖、伺服器一致性...\n');

// 檢查項目結構
const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function logSuccess(message) {
  console.log(`✅ ${message}`);
  checks.passed++;
}

function logError(message) {
  console.log(`❌ ${message}`);
  checks.failed++;
}

function logWarning(message) {
  console.log(`⚠️  ${message}`);
  checks.warnings++;
}

// 1. 檢查環境變數一致性
console.log('📋 檢查環境變數一致性:');

try {
  const apolloClient = fs.readFileSync('src/apolloClient.ts', 'utf8');
  if (apolloClient.includes('VITE_THE_GRAPH_STUDIO_API_URL')) {
    logSuccess('Apollo 客戶端使用正確的環境變數');
  } else {
    logError('Apollo 客戶端仍使用舊的環境變數名稱');
  }
} catch (error) {
  logError('無法讀取 Apollo 客戶端文件');
}

// 2. 檢查類型定義一致性
console.log('\n📋 檢查類型定義一致性:');

try {
  const nftTypes = fs.readFileSync('src/types/nft.ts', 'utf8');
  if (nftTypes.includes('stakedAmount: bigint')) {
    logSuccess('VIP 類型定義包含 stakedAmount 欄位');
  } else {
    logError('VIP 類型定義缺少 stakedAmount 欄位');
  }
  
  if (nftTypes.includes('stakedValueUSD?: bigint')) {
    logSuccess('VIP 類型定義包含 stakedValueUSD 欄位');
  } else {
    logWarning('VIP 類型定義可能缺少 stakedValueUSD 欄位');
  }
} catch (error) {
  logError('無法讀取 NFT 類型定義文件');
}

// 3. 檢查 GraphQL 查詢結構
console.log('\n📋 檢查 GraphQL 查詢結構:');

try {
  const nftApi = fs.readFileSync('src/api/nfts.ts', 'utf8');
  if (nftApi.includes('stakedAmount') && nftApi.includes('level')) {
    logSuccess('前端 GraphQL 查詢包含完整的 VIP 欄位');
  } else {
    logError('前端 GraphQL 查詢可能缺少 VIP 欄位');
  }
} catch (error) {
  logError('無法讀取前端 API 文件');
}

try {
  const serverQueries = fs.readFileSync('dungeon-delvers-metadata-server/src/queries.js', 'utf8');
  if (serverQueries.includes('GET_VIP_QUERY') && serverQueries.includes('stakedAmount')) {
    logSuccess('伺服器查詢結構與前端一致');
  } else {
    logError('伺服器查詢結構與前端不一致');
  }
} catch (error) {
  logError('無法讀取伺服器查詢文件');
}

// 4. 檢查 ID 格式統一性
console.log('\n📋 檢查 ID 格式統一性:');

try {
  const partyTs = fs.readFileSync('DDgraphql/dungeon-delvers/src/party.ts', 'utf8');
  if (partyTs.includes('createEntityId(event.address.toHexString()')) {
    logSuccess('子圖 Party 使用統一的 ID 生成函數');
  } else {
    logError('子圖 Party 未使用統一的 ID 生成函數');
  }
} catch (error) {
  logError('無法讀取子圖 Party 文件');
}

try {
  const dungeonMaster = fs.readFileSync('DDgraphql/dungeon-delvers/src/dungeon-master.ts', 'utf8');
  if (dungeonMaster.includes('createEntityId(getPartyContractAddress()')) {
    logSuccess('子圖 DungeonMaster 使用統一的配置系統');
  } else {
    logError('子圖 DungeonMaster 未使用統一的配置系統');
  }
} catch (error) {
  logError('無法讀取子圖 DungeonMaster 文件');
}

// 5. 檢查合約地址一致性
console.log('\n📋 檢查合約地址參照:');

const expectedAddresses = {
  hero: '0x2Cf5429dDbd2Df730a6668b50200233c76c1116F',
  relic: '0x548eA33d0deC74bBE9a3F0D1B5E4C660bf59E5A5',
  party: '0x78dBA7671753191FFeeBEEed702Aab4F2816d70D',
  playerProfile: '0x98708fFC8afaC1289639C797f5A6F095217FAFB8',
  vipStaking: '0xf1F84F3F3632fbB9be2F3d132C3660100d2C98e2'
};

try {
  const subgraphConfig = fs.readFileSync('DDgraphql/dungeon-delvers/subgraph.yaml', 'utf8');
  let addressMatches = 0;
  
  Object.entries(expectedAddresses).forEach(([name, address]) => {
    if (subgraphConfig.includes(address)) {
      addressMatches++;
    }
  });
  
  if (addressMatches === Object.keys(expectedAddresses).length) {
    logSuccess('子圖配置包含所有預期的合約地址');
  } else {
    logWarning(`子圖配置只匹配了 ${addressMatches}/${Object.keys(expectedAddresses).length} 個地址`);
  }
} catch (error) {
  logError('無法讀取子圖配置文件');
}

// 總結
console.log('\n📊 檢查結果總結:');
console.log(`✅ 通過: ${checks.passed}`);
console.log(`❌ 失敗: ${checks.failed}`);
console.log(`⚠️  警告: ${checks.warnings}`);

if (checks.failed === 0) {
  console.log('\n🎉 所有關鍵檢查都通過了！系統一致性良好。');
} else {
  console.log(`\n🚨 發現 ${checks.failed} 個問題需要修復。`);
  process.exit(1);
}

console.log('\n🔧 如果需要進一步的驗證，請運行前端和伺服器測試。');