// 檢查 GraphQL 查詢與子圖 schema 的一致性

// 已知的子圖實體和欄位（基於錯誤訊息推斷）
const KNOWN_SCHEMA = {
  Hero: {
    fields: ['id', 'tokenId', 'owner', 'power'], // 沒有 tier
    relationships: []
  },
  Relic: {
    fields: ['id', 'tokenId', 'owner', 'category', 'capacity'], // 沒有 tier
    relationships: []
  },
  VIP: {
    fields: ['id'], // 沒有 stakingAmount
    relationships: []
  },
  Player: {
    fields: ['id'],
    relationships: ['profile', 'heros', 'relics', 'parties', 'vip', 'vault', 'stats']
  },
  Party: {
    fields: ['id', 'unclaimedRewards', 'tokenId', 'owner'],
    relationships: ['heros', 'relics']
  },
  Expedition: {
    fields: ['id', 'status', 'party', 'dungeon', 'startTime', 'endTime'],
    relationships: []
  }
};

// 常見的問題欄位
export const PROBLEMATIC_FIELDS = {
  Hero: ['tier', 'level', 'experience'],
  Relic: ['tier', 'level'],
  VIP: ['stakingAmount', 'stakedAmount', 'stakingTime'],
  Party: ['power', 'totalPower'],
  Player: ['address', 'wallet']
};

// 檢查查詢字符串中的欄位
export function checkQueryFields(query: string): { entity: string; field: string; isValid: boolean }[] {
  const issues: { entity: string; field: string; isValid: boolean }[] = [];
  
  // 簡單的正則匹配來找出實體和欄位
  const entityMatches = query.match(/(\w+)\s*\{[^}]+\}/g) || [];
  
  entityMatches.forEach(match => {
    const entityName = match.match(/^(\w+)/)?.[1];
    if (!entityName) return;
    
    // 找出欄位
    const fields = match.match(/\b(\w+)(?:\s*\{|\s*$)/g) || [];
    
    fields.forEach(field => {
      const fieldName = field.trim().replace(/\s*\{$/, '');
      
      // 檢查已知問題欄位
      Object.entries(PROBLEMATIC_FIELDS).forEach(([entity, problematicFields]) => {
        if (entityName.toLowerCase().includes(entity.toLowerCase()) && 
            problematicFields.includes(fieldName)) {
          issues.push({
            entity: entityName,
            field: fieldName,
            isValid: false
          });
        }
      });
    });
  });
  
  return issues;
}

// 輸出所有查詢的潛在問題
export function generateReport(queries: { file: string; query: string }[]): string {
  let report = '# GraphQL 查詢一致性檢查報告\n\n';
  
  queries.forEach(({ file, query }) => {
    const issues = checkQueryFields(query);
    if (issues.length > 0) {
      report += `## ${file}\n`;
      issues.forEach(issue => {
        report += `- ❌ ${issue.entity}.${issue.field} - 此欄位可能不存在於子圖 schema\n`;
      });
      report += '\n';
    }
  });
  
  report += '\n## 建議修復的欄位\n';
  Object.entries(PROBLEMATIC_FIELDS).forEach(([entity, fields]) => {
    report += `\n### ${entity}\n`;
    fields.forEach(field => {
      report += `- ${field}\n`;
    });
  });
  
  return report;
}