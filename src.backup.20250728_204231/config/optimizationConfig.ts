// 優化配置中心
export const OPTIMIZATION_CONFIG = {
  // 快取配置
  cache: {
    // NFT 元數據快取
    nftMetadata: {
      memoryTTL: 1000 * 60 * 30,      // 30 分鐘記憶體快取
      persistTTL: 1000 * 60 * 60 * 24 * 7, // 7 天持久化快取
      maxMemoryItems: 500,
    },
    
    // GraphQL 查詢快取
    graphql: {
      defaultTTL: 1000 * 60 * 5,       // 5 分鐘
      playerDataTTL: 1000 * 60 * 10,   // 10 分鐘
      maxCacheSize: 100,
    },
    
    // 合約讀取快取
    contractReads: {
      staticDataTTL: 1000 * 60 * 60,   // 1 小時（如費用、配置等）
      dynamicDataTTL: 1000 * 10,       // 10 秒（如餘額、狀態等）
    },
  },

  // 請求批處理配置
  batching: {
    // NFT 元數據批處理
    nftMetadata: {
      maxBatchSize: 50,
      batchDelay: 50, // ms
      maxRetries: 3,
    },
    
    // 合約 multicall 批處理
    contractReads: {
      maxBatchSize: 30,
      batchDelay: 100, // ms
    },
  },

  // 背景刷新配置
  backgroundRefresh: {
    // 自適應刷新間隔
    adaptive: {
      activeInterval: 30000,     // 30 秒（活躍時）
      idleInterval: 60000,       // 1 分鐘（閒置時）
      inactiveInterval: 300000,  // 5 分鐘（非活躍時）
    },
    
    // 特定數據刷新間隔
    specific: {
      playerData: 60000,         // 1 分鐘
      nftAssets: 300000,         // 5 分鐘
      contractState: 10000,      // 10 秒
    },
  },

  // 預取策略
  prefetch: {
    // 頁面轉換預取
    pageTransitions: {
      dashboard: ['party', 'dungeon', 'mint'],
      mint: ['party', 'dashboard'],
      party: ['dungeon', 'dashboard'],
      dungeon: ['party', 'provisions'],
    },
    
    // 懸停預取延遲
    hoverDelay: 200, // ms
  },

  // 性能監控
  performance: {
    slowThreshold: 1000,         // 1 秒
    renderThreshold: 100,        // 100ms
    reportInterval: 60000,       // 1 分鐘
    maxMetrics: 100,
  },

  // IPFS 網關配置
  ipfs: {
    gateways: [
      'https://ipfs.io/ipfs/',
      'https://gateway.pinata.cloud/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
    ],
    timeout: 3000,               // 3 秒
    maxRetries: 2,
  },

  // API 端點優先級
  apiPriority: {
    nftMetadata: [
      'local',    // 本地 API
      'cdn',      // CDN
      'ipfs',     // IPFS
      'fallback', // 備用
    ],
  },
};

// 優化策略輔助函數
export const OptimizationStrategies = {
  // 判斷數據是否需要刷新
  shouldRefresh(lastFetch: number, dataType: keyof typeof OPTIMIZATION_CONFIG.backgroundRefresh.specific): boolean {
    const interval = OPTIMIZATION_CONFIG.backgroundRefresh.specific[dataType];
    return Date.now() - lastFetch > interval;
  },

  // 獲取快取 TTL
  getCacheTTL(dataType: 'nftMetadata' | 'graphql' | 'contractStatic' | 'contractDynamic'): number {
    switch (dataType) {
      case 'nftMetadata':
        return OPTIMIZATION_CONFIG.cache.nftMetadata.persistTTL;
      case 'graphql':
        return OPTIMIZATION_CONFIG.cache.graphql.defaultTTL;
      case 'contractStatic':
        return OPTIMIZATION_CONFIG.cache.contractReads.staticDataTTL;
      case 'contractDynamic':
        return OPTIMIZATION_CONFIG.cache.contractReads.dynamicDataTTL;
    }
  },

  // 獲取批處理配置
  getBatchConfig(type: 'nftMetadata' | 'contractReads') {
    return OPTIMIZATION_CONFIG.batching[type];
  },
};

// 導出類型
export type OptimizationConfig = typeof OPTIMIZATION_CONFIG;