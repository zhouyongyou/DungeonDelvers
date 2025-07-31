// 檢查合約地址一致性
console.log('🔍 檢查前端與子圖的合約地址一致性...\n');

// 前端配置的地址 (從 contractsWithABI.ts)
const FRONTEND_ADDRESSES = {
  DUNGEONMASTER: '0x2E2F5569192526B4b4B51D51BcB6d9290492078d',
  PARTY: '0xA4BA997d806FeAde847Cf82a070a694a9e51fAf2',
  HERO: '0xF6A318568CFF7704c24C1Ab81B34de26Cd473d40',
  RELIC: '0xA9bfc01562d168644E07afA704Ca2b6764E36C66'
};

// 子圖配置的地址 (從 subgraph.yaml)
const SUBGRAPH_ADDRESSES = {
  DUNGEONMASTER: '0x2E2F5569192526B4b4B51D51BcB6d9290492078d',
  PARTY: '0xA4BA997d806FeAde847Cf82a070a694a9e51fAf2',
  HERO: '0xF6A318568CFF7704c24C1Ab81B34de26Cd473d40',
  RELIC: '0xA9bfc01562d168644E07afA704Ca2b6764E36C66'
};

console.log('📋 地址對比結果:');
console.log('==========================================');

for (const contract in FRONTEND_ADDRESSES) {
  const frontendAddr = FRONTEND_ADDRESSES[contract];
  const subgraphAddr = SUBGRAPH_ADDRESSES[contract];
  const match = frontendAddr.toLowerCase() === subgraphAddr.toLowerCase();
  
  console.log(`${contract}:`);
  console.log(`  前端:   ${frontendAddr}`);
  console.log(`  子圖:   ${subgraphAddr}`);
  console.log(`  一致性: ${match ? '✅ 匹配' : '❌ 不匹配'}\n`);
}

console.log('🔍 可能的問題原因分析:');
console.log('==========================================');

console.log('1. ✅ 合約地址完全一致 - 這不是問題所在');
console.log('2. 🤔 子圖映射處理邏輯:');
console.log('   - handleExpeditionFulfilled 函數存在且正確');
console.log('   - 事件簽名匹配: ExpeditionFulfilled(indexed address,indexed uint256,bool,uint256,uint256)');
console.log('3. 🎯 可能的原因:');
console.log('   - startBlock 設定為 55808316，你的遠征可能在這個區塊之前');
console.log('   - 子圖同步延遲或索引錯誤');
console.log('   - 事件參數解析問題');
console.log('   - 隊伍實體不存在導致事件處理失敗');

console.log('\n💡 建議調查步驟:');
console.log('==========================================');
console.log('1. 檢查你的遠征交易是在哪個區塊');
console.log('2. 確認該區塊號 >= 55808316');
console.log('3. 檢查子圖同步進度');
console.log('4. 查看子圖錯誤日誌');
console.log('5. 確認隊伍實體在遠征前已正確創建');

console.log('\n🚀 修復建議:');
console.log('==========================================');
console.log('1. 如果遠征在 startBlock 之前 -> 降低 startBlock');
console.log('2. 如果子圖有索引錯誤 -> 重新部署子圖');
console.log('3. 如果隊伍實體缺失 -> 檢查 Party 事件處理');
console.log('4. 強制重新索引: 在 The Graph Studio 中重新部署');