// src/config/cdn.ts
// 🌍 CDN 和資源載入配置

import { silentFetch } from '../utils/silentFetch';

export interface ResourceConfig {
  baseUrl: string;
  fallbackUrl?: string;
  timeout: number;
  priority: number;
}

export interface CDNConfig {
  development: ResourceConfig[];
  production: ResourceConfig[];
}

// 🔧 環境配置
const isDevelopment = import.meta.env.DEV;

// 🚀 CDN 配置
export const cdnConfig: CDNConfig = {
  // 開發環境：優先使用線上後端服務器
  development: [
    {
      baseUrl: 'https://dungeon-delvers-metadata-server.onrender.com', // 線上後端服務器
      timeout: 3000,
      priority: 1
    },
    {
      baseUrl: window.location.origin, // 本地開發服務器
      timeout: 1000,
      priority: 2
    },
    {
      baseUrl: 'https://www.dungeondelvers.xyz',
      fallbackUrl: 'https://dungeondelvers.xyz',
      timeout: 2000,
      priority: 3
    }
  ],
  
  // 生產環境：優先使用後端服務器
  production: [
    {
      baseUrl: 'https://dungeon-delvers-metadata-server.onrender.com', // 主要後端服務器
      timeout: 3000,
      priority: 1
    },
    {
      baseUrl: window.location.origin, // 本地備援
      timeout: 1000,
      priority: 2
    },
    {
      baseUrl: 'https://dungeondelvers.xyz', // 備用域名
      timeout: 2000,
      priority: 3
    }
  ]
};

// 🎯 獲取當前環境的配置
export function getResourceConfig(): ResourceConfig[] {
  return isDevelopment ? cdnConfig.development : cdnConfig.production;
}

// 🔗 構建資源 URL
export function buildResourceUrl(type: 'api' | 'image', path: string, configIndex: number = 0): string {
  const configs = getResourceConfig();
  const config = configs[configIndex];
  
  if (!config) {
    throw new Error(`No resource config found for index ${configIndex}`);
  }
  
  return `${config.baseUrl}/${type}/${path}`;
}

// 🖼️ 圖片資源載入
export function getImageUrl(nftType: string, tokenId: string | number, rarity?: number): string {
  const configs = getResourceConfig();
  
  // 根據 NFT 類型構建圖片路徑
  let imagePath = '';
  
  switch (nftType) {
    case 'hero': {
      const heroRarity = rarity || 1;
      imagePath = `images/hero/hero-${heroRarity}.png`;
      break;
    }
    case 'relic': {
      const relicRarity = rarity || 1;
      imagePath = `images/relic/relic-${relicRarity}.png`;
      break;
    }
    case 'party':
      imagePath = `images/party/party.png`;
      break;
    case 'vip':
      imagePath = `images/vip/vip.png`;
      break;
    default:
      imagePath = `images/placeholder.png`;
  }
  
  // 返回主要 CDN 的圖片 URL
  return `${configs[0].baseUrl}/${imagePath}`;
}

// 📊 元數據載入
export function getMetadataUrl(nftType: string, tokenId: string | number): string {
  const configs = getResourceConfig();
  
  // 開發環境：使用後端 API 端點
  if (isDevelopment && configs[0].baseUrl === 'https://dungeon-delvers-metadata-server.onrender.com') {
    return `${configs[0].baseUrl}/api/${nftType}/${tokenId}`;
  }
  
  // 生產環境：使用靜態 JSON 文件
  let apiPath = '';
  
  switch (nftType) {
    case 'hero':
    case 'relic':
      apiPath = `api/${nftType}/${tokenId}.json`;
      break;
    case 'party':
      apiPath = `api/party/party.json`;
      break;
    case 'vip':
      apiPath = `api/vip/vip.json`;
      break;
    default:
      throw new Error(`不支援的 NFT 類型: ${nftType}`);
  }
  
  // 返回主要 CDN 的 API URL
  return `${configs[0].baseUrl}/${apiPath}`;
}

// 🔄 資源載入重試邏輯
export async function loadResourceWithFallback<T>(
  resourcePath: string,
  type: 'api' | 'image',
  parser?: (response: Response) => Promise<T>
): Promise<T> {
  const configs = getResourceConfig();
  let lastError: Error | null = null;
  
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    
    try {
      const url = buildResourceUrl(type, resourcePath, i);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);
      
      const response = await silentFetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': type === 'api' ? 'application/json' : '*/*'
          // 移除 Cache-Control header 以避免 CORS 問題
        },
        silent: true // 減少錯誤輸出
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (parser) {
        return await parser(response);
      }
      
      return response as unknown as T;
      
    } catch (error) {

      lastError = error instanceof Error ? error : new Error('未知錯誤');
      
      // 嘗試 fallback URL
      if (config.fallbackUrl) {
        try {
          const fallbackUrl = `${config.fallbackUrl}/${type}/${resourcePath}`;

          const response = await silentFetch(fallbackUrl, {
            headers: {
              'Accept': type === 'api' ? 'application/json' : '*/*'
            },
            silent: true // fallback 也使用靜默模式
          });
          
          if (response.ok) {

            if (parser) {
              return await parser(response);
            }
            return response as unknown as T;
          }
        } catch (fallbackError) {
          // Log fallback error but continue trying other options
          console.warn('Fallback resource fetch failed:', fallbackError);
        }
      }
      
      continue;
    }
  }
  
  throw lastError || new Error('所有資源載入都失敗');
}

// 🎨 資源預載入
export function preloadCriticalResources() {
  const configs = getResourceConfig();
  const baseUrl = configs[0].baseUrl;
  
  // 預載入常用圖片
  const criticalImages = [
    `${baseUrl}/images/hero/hero-1.png`,
    `${baseUrl}/images/hero/hero-2.png`,
    `${baseUrl}/images/relic/relic-1.png`,
    `${baseUrl}/images/party/party.png`,
    `${baseUrl}/images/vip/vip.png`
  ];
  
  criticalImages.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  });

} 