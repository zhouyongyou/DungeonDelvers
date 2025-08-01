#!/usr/bin/env node

/**
 * V25 VirtualTaxCollected 事件測試腳本
 * 
 * 驗證子圖配置是否正確設置來處理新的虛擬稅收事件
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 V25 VirtualTaxCollected 事件配置檢查');
console.log('='.repeat(50));

// 1. 檢查 subgraph.yaml 配置
console.log('\n📋 檢查 subgraph.yaml...');
const subgraphYaml = fs.readFileSync('./subgraph.yaml', 'utf8');

// 檢查 PlayerVault 地址
const playerVaultMatch = subgraphYaml.match(/address: '(0x[a-fA-F0-9]{40})'/g);
const expectedPlayerVault = '0x8c3A73E27C518f082150330e5666e765B52297AF';

console.log('合約地址檢查:');
playerVaultMatch.forEach(match => {
  const address = match.replace("address: '", '').replace("'", '');
  if (address === expectedPlayerVault) {
    console.log(`✅ PlayerVault: ${address}`);
  } else {
    console.log(`📝 其他合約: ${address}`);
  }
});

// 檢查事件處理器
const hasVirtualTaxEvent = subgraphYaml.includes('VirtualTaxCollected(uint256)');
const hasVirtualTaxHandler = subgraphYaml.includes('handleVirtualTaxCollected');

console.log('\n事件配置檢查:');
console.log(`${hasVirtualTaxEvent ? '✅' : '❌'} VirtualTaxCollected 事件映射`);
console.log(`${hasVirtualTaxHandler ? '✅' : '❌'} handleVirtualTaxCollected 處理器`);

// 2. 檢查 schema.graphql
console.log('\n📊 檢查 schema.graphql...');
const schema = fs.readFileSync('./schema.graphql', 'utf8');

const hasVirtualTaxRecord = schema.includes('type VirtualTaxRecord');
const hasTaxStatistics = schema.includes('type TaxStatistics');

console.log('Schema 實體檢查:');
console.log(`${hasVirtualTaxRecord ? '✅' : '❌'} VirtualTaxRecord 實體`);
console.log(`${hasTaxStatistics ? '✅' : '❌'} TaxStatistics 實體`);

// 3. 檢查 mapping 實現
console.log('\n🔧 檢查 player-vault.ts...');
const mapping = fs.readFileSync('./src/player-vault.ts', 'utf8');

const hasImportVirtualTaxRecord = mapping.includes('VirtualTaxRecord');
const hasImportTaxStatistics = mapping.includes('TaxStatistics');
const hasHandlerImplementation = mapping.includes('export function handleVirtualTaxCollected');
const hasRecordCreation = mapping.includes('new VirtualTaxRecord');
const hasStatsUpdate = mapping.includes('TaxStatistics.load("global")');

console.log('Mapping 實現檢查:');
console.log(`${hasImportVirtualTaxRecord ? '✅' : '❌'} VirtualTaxRecord 導入`);
console.log(`${hasImportTaxStatistics ? '✅' : '❌'} TaxStatistics 導入`);
console.log(`${hasHandlerImplementation ? '✅' : '❌'} 處理器函數實現`);
console.log(`${hasRecordCreation ? '✅' : '❌'} 記錄創建邏輯`);
console.log(`${hasStatsUpdate ? '✅' : '❌'} 統計更新邏輯`);

// 4. 檢查 ABI 文件
console.log('\n📄 檢查 PlayerVault ABI...');
const abiPath = './abis/PlayerVault.json';
if (fs.existsSync(abiPath)) {
  const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  const hasVirtualTaxEvent = abi.some(item => 
    item.type === 'event' && item.name === 'VirtualTaxCollected'
  );
  
  console.log(`${hasVirtualTaxEvent ? '✅' : '❌'} PlayerVault ABI 包含 VirtualTaxCollected 事件`);
  
  if (hasVirtualTaxEvent) {
    const event = abi.find(item => item.name === 'VirtualTaxCollected');
    console.log(`   事件簽名: VirtualTaxCollected(${event.inputs.map(i => i.type).join(',')})`);
  }
} else {
  console.log('❌ PlayerVault ABI 文件不存在');
}

// 5. 總結
console.log('\n🎯 配置總結:');
const allChecks = [
  hasVirtualTaxEvent,
  hasVirtualTaxHandler,
  hasVirtualTaxRecord,
  hasTaxStatistics,
  hasHandlerImplementation,
  hasRecordCreation,
  hasStatsUpdate
];

const passedChecks = allChecks.filter(Boolean).length;
const totalChecks = allChecks.length;

console.log(`通過檢查: ${passedChecks}/${totalChecks}`);

if (passedChecks === totalChecks) {
  console.log('🎉 所有配置正確！可以執行 npm run codegen && npm run build');
} else {
  console.log('⚠️  發現配置問題，請檢查上述失敗項目');
}

// 6. 下一步建議
console.log('\n📝 下一步操作:');
console.log('1. npm run codegen     # 重新生成 TypeScript 類型');
console.log('2. npm run build       # 構建子圖');
console.log('3. npm run deploy      # 部署到 The Graph');
console.log('\n或者使用一鍵命令:');
console.log('npm run codegen && npm run build && npm run deploy');

console.log('\n🔍 GraphQL 查詢範例:');
console.log(`
query GetVirtualTaxRecords {
  virtualTaxRecords(
    first: 10
    orderBy: timestamp
    orderDirection: desc
  ) {
    id
    amount
    timestamp
    transactionHash
  }
}

query GetTaxStatistics {
  taxStatistics(id: "global") {
    totalVirtualTaxCollected
    totalTaxRecords
    lastUpdated
  }
}
`);