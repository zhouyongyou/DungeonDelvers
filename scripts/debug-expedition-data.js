// 調試遠征數據
console.log('🔍 檢查遠征追蹤器數據\n');

// 檢查 localStorage 中的遠征結果
const STORAGE_KEY = 'recentExpeditionResults';
const stored = localStorage.getItem(STORAGE_KEY);

console.log('📦 localStorage 檢查:');
console.log(`   鍵: ${STORAGE_KEY}`);

if (stored) {
    try {
        const parsed = JSON.parse(stored);
        console.log(`   ✅ 找到 ${parsed.length} 個遠征記錄`);
        
        parsed.forEach((result, index) => {
            console.log(`\n   記錄 ${index + 1}:`);
            console.log(`      隊伍 ID: ${result.partyId}`);
            console.log(`      成功: ${result.success ? '✅' : '❌'}`);
            console.log(`      獎勵: ${result.reward} SOUL`);
            console.log(`      經驗: ${result.expGained} EXP`);
            console.log(`      時間: ${new Date(result.timestamp).toLocaleString()}`);
        });
    } catch (error) {
        console.log(`   ❌ 解析失敗: ${error.message}`);
    }
} else {
    console.log('   ❌ 沒有找到遠征記錄');
}

// 模擬添加一個測試記錄
console.log('\n🧪 模擬測試數據:');
const testResult = {
    partyId: "1",
    success: true,
    reward: "8751011775470274762281196", // 你提到的獎勵數量
    expGained: 60,
    timestamp: Date.now() - 2 * 60 * 1000 // 2分鐘前
};

console.log('添加測試遠征結果...');
localStorage.setItem(STORAGE_KEY, JSON.stringify([testResult]));
console.log('✅ 測試數據已添加，請刷新頁面查看效果');

// 驗證
const verification = localStorage.getItem(STORAGE_KEY);
if (verification) {
    const verified = JSON.parse(verification);
    console.log(`✅ 驗證成功，現在有 ${verified.length} 個記錄`);
}