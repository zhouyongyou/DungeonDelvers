// src/utils/checkRpcConfig.ts
// RPC 配置檢查工具

import { logger } from './logger';

export function checkRpcConfiguration() {
  console.group('🔍 RPC 配置檢查');
  
  // 檢查 Alchemy Keys
  const alchemyKeys = {
    VITE_ALCHEMY_KEY: import.meta.env.VITE_ALCHEMY_KEY,
    VITE_ALCHEMY_KEY_PUBLIC: import.meta.env.VITE_ALCHEMY_KEY_PUBLIC,
    VITE_ALCHEMY_KEY_1: import.meta.env.VITE_ALCHEMY_KEY_1,
    VITE_ALCHEMY_KEY_2: import.meta.env.VITE_ALCHEMY_KEY_2,
    VITE_ALCHEMY_KEY_3: import.meta.env.VITE_ALCHEMY_KEY_3,
    VITE_ALCHEMY_KEY_4: import.meta.env.VITE_ALCHEMY_KEY_4,
    VITE_ALCHEMY_KEY_5: import.meta.env.VITE_ALCHEMY_KEY_5,
  };
  
  console.log('📌 Alchemy Keys 配置:');
  Object.entries(alchemyKeys).forEach(([key, value]) => {
    if (value) {
      console.log(`✅ ${key}: ${value.substring(0, 10)}...${value.substring(value.length - 4)}`);
    } else {
      console.log(`❌ ${key}: 未配置`);
    }
  });
  
  // 檢查代理設置
  console.log('\n📌 代理設置:');
  console.log(`VITE_USE_RPC_PROXY: ${import.meta.env.VITE_USE_RPC_PROXY || '未設置'}`);
  console.log(`VITE_ADMIN_USE_VERCEL_PROXY: ${import.meta.env.VITE_ADMIN_USE_VERCEL_PROXY || '未設置'}`);
  
  // 檢查其他相關設置
  console.log('\n📌 其他設置:');
  console.log(`NODE_ENV: ${import.meta.env.NODE_ENV}`);
  console.log(`DEV: ${import.meta.env.DEV}`);
  console.log(`PROD: ${import.meta.env.PROD}`);
  console.log(`MODE: ${import.meta.env.MODE}`);
  
  // 建議
  console.log('\n💡 配置建議:');
  
  const hasAlchemyKey = Object.values(alchemyKeys).some(key => !!key);
  if (!hasAlchemyKey) {
    console.warn('⚠️ 未配置任何 Alchemy Key，將使用公共 RPC 節點');
    console.log('📝 請在 .env.local 中添加:');
    console.log('VITE_ALCHEMY_KEY=你的_Alchemy_API_KEY');
  } else {
    console.log('✅ 已配置 Alchemy Key，應該使用私人節點');
  }
  
  if (import.meta.env.VITE_USE_RPC_PROXY === 'true') {
    console.log('⚠️ 已啟用 RPC 代理，將通過 /api/rpc 轉發請求');
  }
  
  // 檢查是否在緊急模式
  try {
    const emergencyMode = localStorage.getItem('emergency-rpc-mode');
    if (emergencyMode === 'true') {
      console.warn('🚨 當前處於緊急 RPC 模式！');
      console.log('💡 清除緊急模式: localStorage.removeItem("emergency-rpc-mode")');
    }
  } catch (e) {
    // 忽略 localStorage 錯誤
  }
  
  console.groupEnd();
}

// 在開發環境自動執行檢查
if (import.meta.env.DEV) {
  // 延遲執行，確保頁面載入完成
  setTimeout(() => {
    checkRpcConfiguration();
  }, 1000);
}