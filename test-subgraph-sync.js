#!/usr/bin/env node

const SUBGRAPH_URL = 'https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs';

async function testSubgraphSync() {
  console.log('🔍 測試子圖數據同步狀態...\n');
  console.log(`📍 子圖端點: ${SUBGRAPH_URL}\n`);

  try {
    // 1. 測試基本連接和元數據
    console.log('1️⃣ 檢查子圖元數據...');
    const metaQuery = `
      query {
        _meta {
          hasIndexingErrors
          block {
            number
            hash
            timestamp
          }
        }
      }
    `;

    const metaResponse = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: metaQuery })
    });

    const metaData = await metaResponse.json();
    
    if (metaData.errors) {
      console.error('❌ 子圖查詢錯誤:', metaData.errors);
      return;
    }

    console.log('✅ 子圖元數據:');
    console.log(`   - 索引錯誤: ${metaData.data._meta.hasIndexingErrors ? '是' : '否'}`);
    console.log(`   - 最新區塊: ${metaData.data._meta.block.number}`);
    console.log(`   - 區塊時間: ${new Date(metaData.data._meta.block.timestamp * 1000).toLocaleString()}`);
    console.log('');

    // 2. 測試各個實體的數據
    console.log('2️⃣ 檢查各實體數據量...');
    const entitiesQuery = `
      query {
        heros(first: 1) {
          tokenId
        }
        relics(first: 1) {
          tokenId
        }
        parties(first: 1) {
          tokenId
        }
        vips(first: 1) {
          owner
        }
        playerProfiles(first: 1) {
          owner
        }
        expeditions(first: 1) {
          id
        }
        _meta {
          block {
            number
          }
        }
      }
    `;

    const entitiesResponse = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: entitiesQuery })
    });

    const entitiesData = await entitiesResponse.json();

    if (entitiesData.errors) {
      console.error('❌ 實體查詢錯誤:', JSON.stringify(entitiesData.errors, null, 2));
      return;
    }

    if (!entitiesData.data) {
      console.error('❌ 沒有返回數據');
      console.log('原始響應:', JSON.stringify(entitiesData, null, 2));
      return;
    }

    console.log('✅ 實體數據狀態:');
    console.log(`   - Heroes: ${entitiesData.data.heros?.length > 0 ? '有數據' : '無數據'}`);
    console.log(`   - Relics: ${entitiesData.data.relics?.length > 0 ? '有數據' : '無數據'}`);
    console.log(`   - Parties: ${entitiesData.data.parties?.length > 0 ? '有數據' : '無數據'}`);
    console.log(`   - VIPs: ${entitiesData.data.vips?.length > 0 ? '有數據' : '無數據'}`);
    console.log(`   - Player Profiles: ${entitiesData.data.playerProfiles?.length > 0 ? '有數據' : '無數據'}`);
    console.log(`   - Expeditions: ${entitiesData.data.expeditions?.length > 0 ? '有數據' : '無數據'}`);
    console.log('');

    // 3. 測試具體查詢（例如：最新的英雄）
    console.log('3️⃣ 測試最新英雄數據...');
    const heroQuery = `
      query {
        heros(first: 5, orderBy: createdAt, orderDirection: desc) {
          tokenId
          owner
          rarity
          power
          createdAt
        }
      }
    `;

    const heroResponse = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: heroQuery })
    });

    const heroData = await heroResponse.json();

    if (heroData.data.heros.length > 0) {
      console.log('✅ 最新英雄:');
      heroData.data.heros.forEach(hero => {
        console.log(`   - Hero #${hero.tokenId}: 稀有度 ${hero.rarity}, 力量 ${hero.power}`);
        console.log(`     擁有者: ${hero.owner}`);
        console.log(`     創建時間: ${new Date(hero.createdAt * 1000).toLocaleString()}`);
      });
    } else {
      console.log('❌ 沒有找到英雄數據');
    }
    console.log('');

    // 4. 測試隊伍數據（特別關注隊伍成員）
    console.log('4️⃣ 測試隊伍數據...');
    const partyQuery = `
      query {
        parties(first: 3, orderBy: createdAt, orderDirection: desc) {
          tokenId
          owner
          heroIds
          relicIds
          totalPower
          createdAt
        }
      }
    `;

    const partyResponse = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: partyQuery })
    });

    const partyData = await partyResponse.json();

    if (partyData.data.parties.length > 0) {
      console.log('✅ 最新隊伍:');
      partyData.data.parties.forEach(party => {
        console.log(`   - Party #${party.tokenId}:`);
        console.log(`     擁有者: ${party.owner}`);
        console.log(`     英雄: [${party.heroIds.join(', ')}]`);
        console.log(`     聖物: [${party.relicIds.join(', ')}]`);
        console.log(`     總力量: ${party.totalPower}`);
      });
    } else {
      console.log('❌ 沒有找到隊伍數據');
    }
    console.log('');

    // 5. 測試出征記錄
    console.log('5️⃣ 測試出征記錄...');
    const expeditionQuery = `
      query {
        expeditions(first: 5, orderBy: timestamp, orderDirection: desc) {
          id
          player {
            id
          }
          partyId
          isVictory
          rewardsClaimed
          timestamp
        }
      }
    `;

    const expeditionResponse = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: expeditionQuery })
    });

    const expeditionData = await expeditionResponse.json();

    if (expeditionData.data && expeditionData.data.expeditions && expeditionData.data.expeditions.length > 0) {
      console.log('✅ 最新出征記錄:');
      expeditionData.data.expeditions.forEach(exp => {
        console.log(`   - 出征 ${exp.id.substring(0, 10)}...:`);
        console.log(`     玩家: ${exp.player.id}`);
        console.log(`     隊伍: #${exp.partyId}`);
        console.log(`     結果: ${exp.isVictory ? '勝利' : '失敗'}`);
        console.log(`     獎勵: ${exp.rewardsClaimed}`);
        console.log(`     時間: ${new Date(exp.timestamp * 1000).toLocaleString()}`);
      });
    } else {
      console.log('❌ 沒有找到出征記錄');
    }

    console.log('\n✅ 子圖同步測試完成！');

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

// 執行測試
testSubgraphSync();