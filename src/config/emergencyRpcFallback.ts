// src/config/emergencyRpcFallback.ts - 緊急 RPC 回退方案

import { logger } from '../utils/logger';

/**
 * 緊急 RPC 修復工具
 * 當主要 RPC 連接失敗時，自動切換到備用方案
 */

// 檢測 RPC 連接問題的標誌
const RPC_ISSUES = {
  CONNECTION_CLOSED: 'ERR_CONNECTION_CLOSED',
  PROXY_FAILED: 'Vercel RPC 代理請求失敗',
  FETCH_FAILED: 'Failed to fetch'
};

// 公共 BSC RPC 節點（高可用性）- 已移除有問題的節點
const EMERGENCY_BSC_RPCS = [
  'https://bsc-dataseed1.binance.org/',
  'https://bsc-dataseed2.binance.org/',
  'https://bsc-dataseed3.binance.org/',
  'https://bsc-dataseed4.binance.org/',
  // 'https://bsc.publicnode.com', // 移除：ERR_CONNECTION_CLOSED
  'https://1rpc.io/bnb',
  'https://binance.nodereal.io',
  // 'https://bsc-rpc.gateway.pokt.network', // 移除：ERR_NAME_NOT_RESOLVED
  // 'https://bsc.meowrpc.com', // 移除：CORS 配置錯誤
];

let emergencyModeActive = false;
let currentEmergencyRpcIndex = 0;

/**
 * 檢測是否應該啟用緊急模式
 */
export function shouldActivateEmergencyMode(error: any): boolean {
  const errorMessage = error?.message || error?.toString() || '';
  
  return Object.values(RPC_ISSUES).some(issue => 
    errorMessage.includes(issue)
  );
}

/**
 * 啟用緊急 RPC 模式
 */
export function activateEmergencyMode(): void {
  if (!emergencyModeActive) {
    emergencyModeActive = true;
    logger.warn('🚨 啟用緊急 RPC 模式：切換到公共節點');
    
    // 清除可能有問題的 localStorage 緩存
    try {
      localStorage.removeItem('rpc-migration-group');
      localStorage.setItem('emergency-rpc-mode', 'true');
    } catch (e) {
      // 忽略 localStorage 錯誤
    }
    
    // 提示用戶刷新頁面
    showEmergencyNotification();
  }
}

/**
 * 獲取緊急 RPC URL
 */
export function getEmergencyRpcUrl(): string {
  const rpc = EMERGENCY_BSC_RPCS[currentEmergencyRpcIndex];
  currentEmergencyRpcIndex = (currentEmergencyRpcIndex + 1) % EMERGENCY_BSC_RPCS.length;
  
  logger.info(`🔄 使用緊急 RPC: ${rpc}`);
  return rpc;
}

/**
 * 測試 RPC 連接健康狀態
 */
export async function testRpcHealth(rpcUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超時
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return false;
    
    const data = await response.json();
    return !!(data.result && data.result.startsWith('0x'));
    
  } catch (error) {
    logger.debug(`RPC 健康檢查失敗: ${rpcUrl}`, error);
    return false;
  }
}

/**
 * 自動找到最快的緊急 RPC
 */
export async function findFastestEmergencyRpc(): Promise<string> {
  logger.info('🔍 尋找最快的緊急 RPC 節點...');
  
  const healthTests = EMERGENCY_BSC_RPCS.map(async (rpc) => {
    const start = Date.now();
    const isHealthy = await testRpcHealth(rpc);
    const duration = Date.now() - start;
    
    return { rpc, isHealthy, duration };
  });
  
  const results = await Promise.all(healthTests);
  const healthyRpcs = results.filter(r => r.isHealthy);
  
  if (healthyRpcs.length === 0) {
    logger.error('❌ 所有緊急 RPC 節點都無法連接');
    return EMERGENCY_BSC_RPCS[0]; // 返回第一個作為最後嘗試
  }
  
  // 按響應時間排序
  healthyRpcs.sort((a, b) => a.duration - b.duration);
  const fastest = healthyRpcs[0];
  
  logger.info(`✅ 找到最快的緊急 RPC: ${fastest.rpc} (${fastest.duration}ms)`);
  return fastest.rpc;
}

/**
 * 檢查是否已經在緊急模式
 */
export function isEmergencyModeActive(): boolean {
  // 檢查 localStorage
  try {
    return localStorage.getItem('emergency-rpc-mode') === 'true' || emergencyModeActive;
  } catch (e) {
    return emergencyModeActive;
  }
}

/**
 * 退出緊急模式
 */
export function deactivateEmergencyMode(): void {
  emergencyModeActive = false;
  
  try {
    localStorage.removeItem('emergency-rpc-mode');
  } catch (e) {
    // 忽略錯誤
  }
  
  logger.info('✅ 緊急 RPC 模式已停用');
}

/**
 * 顯示緊急通知
 */
function showEmergencyNotification(): void {
  // 創建緊急通知 UI
  if (typeof window !== 'undefined' && document) {
    const notification = document.createElement('div');
    notification.id = 'emergency-rpc-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 350px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      line-height: 1.4;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: start; gap: 12px;">
        <div style="font-size: 20px;">🚨</div>
        <div>
          <div style="font-weight: bold; margin-bottom: 8px;">RPC 連接問題</div>
          <div style="margin-bottom: 8px;">已自動切換到緊急公共節點。建議您：</div>
          <div style="margin-bottom: 12px;">
            <div>• 刷新頁面 (F5)</div>
            <div>• 檢查網路連接</div>
            <div>• 稍後再試</div>
          </div>
          <button onclick="window.location.reload()" style="
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            margin-right: 8px;
          ">立即刷新</button>
          <button onclick="document.getElementById('emergency-rpc-notification').remove()" style="
            background: transparent;
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">關閉</button>
        </div>
      </div>
    `;
    
    // 移除現有通知
    const existing = document.getElementById('emergency-rpc-notification');
    if (existing) existing.remove();
    
    document.body.appendChild(notification);
    
    // 10秒後自動消失
    setTimeout(() => {
      if (document.getElementById('emergency-rpc-notification')) {
        notification.remove();
      }
    }, 10000);
  }
}

/**
 * 監聽 RPC 錯誤並自動啟用緊急模式
 */
export function setupEmergencyRpcHandler(): void {
  // 監聽全域錯誤
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      if (shouldActivateEmergencyMode(event.error)) {
        activateEmergencyMode();
      }
    });
    
    // 監聽未處理的 Promise 拒絕
    window.addEventListener('unhandledrejection', (event) => {
      if (shouldActivateEmergencyMode(event.reason)) {
        activateEmergencyMode();
      }
    });
  }
}

/**
 * 獲取建議的 RPC 配置
 */
export function getRecommendedRpcConfig() {
  return {
    // 強制使用緊急模式
    forceEmergencyMode: true,
    
    // 建議的環境變數設置
    envVars: {
      VITE_USE_RPC_PROXY: 'false', // 停用代理
      VITE_FORCE_PUBLIC_RPC: 'true', // 強制使用公共節點
    },
    
    // 給用戶的建議
    userRecommendations: [
      '暫時停用 RPC 代理功能',
      '使用高可用性公共節點',
      '定期檢查 dungeondelvers.xyz 狀態',
      '考慮配置備用 Alchemy key'
    ]
  };
}