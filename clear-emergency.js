#!/usr/bin/env node
// 清除緊急 RPC 模式腳本

console.log('🔧 清除緊急 RPC 模式...');

// 在瀏覽器中執行的腳本
const script = `
// 清除 localStorage 中的緊急模式標記
localStorage.removeItem('emergency-rpc-mode');
localStorage.removeItem('emergency-rpc-endpoints');
localStorage.removeItem('emergency-rpc-last-used');
localStorage.removeItem('rpc-migration-group');

console.log('✅ 已清除所有緊急模式相關設置');

// 檢查環境變數
const config = {
  VITE_USE_RPC_PROXY: '${process.env.VITE_USE_RPC_PROXY || 'false'}',
  VITE_ALCHEMY_KEY: '${process.env.VITE_ALCHEMY_KEY ? process.env.VITE_ALCHEMY_KEY.slice(0,10) + '...' : 'undefined'}'
};

console.log('🔍 當前配置:', config);

if (config.VITE_USE_RPC_PROXY === 'false' && config.VITE_ALCHEMY_KEY !== 'undefined') {
  console.log('✅ 配置正確：應該使用私人 Alchemy 節點');
} else {
  console.log('⚠️ 配置問題：請檢查環境變數');
}

console.log('📌 請刷新頁面以應用更改');
`;

console.log('請在瀏覽器控制台中執行以下腳本：');
console.log('\n' + '='.repeat(60));
console.log(script);
console.log('='.repeat(60) + '\n');

console.log('或者直接執行：');
console.log('clearEmergencyRpcMode()');