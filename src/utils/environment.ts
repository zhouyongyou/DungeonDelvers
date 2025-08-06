/**
 * 統一的環境檢測工具
 */

export const Environment = {
  isDevelopment: () => {
    return process.env.NODE_ENV === 'development';
  },
  
  isProduction: () => {
    return process.env.NODE_ENV === 'production';
  },
  
  isLocalhost: () => {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
  },
  
  isTestnet: () => {
    // BSC Testnet Chain ID = 97, Mainnet = 56
    return false; // 目前都在主網
  },
  
  shouldShowDebugInfo: () => {
    return Environment.isDevelopment() || Environment.isLocalhost();
  },
  
  getNetworkName: () => {
    return 'BSC Mainnet';
  },
  
  getChainId: () => {
    return 56;
  }
};

// 快捷導出
export const isDev = Environment.isDevelopment();
export const isProd = Environment.isProduction();
export const isLocal = Environment.isLocalhost();