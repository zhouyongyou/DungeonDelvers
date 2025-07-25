#!/usr/bin/env node

// V19 子圖測試腳本
// 測試 URL: https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.1.2

const GRAPH_URL = 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.1.2';

// GraphQL 查詢函數
async function queryGraph(query) {
  try {
    const response = await fetch(GRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.errors) {
      console.error('❌ GraphQL 錯誤:', data.errors);
      return null;
    }
    
    return data.data;
  } catch (error) {
    console.error('❌ 查詢失敗:', error.message);
    return null;
  }
}

// 測試查詢
const tests = [
  {
    name: '1. Hero NFT 測試',
    query: `{
      heros(first: 5, orderBy: createdAt, orderDirection: desc) {
        id
        tokenId
        owner { id }
        rarity
        power
        createdAt
        isBurned
      }
    }`
  },
  {
    name: '2. Relic NFT 測試',
    query: `{
      relics(first: 5, orderBy: createdAt, orderDirection: desc) {
        id
        tokenId
        owner { id }
        rarity
        capacity
        createdAt
        isBurned
      }
    }`
  },
  {
    name: '3. Party NFT 測試',
    query: `{
      parties(first: 5, orderBy: createdAt, orderDirection: desc) {
        id
        tokenId
        owner { id }
        name
        totalPower
        totalCapacity
        partyRarity
        createdAt
      }
    }`
  },
  {
    name: '4. VIP 質押測試',
    query: `{
      vips(first: 5, orderBy: createdAt, orderDirection: desc) {
        id
        owner { id }
        stakedAmount
        stakedAt
        unlockTime
        isUnlocking
        createdAt
      }
    }`
  },
  {
    name: '5. 玩家檔案測試',
    query: `{
      players(first: 5) {
        id
        heros { id }
        relics { id }
        parties { id }
        vip { id }
        profile { id }
      }
    }`
  },
  {
    name: '6. 升星記錄測試',
    query: `{
      upgradeAttempts(first: 5, orderBy: timestamp, orderDirection: desc) {
        id
        player { id }
        type
        targetId
        materialIds
        isSuccess
        newRarity
        timestamp
      }
    }`
  },
  {
    name: '7. 聚合統計測試',
    query: `{
      _meta {
        block {
          number
          timestamp
        }
        deployment
        hasIndexingErrors
      }
    }`
  }
];

// 執行測試
async function runTests() {
  console.log('🔍 開始測試 V19 子圖...');
  console.log(`📍 測試 URL: ${GRAPH_URL}\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const test of tests) {
    console.log(`\n📊 ${test.name}`);
    console.log('─'.repeat(50));
    
    const result = await queryGraph(test.query);
    
    if (result) {
      successCount++;
      console.log('✅ 查詢成功');
      console.log(JSON.stringify(result, null, 2));
    } else {
      failCount++;
      console.log('❌ 查詢失敗');
    }
  }
  
  // 總結
  console.log('\n' + '='.repeat(50));
  console.log(`📈 測試總結：`);
  console.log(`   成功: ${successCount}/${tests.length}`);
  console.log(`   失敗: ${failCount}/${tests.length}`);
  console.log('='.repeat(50));
  
  // 額外測試：檢查特定地址
  console.log('\n🔍 額外測試：查詢特定英雄 #1');
  const heroResult = await queryGraph(`{
    hero(id: "0x141f081922d4015b3157cda6ee970dff34bb8aab-1") {
      id
      tokenId
      owner { id }
      rarity
      power
    }
  }`);
  
  if (heroResult) {
    console.log('✅ 英雄 #1 資料：');
    console.log(JSON.stringify(heroResult, null, 2));
  } else {
    console.log('❌ 無法查詢英雄 #1（可能尚未鑄造）');
  }
}

// 執行測試
runTests().catch(console.error);