// 檢查子圖同步狀態
const SUBGRAPH_URL = 'https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs';

async function checkSubgraphSync() {
  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
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
    
    const result = await response.json();
    console.log('📊 子圖同步狀態:', result.data._meta);
    
    const blockNumber = result.data._meta.block.number;
    console.log(`🔍 子圖當前區塊: ${blockNumber}`);
    console.log(`🎯 目標起始區塊: 55958852`);
    
    if (blockNumber >= 55958852) {
      console.log('✅ 子圖已同步到目標區塊');
    } else {
      console.log('⏳ 子圖還在同步中...');
    }
    
  } catch (error) {
    console.error('❌ 檢查子圖狀態失敗:', error);
  }
}

checkSubgraphSync();