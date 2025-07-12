// src/utils/marketDataIntegrator.ts
// NFT市場資料整合工具

export interface MarketData {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  lastUpdated?: string;
  source: 'okx' | 'element' | 'opensea' | 'blur' | 'metadata_server' | 'graph';
}

export interface PartyMarketData extends MarketData {
  totalPower?: string;
  totalCapacity?: string;
  partyRarity?: string;
  provisionsRemaining?: string;
  cooldownEndsAt?: string;
  unclaimedRewards?: string;
  fatigueLevel?: string;
  heroIds?: string[];
  relicIds?: string[];
}

// NFT市場API配置 - BSC鏈優先
const MARKET_APIS = {
  // BSC鏈主要市場
  okx: 'https://www.okx.com/api/v5/nft',
  element: 'https://api.element.market',
  // 其他市場
  opensea: 'https://api.opensea.io/api/v2',
  blur: 'https://api.blur.io',
  metadataServer: import.meta.env.VITE_METADATA_SERVER_URL || 'https://dungeon-delvers-metadata-server.onrender.com',
};

// 合約地址配置（供未來使用）
export const CONTRACTS = {
  hero: import.meta.env.VITE_MAINNET_HERO_ADDRESS || '0xE22C45AcC80BFAEDa4F2Ec17352301a37Fbc0741',
  relic: import.meta.env.VITE_MAINNET_RELIC_ADDRESS || '0x5b03165dBD05c82480b69b94F59d0FE942ED9A36',
  party: import.meta.env.VITE_MAINNET_PARTY_ADDRESS || '0xaE13E9FE44aB58D6d43014A32Cbd565bAEf01C01',
  vip: import.meta.env.VITE_MAINNET_VIP_ADDRESS || '0x30a5374bcc612698B4eF1Df1348a21F18cbb3c9D',
};

/**
 * 從OKX NFT市場獲取資料
 */
export async function fetchFromOKX(type: string, tokenId: string, contractAddress: string): Promise<MarketData | null> {
  try {
    // OKX NFT API - 需要根據實際API文檔調整
    const url = `${MARKET_APIS.okx}/collection/${contractAddress}/token/${tokenId}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DungeonDelvers-Frontend/1.0.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OKX API error: ${response.status}`);
    }

    const data = await response.json();
    const nft = data?.data?.[0];

    if (!nft) {
      return null;
    }

    return {
      name: nft.name || `${type.charAt(0).toUpperCase() + type.slice(1)} #${tokenId}`,
      description: nft.description || 'Dungeon Delvers NFT',
      image: nft.image_url || nft.image,
      attributes: nft.attributes?.map((attr: any) => ({
        trait_type: attr.trait_type,
        value: attr.value,
      })) || [],
      lastUpdated: new Date().toISOString(),
      source: 'okx' as const,
    };
  } catch (error) {
    console.warn(`無法從OKX獲取 ${type} #${tokenId}:`, error);
    return null;
  }
}

/**
 * 從Element市場獲取資料
 */
export async function fetchFromElement(type: string, tokenId: string, contractAddress: string): Promise<MarketData | null> {
  try {
    // Element API - 需要根據實際API文檔調整
    const url = `${MARKET_APIS.element}/api/v1/nft/${contractAddress}/${tokenId}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DungeonDelvers-Frontend/1.0.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Element API error: ${response.status}`);
    }

    const data = await response.json();
    const nft = data?.nft || data?.data;

    if (!nft) {
      return null;
    }

    return {
      name: nft.name || `${type.charAt(0).toUpperCase() + type.slice(1)} #${tokenId}`,
      description: nft.description || 'Dungeon Delvers NFT',
      image: nft.image_url || nft.image,
      attributes: nft.attributes?.map((attr: any) => ({
        trait_type: attr.trait_type,
        value: attr.value,
      })) || [],
      lastUpdated: new Date().toISOString(),
      source: 'element' as const,
    };
  } catch (error) {
    console.warn(`無法從Element獲取 ${type} #${tokenId}:`, error);
    return null;
  }
}

/**
 * 從OpenSea獲取NFT資料
 */
export async function fetchFromOpenSea(type: string, tokenId: string, contractAddress: string): Promise<MarketData | null> {
  try {
    const url = `${MARKET_APIS.opensea}/chain/base/contract/${contractAddress}/nfts/${tokenId}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DungeonDelvers-Frontend/1.0.0',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenSea API error: ${response.status}`);
    }

    const data = await response.json();
    const nft = data?.nft;

    if (!nft) {
      return null;
    }

    return {
      name: nft.name,
      description: nft.description,
      image: nft.image_url,
      attributes: nft.traits?.map((trait: any) => ({
        trait_type: trait.trait_type,
        value: trait.value,
      })) || [],
      lastUpdated: new Date().toISOString(),
      source: 'opensea' as const,
    };
  } catch (error) {
    console.warn(`無法從OpenSea獲取 ${type} #${tokenId}:`, error);
    return null;
  }
}

/**
 * 從我們的metadata server獲取資料
 */
export async function fetchFromMetadataServer(type: string, tokenId: string): Promise<MarketData | null> {
  try {
    const url = `${MARKET_APIS.metadataServer}/api/${type}/${tokenId}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Metadata server error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      name: data.name,
      description: data.description,
      image: data.image,
      attributes: data.attributes || [],
      lastUpdated: data.lastUpdated || new Date().toISOString(),
      source: 'metadata_server' as const,
    };
  } catch (error) {
    console.warn(`無法從metadata server獲取 ${type} #${tokenId}:`, error);
    return null;
  }
}

/**
 * 獲取隊伍的市場資料
 */
export async function fetchPartyMarketData(tokenId: string): Promise<PartyMarketData | null> {
  try {
    const url = `${MARKET_APIS.metadataServer}/api/party/${tokenId}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Metadata server error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      name: data.name,
      description: data.description,
      image: data.image,
      attributes: data.attributes || [],
      totalPower: data.totalPower,
      totalCapacity: data.totalCapacity,
      partyRarity: data.partyRarity,
      provisionsRemaining: data.provisionsRemaining,
      cooldownEndsAt: data.cooldownEndsAt,
      unclaimedRewards: data.unclaimedRewards,
      fatigueLevel: data.fatigueLevel,
      heroIds: data.heroIds,
      relicIds: data.relicIds,
      lastUpdated: data.lastUpdated || new Date().toISOString(),
      source: 'metadata_server' as const,
    };
  } catch (error) {
    console.warn(`無法從metadata server獲取隊伍 #${tokenId}:`, error);
    return null;
  }
}

/**
 * 從多個BSC市場獲取NFT資料
 */
export async function fetchFromBSCMarkets(type: string, tokenId: string, contractAddress: string): Promise<MarketData | null> {
  // 按優先級嘗試不同的BSC市場
  const marketSources = [
    { name: 'okx', fetchFn: () => fetchFromOKX(type, tokenId, contractAddress) },
    { name: 'element', fetchFn: () => fetchFromElement(type, tokenId, contractAddress) },
    { name: 'opensea', fetchFn: () => fetchFromOpenSea(type, tokenId, contractAddress) },
  ];

  for (const source of marketSources) {
    try {
      const data = await source.fetchFn();
      if (data) {
        console.log(`✅ 從 ${source.name} 獲取到 ${type} #${tokenId} 資料`);
        return data;
      }
    } catch (error) {
      console.warn(`❌ 從 ${source.name} 獲取 ${type} #${tokenId} 失敗:`, error);
      continue;
    }
  }

  return null;
}

/**
 * 強制刷新特定NFT的快取
 */
export async function refreshNFTCache(type: string, tokenId: string): Promise<boolean> {
  try {
    const url = `${MARKET_APIS.metadataServer}/api/${type}/${tokenId}/refresh`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Refresh API error: ${response.status}`);
    }

    const result = await response.json();
    console.log(`快取刷新成功: ${type} #${tokenId}`, result);
    return true;
  } catch (error) {
    console.warn(`快取刷新失敗 ${type} #${tokenId}:`, error);
    return false;
  }
}

/**
 * 合併多個資料來源，BSC鏈優先級：OKX > Element > GraphQL > Metadata Server > OpenSea
 */
export function mergeMarketData(...sources: (MarketData | null)[]): MarketData | null {
  const validSources = sources.filter(Boolean) as MarketData[];
  
  if (validSources.length === 0) {
    return null;
  }

  // BSC鏈市場優先級排序
  const priorityOrder = ['okx', 'element', 'graph', 'metadata_server', 'opensea', 'blur'];
  validSources.sort((a, b) => {
    const aPriority = priorityOrder.indexOf(a.source);
    const bPriority = priorityOrder.indexOf(b.source);
    return aPriority - bPriority;
  });

  // 合併資料，優先使用高優先級的資料
  const merged: MarketData = {
    source: validSources[0].source,
    lastUpdated: validSources[0].lastUpdated,
  };

  for (const source of validSources) {
    if (!merged.name && source.name) merged.name = source.name;
    if (!merged.description && source.description) merged.description = source.description;
    if (!merged.image && source.image) merged.image = source.image;
    if (!merged.attributes && source.attributes) merged.attributes = source.attributes;
  }

  return merged;
}

/**
 * 檢查資料是否需要更新
 */
export function shouldUpdateData(lastUpdate: string, maxAgeMinutes: number = 5): boolean {
  const now = Date.now();
  const lastUpdateTime = new Date(lastUpdate).getTime();
  const maxAgeMs = maxAgeMinutes * 60 * 1000;
  
  return (now - lastUpdateTime) > maxAgeMs;
}

/**
 * 獲取BSC鏈NFT的完整市場資料
 */
export async function getBSCNFTMarketData(type: string, tokenId: string, contractAddress: string): Promise<MarketData | null> {
  // 1. 首先嘗試從BSC市場獲取
  const marketData = await fetchFromBSCMarkets(type, tokenId, contractAddress);
  
  // 2. 如果市場沒有資料，從metadata server獲取
  if (!marketData) {
    const metadataData = await fetchFromMetadataServer(type, tokenId);
    return metadataData;
  }
  
  return marketData;
} 