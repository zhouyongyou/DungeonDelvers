// 詳細 Gas 成本拆解分析

console.log('🔬 Gas 成本詳細拆解分析\n');
console.log('=====================================\n');

// Gas 成本常數
const GAS_COSTS = {
  // ERC721 操作
  SAFE_MINT: 80000,           // _safeMint 基礎成本
  TRANSFER_FROM: 50000,        // transferFrom 成本
  
  // 存儲操作
  SSTORE_NEW: 20000,           // 新存儲槽寫入
  SSTORE_UPDATE: 5000,         // 更新現有存儲槽
  SLOAD: 2100,                 // 讀取存儲槽
  
  // 數組操作
  ARRAY_PUSH: 50000,           // 動態數組 push
  ARRAY_ACCESS: 2100,          // 數組訪問
  
  // Mapping 操作
  MAPPING_SET: 20000,          // mapping 寫入
  MAPPING_GET: 2100,           // mapping 讀取
  
  // 其他
  KECCAK256: 30,               // hash 操作（per 32 bytes）
  LOG_BASE: 375,               // 事件基礎成本
  LOG_TOPIC: 375,              // 每個 indexed 參數
  LOG_DATA: 8,                 // 每 byte 數據
  
  // 交易基礎
  TX_BASE: 21000,              // 基礎交易成本
  VRF_CALLBACK_BASE: 21000,    // VRF 回調基礎
};

// 舊模式 Gas 分析
function analyzeOldMode(quantity) {
  console.log(`📊 舊模式 - 鑄造 ${quantity} 個 NFT`);
  console.log('-----------------------------------');
  
  // 用戶支付階段
  const userPhase = {
    baseTx: GAS_COSTS.TX_BASE,
    storeRequest: GAS_COSTS.MAPPING_SET * 2,  // user mapping + request
    vrfRequest: 50000,  // VRF 請求成本
    events: GAS_COSTS.LOG_BASE + GAS_COSTS.LOG_TOPIC * 3 + GAS_COSTS.LOG_DATA * 32,
    total: 0
  };
  userPhase.total = Object.values(userPhase).reduce((a, b) => a + b, 0) - userPhase.total;
  
  // VRF 回調階段（Chainlink 支付）
  const vrfPhase = {
    baseTx: GAS_COSTS.VRF_CALLBACK_BASE,
    mintLoop: quantity * (
      GAS_COSTS.SAFE_MINT +                    // 鑄造
      GAS_COSTS.MAPPING_SET * 2 +              // heroData + owner mapping
      GAS_COSTS.SSTORE_NEW +                   // tokenId 存儲
      GAS_COSTS.LOG_BASE + GAS_COSTS.LOG_TOPIC * 2  // Transfer event
    ),
    events: GAS_COSTS.LOG_BASE + GAS_COSTS.LOG_TOPIC * 2,
    total: 0
  };
  vrfPhase.total = Object.values(vrfPhase).reduce((a, b) => a + b, 0) - vrfPhase.total;
  
  console.log('👤 用戶支付:');
  console.log(`  基礎交易: ${userPhase.baseTx.toLocaleString()} gas`);
  console.log(`  存儲請求: ${userPhase.storeRequest.toLocaleString()} gas`);
  console.log(`  VRF 請求: ${userPhase.vrfRequest.toLocaleString()} gas`);
  console.log(`  事件記錄: ${userPhase.events.toLocaleString()} gas`);
  console.log(`  小計: ${userPhase.total.toLocaleString()} gas\n`);
  
  console.log('🔗 VRF 回調（Chainlink 支付）:');
  console.log(`  基礎回調: ${vrfPhase.baseTx.toLocaleString()} gas`);
  console.log(`  鑄造循環: ${vrfPhase.mintLoop.toLocaleString()} gas`);
  console.log(`  事件記錄: ${vrfPhase.events.toLocaleString()} gas`);
  console.log(`  小計: ${vrfPhase.total.toLocaleString()} gas\n`);
  
  console.log(`💰 總計: ${(userPhase.total + vrfPhase.total).toLocaleString()} gas`);
  console.log(`  - 用戶實際支付: ${userPhase.total.toLocaleString()} gas`);
  console.log(`  - Chainlink 支付: ${vrfPhase.total.toLocaleString()} gas\n`);
  
  return { user: userPhase.total, vrf: vrfPhase.total };
}

// 新模式 Gas 分析
function analyzeNewMode(quantity) {
  console.log(`📊 新模式 - 鑄造 ${quantity} 個 NFT`);
  console.log('-----------------------------------');
  
  // 用戶支付階段（預先鑄造）
  const userPhase = {
    baseTx: GAS_COSTS.TX_BASE,
    premintLoop: quantity * (
      GAS_COSTS.SAFE_MINT +                    // 預先鑄造
      GAS_COSTS.MAPPING_SET +                  // owner mapping
      GAS_COSTS.ARRAY_PUSH +                   // pendingTokenIds.push
      GAS_COSTS.SSTORE_NEW                     // tokenId 存儲
    ),
    storeRequest: GAS_COSTS.MAPPING_SET * 3,   // request + requestIdToUser + pendingIds
    vrfRequest: 30000,  // VRF 請求成本（簡化）
    events: (GAS_COSTS.LOG_BASE + GAS_COSTS.LOG_TOPIC * 2) * quantity,  // Transfer events
    total: 0
  };
  userPhase.total = Object.values(userPhase).reduce((a, b) => a + b, 0) - userPhase.total;
  
  // VRF 回調階段（Chainlink 支付）
  const vrfPhase = {
    baseTx: GAS_COSTS.VRF_CALLBACK_BASE,
    updateLoop: quantity * (
      GAS_COSTS.SLOAD +                        // 讀取 tokenId
      GAS_COSTS.SSTORE_UPDATE * 2 +            // 更新 heroData
      GAS_COSTS.KECCAK256 * 32                 // hash 運算
    ),
    cleanup: GAS_COSTS.SSTORE_UPDATE * 2,      // 清理 mapping
    events: GAS_COSTS.LOG_BASE + GAS_COSTS.LOG_TOPIC * 2,
    total: 0
  };
  vrfPhase.total = Object.values(vrfPhase).reduce((a, b) => a + b, 0) - vrfPhase.total;
  
  console.log('👤 用戶支付:');
  console.log(`  基礎交易: ${userPhase.baseTx.toLocaleString()} gas`);
  console.log(`  預鑄造循環: ${userPhase.premintLoop.toLocaleString()} gas ⚠️`);
  console.log(`  存儲請求: ${userPhase.storeRequest.toLocaleString()} gas`);
  console.log(`  VRF 請求: ${userPhase.vrfRequest.toLocaleString()} gas`);
  console.log(`  事件記錄: ${userPhase.events.toLocaleString()} gas`);
  console.log(`  小計: ${userPhase.total.toLocaleString()} gas\n`);
  
  console.log('🔗 VRF 回調（Chainlink 支付）:');
  console.log(`  基礎回調: ${vrfPhase.baseTx.toLocaleString()} gas`);
  console.log(`  更新屬性: ${vrfPhase.updateLoop.toLocaleString()} gas`);
  console.log(`  清理存儲: ${vrfPhase.cleanup.toLocaleString()} gas`);
  console.log(`  事件記錄: ${vrfPhase.events.toLocaleString()} gas`);
  console.log(`  小計: ${vrfPhase.total.toLocaleString()} gas\n`);
  
  console.log(`💰 總計: ${(userPhase.total + vrfPhase.total).toLocaleString()} gas`);
  console.log(`  - 用戶實際支付: ${userPhase.total.toLocaleString()} gas ⚠️`);
  console.log(`  - Chainlink 支付: ${vrfPhase.total.toLocaleString()} gas\n`);
  
  return { user: userPhase.total, vrf: vrfPhase.total };
}

// 2.5M Gas 限制分析
function analyzeGasLimit() {
  console.log('\n🚨 2.5M Gas 限制分析');
  console.log('=====================================\n');
  
  const GAS_LIMIT = 2500000;
  
  for (let quantity of [10, 15, 20, 25, 30, 40, 50]) {
    const oldMode = analyzeOldMode(quantity);
    const newMode = analyzeNewMode(quantity);
    
    console.log(`\n📊 鑄造 ${quantity} 個 NFT 的限制檢查:`);
    console.log('-----------------------------------');
    
    // 舊模式
    const oldUserUnderLimit = oldMode.user < GAS_LIMIT;
    const oldVrfUnderLimit = oldMode.vrf < GAS_LIMIT;
    console.log(`舊模式:`);
    console.log(`  用戶交易: ${oldMode.user.toLocaleString()} gas ${oldUserUnderLimit ? '✅' : '❌ 超過限制!'}`);
    console.log(`  VRF 回調: ${oldMode.vrf.toLocaleString()} gas ${oldVrfUnderLimit ? '✅' : '❌ 超過限制!'}`);
    
    // 新模式
    const newUserUnderLimit = newMode.user < GAS_LIMIT;
    const newVrfUnderLimit = newMode.vrf < GAS_LIMIT;
    console.log(`新模式:`);
    console.log(`  用戶交易: ${newMode.user.toLocaleString()} gas ${newUserUnderLimit ? '✅' : '❌ 超過限制!'}`);
    console.log(`  VRF 回調: ${newMode.vrf.toLocaleString()} gas ${newVrfUnderLimit ? '✅' : '❌ 超過限制!'}`);
    
    if (!newUserUnderLimit) {
      console.log(`\n⚠️ 新模式在 ${quantity} 個時用戶交易會超過 2.5M gas 限制！`);
      
      // 計算最大安全數量
      const maxSafe = Math.floor((GAS_LIMIT - 100000) / (newMode.user / quantity));
      console.log(`💡 建議最大批次：${maxSafe} 個 NFT`);
      break;
    }
  }
}

// 執行分析
console.log('=== 詳細對比分析 ===\n');
analyzeOldMode(10);
console.log('\n');
analyzeNewMode(10);
analyzeGasLimit();

console.log('\n\n💡 關鍵發現:');
console.log('1. 新模式將鑄造成本從 VRF 回調轉移到用戶交易');
console.log('2. 用戶需要支付更多 Gas（預先鑄造）');
console.log('3. VRF 回調變得更輕量（只更新屬性）');
console.log('4. 2.5M Gas 限制主要影響用戶交易，不是 VRF 回調');