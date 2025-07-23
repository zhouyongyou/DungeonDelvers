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

// 默認配置（作為備份）
const DEFAULT_CONFIG: AppConfig = {
  version: 'V15',
  lastUpdated: '2025-07-23',
  contracts: {
    TESTUSD: '0xa095B8c9D9964F62A7dbA3f60AA91dB381A3e074',
    SOULSHARD: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
    HERO: '0x2b6CB00D10EFB1aF0125a26dfcbd9EBa87e07CD2',
    RELIC: '0xaEa78C3FC4bc50966aC41D76331fD0bf219D00ac',
    PARTY: '0x514AFBb114fa6c77CC025720A31aaeE038fBbcd7',
    DUNGEONCORE: '0xA43edd46Eb4416195bc1BAA3575358EA92CE49dD',
    DUNGEONMASTER: '0xaeBd33846a4a88Afd1B1c3ACB5D8C5872796E316',
    DUNGEONSTORAGE: '0xAfA453cdca0245c858DAeb4d3e21C6360F4d62Eb',
    PLAYERVAULT: '0x34d94193aa59f8a7E34040Ed4F0Ea5B231811388',
    PLAYERPROFILE: '0x5d4582266654CBEA6cC6Bdf696B68B8473521b63',
    VIPSTAKING: '0x9c2fdD1c692116aB5209983e467286844B3b9921',
    ORACLE: '0x623caa925445BeACd54Cc6C62Bb725B5d93698af',
    ALTAROFASCENSION: '0x0000000000000000000000000000000000000000',
    DUNGEONMASTERWALLET: '0x10925A7138649C7E1794CE646182eeb5BF8ba647',
  },
  subgraph: {
    studio: 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.0.9',
    decentralized: 'https://gateway.thegraph.com/api/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs',
    useDecentralized: import.meta.env.PROD
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
        studio: import.meta.env.VITE_GRAPH_STUDIO_URL || DEFAULT_CONFIG.subgraph.studio,
        decentralized: import.meta.env.VITE_GRAPH_DECENTRALIZED_URL || DEFAULT_CONFIG.subgraph.decentralized,
        useDecentralized: import.meta.env.PROD
      }
    };
  }

  // 從遠端載入配置
  private async loadFromRemote(): Promise<AppConfig | null> {
    try {
      // 優先從 CDN 載入
      const cdnUrl = '/config/v15.json';
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
          studio: remoteConfig.subgraph.studio.url,
          decentralized: remoteConfig.subgraph.decentralized.url,
          useDecentralized: import.meta.env.PROD
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