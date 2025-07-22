// checkSubgraphSync.js - 檢查 Subgraph 同步狀態

import fetch from 'node-fetch';

const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.0.7';

async function checkSubgraphSync() {
  const query = `
    query {
      _meta {
        deployment
        hasIndexingErrors
        block {
          number
          hash
          timestamp
        }
      }
    }
  `;

  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('❌ GraphQL 錯誤:', result.errors);
      return;
    }

    const meta = result.data._meta;
    const blockTime = new Date(meta.block.timestamp * 1000);
    const now = new Date();
    const lagSeconds = Math.floor((now - blockTime) / 1000);
    
    console.log('📊 Subgraph v3.0.7 同步狀態:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📦 部署 ID: ${meta.deployment}`);
    console.log(`🔢 當前區塊: #${meta.block.number}`);
    console.log(`🕐 區塊時間: ${blockTime.toLocaleString()}`);
    console.log(`⏱️  延遲時間: ${lagSeconds} 秒`);
    console.log(`❗ 索引錯誤: ${meta.hasIndexingErrors ? '是' : '否'}`);
    
    if (lagSeconds > 60) {
      console.log('\n⚠️  警告: 同步延遲超過 1 分鐘！');
    } else {
      console.log('\n✅ 同步狀態良好');
    }

    // 檢查 RewardsBanked 事件處理
    await checkRewardsBankedEvents();
    
  } catch (error) {
    console.error('❌ 錯誤:', error.message);
  }
}

async function checkRewardsBankedEvents() {
  console.log('\n🔍 檢查 RewardsBanked 事件處理...');
  
  // 查詢最近有獎勵領取的隊伍
  const query = `
    query {
      parties(
        first: 5
        where: { unclaimedRewards_gt: "0" }
        orderBy: lastUpdatedAt
        orderDirection: desc
      ) {
        id
        unclaimedRewards
        lastUpdatedAt
      }
    }
  `;

  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const result = await response.json();
    
    if (result.data && result.data.parties) {
      console.log(`\n找到 ${result.data.parties.length} 個有未領取獎勵的隊伍:`);
      result.data.parties.forEach(party => {
        const updateTime = new Date(party.lastUpdatedAt * 1000);
        console.log(`  隊伍 #${party.id}: ${(party.unclaimedRewards / 1e18).toFixed(4)} SOUL (更新於 ${updateTime.toLocaleString()})`);
      });
    }
  } catch (error) {
    console.error('檢查失敗:', error.message);
  }
}

// 執行檢查
checkSubgraphSync();