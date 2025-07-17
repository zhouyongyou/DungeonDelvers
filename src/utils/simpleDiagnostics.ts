// 簡化的診斷工具，用於快速定位問題

export function quickDiagnose() {
  console.log('🔍 開始快速診斷...');
  
  // 檢查 localStorage
  try {
    const localStorageSize = new Blob(Object.values(localStorage)).size;
    console.log(`📦 localStorage 大小: ${(localStorageSize / 1024).toFixed(2)}KB`);
    
    // 列出所有 localStorage 鍵
    const keys = Object.keys(localStorage);
    console.log(`📋 localStorage 鍵數量: ${keys.length}`);
    if (keys.length > 50) {
      console.warn('⚠️ localStorage 鍵過多，可能影響性能');
    }
  } catch (e) {
    console.error('❌ 無法檢查 localStorage:', e);
  }
  
  // 檢查 sessionStorage
  try {
    const sessionStorageSize = new Blob(Object.values(sessionStorage)).size;
    console.log(`📦 sessionStorage 大小: ${(sessionStorageSize / 1024).toFixed(2)}KB`);
  } catch (e) {
    console.error('❌ 無法檢查 sessionStorage:', e);
  }
  
  // 檢查記憶體使用（如果支援）
  if ((performance as any).memory) {
    const memory = (performance as any).memory;
    console.log(`💾 記憶體使用: ${(memory.usedJSHeapSize / 1048576).toFixed(2)}MB / ${(memory.jsHeapSizeLimit / 1048576).toFixed(2)}MB`);
    
    if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.8) {
      console.error('🚨 記憶體使用率過高！');
    }
  }
  
  // 檢查 DOM 節點數量
  const nodeCount = document.getElementsByTagName('*').length;
  console.log(`🌳 DOM 節點數量: ${nodeCount}`);
  if (nodeCount > 5000) {
    console.warn('⚠️ DOM 節點過多，可能影響性能');
  }
  
  // 檢查活動的計時器
  const activeTimers = (window as any).__activeTimers || 0;
  console.log(`⏱️ 活動計時器: ${activeTimers}`);
  
  console.log('✅ 診斷完成');
}

// 清理函數
export function cleanupStorage() {
  console.log('🧹 開始清理存儲...');
  
  // 清理過期的 wagmi 緩存
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('wagmi') || key.includes('walletconnect'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`🗑️ 移除: ${key}`);
  });
  
  console.log(`✅ 清理完成，移除了 ${keysToRemove.length} 個項目`);
}

// 導出到全局以便在控制台使用
(window as any).quickDiagnose = quickDiagnose;
(window as any).cleanupStorage = cleanupStorage;