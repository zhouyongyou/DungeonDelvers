import fetch from 'node-fetch';

const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.0.2';
const TARGET_BLOCK = 54557721; // DungeonMasterV5 部署區塊
const CHECK_INTERVAL = 30000; // 每30秒檢查一次

async function checkSubgraphStatus() {
  const query = `
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
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    
    if (data.data && data.data._meta) {
      const currentBlock = data.data._meta.block.number;
      const hasErrors = data.data._meta.hasIndexingErrors;
      const progress = ((currentBlock / TARGET_BLOCK) * 100).toFixed(2);
      
      console.clear();
      console.log('🔍 DungeonDelvers 子圖同步進度監控');
      console.log('=====================================');
      console.log(`📊 目標區塊: ${TARGET_BLOCK.toLocaleString()}`);
      console.log(`📍 當前區塊: ${currentBlock.toLocaleString()}`);
      console.log(`📈 同步進度: ${progress}%`);
      console.log(`⚠️  索引錯誤: ${hasErrors ? '是' : '否'}`);
      console.log(`🕐 更新時間: ${new Date().toLocaleTimeString()}`);
      
      if (currentBlock >= TARGET_BLOCK) {
        console.log('\n✅ 子圖已同步到目標區塊！可以開始測試了！');
        
        // 查詢一些基本數據
        const dataQuery = `
          {
            parties(first: 5) {
              id
              totalPower
            }
            expeditions(first: 5) {
              id
              dungeonName
              success
            }
          }
        `;
        
        const dataResponse = await fetch(SUBGRAPH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: dataQuery }),
        });
        
        const subgraphData = await dataResponse.json();
        console.log('\n📊 子圖數據摘要:');
        console.log(`- 隊伍數量: ${subgraphData.data?.parties?.length || 0}`);
        console.log(`- 探險記錄: ${subgraphData.data?.expeditions?.length || 0}`);
        
        return true; // 同步完成
      }
      
      // 估計剩餘時間（假設每秒約100個區塊）
      const blocksRemaining = TARGET_BLOCK - currentBlock;
      const estimatedSeconds = blocksRemaining / 100;
      const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
      
      console.log(`\n⏱️  預估剩餘時間: ${estimatedMinutes} 分鐘`);
      console.log('\n按 Ctrl+C 停止監控');
      
    } else {
      console.error('無法獲取子圖狀態');
    }
  } catch (error) {
    console.error('查詢錯誤:', error.message);
  }
  
  return false; // 尚未完成
}

// 開始監控
console.log('🚀 開始監控子圖同步進度...\n');

const monitor = async () => {
  const isComplete = await checkSubgraphStatus();
  
  if (!isComplete) {
    setTimeout(monitor, CHECK_INTERVAL);
  } else {
    console.log('\n🎉 監控完成！');
    process.exit(0);
  }
};

monitor();

// 處理 Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 監控已停止');
  process.exit(0);
});