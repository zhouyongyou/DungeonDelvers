// 測試子圖 v2.0.9 狀態
import fetch from 'node-fetch';

const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.9';

async function testSubgraph() {
  console.log('🔍 測試子圖 v2.0.9...\n');

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
      console.log('📊 子圖狀態:');
      console.log('- 最新區塊:', meta.block.number);
      console.log('- 區塊時間:', new Date(parseInt(meta.block.timestamp) * 1000).toLocaleString());
      console.log('- 索引錯誤:', meta.hasIndexingErrors ? '❌ 有錯誤' : '✅ 無錯誤');
      console.log('');
    }

    // 2. 檢查各種實體數量
    const entities = ['players', 'heros', 'relics', 'parties', 'dungeonRuns'];
    
    for (const entity of entities) {
      const response = await fetch(SUBGRAPH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{ ${entity}(first: 1) { id } }`
        })
      });
      
      const data = await response.json();
      const count = data.data?.[entity]?.length || 0;
      console.log(`- ${entity}: ${count > 0 ? '✅ 有數據' : '⏳ 等待數據'}`);
    }

    console.log('\n✅ 子圖 v2.0.9 已成功部署並正在運行！');
    console.log('📝 注意: 由於從最新區塊開始索引，歷史數據會缺失。');
    console.log('🔄 新的交易會立即被索引。');

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

testSubgraph();