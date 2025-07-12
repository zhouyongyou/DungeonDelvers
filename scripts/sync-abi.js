#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 合約與 ABI 對應表
const CONTRACT_ABI_MAP = {
  'Hero.sol': 'heroABI',
  'Relic.sol': 'relicABI', 
  'Party.sol': 'partyABI',
  'PlayerProfile.sol': 'playerProfileABI',
  'VIPStaking.sol': 'vipStakingABI',
  'DungeonMaster.sol': 'dungeonMasterABI',
  'AltarOfAscension.sol': 'altarOfAscensionABI',
  'PlayerVault.sol': 'playerVaultABI',
  'Oracle.sol': 'oracleABI',
  'DungeonCore.sol': 'dungeonCoreABI',
  'DungeonStorage.sol': 'dungeonStorageABI'
};

// 路徑配置
const PATHS = {
  contracts: './contracts',
  frontendAbi: './src/config/abis.ts',
  graphqlAbi: './DDgraphql/dungeon-delvers/abis',
  outputDir: './scripts/generated'
};

// 確保輸出目錄存在
function ensureOutputDir() {
  if (!fs.existsSync(PATHS.outputDir)) {
    fs.mkdirSync(PATHS.outputDir, { recursive: true });
  }
}

// 讀取 JSON ABI 檔案
function readJsonAbi(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ 無法讀取 ABI 檔案: ${filePath}`, error.message);
    return null;
  }
}

// 生成 TypeScript ABI 檔案
function generateTsAbi() {
  console.log('🔄 開始生成 TypeScript ABI...');
  
  let tsContent = `// 自動生成的 ABI 檔案 - 請勿手動編輯
// 生成時間: ${new Date().toISOString()}
// 使用腳本: scripts/sync-abi.js

`;

  // 讀取所有 GraphQL ABI 檔案
  const graphqlAbiFiles = fs.readdirSync(PATHS.graphqlAbi)
    .filter(file => file.endsWith('.json') && !file.startsWith('.'));

  for (const file of graphqlAbiFiles) {
    const contractName = file.replace('.json', '');
    const abiPath = path.join(PATHS.graphqlAbi, file);
    const abi = readJsonAbi(abiPath);
    
    if (abi) {
      const varName = `${contractName.charAt(0).toLowerCase() + contractName.slice(1)}ABI`;
      tsContent += `export const ${varName} = ${JSON.stringify(abi, null, 2)} as const;\n\n`;
      console.log(`✅ 已處理: ${contractName}`);
    }
  }

  // 添加 SoulShard Token ABI (如果存在)
  const soulShardAbi = readJsonAbi(path.join(PATHS.graphqlAbi, 'SoulShard.json'));
  if (soulShardAbi) {
    tsContent += `export const soulShardTokenABI = ${JSON.stringify(soulShardAbi, null, 2)} as const;\n\n`;
    console.log('✅ 已處理: SoulShard Token');
  }

  // 寫入檔案
  const outputPath = path.join(PATHS.outputDir, 'generated-abi.ts');
  fs.writeFileSync(outputPath, tsContent);
  console.log(`✅ TypeScript ABI 已生成: ${outputPath}`);
  
  return outputPath;
}

// 驗證 ABI 一致性
function validateAbiConsistency() {
  console.log('🔍 驗證 ABI 一致性...');
  
  const frontendAbiPath = PATHS.frontendAbi;
  const generatedAbiPath = path.join(PATHS.outputDir, 'generated-abi.ts');
  
  if (!fs.existsSync(frontendAbiPath)) {
    console.log('⚠️  前端 ABI 檔案不存在，跳過驗證');
    return;
  }
  
  if (!fs.existsSync(generatedAbiPath)) {
    console.log('⚠️  生成的 ABI 檔案不存在，跳過驗證');
    return;
  }
  
  const frontendContent = fs.readFileSync(frontendAbiPath, 'utf8');
  const generatedContent = fs.readFileSync(generatedAbiPath, 'utf8');
  
  // 簡單的內容比較 (可以進一步優化)
  if (frontendContent.length !== generatedContent.length) {
    console.log('⚠️  ABI 檔案大小不一致，建議更新前端 ABI');
  } else {
    console.log('✅ ABI 檔案大小一致');
  }
}

// 更新前端 ABI 檔案
function updateFrontendAbi() {
  console.log('🔄 更新前端 ABI 檔案...');
  
  const generatedPath = path.join(PATHS.outputDir, 'generated-abi.ts');
  const frontendPath = PATHS.frontendAbi;
  
  if (!fs.existsSync(generatedPath)) {
    console.error('❌ 生成的 ABI 檔案不存在');
    return false;
  }
  
  try {
    // 備份原始檔案
    if (fs.existsSync(frontendPath)) {
      const backupPath = frontendPath + '.backup.' + Date.now();
      fs.copyFileSync(frontendPath, backupPath);
      console.log(`✅ 已備份原始檔案: ${backupPath}`);
    }
    
    // 複製新檔案
    fs.copyFileSync(generatedPath, frontendPath);
    console.log(`✅ 前端 ABI 已更新: ${frontendPath}`);
    return true;
  } catch (error) {
    console.error('❌ 更新前端 ABI 失敗:', error.message);
    return false;
  }
}

// 主函數
async function main() {
  console.log('🚀 開始 ABI 同步流程...\n');
  
  ensureOutputDir();
  generateTsAbi();
  validateAbiConsistency();
  
  // 詢問是否更新前端 ABI
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await new Promise(resolve => {
    rl.question('\n是否要更新前端 ABI 檔案? (y/N): ', resolve);
  });
  
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    updateFrontendAbi();
  } else {
    console.log('⏭️  跳過前端 ABI 更新');
  }
  
  console.log('\n✅ ABI 同步流程完成!');
  rl.close();
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  generateTsAbi,
  validateAbiConsistency,
  updateFrontendAbi
}; 