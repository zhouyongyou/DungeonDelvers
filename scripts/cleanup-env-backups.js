#!/usr/bin/env node

/**
 * 環境檔案清理腳本
 * 
 * 功能：
 * 1. 清理過期的 .env 備份檔案
 * 2. 整理舊版本檔案到 archived-configs
 * 3. 保留最近的幾個備份
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG = {
  keepRecentBackups: 1,  // 只保留最近 1 個備份（以防萬一）
  archiveOldVersions: true,
  dryRun: false  // 實際執行清理
};

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, type = 'info') {
  const prefix = {
    info: `${colors.blue}[INFO]${colors.reset}`,
    success: `${colors.green}[SUCCESS]${colors.reset}`,
    warning: `${colors.yellow}[WARNING]${colors.reset}`,
    error: `${colors.red}[ERROR]${colors.reset}`
  };
  console.log(`${prefix[type]} ${message}`);
}

async function cleanupEnvBackups() {
  const projectRoot = path.resolve(__dirname, '..');
  const archivedDir = path.join(projectRoot, 'archived-configs');
  
  log('開始清理環境檔案備份...');
  
  // 讀取所有檔案
  const files = fs.readdirSync(projectRoot);
  
  // 分類檔案
  const envBackups = [];
  const envLocalBackups = [];
  const oldVersions = [];
  const currentFiles = [];
  
  files.forEach(file => {
    if (file.match(/^\.env\.backup-\d+$/)) {
      envBackups.push({
        name: file,
        timestamp: parseInt(file.match(/(\d+)$/)[1])
      });
    } else if (file.match(/^\.env\.local\.backup-\d+$/)) {
      envLocalBackups.push({
        name: file,
        timestamp: parseInt(file.match(/(\d+)$/)[1])
      });
    } else if (file.match(/^\.env\.v\d+$/)) {
      oldVersions.push(file);
    } else if (['.env', '.env.local', '.env.example', '.env.local.example'].includes(file)) {
      currentFiles.push(file);
    }
  });
  
  // 排序備份（最新的在前）
  envBackups.sort((a, b) => b.timestamp - a.timestamp);
  envLocalBackups.sort((a, b) => b.timestamp - a.timestamp);
  
  log(`找到 ${envBackups.length} 個 .env 備份`);
  log(`找到 ${envLocalBackups.length} 個 .env.local 備份`);
  log(`找到 ${oldVersions.length} 個舊版本檔案`);
  
  // 處理 .env 備份
  if (envBackups.length > CONFIG.keepRecentBackups) {
    const toDelete = envBackups.slice(CONFIG.keepRecentBackups);
    log(`將刪除 ${toDelete.length} 個過期的 .env 備份`, 'warning');
    
    for (const backup of toDelete) {
      const filePath = path.join(projectRoot, backup.name);
      if (CONFIG.dryRun) {
        log(`[DRY RUN] 將刪除: ${backup.name}`, 'warning');
      } else {
        fs.unlinkSync(filePath);
        log(`已刪除: ${backup.name}`, 'success');
      }
    }
  }
  
  // 處理 .env.local 備份
  if (envLocalBackups.length > CONFIG.keepRecentBackups) {
    const toDelete = envLocalBackups.slice(CONFIG.keepRecentBackups);
    log(`將刪除 ${toDelete.length} 個過期的 .env.local 備份`, 'warning');
    
    for (const backup of toDelete) {
      const filePath = path.join(projectRoot, backup.name);
      if (CONFIG.dryRun) {
        log(`[DRY RUN] 將刪除: ${backup.name}`, 'warning');
      } else {
        fs.unlinkSync(filePath);
        log(`已刪除: ${backup.name}`, 'success');
      }
    }
  }
  
  // 處理舊版本檔案
  if (oldVersions.length > 0 && CONFIG.archiveOldVersions) {
    log(`將歸檔 ${oldVersions.length} 個舊版本檔案`, 'info');
    
    // 確保歸檔目錄存在
    if (!fs.existsSync(archivedDir)) {
      fs.mkdirSync(archivedDir, { recursive: true });
    }
    
    for (const version of oldVersions) {
      const sourcePath = path.join(projectRoot, version);
      const destPath = path.join(archivedDir, version);
      
      if (CONFIG.dryRun) {
        log(`[DRY RUN] 將移動: ${version} -> archived-configs/`, 'warning');
      } else {
        fs.renameSync(sourcePath, destPath);
        log(`已歸檔: ${version}`, 'success');
      }
    }
  }
  
  // 總結
  log('\n清理總結:', 'info');
  log(`- 保留的 .env 備份: ${Math.min(envBackups.length, CONFIG.keepRecentBackups)} 個`);
  log(`- 保留的 .env.local 備份: ${Math.min(envLocalBackups.length, CONFIG.keepRecentBackups)} 個`);
  log(`- 當前使用的檔案: ${currentFiles.join(', ')}`);
  
  if (CONFIG.dryRun) {
    log('\n這是 DRY RUN 模式，沒有實際刪除任何檔案', 'warning');
    log('要實際執行清理，請將 CONFIG.dryRun 設為 false', 'warning');
  }
}

// 執行清理
cleanupEnvBackups().catch(error => {
  log(`清理失敗: ${error.message}`, 'error');
  process.exit(1);
});