// src/utils/clearEmergencyMode.ts
// 清除緊急 RPC 模式的工具函數

export function clearEmergencyRpcMode() {
  try {
    // 清除 localStorage 中的緊急模式標記
    localStorage.removeItem('emergency-rpc-mode');
    localStorage.removeItem('rpc-migration-group');
    
    console.log('✅ 已清除緊急 RPC 模式');
    console.log('📌 請刷新頁面以使用私人 RPC 節點');
    
    // 檢查是否有 Alchemy Key
    const hasAlchemyKey = !!(
      import.meta.env.VITE_ALCHEMY_KEY ||
      import.meta.env.VITE_ALCHEMY_KEY_PUBLIC ||
      import.meta.env.VITE_ALCHEMY_KEY_1
    );
    
    if (!hasAlchemyKey) {
      console.warn('⚠️ 未檢測到 Alchemy Key 配置');
      console.log('📝 請確保在 .env.local 中配置了 VITE_ALCHEMY_KEY');
    } else {
      console.log('✅ 檢測到 Alchemy Key，應該會使用私人節點');
    }
    
    return true;
  } catch (error) {
    console.error('❌ 清除緊急模式失敗:', error);
    return false;
  }
}

// 暴露到全局方便使用
if (typeof window !== 'undefined') {
  (window as any).clearEmergencyRpcMode = clearEmergencyRpcMode;
  
  // 開發環境下提供提示
  if (import.meta.env.DEV) {
    console.log('💡 如果看到"使用緊急 RPC"的訊息，可以執行:');
    console.log('   clearEmergencyRpcMode()');
  }
}