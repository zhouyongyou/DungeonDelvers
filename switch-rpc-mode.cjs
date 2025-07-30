#!/usr/bin/env node
// 切換 RPC 模式腳本

const fs = require('fs');
const path = require('path');

const appTsPath = path.join(__dirname, 'src', 'App.tsx');

function switchToSimpleMode() {
  console.log('🔄 切換到簡化 RPC 模式...');
  
  // 讀取 App.tsx
  let content = fs.readFileSync(appTsPath, 'utf8');
  
  // 替換 wagmi 導入
  content = content.replace(
    /import.*wagmiConfig.*from.*['"`]\.\/wagmi.*['"`]/,
    "import { wagmiSimpleConfig as wagmiConfig } from './wagmi-simple'"
  );
  
  // 寫回文件
  fs.writeFileSync(appTsPath, content);
  
  console.log('✅ 已切換到簡化 RPC 模式');
  console.log('📌 重啟開發服務器生效: npm run dev');
  console.log('🔍 檢查配置: checkCurrentRpcConfig()');
}

function switchToComplexMode() {
  console.log('🔄 切換到完整 RPC 模式...');
  
  // 讀取 App.tsx
  let content = fs.readFileSync(appTsPath, 'utf8');
  
  // 替換 wagmi 導入
  content = content.replace(
    /import.*wagmiConfig.*from.*['"`]\.\/wagmi-simple.*['"`]/,
    "import { wagmiConfig } from './wagmi'"
  );
  
  // 寫回文件
  fs.writeFileSync(appTsPath, content);
  
  console.log('✅ 已切換到完整 RPC 模式');
  console.log('📌 重啟開發服務器生效: npm run dev');
}

function checkCurrentMode() {
  const content = fs.readFileSync(appTsPath, 'utf8');
  
  if (content.includes('wagmi-simple')) {
    console.log('📊 當前模式: 簡化 RPC 模式 (私人節點優先)');
  } else {
    console.log('📊 當前模式: 完整 RPC 模式 (含容錯機制)');
  }
}

// 處理命令行參數
const command = process.argv[2];

switch (command) {
  case 'simple':
  case 's':
    switchToSimpleMode();
    break;
  case 'complex':
  case 'c':
    switchToComplexMode();
    break;
  case 'check':
    checkCurrentMode();
    break;
  default:
    console.log('🎯 RPC 模式切換工具');
    console.log('');
    console.log('用法:');
    console.log('  node switch-rpc-mode.js simple   # 切換到簡化模式 (私人節點優先)');
    console.log('  node switch-rpc-mode.js complex  # 切換到完整模式 (含容錯)');
    console.log('  node switch-rpc-mode.js check    # 檢查當前模式');
    console.log('');
    checkCurrentMode();
}