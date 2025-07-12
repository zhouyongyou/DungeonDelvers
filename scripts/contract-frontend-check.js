#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 檢查配置
const CHECK_CONFIG = {
  // 需要檢查的前端檔案
  frontendFiles: [
    'src/pages/MintPage.tsx',
    'src/pages/ProvisionsPage.tsx',
    'src/pages/MyAssetsPage.tsx',
    'src/pages/VipPage.tsx',
    'src/pages/AltarPage.tsx',
    'src/pages/DungeonPage.tsx',
    'src/pages/ProfilePage.tsx',
    'src/pages/ReferralPage.tsx'
  ],
  
  // 需要檢查的合約檔案
  contractFiles: [
    'contracts/Hero.sol',
    'contracts/Relic.sol',
    'contracts/Party.sol',
    'contracts/DungeonMaster.sol',
    'contracts/PlayerVault.sol',
    'contracts/VIPStaking.sol',
    'contracts/AltarOfAscension.sol',
    'contracts/PlayerProfile.sol'
  ],
  
  // 關鍵合約函數對照表
  contractFunctions: {
    // 鑄造相關
    'mintFromWallet': { contract: 'Hero.sol', params: ['uint256 _quantity'] },
    'mintFromVault': { contract: 'Hero.sol', params: ['uint256 _quantity'] },
    'getRequiredSoulShardAmount': { contract: 'Hero.sol', params: ['uint256 _quantity'] },
    'mintPriceUSD': { contract: 'Hero.sol', params: [] },
    'platformFee': { contract: 'Hero.sol', params: [] },
    
    // 儲備購買
    'buyProvisions': { contract: 'DungeonMaster.sol', params: ['uint256 _partyId', 'uint256 _amount'] },
    'provisionPriceUSD': { contract: 'DungeonMaster.sol', params: [] },
    
    // 隊伍管理
    'createParty': { contract: 'Party.sol', params: ['uint256[] _heroIds', 'uint256[] _relicIds'] },
    'getPartyComposition': { contract: 'Party.sol', params: ['uint256 _partyId'] },
    
    // VIP 相關
    'stake': { contract: 'VIPStaking.sol', params: ['uint256 _amount'] },
    'getVipLevel': { contract: 'VIPStaking.sol', params: ['address _user'] },
    'getVipTaxReduction': { contract: 'VIPStaking.sol', params: ['address _user'] },
    
    // 升級相關
    'upgradeNFTs': { contract: 'AltarOfAscension.sol', params: ['address _tokenContract', 'uint256[] _tokenIds'] },
    'upgradeRules': { contract: 'AltarOfAscension.sol', params: ['uint8'] },
    
    // 探險相關
    'requestExpedition': { contract: 'DungeonMaster.sol', params: ['uint256 _partyId', 'uint256 _dungeonId'] },
    'claimRewards': { contract: 'DungeonMaster.sol', params: ['uint256 _partyId'] },
    'restParty': { contract: 'DungeonMaster.sol', params: ['uint256 _partyId'] },
    
    // 個人資料
    'mintProfile': { contract: 'PlayerProfile.sol', params: ['address _player'] },
    'getExperience': { contract: 'PlayerProfile.sol', params: ['address _player'] },
    'getLevel': { contract: 'PlayerProfile.sol', params: ['address _player'] },
    
    // 金庫相關
    'deposit': { contract: 'PlayerVault.sol', params: ['address _player', 'uint256 _amount'] },
    'withdraw': { contract: 'PlayerVault.sol', params: ['uint256 _amount'] },
    'setReferrer': { contract: 'PlayerVault.sol', params: ['address _referrer'] }
  }
};

// 讀取檔案內容
function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`❌ 無法讀取檔案: ${filePath}`, error.message);
    return null;
  }
}

// 檢查前端檔案中的合約函數使用
function checkFrontendContractUsage() {
  console.log('🔍 檢查前端合約函數使用...\n');
  
  const issues = [];
  
  for (const filePath of CHECK_CONFIG.frontendFiles) {
    const content = readFileContent(filePath);
    if (!content) continue;
    
    console.log(`📄 檢查檔案: ${filePath}`);
    
    // 檢查 useReadContract 和 useWriteContract 的使用
    const readContractMatches = content.match(/useReadContract\s*\(\s*\{[^}]*functionName\s*:\s*['"`]([^'"`]+)['"`]/g);
    const writeContractMatches = content.match(/useWriteContract\s*\(\s*\{[^}]*functionName\s*:\s*['"`]([^'"`]+)['"`]/g);
    
    const allMatches = [...(readContractMatches || []), ...(writeContractMatches || [])];
    
    for (const match of allMatches) {
      const functionName = match.match(/functionName\s*:\s*['"`]([^'"`]+)['"`]/)?.[1];
      if (functionName && CHECK_CONFIG.contractFunctions[functionName]) {
        const expected = CHECK_CONFIG.contractFunctions[functionName];
        console.log(`  ✅ 找到合約函數: ${functionName} (${expected.contract})`);
      } else if (functionName) {
        console.log(`  ⚠️  未知合約函數: ${functionName}`);
        issues.push({
          file: filePath,
          type: 'unknown_function',
          function: functionName
        });
      }
    }
  }
  
  return issues;
}

// 檢查合約檔案中的函數定義
function checkContractFunctions() {
  console.log('\n🔍 檢查合約函數定義...\n');
  
  const contractFunctions = {};
  
  for (const filePath of CHECK_CONFIG.contractFiles) {
    const content = readFileContent(filePath);
    if (!content) continue;
    
    const contractName = path.basename(filePath);
    console.log(`📄 檢查合約: ${contractName}`);
    
    // 提取 public/external 函數
    const functionMatches = content.match(/function\s+(\w+)\s*\([^)]*\)\s*(?:public|external|view|pure)/g);
    
    if (functionMatches) {
      for (const match of functionMatches) {
        const functionName = match.match(/function\s+(\w+)/)?.[1];
        if (functionName) {
          contractFunctions[functionName] = contractName;
          console.log(`  ✅ 找到函數: ${functionName}`);
        }
      }
    }
  }
  
  return contractFunctions;
}

// 檢查 ABI 一致性
function checkAbiConsistency() {
  console.log('\n🔍 檢查 ABI 一致性...\n');
  
  const frontendAbiPath = 'src/config/abis.ts';
  const graphqlAbiPath = 'DDgraphql/dungeon-delvers/abis';
  
  const frontendContent = readFileContent(frontendAbiPath);
  const graphqlFiles = fs.readdirSync(graphqlAbiPath).filter(f => f.endsWith('.json'));
  
  console.log(`📄 前端 ABI 檔案: ${frontendAbiPath}`);
  console.log(`📄 GraphQL ABI 檔案數量: ${graphqlFiles.length}`);
  
  const issues = [];
  
  // 檢查每個 GraphQL ABI 是否在前端 ABI 中有對應
  for (const file of graphqlFiles) {
    const contractName = file.replace('.json', '');
    const expectedVarName = `${contractName.charAt(0).toLowerCase() + contractName.slice(1)}ABI`;
    
    if (frontendContent && frontendContent.includes(expectedVarName)) {
      console.log(`  ✅ ${contractName} ABI 一致`);
    } else {
      console.log(`  ❌ ${contractName} ABI 不一致或缺失`);
      issues.push({
        type: 'abi_mismatch',
        contract: contractName,
        expected: expectedVarName
      });
    }
  }
  
  return issues;
}

// 生成檢查報告
function generateReport(frontendIssues, contractFunctions, abiIssues) {
  console.log('\n📊 檢查報告\n');
  console.log('='.repeat(50));
  
  if (frontendIssues.length === 0 && abiIssues.length === 0) {
    console.log('✅ 所有檢查都通過！前端與合約邏輯一致。');
  } else {
    console.log('⚠️  發現以下問題：\n');
    
    if (frontendIssues.length > 0) {
      console.log('🔴 前端合約使用問題：');
      frontendIssues.forEach(issue => {
        console.log(`  - ${issue.file}: ${issue.function} (${issue.type})`);
      });
    }
    
    if (abiIssues.length > 0) {
      console.log('\n🔴 ABI 一致性问题：');
      abiIssues.forEach(issue => {
        console.log(`  - ${issue.contract}: ${issue.expected} 缺失或不一致`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📈 統計：`);
  console.log(`  - 合約函數總數: ${Object.keys(contractFunctions).length}`);
  console.log(`  - 前端問題數: ${frontendIssues.length}`);
  console.log(`  - ABI 問題數: ${abiIssues.length}`);
}

// 主函數
function main() {
  console.log('🚀 開始合約與前端邏輯一致性檢查...\n');
  
  const frontendIssues = checkFrontendContractUsage();
  const contractFunctions = checkContractFunctions();
  const abiIssues = checkAbiConsistency();
  
  generateReport(frontendIssues, contractFunctions, abiIssues);
  
  // 如果有問題，提供建議
  if (frontendIssues.length > 0 || abiIssues.length > 0) {
    console.log('\n💡 建議：');
    console.log('1. 執行 scripts/sync-abi.js 同步 ABI 檔案');
    console.log('2. 檢查前端合約函數名稱是否正確');
    console.log('3. 確認合約參數型別是否匹配');
    console.log('4. 測試所有合約互動功能');
  }
  
  console.log('\n✅ 檢查完成！');
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  checkFrontendContractUsage,
  checkContractFunctions,
  checkAbiConsistency
}; 