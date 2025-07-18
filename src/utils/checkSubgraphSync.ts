// 檢查子圖同步狀態的工具
export async function checkSubgraphSync() {
  const SUBGRAPH_URL = import.meta.env.VITE_THE_GRAPH_API_URL;
  
  try {
    // 查詢最新的區塊
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          {
            _meta {
              block {
                number
                hash
                timestamp
              }
              deployment
              hasIndexingErrors
            }
          }
        `
      })
    });
    
    const data = await response.json();
    
    if (data.data?._meta) {
      const meta = data.data._meta;
      const currentTime = Math.floor(Date.now() / 1000);
      const blockTime = parseInt(meta.block.timestamp);
      const timeDiff = currentTime - blockTime;
      
      console.log('📊 子圖同步狀態:');
      console.log('- 最新區塊:', meta.block.number);
      console.log('- 區塊時間:', new Date(blockTime * 1000).toLocaleString());
      console.log('- 延遲時間:', Math.floor(timeDiff / 60), '分鐘');
      console.log('- 索引錯誤:', meta.hasIndexingErrors ? '❌ 有錯誤' : '✅ 無錯誤');
      console.log('- 部署 ID:', meta.deployment);
      
      // 檢查是否有 Party 數據
      const partyResponse = await fetch(SUBGRAPH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{ parties(first: 1) { id } }`
        })
      });
      
      const partyData = await partyResponse.json();
      const hasParties = partyData.data?.parties?.length > 0;
      console.log('- Party 數據:', hasParties ? '✅ 有數據' : '❌ 無數據');
      
      return {
        blockNumber: meta.block.number,
        timeLag: timeDiff,
        hasErrors: meta.hasIndexingErrors,
        hasPartyData: hasParties
      };
    }
  } catch (error) {
    console.error('檢查子圖狀態失敗:', error);
  }
  
  return null;
}

// 在瀏覽器控制台執行
(window as any).checkSubgraphSync = checkSubgraphSync;