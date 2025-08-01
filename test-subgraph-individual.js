#!/usr/bin/env node

const SUBGRAPH_URL = 'https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs';

async function testEntity(entityName, query) {
  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.log(`❌ ${entityName}: 查詢錯誤 - ${data.errors[0].message}`);
    } else if (data.data && data.data[entityName]) {
      const count = data.data[entityName].length;
      if (count > 0) {
        console.log(`✅ ${entityName}: 有 ${count} 條數據`);
        // 顯示第一條數據
        console.log(`   範例:`, JSON.stringify(data.data[entityName][0], null, 2).substring(0, 200) + '...');
      } else {
        console.log(`⚠️  ${entityName}: 無數據`);
      }
    } else {
      console.log(`❌ ${entityName}: 無響應數據`);
    }
  } catch (error) {
    console.log(`❌ ${entityName}: 請求失敗 - ${error.message}`);
  }
}

async function testSubgraphSync() {
  console.log('🔍 逐個測試子圖實體...\n');
  console.log(`📍 子圖端點: ${SUBGRAPH_URL}\n`);

  // 測試每個實體
  const tests = [
    {
      name: 'heros',
      query: `query { heros(first: 1) { tokenId owner rarity power } }`
    },
    {
      name: 'relics',
      query: `query { relics(first: 1) { tokenId owner rarity capacity } }`
    },
    {
      name: 'parties',
      query: `query { parties(first: 1) { tokenId owner heroIds relicIds } }`
    },
    {
      name: 'players',
      query: `query { players(first: 1) { id } }`
    },
    {
      name: 'playerProfiles',
      query: `query { playerProfiles(first: 1) { owner tokenId } }`
    },
    {
      name: 'expeditions',
      query: `query { expeditions(first: 1) { id partyId isVictory } }`
    },
    {
      name: '_meta',
      query: `query { _meta { hasIndexingErrors block { number } } }`
    }
  ];

  for (const test of tests) {
    await testEntity(test.name, test.query);
    console.log('');
  }

  // 測試特定的複雜查詢
  console.log('📊 測試複雜查詢...\n');
  
  // 測試玩家的英雄
  const playerHeroQuery = `
    query {
      players(first: 1, where: { id_not: "0x0000000000000000000000000000000000000000" }) {
        id
        heros(first: 3) {
          tokenId
          rarity
          power
        }
      }
    }
  `;

  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: playerHeroQuery })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.log('❌ 玩家英雄查詢失敗:', data.errors[0].message);
    } else if (data.data && data.data.players && data.data.players.length > 0) {
      console.log('✅ 玩家英雄查詢成功:');
      const player = data.data.players[0];
      console.log(`   玩家: ${player.id}`);
      console.log(`   英雄數量: ${player.heros.length}`);
      if (player.heros.length > 0) {
        player.heros.forEach(hero => {
          console.log(`   - Hero #${hero.tokenId}: 稀有度 ${hero.rarity}, 力量 ${hero.power}`);
        });
      }
    }
  } catch (error) {
    console.log('❌ 玩家英雄查詢錯誤:', error.message);
  }

  console.log('\n✅ 測試完成！');
}

// 執行測試
testSubgraphSync();