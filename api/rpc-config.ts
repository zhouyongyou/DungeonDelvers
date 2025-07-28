// RPC 代理配置管理

export interface RpcConfig {
  // 基本設定
  providers: {
    alchemy: {
      baseUrl: string;
      maxKeys: number;
    };
    backup?: {
      url: string;
      enabled: boolean;
    };
  };
  
  // 性能優化
  optimization: {
    // 緩存策略
    cache: {
      enabled: boolean;
      ttl: Record<string, number>;
      maxSize: number;
      compression: boolean;
    };
    
    // 請求去重
    deduplication: {
      enabled: boolean;
      windowMs: number;
    };
    
    // 批量處理
    batching: {
      enabled: boolean;
      maxSize: number;
      delayMs: number;
    };
  };
  
  // 安全設定
  security: {
    // 速率限制
    rateLimit: {
      enabled: boolean;
      windowMs: number;
      maxRequests: number;
      skipSuccessfulRequests: boolean;
    };
    
    // 認證
    auth: {
      enabled: boolean;
      apiKeys: string[];
    };
    
    // IP 白名單
    whitelist: {
      enabled: boolean;
      ips: string[];
    };
  };
  
  // 監控設定
  monitoring: {
    // 指標收集
    metrics: {
      enabled: boolean;
      sampleRate: number;
    };
    
    // 日誌
    logging: {
      level: 'debug' | 'info' | 'warn' | 'error';
      slowRequestThreshold: number;
    };
    
    // 健康檢查
    healthCheck: {
      enabled: boolean;
      interval: number;
    };
  };
  
  // 錯誤處理
  errorHandling: {
    // 重試策略
    retry: {
      maxAttempts: number;
      backoff: number[];
      retryableErrors: string[];
    };
    
    // 降級策略
    fallback: {
      enabled: boolean;
      providers: string[];
    };
    
    // 熔斷器
    circuitBreaker: {
      enabled: boolean;
      errorThreshold: number;
      resetTimeout: number;
    };
  };
}

// 預設配置
export const defaultConfig: RpcConfig = {
  providers: {
    alchemy: {
      baseUrl: 'https://bnb-mainnet.g.alchemy.com/v2/',
      maxKeys: 10,
    },
  },
  
  optimization: {
    cache: {
      enabled: true,
      ttl: {
        'eth_blockNumber': 3000,
        'eth_getBalance': 30000,
        'eth_getCode': 300000,
        'eth_call': 10000,
        'eth_getTransactionReceipt': 86400000,
        'eth_getBlockByNumber': 3600000,
        'eth_getLogs': 60000,
      },
      maxSize: 1000,
      compression: false,
    },
    
    deduplication: {
      enabled: true,
      windowMs: 100,
    },
    
    batching: {
      enabled: true,
      maxSize: 10,
      delayMs: 10,
    },
  },
  
  security: {
    rateLimit: {
      enabled: true,
      windowMs: 60000,
      maxRequests: 100,
      skipSuccessfulRequests: false,
    },
    
    auth: {
      enabled: false,
      apiKeys: [],
    },
    
    whitelist: {
      enabled: false,
      ips: [],
    },
  },
  
  monitoring: {
    metrics: {
      enabled: true,
      sampleRate: 0.1, // 10%
    },
    
    logging: {
      level: 'info',
      slowRequestThreshold: 1000, // 1秒
    },
    
    healthCheck: {
      enabled: true,
      interval: 60000, // 1分鐘
    },
  },
  
  errorHandling: {
    retry: {
      maxAttempts: 3,
      backoff: [100, 500, 1000],
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
    },
    
    fallback: {
      enabled: false,
      providers: [],
    },
    
    circuitBreaker: {
      enabled: true,
      errorThreshold: 0.5, // 50% 錯誤率
      resetTimeout: 60000, // 1分鐘
    },
  },
};

// 環境特定配置
export function getConfig(): RpcConfig {
  const env = process.env.VERCEL_ENV || 'development';
  
  switch (env) {
    case 'production':
      return {
        ...defaultConfig,
        optimization: {
          ...defaultConfig.optimization,
          cache: {
            ...defaultConfig.optimization.cache,
            enabled: true,
            compression: true,
          },
        },
        security: {
          ...defaultConfig.security,
          rateLimit: {
            ...defaultConfig.security.rateLimit,
            maxRequests: 60, // 更嚴格的限制
          },
        },
        monitoring: {
          ...defaultConfig.monitoring,
          logging: {
            ...defaultConfig.monitoring.logging,
            level: 'warn',
          },
        },
      };
      
    case 'preview':
      return {
        ...defaultConfig,
        monitoring: {
          ...defaultConfig.monitoring,
          metrics: {
            ...defaultConfig.monitoring.metrics,
            sampleRate: 1, // 100% 監控
          },
        },
      };
      
    default:
      return defaultConfig;
  }
}