// DungeonDelvers Subgraph Configuration
// V25 - Decentralized Network

import { subgraphConfig } from './subgraphConfig';

// 快取配置
 let cachedConfig: {
  STUDIO_URL: string;
  DECENTRALIZED_URL: string;
  ACTIVE_URL: string;
} | null = null;

// 初始化配置
export async function initializeSubgraphConfig() {
  const studioUrl = await subgraphConfig.getStudioUrl();
  const decentralizedUrl = await subgraphConfig.getDecentralizedUrl();
  const activeUrl = import.meta.env.PROD ? decentralizedUrl : studioUrl;
  
  cachedConfig = {
    STUDIO_URL: studioUrl,
    DECENTRALIZED_URL: decentralizedUrl,
    ACTIVE_URL: activeUrl
  };
}

// 為了向後兼容，保留 SUBGRAPH_CONFIG 對象
export const SUBGRAPH_CONFIG = {
  // Studio endpoint (for development/testing)
  get STUDIO_URL() {
    return cachedConfig?.STUDIO_URL || 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.2.0';
  },
  
  // Decentralized network endpoint (for production)
  get DECENTRALIZED_URL() {
    return cachedConfig?.DECENTRALIZED_URL || 'https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs';
  },
  
  // API key for decentralized network (if required)
  API_KEY: import.meta.env.VITE_GRAPH_API_KEY || '',
  
  // Current active endpoint
  get ACTIVE_URL() {
    return cachedConfig?.ACTIVE_URL || (import.meta.env.PROD 
      ? 'https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs'
      : 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.2.0');
  }
};

// Helper function to get query URL with API key
export function getSubgraphUrl(): string {
  const baseUrl = SUBGRAPH_CONFIG.ACTIVE_URL;
  const apiKey = SUBGRAPH_CONFIG.API_KEY;
  
  if (apiKey && SUBGRAPH_CONFIG.ACTIVE_URL.includes('gateway.thegraph.com')) {
    // Add API key as query parameter for decentralized network
    return `${baseUrl}?api-key=${apiKey}`;
  }
  
  return baseUrl;
}

// Export for backward compatibility
export const SUBGRAPH_URL = getSubgraphUrl();

// 重新載入配置
export async function reloadSubgraphConfig() {
  await subgraphConfig.reload();
  await initializeSubgraphConfig();
}