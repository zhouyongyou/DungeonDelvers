// subgraphConfig.ts - 集中式子圖配置系統
// 替代所有硬編碼的子圖 URL

import { configLoader } from './configLoader';
import { logger } from '../utils/logger';

export enum GraphQLEndpointType {
  STUDIO = 'studio',
  DECENTRALIZED = 'decentralized'
}

// 功能與端點映射（保持原有邏輯）
export const FEATURE_ENDPOINT_MAP: Record<string, GraphQLEndpointType> = {
  // 探索者頁面使用 Studio 版本（免費，可承受延遲）
  'explorer': GraphQLEndpointType.STUDIO,
  'browser': GraphQLEndpointType.STUDIO,
  'statistics': GraphQLEndpointType.STUDIO,
  
  // 核心遊戲功能使用去中心化版本（即時數據）
  'party-management': GraphQLEndpointType.DECENTRALIZED,
  'battle': GraphQLEndpointType.DECENTRALIZED,
  'expedition': GraphQLEndpointType.DECENTRALIZED,
  'market': GraphQLEndpointType.DECENTRALIZED,
  'rewards': GraphQLEndpointType.DECENTRALIZED,
  'real-time-stats': GraphQLEndpointType.DECENTRALIZED,
  
  // 用戶數據相關使用去中心化版本
  'leaderboard': GraphQLEndpointType.DECENTRALIZED,
  'history': GraphQLEndpointType.DECENTRALIZED,
  'nft-gallery': GraphQLEndpointType.DECENTRALIZED
};

// 子圖配置管理器
class SubgraphConfigManager {
  private config: {
    studio: string;
    decentralized: string;
  } | null = null;
  private hasLoggedConfig = false;
  
  // 端點性能快取
  private performanceCache = {
    studio: { responseTime: 0, lastCheck: 0, isHealthy: true },
    decentralized: { responseTime: 0, lastCheck: 0, isHealthy: true }
  };

  // 獲取配置（帶緩存）
  private async getConfig() {
    if (!this.config) {
      const appConfig = await configLoader.getConfig();
      this.config = {
        studio: appConfig.subgraph.studio,
        decentralized: appConfig.subgraph.decentralized
      };
      
      // 只記錄一次配置載入信息
      if (!this.hasLoggedConfig && import.meta.env.VITE_ENABLE_DEBUG === 'true') {
        logger.info('Subgraph config loaded:', this.config);
        this.hasLoggedConfig = true;
      }
    }
    return this.config;
  }

  // 獲取端點配置
  async getEndpoints() {
    const config = await this.getConfig();
    
    return {
      [GraphQLEndpointType.STUDIO]: {
        url: config.studio,
        description: '免費版本 - 有 15-30 分鐘延遲，Studio 額度有限',
        features: ['探索者', '數據瀏覽', '統計資料'],
        fallbackUrl: config.decentralized
      },
      [GraphQLEndpointType.DECENTRALIZED]: {
        url: config.decentralized,
        description: '付費版本 - 即時數據，主要使用',
        features: ['隊伍管理', '戰鬥', '市場', '獎勵', '即時統計'],
        fallbackUrl: config.studio
      }
    };
  }

  // 獲取對應功能的端點
  async getEndpointForFeature(feature: string): Promise<string> {
    const endpointType = FEATURE_ENDPOINT_MAP[feature] || GraphQLEndpointType.STUDIO;
    const endpoints = await this.getEndpoints();
    return endpoints[endpointType].url;
  }

  // 檢查是否使用 Studio 版本
  isUsingStudioVersion(feature: string): boolean {
    return FEATURE_ENDPOINT_MAP[feature] === GraphQLEndpointType.STUDIO;
  }

  // 獲取端點描述
  async getEndpointInfo(feature: string): Promise<{
    type: GraphQLEndpointType;
    url: string;
    description: string;
    hasDelay: boolean;
  }> {
    const endpointType = FEATURE_ENDPOINT_MAP[feature] || GraphQLEndpointType.STUDIO;
    const endpoints = await this.getEndpoints();
    const endpoint = endpoints[endpointType];
    
    return {
      type: endpointType,
      url: endpoint.url,
      description: endpoint.description,
      hasDelay: endpointType === GraphQLEndpointType.STUDIO
    };
  }

  // 獲取主要子圖 URL（用於環境變數兼容）
  async getMainSubgraphUrl(): Promise<string> {
    const config = await this.getConfig();
    // 在生產環境使用去中心化版本，否則使用 Studio
    return import.meta.env.PROD ? config.decentralized : config.studio;
  }

  // 獲取 Studio URL
  async getStudioUrl(): Promise<string> {
    const config = await this.getConfig();
    return config.studio;
  }

  // 獲取去中心化 URL
  async getDecentralizedUrl(): Promise<string> {
    const config = await this.getConfig();
    return config.decentralized;
  }

  // 重新載入配置
  async reload() {
    this.config = null;
    await configLoader.reload();
    await this.getConfig();
  }

  // 新增：獲取最佳端點（智能選擇）
  async getOptimalEndpoint(feature: string = 'default'): Promise<string> {
    const checkInterval = 2 * 60 * 1000; // 2分鐘檢查一次
    const now = Date.now();
    
    // 檢查是否需要更新性能指標
    if (now - this.performanceCache.studio.lastCheck > checkInterval) {
      await this.updatePerformanceMetrics();
    }
    
    const studio = this.performanceCache.studio;
    const decentralized = this.performanceCache.decentralized;
    
    // 健康狀況優先：如果一個不健康，選擇健康的
    if (!studio.isHealthy && decentralized.isHealthy) {
      logger.info('Using decentralized endpoint (studio unhealthy)');
      return await this.getDecentralizedUrl();
    }
    if (!decentralized.isHealthy && studio.isHealthy) {
      logger.info('Using studio endpoint (decentralized unhealthy)');
      return await this.getStudioUrl();
    }
    
    // 都健康的話選擇更快的
    const chosenEndpoint = studio.responseTime <= decentralized.responseTime ? 'studio' : 'decentralized';
    
    logger.info(`Optimal endpoint selected: ${chosenEndpoint}`, {
      studioTime: `${studio.responseTime}ms`,
      decentralizedTime: `${decentralized.responseTime}ms`
    });
    
    return chosenEndpoint === 'studio' ? 
      await this.getStudioUrl() : 
      await this.getDecentralizedUrl();
  }

  // 更新端點性能指標
  private async updatePerformanceMetrics() {
    try {
      const studioUrl = await this.getStudioUrl();
      const decentralizedUrl = await this.getDecentralizedUrl();
      
      const [studioResult, decentralizedResult] = await Promise.allSettled([
        this.pingEndpoint(studioUrl),
        this.pingEndpoint(decentralizedUrl)
      ]);
      
      // 更新 Studio 指標
      this.performanceCache.studio = {
        responseTime: studioResult.status === 'fulfilled' ? studioResult.value : 9999,
        isHealthy: studioResult.status === 'fulfilled',
        lastCheck: Date.now()
      };
      
      // 更新 Decentralized 指標
      this.performanceCache.decentralized = {
        responseTime: decentralizedResult.status === 'fulfilled' ? decentralizedResult.value : 9999,
        isHealthy: decentralizedResult.status === 'fulfilled',
        lastCheck: Date.now()
      };
      
      logger.debug('Endpoint performance updated:', {
        studio: `${this.performanceCache.studio.responseTime}ms (${this.performanceCache.studio.isHealthy ? '健康' : '異常'})`,
        decentralized: `${this.performanceCache.decentralized.responseTime}ms (${this.performanceCache.decentralized.isHealthy ? '健康' : '異常'})`
      });
      
    } catch (error) {
      logger.warn('Failed to update performance metrics:', error);
    }
  }

  // 端點健康檢查（包含資料可用性）
  private async pingEndpoint(url: string): Promise<number> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超時
      
      // 使用更全面的查詢來檢查資料可用性
      const testQuery = `{
        _meta { 
          block { number } 
          hasIndexingErrors
        }
        players(first: 1) { id }
      }`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ query: testQuery }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.errors && data.errors.length > 0) {
        throw new Error(`GraphQL Error: ${data.errors[0].message}`);
      }
      
      // 檢查是否有索引錯誤
      if (data.data?._meta?.hasIndexingErrors) {
        logger.warn(`Endpoint has indexing errors: ${url}`);
        return 8000; // 有錯誤但可用，給較高延遲
      }
      
      // 檢查資料可用性和新鮮度
      const hasData = data.data?.players && Array.isArray(data.data.players);
      const blockNumber = data.data?._meta?.block?.number || 0;
      const responseTime = Date.now() - start;
      
      if (!hasData || blockNumber === 0) {
        logger.warn(`Endpoint has no data: ${url} (block: ${blockNumber})`);
        return 9999; // 沒資料視為不可用
      }
      
      // 檢查資料是否太舊（如果區塊號明顯落後）
      // 這裡可以根據需要調整閾值
      const endpointType = url.includes('studio') ? 'studio' : 'decentralized';
      if (endpointType === 'decentralized' && this.isBlockTooOld(blockNumber)) {
        logger.warn(`Decentralized endpoint data too old: ${url} (block: ${blockNumber})`);
        return responseTime + 8000; // 資料太舊，大幅增加延遲
      }
      
      return responseTime;
    } catch (error) {
      logger.warn(`Endpoint ping failed: ${url}`, error);
      return 9999; // 返回很高的延遲表示不可用
    }
  }

  // 檢查區塊是否太舊（用於判斷重新部署情況）
  private isBlockTooOld(blockNumber: number): boolean {
    // 可以通過比較 Studio 和 Decentralized 的區塊高度
    // 或者設定一個絕對閾值
    const studioBlock = this.getLastKnownBlock('studio');
    const decentralizedBlock = this.getLastKnownBlock('decentralized');
    
    // 如果去中心化版本的區塊明顯低於 Studio，可能是重新部署
    if (studioBlock > 0 && blockNumber < studioBlock - 1000) {
      return true; // 落後超過 1000 個區塊（約 50 分鐘）
    }
    
    return false;
  }

  // 獲取已知的最後區塊號
  private getLastKnownBlock(type: 'studio' | 'decentralized'): number {
    // 這裡可以實施更複雜的邏輯來追蹤歷史區塊高度
    // 暫時返回 0，表示沒有歷史數據
    return 0;
  }

  // 獲取端點性能狀態（用於監控）
  getPerformanceStatus() {
    return {
      studio: {
        ...this.performanceCache.studio,
        status: this.performanceCache.studio.isHealthy ? 'healthy' : 'unhealthy'
      },
      decentralized: {
        ...this.performanceCache.decentralized,
        status: this.performanceCache.decentralized.isHealthy ? 'healthy' : 'unhealthy'
      },
      lastUpdated: Math.max(
        this.performanceCache.studio.lastCheck,
        this.performanceCache.decentralized.lastCheck
      )
    };
  }
}

// 導出單例實例
export const subgraphConfig = new SubgraphConfigManager();

// 導出便捷函數（保持向後兼容）
export async function getEndpointForFeature(feature: string): Promise<string> {
  return subgraphConfig.getEndpointForFeature(feature);
}

export function isUsingStudioVersion(feature: string): boolean {
  return subgraphConfig.isUsingStudioVersion(feature);
}

export async function getEndpointInfo(feature: string) {
  return subgraphConfig.getEndpointInfo(feature);
}

// 環境變數兼容層（用於替換 env.ts 中的硬編碼）
export async function getTheGraphNetworkUrl(): Promise<string> {
  return subgraphConfig.getMainSubgraphUrl();
}

export async function getTheGraphStudioUrl(): Promise<string> {
  return subgraphConfig.getStudioUrl();
}

export async function getTheGraphDecentralizedUrl(): Promise<string> {
  return subgraphConfig.getDecentralizedUrl();
}