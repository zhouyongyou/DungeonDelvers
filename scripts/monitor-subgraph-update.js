// 監控子圖更新速度
import fetch from 'node-fetch';

const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.1.0';

async function monitorSubgraphUpdate() {
  console.log('🔄 監控子圖更新速度...\n');

  let lastBlockNumber = 0;
  let lastCheckTime = Date.now();

  const checkUpdate = async () => {
    try {
      const response = await fetch(SUBGRAPH_URL, {
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
              }
              parties(first: 5, orderBy: tokenId, orderDirection: desc) {
                id
                tokenId
                owner { id }
              }
            }
          `
        })
      });
      
      const data = await response.json();
      const currentBlock = data.data?._meta?.block?.number || 0;
      const parties = data.data?.parties || [];
      
      const now = Date.now();
      const timeDiff = (now - lastCheckTime) / 1000;
      
      if (currentBlock !== lastBlockNumber) {
        const blockDiff = currentBlock - lastBlockNumber;
        const blocksPerSecond = blockDiff / timeDiff;
        
        console.log(`📊 更新狀態 (${new Date().toLocaleTimeString()})`);
        console.log(`- 當前區塊: ${currentBlock} (+${blockDiff} 區塊)`);
        console.log(`- 更新速度: ${blocksPerSecond.toFixed(2)} 區塊/秒`);
        console.log(`- 隊伍數量: ${parties.length}`);
        
        if (parties.length > 0) {
          console.log('- 最新隊伍:');
          parties.forEach(party => {
            console.log(`  Party #${party.tokenId} - 擁有者: ${party.owner.id.slice(0, 10)}...`);
          });
        }
        
        lastBlockNumber = currentBlock;
        lastCheckTime = now;
      }
      
      // BSC 的平均出塊時間是 3 秒
      const currentTime = Math.floor(Date.now() / 1000);
      const blockTime = parseInt(data.data?._meta?.block?.timestamp || '0');
      const lagInSeconds = currentTime - blockTime;
      
      console.log(`- 延遲時間: ${Math.floor(lagInSeconds / 60)}分${lagInSeconds % 60}秒`);
      console.log('');
      
    } catch (error) {
      console.error('檢查失敗:', error.message);
    }
  };

  // 立即檢查一次
  await checkUpdate();
  
  // 每 5 秒檢查一次
  console.log('⏱️  每 5 秒檢查一次更新...\n');
  setInterval(checkUpdate, 5000);
}

monitorSubgraphUpdate();