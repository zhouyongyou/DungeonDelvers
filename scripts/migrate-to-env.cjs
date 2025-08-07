#!/usr/bin/env node

/**
 * 前端 ENV 遷移腳本
 * 將前端從硬編碼 contracts.ts 遷移到 ENV 模式
 */

const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// 需要更新的文件模式
const IMPORT_PATTERNS = [
    // 舊的 import 模式
    /import\s+{([^}]+)}\s+from\s+['"]\.\.?\/config\/contracts['"];?/g,
    /import\s+{([^}]+)}\s+from\s+['"]@\/config\/contracts['"];?/g,
    /from\s+['"]\.\.?\/config\/contracts['"];?/g,
    /from\s+['"]@\/config\/contracts['"];?/g,
];

const REPLACEMENT_IMPORT = "import { $1 } from '../config/env-contracts';";

class FrontendMigrator {
    constructor() {
        this.srcDir = '/Users/sotadic/Documents/GitHub/DungeonDelvers/src';
        this.filesToUpdate = [];
        this.backupDir = path.join(this.srcDir, '../backup-env-migration');
    }

    // 掃描需要更新的文件
    scanFiles() {
        log('\n🔍 掃描需要更新的文件...', 'blue');
        
        const scanDir = (dir) => {
            const files = fs.readdirSync(dir);
            
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                
                if (stat.isDirectory() && !file.startsWith('.') && !file.startsWith('node_modules')) {
                    scanDir(filePath);
                } else if (file.match(/\.(tsx?|jsx?)$/)) {
                    // 讀取文件內容檢查是否引用 contracts
                    try {
                        const content = fs.readFileSync(filePath, 'utf8');
                        if (content.includes('config/contracts') || content.includes('@/config/contracts')) {
                            this.filesToUpdate.push({
                                path: filePath,
                                relativePath: path.relative(this.srcDir, filePath),
                                content: content
                            });
                        }
                    } catch (error) {
                        // 忽略讀取錯誤
                    }
                }
            }
        };
        
        scanDir(this.srcDir);
        
        log(`  找到 ${this.filesToUpdate.length} 個需要更新的文件:`, 'cyan');
        this.filesToUpdate.forEach(file => {
            log(`    - ${file.relativePath}`, 'dim');
        });
        
        return this.filesToUpdate.length > 0;
    }

    // 創建備份
    createBackup() {
        log('\n💾 創建備份...', 'blue');
        
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
        
        const timestamp = Date.now();
        
        for (const file of this.filesToUpdate) {
            const backupPath = path.join(this.backupDir, `${path.basename(file.path)}.${timestamp}.backup`);
            try {
                fs.copyFileSync(file.path, backupPath);
                log(`  ✅ 備份: ${path.basename(file.path)}`, 'green');
            } catch (error) {
                log(`  ⚠️  備份失敗: ${path.basename(file.path)} - ${error.message}`, 'yellow');
            }
        }
    }

    // 更新單個文件
    updateFile(file) {
        let content = file.content;
        let updated = false;
        
        // 更新 import 語句
        for (const pattern of IMPORT_PATTERNS) {
            if (pattern.test(content)) {
                content = content.replace(pattern, (match, imports) => {
                    updated = true;
                    return `import { ${imports} } from '../config/env-contracts';`;
                });
            }
        }
        
        // 特殊情況處理
        if (content.includes('config/contracts')) {
            // 處理動態 import
            content = content.replace(
                /import\(['"]\.\.?\/config\/contracts['"]\)/g,
                "import('../config/env-contracts')"
            );
            
            // 處理路徑別名
            content = content.replace(
                /@\/config\/contracts/g,
                '../config/env-contracts'
            );
            
            updated = true;
        }
        
        return { content, updated };
    }

    // 執行遷移
    async migrate() {
        log('🚀 開始前端 ENV 遷移', 'bright');
        log('=====================================', 'cyan');
        
        // 1. 掃描文件
        if (!this.scanFiles()) {
            log('\n✅ 沒有找到需要遷移的文件！', 'green');
            return;
        }
        
        // 2. 創建備份
        this.createBackup();
        
        // 3. 更新文件
        log('\n📝 更新文件...', 'blue');
        let successCount = 0;
        
        for (const file of this.filesToUpdate) {
            try {
                const result = this.updateFile(file);
                
                if (result.updated) {
                    fs.writeFileSync(file.path, result.content);
                    log(`  ✅ 更新: ${file.relativePath}`, 'green');
                    successCount++;
                } else {
                    log(`  ➡️  跳過: ${file.relativePath} (無需更新)`, 'dim');
                }
            } catch (error) {
                log(`  ❌ 錯誤: ${file.relativePath} - ${error.message}`, 'red');
            }
        }
        
        // 4. 重命名舊文件
        const oldContractsPath = path.join(this.srcDir, 'config/contracts.ts');
        if (fs.existsSync(oldContractsPath)) {
            const renamedPath = path.join(this.srcDir, 'config/contracts.ts.old');
            fs.renameSync(oldContractsPath, renamedPath);
            log('\n  📄 已重命名: contracts.ts → contracts.ts.old', 'yellow');
        }
        
        // 5. 總結
        log('\n=====================================', 'cyan');
        log('📊 遷移總結', 'cyan');
        log('=====================================', 'cyan');
        
        if (successCount === this.filesToUpdate.length) {
            log('\n🎉 ENV 遷移完成！', 'green');
            log('\n✅ 現在前端將從環境變數讀取合約地址', 'green');
            log('✅ 修改 .env.local 即可更新所有地址', 'green');
            log('✅ 再也不需要手動同步 contracts.ts', 'green');
            
            log('\n⚠️  下一步:', 'yellow');
            log('  1. 重啟開發服務器: npm run dev', 'dim');
            log('  2. 檢查瀏覽器控制台確認載入正確', 'dim');
            log('  3. 測試核心功能（mint, staking 等）', 'dim');
            
        } else {
            log(`\n⚠️  部分文件遷移失敗: ${successCount}/${this.filesToUpdate.length}`, 'yellow');
            log('請檢查錯誤信息並手動修復', 'yellow');
        }
        
        log('\n💡 恢復方法:', 'cyan');
        log('  備份文件位於: backup-env-migration/', 'dim');
        log('  如需恢復可從備份復制', 'dim');
    }

    // 驗證遷移結果
    validate() {
        log('\n🔍 驗證遷移結果...', 'blue');
        
        let issues = 0;
        
        for (const file of this.filesToUpdate) {
            try {
                const content = fs.readFileSync(file.path, 'utf8');
                
                // 檢查是否還有舊的引用
                if (content.includes('config/contracts') && !content.includes('env-contracts')) {
                    log(`  ⚠️  ${file.relativePath}: 仍有舊引用`, 'yellow');
                    issues++;
                }
            } catch (error) {
                log(`  ❌ 無法檢查: ${file.relativePath}`, 'red');
                issues++;
            }
        }
        
        if (issues === 0) {
            log('  ✅ 所有文件遷移正確！', 'green');
        } else {
            log(`  ⚠️  發現 ${issues} 個問題`, 'yellow');
        }
        
        return issues === 0;
    }
}

// 主執行
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'migrate';
    
    const migrator = new FrontendMigrator();
    
    switch (command) {
        case 'scan':
            migrator.scanFiles();
            break;
            
        case 'migrate':
            await migrator.migrate();
            break;
            
        case 'validate':
            migrator.scanFiles();
            migrator.validate();
            break;
            
        default:
            log('🎯 前端 ENV 遷移工具', 'bright');
            log('=====================================', 'cyan');
            log('可用命令:', 'blue');
            log('  migrate  - 執行完整遷移 (預設)', 'dim');
            log('  scan     - 只掃描需要更新的文件', 'dim');
            log('  validate - 驗證遷移結果', 'dim');
            break;
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = FrontendMigrator;