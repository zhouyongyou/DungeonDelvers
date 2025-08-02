// configLoader.ts - 統一配置載入器
// 從單一來源載入所有配置，減少硬編碼

import { logger } from '../utils/logger';

export interface AppConfig {
  version: string;
  lastUpdated: string;
  contracts: {
    [key: string]: string;
  };
  subgraph: {
    studio: string;
    decentralized: string;
    useDecentralized: boolean;
  };
  network: {
    chainId: number;
    name: string;
    rpc: string;
    explorer: string;
  };
}

// 默認配置（作為備份）- V25 版本
const DEFAULT_CONFIG: AppConfig = {
  version: 'V25',
  lastUpdated: '2025-07-28',
  contracts: {
    USD: '0x7C67Af4EBC6651c95dF78De11cfe325660d935FE',
    SOULSHARD: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
    HERO: '0x5d71d62fAFd07C92ec677C3Ae57984576f5955f0',
    RELIC: '0x5f93fCdb2ecd1A0eB758E554bfeB3A2B95581366',
    PARTY: '0x6B32c2EEaB24C04bF97A022B1e55943FE1E772a5',
    DUNGEONCORE: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
    DUNGEONMASTER: '0x446f80c6562a9b0A33b48F74F7Dbf10b53Fe2703',
    DUNGEONSTORAGE: '0x88EF98E7F9095610d7762C30165854f271525B97',
    PLAYERVAULT: '0x39523e8eeB6c54fCe65D62ec696cA5ad888eF25c',
    PLAYERPROFILE: '0xCf352E394fD2Ff27D65bB525C032a2c03Bd79AC7',
    VIPSTAKING: '0x186a89e5418645459ed0a469FF97C9d4B2ca5355',
    ORACLE: '0x67989939163bCFC57302767722E1988FFac46d64',
    ALTAROFASCENSION: '0xaA4f3D3ed21599F501773F83a1A2B4d65b1d0AE3',
    DUNGEONMASTERWALLET: '0x10925A7138649C7E1794CE646182eeb5BF8ba647',
    UNISWAP_POOL: '0x1e5Cd5F386Fb6F39cD8788675dd3A5ceB6521C82',
  },
  subgraph: {
    studio: 'https://api.studio.thegraph.com/query/115633/dungeon-delvers---bsc/v3.5.4',
    decentralized: 'https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs',
    useDecentralized: true // 全面使用去中心化端點
  },
  network: {
    chainId: 56,
    name: 'BSC Mainnet',
    rpc: 'https://bsc-dataseed.binance.org/',
    explorer: 'https://bscscan.com'
  }
};

class ConfigLoader {
  private static instance: ConfigLoader;
  private config: AppConfig | null = null;
  private configPromise: Promise<AppConfig> | null = null;

  private constructor() {}

  // 構建包含 API key 的去中心化 URL
  private buildDecentralizedUrl(decentralizedConfig: any): string | null {
    if (!decentralizedConfig) return null;
    
    const baseUrl = decentralizedConfig.url;
    const apiKey = decentralizedConfig.apiKey;
    
    if (!baseUrl) return null;
    
    // 如果 URL 已經包含 API key，直接返回
    if (baseUrl.includes('/api/') && baseUrl.includes('subgraphs/id/')) {
      return baseUrl;
    }
    
    // 如果有 API key 且 URL 格式正確，則插入 API key
    if (apiKey && baseUrl.includes('gateway.thegraph.com/api/subgraphs/id/')) {
      return baseUrl.replace('/api/subgraphs/id/', `/api/${apiKey}/subgraphs/id/`);
    }
    
    return baseUrl;
  }

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  // 從環境變數載入配置
  private loadFromEnv(): Partial<AppConfig> {
    const contracts: { [key: string]: string } = {};
    
    // 載入所有 VITE_*_ADDRESS 環境變數
    Object.keys(import.meta.env).forEach(key => {
      if (key.startsWith('VITE_') && key.endsWith('_ADDRESS')) {
        const contractName = key.replace('VITE_', '').replace('_ADDRESS', '');
        const value = import.meta.env[key];
        if (value) {
          contracts[contractName] = value;
        }
      }
    });

    return {
      contracts: Object.keys(contracts).length > 0 ? contracts : undefined,
      subgraph: {
        studio: import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL || 
                import.meta.env.VITE_GRAPH_STUDIO_URL || 
                DEFAULT_CONFIG.subgraph.studio,
        decentralized: import.meta.env.VITE_THE_GRAPH_DECENTRALIZED_API_URL || 
                      import.meta.env.VITE_GRAPH_DECENTRALIZED_URL || 
                      DEFAULT_CONFIG.subgraph.decentralized,
        useDecentralized: true // 全面使用去中心化端點
      }
    };
  }

  // 從遠端載入配置
  private async loadFromRemote(): Promise<AppConfig | null> {
    try {
      // 優先從 CDN 載入最新版本
      const cdnUrl = '/config/v25.json';
      const response = await fetch(cdnUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.status}`);
      }
      
      const remoteConfig = await response.json();
      
      // 轉換格式
      return {
        version: remoteConfig.version,
        lastUpdated: remoteConfig.lastUpdated,
        contracts: remoteConfig.contracts,
        subgraph: {
          studio: remoteConfig.subgraph?.studio?.url || DEFAULT_CONFIG.subgraph.studio,
          decentralized: this.buildDecentralizedUrl(remoteConfig.subgraph?.decentralized) || DEFAULT_CONFIG.subgraph.decentralized,
          useDecentralized: true // 強制使用去中心化端點
        },
        network: remoteConfig.network
      };
    } catch (error) {
      logger.warn('Failed to load remote config, using local fallback:', error);
      return null;
    }
  }

  // 合併配置（優先級：環境變數 > 遠端 > 默認）
  private mergeConfigs(...configs: (Partial<AppConfig> | null)[]): AppConfig {
    const result = { ...DEFAULT_CONFIG };

    configs.forEach(config => {
      if (!config) return;

      if (config.version) result.version = config.version;
      if (config.lastUpdated) result.lastUpdated = config.lastUpdated;
      if (config.contracts) result.contracts = { ...result.contracts, ...config.contracts };
      if (config.subgraph) result.subgraph = { ...result.subgraph, ...config.subgraph };
      if (config.network) result.network = { ...result.network, ...config.network };
    });

    return result;
  }

  // 獲取配置（單例模式，確保只載入一次）
  async getConfig(): Promise<AppConfig> {
    if (this.config) {
      return this.config;
    }

    if (this.configPromise) {
      return this.configPromise;
    }

    this.configPromise = this.loadConfig();
    this.config = await this.configPromise;
    
    return this.config;
  }

  private async loadConfig(): Promise<AppConfig> {
    logger.info('Loading application configuration...');

    // 1. 載入環境變數配置
    const envConfig = this.loadFromEnv();

    // 2. 嘗試載入遠端配置
    const remoteConfig = await this.loadFromRemote();

    // 3. 合併配置
    const finalConfig = this.mergeConfigs(remoteConfig, envConfig);

    logger.info(`Configuration loaded: Version ${finalConfig.version}`);
    logger.debug('Configuration:', finalConfig);

    return finalConfig;
  }

  // 重新載入配置
  async reload(): Promise<AppConfig> {
    this.config = null;
    this.configPromise = null;
    return this.getConfig();
  }

  // 獲取合約地址
  getContractAddress(contractName: string): string {
    if (!this.config) {
      // 如果配置尚未載入，返回默認值
      return DEFAULT_CONFIG.contracts[contractName] || '';
    }
    return this.config.contracts[contractName] || '';
  }

  // 獲取子圖 URL
  getSubgraphUrl(): string {
    if (!this.config) {
      return DEFAULT_CONFIG.subgraph.studio;
    }
    return this.config.subgraph.useDecentralized 
      ? this.config.subgraph.decentralized 
      : this.config.subgraph.studio;
  }
}

// 導出單例實例
export const configLoader = ConfigLoader.getInstance();

// 導出便捷函數
export async function getAppConfig(): Promise<AppConfig> {
  return configLoader.getConfig();
}

export function getContractAddress(contractName: string): string {
  return configLoader.getContractAddress(contractName);
}

export function getSubgraphUrl(): string {
  return configLoader.getSubgraphUrl();
}