// 管理後台費用診斷工具
// 在管理後台頁面的瀏覽器控制台中運行

console.log('🔍 管理後台費用診斷工具');
console.log('=======================');

// 檢查當前頁面是否為管理後台
if (!window.location.hash.includes('admin')) {
  console.error('❌ 請在管理後台頁面運行此診斷工具');
  console.log('👉 前往: http://localhost:5174/#/admin');
} else {
  console.log('✅ 當前在管理後台頁面');
}

// 檢查 React 組件狀態
console.log('\n1. 檢查 React 應用狀態...');
try {
  const reactFiber = document.querySelector('#root')._reactInternalInstance ||
                    document.querySelector('#root')._reactInternals;
  if (reactFiber) {
    console.log('✅ React 應用已載入');
  }
} catch (error) {
  console.log('⚠️ 無法檢測 React 應用狀態');
}

// 檢查 wagmi 連接狀態
console.log('\n2. 檢查錢包連接狀態...');
// 這需要在 React 組件內部運行，所以提供指令
console.log('請在組件內部運行以下代碼檢查 wagmi 狀態:');
console.log(`
// 在 AdminPage.tsx 中添加臨時代碼：
useEffect(() => {
  console.log('🔍 錢包狀態:', { address, chainId, isConnected });
  console.log('🔍 合約配置:', { 
    hero: getContractWithABI(chainId, 'HERO'),
    relic: getContractWithABI(chainId, 'RELIC') 
  });
}, [address, chainId, isConnected]);
`);

// 檢查 DOM 元素
console.log('\n3. 檢查管理後台 DOM 元素...');
const platformFeeSection = document.querySelector('[title*="平台費用"]') || 
                           document.querySelector('*:contains("平台費用")') ||
                           document.querySelector('*:contains("平台費")');

if (platformFeeSection) {
  console.log('✅ 找到平台費用設定區域');
} else {
  console.log('❌ 未找到平台費用設定區域');
  console.log('👉 檢查是否需要展開對應的 AdminSection');
}

// 檢查輸入框
const inputs = document.querySelectorAll('input[placeholder*="BNB"], input[placeholder*="費用"]');
console.log(`📝 找到 ${inputs.length} 個費用輸入框`);

// 檢查當前顯示的費用值
const feeDisplays = document.querySelectorAll('[class*="font-mono"]:contains("當前值")');
console.log(`📊 找到 ${feeDisplays.length} 個費用顯示區域`);

// 提供測試步驟
console.log('\n🧪 建議測試步驟:');
console.log('================');
console.log('1. 確保錢包已連接到 BSC 主網');
console.log('2. 確保使用的地址是合約 Owner: 0x10925A7138649C7E1794CE646182eeb5BF8ba647');
console.log('3. 展開 "平台費用管理 (BNB)" 區域');
console.log('4. 檢查當前顯示的費用值是否為 0.0');
console.log('5. 如果不是，在輸入框中輸入 "0" 並點擊更新');
console.log('6. 觀察控制台輸出的交易結果');
console.log('7. 等待 2 秒後頁面會自動重新載入');

// 提供快速修復命令
console.log('\n⚡ 快速測試指令:');
console.log('================');
console.log('// 測試合約連接');
console.log('window.ethereum && window.ethereum.request({ method: "eth_chainId" }).then(chainId => console.log("Chain ID:", parseInt(chainId, 16)))');

console.log('\n// 測試合約讀取');
console.log(`
fetch('https://bsc-dataseed.binance.org/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'eth_call',
    params: [{
      to: '0xD48867dbac5f1c1351421726B6544f847D9486af',
      data: '0x99e77d0e' // platformFee() 函數選擇器
    }, 'latest'],
    id: 1
  })
}).then(r => r.json()).then(result => {
  const value = BigInt(result.result) / BigInt(1e18);
  console.log('Hero platformFee:', value.toString(), 'BNB');
});
`);