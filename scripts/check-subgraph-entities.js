import fetch from 'node-fetch';

const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.0.2';

async function checkSubgraphEntities() {
  console.log('🔍 檢查子圖實體狀態\n');

  // 1. 檢查子圖元數據
  const metaQuery = `
    {
      _meta {
        block {
          number
          hash
        }
        deployment
        hasIndexingErrors
      }
    }
  `;

  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: metaQuery }),
    });

    const data = await response.json();
    console.log('📊 子圖狀態:');
    console.log(`- 當前區塊: ${data.data?._meta?.block?.number || 'N/A'}`);
    console.log(`- 索引錯誤: ${data.data?._meta?.hasIndexingErrors ? '是' : '否'}`);
    console.log(`- 部署ID: ${data.data?._meta?.deployment || 'N/A'}`);

    // 2. 檢查各實體數量
    const countQuery = `
      {
        heroCount: heroes(first: 1000) {
          id
        }
        relicCount: relics(first: 1000) {
          id
        }
        partyCount: parties(first: 1000) {
          id
        }
        playerCount: players(first: 1000) {
          id
        }
        expeditionCount: expeditions(first: 1000) {
          id
        }
      }
    `;

    const countResponse = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: countQuery }),
    });

    const countData = await countResponse.json();
    console.log('\n📈 實體統計:');
    console.log(`- 英雄總數: ${countData.data?.heroCount?.length || 0}`);
    console.log(`- 聖物總數: ${countData.data?.relicCount?.length || 0}`);
    console.log(`- 隊伍總數: ${countData.data?.partyCount?.length || 0}`);
    console.log(`- 玩家總數: ${countData.data?.playerCount?.length || 0}`);
    console.log(`- 探險總數: ${countData.data?.expeditionCount?.length || 0}`);

    // 3. 查詢特定ID的實體
    console.log('\n🔎 查詢特定實體:');
    
    // 查詢英雄 #1
    const heroQuery = `
      {
        hero(id: "0x929a4187a462314fcc480ff547019fa122a283f0-1") {
          id
          tokenId
          owner
          level
          power
        }
      }
    `;

    const heroResponse = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: heroQuery }),
    });

    const heroData = await heroResponse.json();
    if (heroData.data?.hero) {
      console.log('\n英雄 #1:');
      console.log(`- ID: ${heroData.data.hero.id}`);
      console.log(`- TokenID: ${heroData.data.hero.tokenId}`);
      console.log(`- 擁有者: ${heroData.data.hero.owner}`);
      console.log(`- 等級: ${heroData.data.hero.level}`);
      console.log(`- 戰力: ${heroData.data.hero.power}`);
    } else {
      console.log('- 英雄 #1: 未找到');
    }

    // 查詢隊伍 #1
    const partyQuery = `
      {
        party(id: "0xe0272e1d76de1f789ce0996f3226bcf54a8c7735-1") {
          id
          tokenId
          owner
          totalPower
          memberCount
        }
      }
    `;

    const partyResponse = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: partyQuery }),
    });

    const partyData = await partyResponse.json();
    if (partyData.data?.party) {
      console.log('\n隊伍 #1:');
      console.log(`- ID: ${partyData.data.party.id}`);
      console.log(`- TokenID: ${partyData.data.party.tokenId}`);
      console.log(`- 擁有者: ${partyData.data.party.owner}`);
      console.log(`- 總戰力: ${partyData.data.party.totalPower}`);
      console.log(`- 成員數: ${partyData.data.party.memberCount}`);
    } else {
      console.log('- 隊伍 #1: 未找到');
    }

    // 4. 檢查最新的交易
    const recentQuery = `
      {
        recentHeroes: heroes(first: 3, orderBy: createdAt, orderDirection: desc) {
          id
          tokenId
          createdAt
        }
        recentParties: parties(first: 3, orderBy: createdAt, orderDirection: desc) {
          id
          tokenId
          createdAt
        }
      }
    `;

    const recentResponse = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: recentQuery }),
    });

    const recentData = await recentResponse.json();
    console.log('\n⏰ 最新實體:');
    if (recentData.data?.recentHeroes?.length > 0) {
      console.log('最新英雄:');
      recentData.data.recentHeroes.forEach(hero => {
        console.log(`- #${hero.tokenId} (${new Date(hero.createdAt * 1000).toLocaleString()})`);
      });
    }
    if (recentData.data?.recentParties?.length > 0) {
      console.log('最新隊伍:');
      recentData.data.recentParties.forEach(party => {
        console.log(`- #${party.tokenId} (${new Date(party.createdAt * 1000).toLocaleString()})`);
      });
    }

  } catch (error) {
    console.error('❌ 查詢錯誤:', error.message);
  }
}

// 執行檢查
checkSubgraphEntities();