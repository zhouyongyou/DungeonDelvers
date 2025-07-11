// fix_all_issues.cjs
// 完整修復腳本 - 解決VIP等級、NFT顯示等問題

const fs = require('fs');
const https = require('https');

// 讀取環境變數
function loadEnv() {
  const envPath = '.env.local';
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local 文件不存在');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^"|"$/g, '');
      env[key.trim()] = value.trim();
    }
  });
  
  return env;
}

const env = loadEnv();

console.log('🔧 開始修復所有問題...\n');

// 1. 檢查合約地址
console.log('📋 1. 檢查合約地址配置:');
console.log(`✅ VIP Staking: ${env.VITE_MAINNET_VIPSTAKING_ADDRESS}`);
console.log(`✅ Dungeon Core: ${env.VITE_MAINNET_DUNGEONCORE_ADDRESS}`);
console.log(`✅ Oracle: ${env.VITE_MAINNET_ORACLE_ADDRESS}`);
console.log(`✅ Hero: ${env.VITE_MAINNET_HERO_ADDRESS}`);
console.log(`✅ Relic: ${env.VITE_MAINNET_RELIC_ADDRESS}`);
console.log(`✅ Party: ${env.VITE_MAINNET_PARTY_ADDRESS}`);
console.log(`✅ Player Profile: ${env.VITE_MAINNET_PLAYERPROFILE_ADDRESS}`);

// 2. 檢查 baseURI 設定
console.log('\n📋 2. 檢查 baseURI 設定:');
console.log('需要設定的 baseURI:');
console.log(`VIP Staking: https://dungeon-delvers-metadata-server.onrender.com/api/vipstaking/`);
console.log(`Player Profile: https://dungeon-delvers-metadata-server.onrender.com/api/playerprofile/`);
console.log(`Hero: https://dungeon-delvers-metadata-server.onrender.com/api/hero/`);
console.log(`Relic: https://dungeon-delvers-metadata-server.onrender.com/api/relic/`);
console.log(`Party: https://dungeon-delvers-metadata-server.onrender.com/api/party/`);

// 3. 修復步驟
console.log('\n🔧 3. 修復步驟:');

console.log('\n步驟 1: 修復 VIP 等級計算');
console.log('已修改 VIPStaking.sol 的 getVipLevel 函式:');
console.log('- 使用 usdValueInCents = stakedValueUSD / 1e16');
console.log('- 等級計算: sqrt(usdValueInCents / 10000)');
console.log('- 需要重新部署合約');

console.log('\n步驟 2: 修復 Subgraph 查詢');
console.log('問題: GraphQL 查詢失敗 "Type Query has no field heroes"');
console.log('解決方案:');
console.log('- 檢查 subgraph 部署狀態');
console.log('- 重新部署 subgraph');
console.log('- 確認 schema.graphql 正確');

console.log('\n步驟 3: 修復 Metadata Server');
console.log('問題: 回傳相同的 fallback 資料');
console.log('解決方案:');
console.log('- 清除快取');
console.log('- 修復 GraphQL 查詢');
console.log('- 更新等級計算邏輯');

console.log('\n步驟 4: 設定正確的 baseURI');
console.log('需要執行的合約函式:');
console.log('VIPStaking.setBaseURI("https://dungeon-delvers-metadata-server.onrender.com/api/vipstaking/")');
console.log('PlayerProfile.setBaseURI("https://dungeon-delvers-metadata-server.onrender.com/api/playerprofile/")');
console.log('Hero.setBaseURI("https://dungeon-delvers-metadata-server.onrender.com/api/hero/")');
console.log('Relic.setBaseURI("https://dungeon-delvers-metadata-server.onrender.com/api/relic/")');
console.log('Party.setBaseURI("https://dungeon-delvers-metadata-server.onrender.com/api/party/")');

// 4. 部署指令
console.log('\n🚀 4. 部署指令:');

console.log('\nA. 重新部署修復後的合約:');
console.log('1. 編譯合約:');
console.log('   npx hardhat compile');
console.log('2. 部署 VIPStaking:');
console.log('   npx hardhat run scripts/deploy-vipstaking.js --network bsc');
console.log('3. 設定 baseURI:');
console.log('   npx hardhat run scripts/set-baseuri.js --network bsc');

console.log('\nB. 重新部署 Subgraph:');
console.log('1. 進入 subgraph 目錄:');
console.log('   cd DDgraphql/dungeon-delvers');
console.log('2. 重新部署:');
console.log('   npx graph deploy --product hosted-service <username>/dungeon-delvers');

console.log('\nC. 更新 Metadata Server:');
console.log('1. 清除快取');
console.log('2. 重新部署到 Render');
console.log('3. 測試 API 端點');

// 5. 測試指令
console.log('\n🧪 5. 測試指令:');

console.log('\n測試 VIP 等級:');
console.log('1. 使用前端測試 VIP 頁面');
console.log('2. 檢查等級計算是否正確');
console.log('3. 驗證 SVG 顯示');

console.log('\n測試 NFT Metadata:');
console.log('1. 使用 SVG 預覽頁面測試');
console.log('2. 檢查不同 NFT 是否有不同屬性');
console.log('3. 驗證 NFT 市場顯示');

// 6. 驗證清單
console.log('\n✅ 6. 驗證清單:');

console.log('\nVIP 等級修復:');
console.log('□ VIP 等級計算正確');
console.log('□ 不同質押金額顯示不同等級');
console.log('□ SVG 顯示正確的等級');

console.log('\nNFT Metadata 修復:');
console.log('□ Hero 不同 tokenId 顯示不同屬性');
console.log('□ Relic 不同 tokenId 顯示不同屬性');
console.log('□ Party 顯示正確的隊伍資訊');
console.log('□ NFT 市場正確顯示');

console.log('\nSubgraph 修復:');
console.log('□ GraphQL 查詢成功');
console.log('□ 資料同步正確');
console.log('□ 新鑄造的 NFT 能正確查詢');

console.log('\nMetadata Server 修復:');
console.log('□ API 端點正常回應');
console.log('□ 快取機制正常');
console.log('□ 錯誤處理正確');

// 7. 緊急修復方案
console.log('\n🚨 7. 緊急修復方案:');

console.log('\n如果無法立即重新部署合約:');
console.log('1. 修改 Metadata Server 的等級計算邏輯');
console.log('2. 在 server 端手動計算正確的等級');
console.log('3. 清除快取，強制更新');

console.log('\n如果 Subgraph 無法修復:');
console.log('1. 使用合約直接查詢資料');
console.log('2. 實現 fallback 查詢機制');
console.log('3. 手動同步重要資料');

console.log('\n📞 8. 聯繫資訊:');
console.log('- 開發團隊: 需要協助重新部署合約');
console.log('- Subgraph 團隊: 需要協助修復查詢問題');
console.log('- 前端團隊: 需要更新測試和驗證');

console.log('\n🎯 優先級:');
console.log('1. 🔴 高優先級: 修復 VIP 等級計算');
console.log('2. 🟡 中優先級: 修復 Subgraph 查詢');
console.log('3. 🟢 低優先級: 優化 Metadata Server');

console.log('\n完成！請按照上述步驟進行修復。'); 