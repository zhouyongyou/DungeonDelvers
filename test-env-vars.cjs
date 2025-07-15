#!/usr/bin/env node

/**
 * 環境變量測試腳本
 * 檢查 RPC 代理所需的環境變量是否正確配置
 */

const fs = require('fs');
const path = require('path');

// 顏色輸出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvironmentVariables() {
  log('blue', '🔍 檢查環境變量配置...\n');
  
  const results = {
    alchemyKeys: [],
    otherVars: {},
    warnings: [],
    errors: []
  };
  
  // 檢查 Alchemy API Keys
  const alchemyVars = [
    'ALCHEMY_KEY',
    'ALCHEMY_API_KEY_1',
    'ALCHEMY_API_KEY_2',
    'ALCHEMY_API_KEY_3',
    'ALCHEMY_API_KEY_4',
    'ALCHEMY_API_KEY_5'
  ];
  
  alchemyVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      results.alchemyKeys.push({
        name: varName,
        value: value.substring(0, 10) + '...' + value.substring(value.length - 4),
        length: value.length
      });
      log('green', `✅ ${varName}: ${value.substring(0, 10)}...${value.substring(value.length - 4)} (${value.length} chars)`);
    } else {
      log('yellow', `⚠️ ${varName}: 未設置`);
    }
  });
  
  // 檢查其他相關變量
  const otherVars = [
    'NODE_ENV',
    'VERCEL_ENV',
    'VERCEL_URL',
    'VITE_USE_RPC_PROXY',
    'VITE_METADATA_SERVER_URL'
  ];
  
  otherVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      results.otherVars[varName] = value;
      log('cyan', `📝 ${varName}: ${value}`);
    } else {
      log('yellow', `⚠️ ${varName}: 未設置`);
    }
  });
  
  // 分析結果
  log('blue', '\n📊 分析結果:');
  
  if (results.alchemyKeys.length === 0) {
    results.errors.push('沒有找到任何 Alchemy API Key');
    log('red', '❌ 錯誤: 沒有找到任何 Alchemy API Key');
  } else {
    log('green', `✅ 找到 ${results.alchemyKeys.length} 個 Alchemy API Key`);
  }
  
  // 檢查 key 格式
  results.alchemyKeys.forEach(key => {
    if (key.length < 32) {
      results.warnings.push(`${key.name} 長度似乎不正確 (${key.length} 字符)`);
      log('yellow', `⚠️ 警告: ${key.name} 長度似乎不正確 (${key.length} 字符)`);
    }
  });
  
  // 檢查環境配置
  const nodeEnv = process.env.NODE_ENV;
  const vercelEnv = process.env.VERCEL_ENV;
  
  if (nodeEnv === 'production' || vercelEnv === 'production') {
    log('magenta', '🚀 檢測到生產環境');
    if (results.alchemyKeys.length < 2) {
      results.warnings.push('生產環境建議配置多個 API Key 以提高可靠性');
      log('yellow', '⚠️ 建議: 生產環境建議配置多個 API Key 以提高可靠性');
    }
  } else {
    log('cyan', '🔧 檢測到開發環境');
  }
  
  return results;
}

function checkConfigFiles() {
  log('blue', '\n🔍 檢查配置文件...\n');
  
  const configFiles = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
    'vercel.json'
  ];
  
  configFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      log('green', `✅ 找到配置文件: ${file}`);
      
      if (file.startsWith('.env')) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n');
          const alchemyLines = lines.filter(line => 
            line.includes('ALCHEMY') && !line.startsWith('#')
          );
          
          if (alchemyLines.length > 0) {
            log('cyan', `   包含 ${alchemyLines.length} 個 Alchemy 配置項`);
          }
        } catch (error) {
          log('red', `   讀取失敗: ${error.message}`);
        }
      }
    } else {
      log('yellow', `⚠️ 配置文件不存在: ${file}`);
    }
  });
}

function generateRecommendations(results) {
  log('blue', '\n💡 建議和下一步:');
  
  if (results.alchemyKeys.length === 0) {
    log('red', '🚨 緊急: 需要配置 Alchemy API Key');
    log('white', '   1. 訪問 https://dashboard.alchemy.com/');
    log('white', '   2. 創建 BSC Mainnet 應用');
    log('white', '   3. 獲取 API Key 並設置環境變量');
    log('white', '   4. 本地開發: 添加到 .env.local');
    log('white', '   5. 生產環境: 添加到 Vercel 環境變量');
  } else if (results.alchemyKeys.length === 1) {
    log('yellow', '⚠️ 建議: 配置多個 API Key 以提高可靠性');
    log('white', '   設置 ALCHEMY_API_KEY_2, ALCHEMY_API_KEY_3 等');
  } else {
    log('green', '✅ API Key 配置良好');
  }
  
  // 環境特定建議
  if (process.env.NODE_ENV === 'production') {
    log('magenta', '🚀 生產環境建議:');
    log('white', '   - 使用多個 API Key 進行負載平衡');
    log('white', '   - 啟用 Vercel 函數監控');
    log('white', '   - 設置錯誤告警');
  } else {
    log('cyan', '🔧 開發環境建議:');
    log('white', '   - 創建 .env.local 文件');
    log('white', '   - 測試 RPC 代理功能');
    log('white', '   - 運行測試腳本驗證配置');
  }
  
  log('blue', '\n🧪 測試命令:');
  log('white', '   npm run test:rpc     # 運行 RPC 測試');
  log('white', '   node manual-rpc-test.js  # 手動測試');
  log('white', '   ./test-rpc-curl.sh   # curl 測試');
}

function main() {
  console.log('='*60);
  log('magenta', '🔧 DungeonDelvers RPC 代理環境檢查');
  console.log('='*60);
  
  const results = checkEnvironmentVariables();
  checkConfigFiles();
  generateRecommendations(results);
  
  console.log('\n' + '='*60);
  
  if (results.errors.length > 0) {
    log('red', '❌ 檢查完成，發現錯誤需要修復');
    process.exit(1);
  } else if (results.warnings.length > 0) {
    log('yellow', '⚠️ 檢查完成，建議進行優化');
    process.exit(0);
  } else {
    log('green', '✅ 檢查完成，配置正常');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkEnvironmentVariables, checkConfigFiles };