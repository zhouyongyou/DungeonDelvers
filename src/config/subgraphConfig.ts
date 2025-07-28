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

  // 獲取配置（帶緩存）
  private async getConfig() {
    if (!this.config) {
      const appConfig = await configLoader.getConfig();
      this.config = {
        studio: appConfig.subgraph.studio,
        decentralized: appConfig.subgraph.decentralized
      };
      logger.info('Subgraph config loaded:', this.config);
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