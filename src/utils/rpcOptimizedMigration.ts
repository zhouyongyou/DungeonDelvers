// RPC 優化版本漸進式遷移控制

// 流量分配配置
export const RPC_MIGRATION_CONFIG = {
  // 啟用優化版本的流量百分比 (0-100)
  trafficPercentage: 100, // 最終階段：全量流量使用優化版本
  
  // 是否啟用 A/B 測試
  enabled: true,
  
  // 測試群組識別（用於固定用戶體驗）
  storageKey: 'rpc-migration-group',
  
  // 強制使用特定版本（用於調試）
  forceVersion: null as 'legacy' | 'optimized' | null,
};

// 檢查 rpc-optimized 端點是否可用
function checkRpcOptimizedAvailability(): boolean {
  // 檢查 localStorage 中是否有之前的失敗記錄
  const failureKey = 'rpc-optimized-failed';
  const lastFailure = localStorage.getItem(failureKey);
  
  if (lastFailure) {
    const failureTime = parseInt(lastFailure);
    const currentTime = Date.now();
    // 如果在過去 5 分鐘內失敗過，就認為不可用
    if (currentTime - failureTime < 5 * 60 * 1000) {
      return false;
    }
  }
  
  return true; // 預設認為可用
}

// 標記 rpc-optimized 端點失敗
export function markRpcOptimizedFailed(): void {
  localStorage.setItem('rpc-optimized-failed', Date.now().toString());
}

// 獲取用戶應該使用的 RPC 端點
export function getRpcEndpoint(): string {
  // 開發環境：檢查是否有外部代理 URL
  if (import.meta.env.DEV) {
    const externalProxyUrl = import.meta.env.VITE_VERCEL_PROXY_URL;
    if (externalProxyUrl) {
      return `${externalProxyUrl}/api/rpc-optimized`;
    }
    return '/api/rpc-optimized';
  }
  
  // 生產環境：檢查 rpc-optimized 端點是否可用
  // 如果不可用，直接使用 Alchemy
  const isOptimizedAvailable = checkRpcOptimizedAvailability();
  if (!isOptimizedAvailable) {
    console.warn('⚠️ rpc-optimized 端點不可用，使用直接 Alchemy 連接');
    return 'direct-alchemy'; // 特殊標記，表示使用直接 Alchemy
  }
  
  // 如果有強制版本設定
  if (RPC_MIGRATION_CONFIG.forceVersion) {
    return RPC_MIGRATION_CONFIG.forceVersion === 'optimized' 
      ? '/api/rpc-optimized' 
      : '/api/rpc';
  }
  
  // 如果未啟用遷移，使用舊版本
  if (!RPC_MIGRATION_CONFIG.enabled) {
    return '/api/rpc';
  }
  
  // 檢查用戶是否已經被分配到測試群組
  const storedGroup = localStorage.getItem(RPC_MIGRATION_CONFIG.storageKey);
  
  if (storedGroup) {
    return storedGroup === 'optimized' ? '/api/rpc-optimized' : '/api/rpc';
  }
  
  // 新用戶：根據流量百分比分配
  const useOptimized = Math.random() * 100 < RPC_MIGRATION_CONFIG.trafficPercentage;
  const group = useOptimized ? 'optimized' : 'legacy';
  
  // 儲存群組分配，確保用戶體驗一致
  localStorage.setItem(RPC_MIGRATION_CONFIG.storageKey, group);
  
  return useOptimized ? '/api/rpc-optimized' : '/api/rpc';
}

// 獲取當前用戶的 RPC 版本
export function getCurrentRpcVersion(): 'legacy' | 'optimized' {
  const endpoint = getRpcEndpoint();
  return endpoint.includes('optimized') ? 'optimized' : 'legacy';
}

// 清除用戶的測試群組分配（用於測試）
export function clearRpcMigrationGroup(): void {
  localStorage.removeItem(RPC_MIGRATION_CONFIG.storageKey);
}

// 監控和報告 RPC 性能
export function reportRpcPerformance(
  duration: number,
  success: boolean,
  method: string
): void {
  // 可以在這裡添加性能監控邏輯
  // 例如發送到分析服務
  const version = getCurrentRpcVersion();
  
  if (import.meta.env.DEV) {
    console.log(`[RPC ${version}] ${method}: ${duration}ms, success: ${success}`);
  }
  
  // 未來可以集成到監控系統
  // analytics.track('rpc_performance', {
  //   version,
  //   duration,
  //   success,
  //   method,
  // });
}