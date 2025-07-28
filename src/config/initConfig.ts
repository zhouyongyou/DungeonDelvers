// initConfig.ts - 全局配置初始化
// 在應用啟動時調用，確保所有配置都正確載入

import { initializeSubgraphUrls } from './env';
import { initializeSubgraphConfig } from './subgraph';
import { initializeGraphQLEndpoints } from './graphql';
import { logger } from '../utils/logger';

// 全局配置初始化函數
export async function initializeAppConfig() {
  logger.info('Initializing application configuration...');
  
  try {
    // 並行初始化所有配置
    await Promise.all([
      initializeSubgraphUrls(),
      initializeSubgraphConfig(),
      initializeGraphQLEndpoints()
    ]);
    
    logger.info('Application configuration initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application configuration:', error);
    // 即使初始化失敗，也不阻塞應用啟動，會使用默認值
  }
}

// 重新載入所有配置
export async function reloadAppConfig() {
  logger.info('Reloading application configuration...');
  await initializeAppConfig();
}