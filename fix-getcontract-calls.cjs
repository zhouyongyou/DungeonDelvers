#!/usr/bin/env node

/**
 * 修復腳本：將所有錯誤的 getContract(chainId, name) 調用修正為 getContract(name)
 * 
 * 問題：當前的 getContract 函數簽名為 (name: string): string
 * 但很多地方在使用 getContract(chainId, name) 的錯誤調用方式
 */

const fs = require('fs');
const path = require('path');

// 需要修復的文件列表
const filesToFix = [
  'src/pages/DashboardPage.tsx',
  'src/pages/AltarPage.tsx', 
  'src/pages/ExplorerPage.tsx',
  'src/pages/ReferralPage.tsx',
  'src/pages/DebugContractPage.tsx',
  'src/pages/MyAssetsPage.tsx',
  'src/pages/ProfilePage.tsx',
  'src/pages/DungeonPage.tsx',
  'src/hooks/useVipStatus.ts',
  'src/hooks/useAdminData.ts',
  'src/hooks/useContractEvents.fixed.ts',
  'src/hooks/useContractEvents.optimized.ts',
  'src/hooks/usePartyValidation.ts',
  'src/hooks/useBatchOperations.ts',
  'src/hooks/useRewardManager.ts',
  'src/components/layout/Footer.tsx',
  'src/components/V3MigrationNotice.tsx',
  'src/components/V3AuthorizationNotice.tsx',
  'src/components/ExpeditionTracker.tsx',
  'src/components/ui/NftCard.tsx',
  'src/components/admin/GlobalRewardSettings.tsx',
  'src/components/admin/VipSettingsManager.tsx',
  'src/components/admin/DungeonManager.tsx',
  'src/components/admin/VipSettingsManagerDark.tsx',
  'src/components/admin/ExpeditionTestComponent.tsx',
  'src/components/admin/AltarRuleManager.tsx',
  'src/components/admin/FundsWithdrawal.tsx',
  'src/utils/partyOwnershipChecker.ts',
  'src/utils/adminConfigValidator.ts',
  'src/utils/vipTesting.ts',
  'src/utils/adminPageDiagnostic.ts',
  'src/utils/adminPageDebugger.ts'
];

// 合約名稱映射 - 從 legacy 名稱映射到 CONTRACT_ADDRESSES 鍵
const contractNameMapping = {
  'dungeonCore': 'DUNGEONCORE',
  'playerVault': 'PLAYERVAULT', 
  'vipStaking': 'VIPSTAKING',
  'playerProfile': 'PLAYERPROFILE',
  'altarOfAscension': 'ALTAROFASCENSION',
  'dungeonMaster': 'DUNGEONMASTER',
  'dungeonStorage': 'DUNGEONSTORAGE',
  'hero': 'HERO',
  'relic': 'RELIC',
  'party': 'PARTY',
  'soulShard': 'SOULSHARD',
  'oracle': 'ORACLE',
  'DUNGEONCORE': 'DUNGEONCORE',
  'ORACLE': 'ORACLE',
  'HERO': 'HERO',
  'RELIC': 'RELIC',
  'PARTY': 'PARTY',
  'DUNGEONMASTER': 'DUNGEONMASTER',
  'DUNGEONSTORAGE': 'DUNGEONSTORAGE',
  'ALTAROFASCENSION': 'ALTAROFASCENSION',
  'PLAYERVAULT': 'PLAYERVAULT',
  'VIPSTAKING': 'VIPSTAKING',
  'PLAYERPROFILE': 'PLAYERPROFILE',
  'SOULSHARD': 'SOULSHARD',
  'USD': 'USD',
  'UNISWAP_POOL': 'UNISWAP_POOL',
  'DUNGEONMASTERWALLET': 'DUNGEONMASTERWALLET'
};

function fixFile(filePath) {
  const fullPath = path.join('/Users/sotadic/Documents/GitHub/DungeonDelvers', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️ 文件不存在：${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let hasChanges = false;

  // 正則表達式匹配 getContract(chainId, 'contractName') 或 getContract(chainId, name)
  const patterns = [
    // 匹配 getContract(chainId, 'contractName')
    /getContract\s*\(\s*[^,]+\s*,\s*['"`]([^'"`]+)['"`]\s*\)/g,
    // 匹配 getContract(chainId, variableName)
    /getContract\s*\(\s*[^,]+\s*,\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\)/g
  ];

  patterns.forEach(pattern => {
    content = content.replace(pattern, (match, contractName) => {
      // 映射合約名稱
      const mappedName = contractNameMapping[contractName] || contractName.toUpperCase();
      
      console.log(`  📝 ${match} -> getContract('${mappedName}')`);
      hasChanges = true;
      return `getContract('${mappedName}')`;
    });
  });

  if (hasChanges) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ 已修復：${filePath}`);
  } else {
    console.log(`⭕ 無需修復：${filePath}`);
  }
}

console.log('🔧 開始修復 getContract 調用...\n');

filesToFix.forEach(filePath => {
  console.log(`\n🔍 檢查：${filePath}`);
  fixFile(filePath);
});

console.log('\n🎉 修復完成！');
console.log('\n⚠️ 注意：');
console.log('1. 請檢查修復結果是否正確');
console.log('2. 某些特殊情況可能需要手動調整');
console.log('3. 建議運行測試確保功能正常');