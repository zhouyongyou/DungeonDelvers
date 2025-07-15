/**
import { logger } from '../utils/logger';
 * 簡化的環境變數管理
 * 只保留必要的配置，減少複雜度
 */

// 簡化的環境變數配置
export const ENV = {
  // API 相關 - 只保留一個 GraphQL URL
  THE_GRAPH_API_URL: import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL,
  
  // RPC 端點 - 移除，改用 rpc.ts 中的安全配置
  // BSC_RPC: 已棄用，請使用 getRpcUrl() from './rpc'
  
  // 主網設定
  MAINNET_URL: import.meta.env.VITE_MAINNET_URL || "https://dungeondelvers.xyz",
  
  // 開發者地址
  DEVELOPER_ADDRESS: import.meta.env.VITE_DEVELOPER_ADDRESS || '0x10925A7138649C7E1794CE646182eeb5BF8ba647',

  // 開發環境標識
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
} as const;

// 簡化的環境變數驗證
export function validateEnvironment(): void {
  if (!ENV.THE_GRAPH_API_URL) {
    logger.warn('VITE_THE_GRAPH_STUDIO_API_URL is not set, using fallback URL');
  }
}

// 環境變數類型導出
export type EnvConfig = typeof ENV;