// 臨時診斷腳本 - 檢查 RPC 配置
// 在瀏覽器控制台執行

console.log('🔍 RPC 配置診斷');
console.log('================');

// 檢查環境變數
console.log('1. 環境變數檢查:');
console.log('VITE_USE_RPC_PROXY:', import.meta.env.VITE_USE_RPC_PROXY);
console.log('VITE_ADMIN_USE_VERCEL_PROXY:', import.meta.env.VITE_ADMIN_USE_VERCEL_PROXY);
console.log('VITE_ALCHEMY_KEY_PUBLIC 存在:', !!import.meta.env.VITE_ALCHEMY_KEY_PUBLIC);
console.log('VITE_ALCHEMY_KEY 存在:', !!import.meta.env.VITE_ALCHEMY_KEY);

if (import.meta.env.VITE_ALCHEMY_KEY_PUBLIC) {
  const key = import.meta.env.VITE_ALCHEMY_KEY_PUBLIC;
  console.log('VITE_ALCHEMY_KEY_PUBLIC 格式:', key.substring(0, 10) + '... (長度: ' + key.length + ')');
}

// 檢查其他 key
for (let i = 1; i <= 5; i++) {
  const key = import.meta.env[`VITE_ALCHEMY_KEY_${i}`];
  if (key) {
    console.log(`VITE_ALCHEMY_KEY_${i} 存在: ${key.substring(0, 10)}... (長度: ${key.length})`);
  }
}

console.log('\n2. URL 類型檢查:');
console.log('當前頁面 URL:', window.location.href);
console.log('是否為管理頁面:', window.location.hash?.includes('admin'));

console.log('\n3. RPC 模擬測試:');

// 模擬 getAlchemyKeys 函數
function testGetAlchemyKeys() {
  const keys = [];
  
  if (import.meta.env.VITE_ALCHEMY_KEY) {
    keys.push(import.meta.env.VITE_ALCHEMY_KEY);
  }
  
  if (import.meta.env.VITE_ALCHEMY_KEY_PUBLIC) {
    keys.push(import.meta.env.VITE_ALCHEMY_KEY_PUBLIC);
  }
  
  for (let i = 1; i <= 5; i++) {
    const key = import.meta.env[`VITE_ALCHEMY_KEY_${i}`];
    if (key) keys.push(key);
  }
  
  return [...new Set(keys)];
}

const alchemyKeys = testGetAlchemyKeys();
console.log('找到 Alchemy keys 數量:', alchemyKeys.length);
console.log('Keys 預覽:', alchemyKeys.map(k => k ? `${k.substring(0, 10)}...` : 'undefined'));

// 檢查 key 完整性
if (alchemyKeys.length > 0) {
  const firstKey = alchemyKeys[0];
  console.log('第一個 key 長度:', firstKey?.length);
  console.log('Key 長度是否 > 20:', firstKey?.length > 20);
  
  if (firstKey && firstKey.length > 20) {
    const testUrl = `https://bnb-mainnet.g.alchemy.com/v2/${firstKey}`;
    console.log('預期 Alchemy URL:', testUrl.substring(0, 50) + '...');
  }
} else {
  console.log('❌ 沒有找到可用的 Alchemy keys');
}

console.log('\n4. 建議修復:');
if (alchemyKeys.length === 0) {
  console.log('❌ 需要配置 VITE_ALCHEMY_KEY_PUBLIC 在 .env 文件中');
} else if (alchemyKeys[0]?.length <= 20) {
  console.log('❌ Alchemy key 似乎不完整，請檢查配置');
} else {
  console.log('✅ Alchemy 配置看起來正常');
  console.log('💡 如果仍有問題，可能是緊急模式被錯誤觸發');
  console.log('💡 嘗試刷新頁面重置緊急模式狀態');
}