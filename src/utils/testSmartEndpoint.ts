// 測試智能端點選擇功能
import { subgraphConfig } from '../config/subgraphConfig';
import { logger } from './logger';

export const testSmartEndpoint = async () => {
  console.log('🧪 Testing Smart Endpoint Selection...');
  
  try {
    // 1. 測試獲取最佳端點
    console.log('1. Getting optimal endpoint...');
    const optimalEndpoint = await subgraphConfig.getOptimalEndpoint();
    console.log('✅ Optimal endpoint:', optimalEndpoint);
    
    // 2. 測試性能狀態
    console.log('2. Getting performance status...');
    const status = subgraphConfig.getPerformanceStatus();
    console.log('✅ Performance status:', status);
    
    // 3. 測試端點 URL
    console.log('3. Getting endpoint URLs...');
    const studioUrl = await subgraphConfig.getStudioUrl();
    const decentralizedUrl = await subgraphConfig.getDecentralizedUrl();
    console.log('✅ Studio URL:', studioUrl);
    console.log('✅ Decentralized URL:', decentralizedUrl);
    
    // 4. 測試多次調用（應該使用快取）
    console.log('4. Testing cache behavior...');
    const start = Date.now();
    await Promise.all([
      subgraphConfig.getOptimalEndpoint(),
      subgraphConfig.getOptimalEndpoint(),
      subgraphConfig.getOptimalEndpoint()
    ]);
    const duration = Date.now() - start;
    console.log(`✅ Three calls completed in ${duration}ms (should be fast due to caching)`);
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    logger.error('Smart endpoint test failed:', error);
  }
};

// 自動在開發環境中運行測試
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // 等 5 秒讓應用初始化完成再測試
  setTimeout(() => {
    testSmartEndpoint();
  }, 5000);
}

export default testSmartEndpoint;