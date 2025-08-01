// 測試排行榜查詢
import { THE_GRAPH_API_URL } from '../config/graphConfig';

const TEST_QUERIES = {
  playerStats: `
    query TestPlayerStats {
      playerStats(first: 5) {
        id
        totalRewardsEarned
        successfulExpeditions
      }
    }
  `,
  
  playerProfiles: `
    query TestPlayerProfiles {
      playerProfiles(first: 5) {
        id
        level
        successfulExpeditions
        owner {
          id
        }
      }
    }
  `,
  
  vips: `
    query TestVips {
      vips(first: 5) {
        id
        level
        stakedAmount
        owner {
          id
        }
      }
    }
  `
};

export async function testAllQueries() {
  if (!THE_GRAPH_API_URL) {
    console.error('❌ 子圖 API URL 未配置');
    return;
  }

  console.log('🔍 測試所有排行榜查詢...');
  console.log('📍 API URL:', THE_GRAPH_API_URL);

  for (const [name, query] of Object.entries(TEST_QUERIES)) {
    try {
      console.log(`\n🧪 測試 ${name} 查詢...`);
      
      const response = await fetch(THE_GRAPH_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        console.error(`❌ ${name} HTTP 錯誤:`, response.status, response.statusText);
        continue;
      }

      const result = await response.json();
      
      if (result.errors) {
        console.error(`❌ ${name} GraphQL 錯誤:`, result.errors);
      } else {
        const dataKeys = Object.keys(result.data || {});
        const firstKey = dataKeys[0];
        const dataCount = result.data?.[firstKey]?.length || 0;
        
        console.log(`✅ ${name} 查詢成功:`);
        console.log(`   - 返回欄位: ${dataKeys.join(', ')}`);
        console.log(`   - 數據條數: ${dataCount}`);
        
        if (dataCount > 0) {
          console.log(`   - 第一條數據:`, result.data[firstKey][0]);
        }
      }
    } catch (error) {
      console.error(`❌ ${name} 查詢異常:`, error);
    }
  }
}

// 在開發環境自動運行測試
if (import.meta.env.DEV) {
  setTimeout(() => {
    testAllQueries();
  }, 2000);
}