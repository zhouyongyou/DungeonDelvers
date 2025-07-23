// DungeonDelvers Subgraph Configuration
// V15 - Decentralized Network

export const SUBGRAPH_CONFIG = {
  // Studio endpoint (for development/testing)
  STUDIO_URL: 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.0.9',
  
  // Decentralized network endpoint (for production)
  DECENTRALIZED_URL: 'https://gateway.thegraph.com/api/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs',
  
  // API key for decentralized network (if required)
  API_KEY: import.meta.env.VITE_GRAPH_API_KEY || '',
  
  // Current active endpoint
  ACTIVE_URL: import.meta.env.PROD 
    ? 'https://gateway.thegraph.com/api/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs'
    : 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.0.9'
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