// 檢查子圖資料新鮮度
import { subgraphConfig } from '../config/subgraphConfig';
import { logger } from './logger';

interface DataFreshnessResult {
  endpoint: string;
  blockNumber: number;
  blockTimestamp?: number;
  lagBehindLatest: number;
  lastIndexedAgo: string;
  hasRecentData: boolean;
}

export const checkDataFreshness = async (): Promise<DataFreshnessResult[]> => {
  console.log('🔍 Checking data freshness...');
  
  try {
    const studioUrl = await subgraphConfig.getStudioUrl();
    const decentralizedUrl = await subgraphConfig.getDecentralizedUrl();
    
    // 獲取最新區塊高度（從 RPC）
    const latestBlock = await getLatestBlockFromRPC();
    
    // 檢查兩個端點的區塊高度
    const [studioResult, networkResult] = await Promise.all([
      checkEndpointFreshness(studioUrl, 'Studio', latestBlock),
      checkEndpointFreshness(decentralizedUrl, 'Network', latestBlock)
    ]);
    
    const results = [studioResult, networkResult];
    
    // 顯示結果
    console.log('\n📊 Data Freshness Report:');
    results.forEach(result => {
      const icon = result.hasRecentData ? '🟢' : '🔴';
      console.log(`${icon} ${result.endpoint}:`);
      console.log(`   Block: ${result.blockNumber} (lag: ${result.lagBehindLatest} blocks)`);
      console.log(`   Last indexed: ${result.lastIndexedAgo}`);
    });
    
    return results;
    
  } catch (error) {
    console.error('❌ Failed to check data freshness:', error);
    logger.error('Data freshness check failed:', error);
    return [];
  }
};

async function getLatestBlockFromRPC(): Promise<number> {
  try {
    const response = await fetch('https://bsc-dataseed.binance.org/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
    });
    
    const data = await response.json();
    return parseInt(data.result, 16);
  } catch (error) {
    console.warn('Failed to get latest block from RPC, using fallback');
    return 0; // fallback
  }
}

async function checkEndpointFreshness(
  url: string, 
  name: string, 
  latestBlock: number
): Promise<DataFreshnessResult> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          _meta {
            block {
              number
              timestamp
            }
            hasIndexingErrors
          }
        }`
      }),
      signal: AbortSignal.timeout(10000)
    });
    
    const data = await response.json();
    const meta = data.data?._meta;
    const blockNumber = meta?.block?.number || 0;
    const blockTimestamp = meta?.block?.timestamp || 0;
    
    const lagBehindLatest = latestBlock > 0 ? latestBlock - blockNumber : 0;
    const now = Math.floor(Date.now() / 1000);
    const secondsAgo = blockTimestamp > 0 ? now - blockTimestamp : 0;
    
    const lastIndexedAgo = secondsAgo < 60 ? 
      `${secondsAgo}s ago` :
      secondsAgo < 3600 ?
      `${Math.floor(secondsAgo / 60)}m ago` :
      `${Math.floor(secondsAgo / 3600)}h ago`;
    
    // 認為資料是「新鮮的」如果：
    // 1. 落後少於 100 個區塊 (約 5 分鐘)
    // 2. 或者最後索引時間少於 30 分鐘前
    const hasRecentData = lagBehindLatest < 100 || secondsAgo < 1800;
    
    return {
      endpoint: name,
      blockNumber,
      blockTimestamp,
      lagBehindLatest,
      lastIndexedAgo,
      hasRecentData
    };
    
  } catch (error) {
    console.warn(`Failed to check ${name} freshness:`, error);
    return {
      endpoint: name,
      blockNumber: 0,
      lagBehindLatest: 9999,
      lastIndexedAgo: 'Unknown',
      hasRecentData: false
    };
  }
}

// 在開發環境自動執行
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // 等待應用初始化完成
  setTimeout(async () => {
    await checkDataFreshness();
  }, 10000);
}

export default checkDataFreshness;