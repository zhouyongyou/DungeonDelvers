// src/config/graphql.ts
// 雙端點 GraphQL 配置 - Studio（免費）和去中心化（付費）
// 現在使用 configLoader 動態載入

import { subgraphConfig } from './subgraphConfig';

export enum GraphQLEndpointType {
  STUDIO = 'studio',
  DECENTRALIZED = 'decentralized'
}

// 功能與端點映射
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

// 快取端點配置
let cachedEndpoints: any = null;

// 初始化端點配置
export async function initializeGraphQLEndpoints() {
  const studioUrl = await subgraphConfig.getStudioUrl();
  const decentralizedUrl = await subgraphConfig.getDecentralizedUrl();
  
  cachedEndpoints = {
    [GraphQLEndpointType.STUDIO]: {
      url: studioUrl,
      description: '免費版本 - 有 15-30 分鐘延遲，Studio 額度有限',
      features: ['探索者', '數據瀏覽', '統計資料'],
      fallbackUrl: decentralizedUrl
    },
    [GraphQLEndpointType.DECENTRALIZED]: {
      url: decentralizedUrl,
      description: '付費版本 - 即時數據，主要使用',
      features: ['隊伍管理', '戰鬥', '市場', '獎勵', '即時統計'],
      fallbackUrl: studioUrl
    }
  };
}

// 端點配置（保持向後兼容）
export const GRAPHQL_ENDPOINTS = {
  get [GraphQLEndpointType.STUDIO]() {
    return cachedEndpoints?.[GraphQLEndpointType.STUDIO] || {
      url: import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL || 
         'https://api.studio.thegraph.com/query/115633/dungeon-delvers---bsc/v3.6.0',
      description: '免費版本 - 有 15-30 分鐘延遲，Studio 額度有限',
      features: ['探索者', '數據瀏覽', '統計資料'],
      fallbackUrl: import.meta.env.VITE_THE_GRAPH_DECENTRALIZED_API_URL || 
                   'https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs'
    };
  },
  get [GraphQLEndpointType.DECENTRALIZED]() {
    return cachedEndpoints?.[GraphQLEndpointType.DECENTRALIZED] || {
      url: import.meta.env.VITE_THE_GRAPH_DECENTRALIZED_API_URL || 
           'https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs',
      description: '付費版本 - 即時數據，主要使用',
      features: ['隊伍管理', '戰鬥', '市場', '獎勵', '即時統計'],
      fallbackUrl: import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL || 
                   'https://api.studio.thegraph.com/query/115633/dungeon-delvers---bsc/v3.6.0'
    };
  }
};

// 獲取對應功能的端點（現在是異步函數）
export async function getEndpointForFeature(feature: string): Promise<string> {
  const endpointType = FEATURE_ENDPOINT_MAP[feature] || GraphQLEndpointType.STUDIO;
  if (endpointType === GraphQLEndpointType.STUDIO) {
    return await subgraphConfig.getStudioUrl();
  } else {
    return await subgraphConfig.getDecentralizedUrl();
  }
}

// 同步版本（向後兼容，但建議使用異步版本）
export function getEndpointForFeatureSync(feature: string): string {
  const endpointType = FEATURE_ENDPOINT_MAP[feature] || GraphQLEndpointType.STUDIO;
  return GRAPHQL_ENDPOINTS[endpointType].url;
}

// 檢查是否使用 Studio 版本
export function isUsingStudioVersion(feature: string): boolean {
  return FEATURE_ENDPOINT_MAP[feature] === GraphQLEndpointType.STUDIO;
}

// 獲取端點描述（現在是異步函數）
export async function getEndpointInfo(feature: string): Promise<{
  type: GraphQLEndpointType;
  url: string;
  description: string;
  hasDelay: boolean;
}> {
  const endpointType = FEATURE_ENDPOINT_MAP[feature] || GraphQLEndpointType.STUDIO;
  const url = await getEndpointForFeature(feature);
  const endpoints = cachedEndpoints || await initializeGraphQLEndpoints();
  const endpoint = endpoints[endpointType];
  
  return {
    type: endpointType,
    url,
    description: endpoint.description,
    hasDelay: endpointType === GraphQLEndpointType.STUDIO
  };
}