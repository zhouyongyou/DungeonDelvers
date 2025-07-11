// fix_vip_level.cjs
// 檢查和修復VIP等級計算問題

const fs = require('fs');

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

console.log('🔍 VIP等級計算問題診斷\n');

console.log('📋 合約地址:');
console.log(`VIP Staking: ${env.VITE_MAINNET_VIPSTAKING_ADDRESS}`);
console.log(`Dungeon Core: ${env.VITE_MAINNET_DUNGEONCORE_ADDRESS}`);
console.log(`Oracle: ${env.VITE_MAINNET_ORACLE_ADDRESS}`);
console.log(`Soul Shard: ${env.VITE_MAINNET_SOUL_SHARD_TOKEN_ADDRESS}`);
console.log(`USD Token: ${env.VITE_MAINNET_USD_TOKEN_ADDRESS}`);

console.log('\n🔧 問題分析:');

console.log('\n1. VIP等級計算邏輯:');
console.log('   - Oracle.getAmountOut() 回傳 18位小數的USD值');
console.log('   - DungeonCore.usdDecimals() 也是 18');
console.log('   - usdValue = stakedValueUSD / (10^18)');
console.log('   - 如果 stakedValueUSD < 10^18，結果會是 0');

console.log('\n2. 可能的問題:');
console.log('   - Oracle 價格計算錯誤');
console.log('   - USD token decimals 設定錯誤');
console.log('   - 質押金額太小，導致USD值 < 100');

console.log('\n3. 建議的修復方案:');
console.log('   a) 檢查 Oracle 價格是否正確');
console.log('   b) 確認 USD token decimals 設定');
console.log('   c) 調整等級計算邏輯，使用更精確的計算');

console.log('\n4. 測試步驟:');
console.log('   a) 檢查 Oracle 的 getSoulShardPriceInUSD()');
console.log('   b) 檢查 DungeonCore 的 usdDecimals()');
console.log('   c) 測試 VIP 等級計算');
console.log('   d) 檢查 PlayerProfile 等級計算');

console.log('\n📝 修復建議:');

console.log('\n1. 修改 VIPStaking.sol 的 getVipLevel 函式:');
console.log(`
function getVipLevel(address _user) public view returns (uint8) {
    uint256 stakedAmount = userStakes[_user].amount;
    if (stakedAmount == 0 || address(dungeonCore) == address(0)) return 0;
    
    uint256 stakedValueUSD = IOracle(dungeonCore.oracle()).getAmountOut(
        address(soulShardToken), stakedAmount
    );
    
    // 直接使用 18位小數進行計算，避免精度損失
    uint256 usdValueInCents = stakedValueUSD / 1e16; // 轉換為美分 (2位小數)
    
    if (usdValueInCents < 10000) return 0; // 100 USD = 10000 美分
    uint256 level = Math.sqrt(usdValueInCents / 10000);
    return uint8(level);
}
`);

console.log('\n2. 或者使用更精確的計算:');
console.log(`
function getVipLevel(address _user) public view returns (uint8) {
    uint256 stakedAmount = userStakes[_user].amount;
    if (stakedAmount == 0 || address(dungeonCore) == address(0)) return 0;
    
    uint256 stakedValueUSD = IOracle(dungeonCore.oracle()).getAmountOut(
        address(soulShardToken), stakedAmount
    );
    
    // 使用 6位小數精度 (1 USD = 1,000,000)
    uint256 usdValueScaled = stakedValueUSD / 1e12;
    
    if (usdValueScaled < 100000000) return 0; // 100 USD
    uint256 level = Math.sqrt(usdValueScaled / 100000000);
    return uint8(level);
}
`);

console.log('\n3. 檢查 Oracle 價格計算:');
console.log('   - 確認 getSoulShardPriceInUSD() 回傳正確的價格');
console.log('   - 確認 TWAP 計算正確');
console.log('   - 確認 pool 地址和 token 順序正確');

console.log('\n4. 檢查 DungeonCore 設定:');
console.log('   - 確認 usdDecimals 設定正確');
console.log('   - 確認所有合約地址已正確設定');

console.log('\n🚀 下一步行動:');
console.log('1. 使用前端或區塊鏈瀏覽器檢查 Oracle 價格');
console.log('2. 檢查 VIP 用戶的實際質押金額');
console.log('3. 手動計算預期的等級');
console.log('4. 如果需要，部署修復後的合約');
console.log('5. 更新 metadata server 的等級計算邏輯'); 