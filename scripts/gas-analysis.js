// Gas 成本分析：預先鑄造 vs 延遲鑄造

// 基礎成本（單位：gas）
const BASE_MINT_COST = 80000;        // _safeMint 基礎成本
const STORAGE_SLOT_WRITE = 20000;    // 寫入新存儲槽
const STORAGE_SLOT_UPDATE = 5000;    // 更新現有存儲槽
const ARRAY_PUSH = 50000;            // 動態數組 push 操作
const MAPPING_WRITE = 20000;         // mapping 寫入
const VRF_CALLBACK_BASE = 21000;     // VRF 回調基礎成本

// 舊模式（延遲鑄造）
function calculateOldModeGas(quantity) {
  const requestPhase = 21000 + STORAGE_SLOT_WRITE * 2; // 請求階段
  const revealPhase = VRF_CALLBACK_BASE + (BASE_MINT_COST * quantity);
  return {
    request: requestPhase,
    reveal: revealPhase,
    total: requestPhase + revealPhase
  };
}

// 新模式（預先鑄造）
function calculateNewModeGas(quantity) {
  // 預先鑄造所有 NFT
  const mintPhase = 21000 + (BASE_MINT_COST * quantity) + (ARRAY_PUSH * quantity);
  // VRF 回調只更新屬性
  const callbackPhase = VRF_CALLBACK_BASE + (STORAGE_SLOT_UPDATE * quantity * 2);
  return {
    mint: mintPhase,
    callback: callbackPhase,
    total: mintPhase + callbackPhase
  };
}

// 比較分析
console.log('🔍 Gas 成本分析（單位：gas）\n');
console.log('=====================================');

const quantities = [1, 5, 10, 20, 50];

quantities.forEach(qty => {
  const oldMode = calculateOldModeGas(qty);
  const newMode = calculateNewModeGas(qty);
  const diff = newMode.total - oldMode.total;
  const diffPercent = ((diff / oldMode.total) * 100).toFixed(1);
  
  console.log(`\n📊 鑄造 ${qty} 個 NFT:`);
  console.log('-------------------');
  console.log(`舊模式總成本: ${oldMode.total.toLocaleString()} gas`);
  console.log(`  - 請求階段: ${oldMode.request.toLocaleString()} gas`);
  console.log(`  - 揭示階段: ${oldMode.reveal.toLocaleString()} gas`);
  console.log(`新模式總成本: ${newMode.total.toLocaleString()} gas`);
  console.log(`  - 鑄造階段: ${newMode.mint.toLocaleString()} gas`);
  console.log(`  - 回調階段: ${newMode.callback.toLocaleString()} gas`);
  console.log(`差異: ${diff > 0 ? '+' : ''}${diff.toLocaleString()} gas (${diff > 0 ? '+' : ''}${diffPercent}%)`);
  
  // BNB 成本估算（假設 gas price = 3 gwei）
  const bnbCost = (newMode.total * 3 * 0.000000001).toFixed(6);
  const usdCost = (bnbCost * 600).toFixed(2); // 假設 BNB = $600
  console.log(`💰 預估成本: ${bnbCost} BNB (~$${usdCost} USD)`);
});

console.log('\n=====================================');
console.log('\n⚠️ 注意事項：');
console.log('1. 實際 gas 會因網路狀況波動');
console.log('2. 新模式在 VRF 回調失敗時，NFT 已鑄造但無屬性');
console.log('3. 建議實施緊急恢復機制處理回調失敗');