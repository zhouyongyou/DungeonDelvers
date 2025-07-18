// 詳細檢查子圖 v2.0.9 索引情況
import fetch from 'node-fetch';

const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.1.0';

async function checkSubgraphDetails() {
  console.log('🔍 檢查子圖 v2.1.0 詳細索引情況...\n');

  try {
    // 1. 檢查元數據
    const metaResponse = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          {
            _meta {
              block {
                number
                timestamp
                hash
              }
              deployment
              hasIndexingErrors
            }
          }
        `
      })
    });
    
    const metaData = await metaResponse.json();
    
    if (metaData.data?._meta) {
      const meta = metaData.data._meta;
      const currentTime = Math.floor(Date.now() / 1000);
      const blockTime = parseInt(meta.block.timestamp);
      const timeDiff = currentTime - blockTime;
      
      console.log('📊 子圖狀態:');
      console.log('- 部署版本: v2.1.0');
      console.log('- 起始區塊: 54440794');
      console.log('- 最新索引區塊:', meta.block.number);
      console.log('- 區塊進度:', meta.block.number - 54440794, '個區塊');
      console.log('- 區塊時間:', new Date(blockTime * 1000).toLocaleString());
      console.log('- 延遲時間:', Math.floor(timeDiff / 60), '分鐘', timeDiff % 60, '秒');
      console.log('- 索引錯誤:', meta.hasIndexingErrors ? '❌ 有錯誤' : '✅ 無錯誤');
      console.log('');
    }

    // 2. 詳細檢查各種實體
    console.log('📈 實體數據統計:');
    
    const queries = [
      { entity: 'players', query: '{ players(first: 1000) { id } }' },
      { entity: 'heros', query: '{ heros(first: 1000) { id tokenId rarity owner { id } } }' },
      { entity: 'relics', query: '{ relics(first: 1000) { id tokenId rarity owner { id } } }' },
      { entity: 'parties', query: '{ parties(first: 1000) { id tokenId owner { id } } }' },
      { entity: 'dungeonRuns', query: '{ dungeonRuns(first: 1000) { id } }' },
      { entity: 'heroUpgrades', query: '{ heroUpgrades(first: 1000) { id } }' },
      { entity: 'relicUpgrades', query: '{ relicUpgrades(first: 1000) { id } }' }
    ];
    
    for (const { entity, query } of queries) {
      const response = await fetch(SUBGRAPH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      const data = await response.json();
      const items = data.data?.[entity] || [];
      const count = items.length;
      
      if (count > 0) {
        console.log(`- ${entity}: ✅ ${count} 筆數據`);
        
        // 顯示一些詳細信息
        if (entity === 'heros' && items.length > 0) {
          const rarityCount = {};
          items.forEach(hero => {
            const rarity = hero.rarity || 0;
            rarityCount[rarity] = (rarityCount[rarity] || 0) + 1;
          });
          console.log(`  稀有度分布:`, rarityCount);
        }
        
        if (entity === 'relics' && items.length > 0) {
          const rarityCount = {};
          items.forEach(relic => {
            const rarity = relic.rarity || 0;
            rarityCount[rarity] = (rarityCount[rarity] || 0) + 1;
          });
          console.log(`  稀有度分布:`, rarityCount);
        }
      } else {
        console.log(`- ${entity}: ⏳ 尚無數據`);
      }
    }

    // 3. 檢查最近的事件
    console.log('\n📅 最近的活動:');
    
    // 檢查最新的英雄
    const heroResponse = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          {
            heros(first: 5, orderBy: tokenId, orderDirection: desc) {
              tokenId
              rarity
              power
              owner { id }
            }
          }
        `
      })
    });
    
    const heroData = await heroResponse.json();
    const latestHeroes = heroData.data?.heros || [];
    
    if (latestHeroes.length > 0) {
      console.log('最新鑄造的英雄:');
      latestHeroes.forEach(hero => {
        console.log(`  - Hero #${hero.tokenId}: ${hero.rarity}★, 戰力 ${hero.power}, 擁有者 ${hero.owner.id.slice(0, 10)}...`);
      });
    }

    console.log('\n✅ 檢查完成！');

  } catch (error) {
    console.error('❌ 檢查失敗:', error.message);
  }
}

checkSubgraphDetails();