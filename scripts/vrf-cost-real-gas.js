// VRF 成本分析 - 真實 BSC Gas Price (0.11 Gwei)

console.log('💰 VRF 成本分析（真實 BSC Gas Price）\n');
console.log('=====================================\n');

// 價格參數
const LINK_PRICE_USD = 15;     // $15/LINK
const BNB_PRICE_USD = 600;      // $600/BNB
const GAS_PRICE_GWEI = 0.11;    // 0.11 gwei (BSC 實際價格) ⚠️

console.log(`📊 當前參數：`);
console.log(`  LINK: $${LINK_PRICE_USD}/LINK`);
console.log(`  BNB: $${BNB_PRICE_USD}/BNB`);
console.log(`  Gas Price: ${GAS_PRICE_GWEI} Gwei (BSC 實際)\n`);

// 計算函數
function calculateCosts(quantity) {
  // 舊模式
  const oldUserGas = 112756;  // 用戶交易
  const oldVrfGas = 1433375 + (quantity - 10) * 141125;  // VRF 回調
  
  // 新模式  
  const newUserGas = 1822250 + (quantity - 10) * 170000;  // 用戶交易
  const newVrfGas = 162725 + (quantity - 10) * 13060;     // VRF 回調
  
  // LINK 消耗計算（VRF 回調成本）
  const oldLinkCost = (oldVrfGas * GAS_PRICE_GWEI * 0.000000001 * BNB_PRICE_USD) / LINK_PRICE_USD;
  const newLinkCost = (newVrfGas * GAS_PRICE_GWEI * 0.000000001 * BNB_PRICE_USD) / LINK_PRICE_USD;
  
  // BNB 成本計算（用戶支付）
  const oldUserBnb = oldUserGas * GAS_PRICE_GWEI * 0.000000001;
  const newUserBnb = newUserGas * GAS_PRICE_GWEI * 0.000000001;
  
  return {
    oldMode: {
      userGas: oldUserGas,
      vrfGas: oldVrfGas,
      userBnb: oldUserBnb,
      userUsd: oldUserBnb * BNB_PRICE_USD,
      linkCost: oldLinkCost,
      linkUsd: oldLinkCost * LINK_PRICE_USD
    },
    newMode: {
      userGas: newUserGas,
      vrfGas: newVrfGas,
      userBnb: newUserBnb,
      userUsd: newUserBnb * BNB_PRICE_USD,
      linkCost: newLinkCost,
      linkUsd: newLinkCost * LINK_PRICE_USD
    }
  };
}

// 分析不同數量
console.log('🎮 不同數量的成本對比：\n');

const quantities = [1, 5, 10, 20, 30, 50];

for (const qty of quantities) {
  const costs = calculateCosts(qty);
  const linkSaved = costs.oldMode.linkCost - costs.newMode.linkCost;
  const linkSavedPercent = ((linkSaved / costs.oldMode.linkCost) * 100).toFixed(1);
  const userCostIncrease = costs.newMode.userUsd - costs.oldMode.userUsd;
  
  console.log(`📦 鑄造 ${qty} 個 NFT：`);
  console.log('-----------------------------------');
  
  console.log('舊模式：');
  console.log(`  用戶支付: ${costs.oldMode.userBnb.toFixed(6)} BNB ($${costs.oldMode.userUsd.toFixed(3)} USD)`);
  console.log(`  LINK 消耗: ${costs.oldMode.linkCost.toFixed(6)} LINK ($${costs.oldMode.linkUsd.toFixed(3)})`);
  
  console.log('新模式：');
  console.log(`  用戶支付: ${costs.newMode.userBnb.toFixed(6)} BNB ($${costs.newMode.userUsd.toFixed(3)} USD)`);
  console.log(`  LINK 消耗: ${costs.newMode.linkCost.toFixed(6)} LINK ($${costs.newMode.linkUsd.toFixed(3)})`);
  
  console.log(`影響：`);
  console.log(`  用戶多付: $${userCostIncrease.toFixed(3)} USD`);
  console.log(`  LINK 節省: ${linkSavedPercent}%\n`);
}

// 實際成本對比表
console.log('\n📊 實際成本速查表（0.11 Gwei）：');
console.log('=====================================\n');
console.log('| 數量 | 用戶成本(舊) | 用戶成本(新) | 差異 |');
console.log('|------|-------------|-------------|------|');

for (const qty of [1, 5, 10, 20, 50]) {
  const costs = calculateCosts(qty);
  const diff = costs.newMode.userUsd - costs.oldMode.userUsd;
  console.log(`| ${qty.toString().padStart(2)} 個 | $${costs.oldMode.userUsd.toFixed(3).padStart(6)} | $${costs.newMode.userUsd.toFixed(3).padStart(6)} | +$${diff.toFixed(3).padStart(5)} |`);
}

// 月度預測
console.log('\n\n📈 月度運營成本（每天 100 次，平均 20 個）：');
console.log('=====================================\n');

const dailyMints = 100;
const avgQuantity = 20;
const monthlyMints = dailyMints * 30;

const monthlyCosts = calculateCosts(avgQuantity);
const monthlyLinkSaved = (monthlyCosts.oldMode.linkCost - monthlyCosts.newMode.linkCost) * monthlyMints;

console.log(`舊模式：${(monthlyCosts.oldMode.linkCost * monthlyMints).toFixed(2)} LINK/月 ($${(monthlyCosts.oldMode.linkUsd * monthlyMints).toFixed(0)})`);
console.log(`新模式：${(monthlyCosts.newMode.linkCost * monthlyMints).toFixed(2)} LINK/月 ($${(monthlyCosts.newMode.linkUsd * monthlyMints).toFixed(0)})`);
console.log(`\n節省：${monthlyLinkSaved.toFixed(2)} LINK/月 ($${(monthlyLinkSaved * LINK_PRICE_USD).toFixed(0)})`);

// 關鍵洞察
console.log('\n\n🔥 關鍵發現（BSC 真實 Gas Price）：');
console.log('=====================================\n');

console.log('1. 💸 用戶成本極低（50個僅 $0.57）');
console.log('2. 📉 LINK 節省依然顯著（90%）');
console.log('3. ✅ 完全不需要擔心用戶負擔');
console.log('4. 🎮 可以放心鑄造 50 個');
console.log('5. 🚀 這是完美的成本結構！');

console.log('\n💡 結論：');
console.log('在 BSC 的低 Gas 環境下（0.11 Gwei），');
console.log('新模式幾乎沒有缺點！用戶成本微不足道，');
console.log('但項目方節省大量 LINK。完美方案！');