// 測試重新部署場景的端點選擇
import { subgraphConfig } from '../config/subgraphConfig';
import { logger } from './logger';

export const testRedeployScenario = async () => {
  console.log('🔄 Testing Redeploy Scenario...');
  
  try {
    // 1. 檢查當前端點狀態
    console.log('1. Current endpoint status:');
    const currentOptimal = await subgraphConfig.getOptimalEndpoint();
    const status = subgraphConfig.getPerformanceStatus();
    
    console.log(`   Current optimal: ${currentOptimal.includes('studio') ? 'Studio' : 'Network'}`);
    console.log(`   Studio: ${status.studio.responseTime}ms (${status.studio.status})`);
    console.log(`   Network: ${status.decentralized.responseTime}ms (${status.decentralized.status})`);
    
    // 2. 模擬檢查資料可用性
    console.log('\n2. Data availability check:');
    const studioUrl = await subgraphConfig.getStudioUrl();
    const networkUrl = await subgraphConfig.getDecentralizedUrl();
    
    const [studioData, networkData] = await Promise.all([
      checkEndpointData(studioUrl, 'Studio'),
      checkEndpointData(networkUrl, 'Network')
    ]);
    
    // 3. 分析重新部署的情況
    console.log('\n3. Redeploy scenario analysis:');
    
    if (studioData.hasData && !networkData.hasData) {
      console.log('🟨 Scenario: Network endpoint has no data (likely redeploying)');
      console.log('   → System should prefer Studio endpoint');
    } else if (!studioData.hasData && networkData.hasData) {
      console.log('🟨 Scenario: Studio endpoint has no data');
      console.log('   → System should prefer Network endpoint');
    } else if (studioData.hasData && networkData.hasData) {
      const blockDiff = Math.abs(studioData.blockNumber - networkData.blockNumber);
      if (blockDiff > 100) {
        console.log(`🟨 Scenario: Block height difference (${blockDiff} blocks)`);
        console.log('   → One endpoint may have stale data');
      } else {
        console.log('🟢 Scenario: Both endpoints have recent data');
        console.log('   → System can choose based on speed');
      }
    } else {
      console.log('🔴 Scenario: Neither endpoint has data');
      console.log('   → System should fall back to default');
    }
    
    // 4. 建議處理策略
    console.log('\n4. Handling strategy:');
    console.log('   • No data endpoint: responseTime = 9999ms (avoid)');
    console.log('   • Stale data endpoint: responseTime + 8000ms (penalize)');
    console.log('   • Fresh data endpoint: actual responseTime (prefer)');
    
  } catch (error) {
    console.error('❌ Redeploy scenario test failed:', error);
    logger.error('Redeploy scenario test failed:', error);
  }
};

interface EndpointData {
  hasData: boolean;
  blockNumber: number;
  playerCount: number;
  error?: string;
}

async function checkEndpointData(url: string, name: string): Promise<EndpointData> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          _meta { 
            block { number }
          }
          players(first: 5) { 
            id 
          }
        }`
      }),
      signal: AbortSignal.timeout(8000)
    });
    
    const data = await response.json();
    
    if (data.errors) {
      console.log(`   ${name}: ❌ GraphQL errors: ${data.errors[0]?.message}`);
      return { hasData: false, blockNumber: 0, playerCount: 0, error: data.errors[0]?.message };
    }
    
    const blockNumber = data.data?._meta?.block?.number || 0;
    const players = data.data?.players || [];
    const hasData = players.length > 0;
    
    console.log(`   ${name}: ${hasData ? '✅' : '❌'} Block ${blockNumber}, ${players.length} players`);
    
    return {
      hasData,
      blockNumber,
      playerCount: players.length
    };
    
  } catch (error) {
    console.log(`   ${name}: ❌ Connection failed: ${error}`);
    return { hasData: false, blockNumber: 0, playerCount: 0, error: String(error) };
  }
}

// 開發環境手動觸發測試
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // 在 window 上暴露測試函數，方便手動調用
  (window as any).testRedeployScenario = testRedeployScenario;
  
  console.log('💡 Tip: Run testRedeployScenario() in console to test redeploy handling');
}

export default testRedeployScenario;