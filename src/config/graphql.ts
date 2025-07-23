// src/config/graphql.ts
// 雙端點 GraphQL 配置 - Studio（免費）和去中心化（付費）

export enum GraphQLEndpointType {
  STUDIO = 'studio',
  DECENTRALIZED = 'decentralized'
}

// 功能與端點映射
export const FEATURE_ENDPOINT_MAP: Record<string, GraphQLEndpointType> = {
  // 暫時所有功能都使用 Studio 版本（穩定且免費）
  'explorer': GraphQLEndpointType.STUDIO,
  'browser': GraphQLEndpointType.STUDIO,
  'leaderboard': GraphQLEndpointType.STUDIO,
  'history': GraphQLEndpointType.STUDIO,
  'statistics': GraphQLEndpointType.STUDIO,
  'nft-gallery': GraphQLEndpointType.STUDIO,
  
  // 暫時也使用 Studio 版本，待去中心化配置完成後再切換
  'party-management': GraphQLEndpointType.STUDIO,
  'battle': GraphQLEndpointType.STUDIO,
  'expedition': GraphQLEndpointType.STUDIO,
  'market': GraphQLEndpointType.STUDIO,
  'rewards': GraphQLEndpointType.STUDIO,
  'real-time-stats': GraphQLEndpointType.STUDIO
};

// 端點配置
export const GRAPHQL_ENDPOINTS = {
  [GraphQLEndpointType.STUDIO]: {
    url: import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL || 
         'https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs',
    description: '免費版本 - 有 15-30 分鐘延遲',
    features: ['探索者', '數據瀏覽', '歷史記錄', '排行榜']
  },
  [GraphQLEndpointType.DECENTRALIZED]: {
    url: import.meta.env.VITE_THE_GRAPH_DECENTRALIZED_API_URL || 
         import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL || // fallback to studio if not configured
         'https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs',
    description: '付費版本 - 即時數據',
    features: ['隊伍管理', '戰鬥', '市場', '獎勵']
  }
};

// 獲取對應功能的端點
export function getEndpointForFeature(feature: string): string {
  const endpointType = FEATURE_ENDPOINT_MAP[feature] || GraphQLEndpointType.STUDIO;
  return GRAPHQL_ENDPOINTS[endpointType].url;
}

// 檢查是否使用 Studio 版本
export function isUsingStudioVersion(feature: string): boolean {
  return FEATURE_ENDPOINT_MAP[feature] === GraphQLEndpointType.STUDIO;
}

// 獲取端點描述
export function getEndpointInfo(feature: string): {
  type: GraphQLEndpointType;
  url: string;
  description: string;
  hasDelay: boolean;
} {
  const endpointType = FEATURE_ENDPOINT_MAP[feature] || GraphQLEndpointType.STUDIO;
  const endpoint = GRAPHQL_ENDPOINTS[endpointType];
  
  return {
    type: endpointType,
    url: endpoint.url,
    description: endpoint.description,
    hasDelay: endpointType === GraphQLEndpointType.STUDIO
  };
}