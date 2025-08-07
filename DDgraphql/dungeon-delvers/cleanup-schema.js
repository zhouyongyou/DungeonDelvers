#!/usr/bin/env node

/**
 * 清理 schema.graphql 中的 Commit-Reveal 殘留
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'schema.graphql');
let schema = fs.readFileSync(schemaPath, 'utf8');

console.log('🧹 清理 Schema 中的 Commit-Reveal 殘留...\n');

// 要移除的實體
const entitiesToRemove = [
  'MintCommitment',
  'RevealEvent',
  'ForcedRevealEvent',
  'ProxyRevealEvent'
];

// 要從 Hero/Relic 移除的欄位
const fieldsToRemove = [
  'mintCommitment',
  'isRevealed',
  'revealedAt'
];

// 移除整個實體定義
entitiesToRemove.forEach(entity => {
  const entityRegex = new RegExp(`type ${entity}[\\s\\S]*?(?=type|$)`, 'g');
  const matches = schema.match(entityRegex);
  if (matches) {
    console.log(`❌ 移除實體: ${entity}`);
    schema = schema.replace(entityRegex, '');
  }
});

// 從 Player 實體移除相關欄位
const playerFieldsToRemove = [
  'forcedReveals: \\[ForcedRevealEvent!\\] @derivedFrom\\(field: "user"\\)',
  'proxyReveals: \\[ProxyRevealEvent!\\] @derivedFrom\\(field: "user"\\)'
];

playerFieldsToRemove.forEach(field => {
  const fieldRegex = new RegExp(`\\s*${field}\\s*\\n`, 'g');
  if (schema.match(fieldRegex)) {
    console.log(`❌ 從 Player 移除欄位: ${field.split(':')[0]}`);
    schema = schema.replace(fieldRegex, '\n');
  }
});

// 從 Hero 和 Relic 實體移除欄位
['Hero', 'Relic'].forEach(entityName => {
  fieldsToRemove.forEach(field => {
    // 匹配包含註釋的完整行
    const fieldRegex = new RegExp(`\\s*${field}:[^\\n]*\\n`, 'g');
    const matches = schema.match(fieldRegex);
    if (matches) {
      console.log(`❌ 從 ${entityName} 移除欄位: ${field}`);
      schema = schema.replace(fieldRegex, '\n');
    }
  });
});

// 添加 VRF 相關實體
const vrfEntities = `
# ===== V25 VRF 實體 =====

type VRFRequest @entity {
  id: ID! # requestId
  requestId: BigInt!
  requester: Bytes! # 合約地址
  user: Bytes # 用戶地址（如果可以確定）
  requestType: String! # MINT, EXPEDITION, UPGRADE
  fulfilled: Boolean!
  randomWords: [BigInt!]
  createdAt: BigInt!
  fulfilledAt: BigInt
  txHash: Bytes!
}

type VRFAuthorization @entity {
  id: ID! # contract address
  contract: Bytes!
  authorized: Boolean!
  updatedAt: BigInt!
}

type VRFStats @entity {
  id: ID! # "global"
  totalRequests: BigInt!
  fulfilledRequests: BigInt!
  pendingRequests: BigInt!
  lastRequestAt: BigInt!
  lastFulfilledAt: BigInt!
}
`;

// 檢查是否已經有 VRF 實體
if (!schema.includes('type VRFRequest')) {
  console.log('\n✅ 添加 VRF 實體');
  schema += vrfEntities;
}

// 為 Hero 和 Relic 添加 vrfRequestId 欄位
['Hero', 'Relic'].forEach(entityName => {
  const entityRegex = new RegExp(`(type ${entityName}[\\s\\S]*?)(\\n})`);
  const match = schema.match(entityRegex);
  
  if (match && !match[0].includes('vrfRequestId')) {
    console.log(`✅ 為 ${entityName} 添加 vrfRequestId`);
    schema = schema.replace(
      entityRegex,
      `$1  vrfRequestId: BigInt # VRF 請求 ID\n$2`
    );
  }
});

// 清理多餘的空行
schema = schema.replace(/\n{3,}/g, '\n\n');

// 保存清理後的 schema
fs.writeFileSync(schemaPath, schema);

console.log('\n✅ Schema 清理完成！');
console.log('📝 已移除所有 Commit-Reveal 殘留');
console.log('✨ 已添加 VRF 相關實體');