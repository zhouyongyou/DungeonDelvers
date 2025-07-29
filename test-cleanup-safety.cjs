#!/usr/bin/env node

// 清理安全性測試腳本

const fs = require('fs');
const path = require('path');

console.log('🔍 開始清理安全性檢查...\n');

const checks = [
    {
        name: '檢查必要頁面文件存在',
        test: () => {
            const requiredPages = [
                'OverviewPage.tsx',
                'MyAssetsPageEnhanced.tsx', 
                'MintPage.tsx',
                'AltarPage.tsx',
                'DungeonPage.tsx',
                'VipPage.tsx',
                'ReferralPage.tsx',
                'AdminPage.tsx'
            ];
            
            const pagesDir = path.join(__dirname, 'src', 'pages');
            const missing = requiredPages.filter(page => 
                !fs.existsSync(path.join(pagesDir, page))
            );
            
            if (missing.length > 0) {
                throw new Error(`缺少必要頁面: ${missing.join(', ')}`);
            }
            return '✅ 所有核心頁面存在';
        }
    },
    {
        name: '檢查路由配置',
        test: () => {
            const appPath = path.join(__dirname, 'src', 'App.tsx');
            const appContent = fs.readFileSync(appPath, 'utf-8');
            
            const requiredRoutes = [
                'dashboard', 'myAssets', 'mint', 'altar', 
                'dungeon', 'vip', 'referral', 'admin'
            ];
            
            const missingRoutes = requiredRoutes.filter(route => 
                !appContent.includes(`case '${route}'`)
            );
            
            if (missingRoutes.length > 0) {
                throw new Error(`缺少路由: ${missingRoutes.join(', ')}`);
            }
            return '✅ 路由配置完整';
        }
    },
    {
        name: '檢查開發環境條件載入',
        test: () => {
            const appPath = path.join(__dirname, 'src', 'App.tsx');
            const appContent = fs.readFileSync(appPath, 'utf-8');
            
            if (!appContent.includes('import.meta.env.DEV')) {
                throw new Error('未找到開發環境條件檢查');
            }
            return '✅ 開發工具已條件載入';
        }
    },
    {
        name: '檢查封存目錄結構',
        test: () => {
            const archivedPath = path.join(__dirname, 'src', 'pages', 'archived', 'replaced-pages');
            if (!fs.existsSync(archivedPath)) {
                throw new Error('封存目錄不存在');
            }
            
            const archivedFiles = fs.readdirSync(archivedPath);
            if (archivedFiles.length < 4) {
                throw new Error('封存文件數量不足');
            }
            return `✅ 已封存 ${archivedFiles.length} 個文件`;
        }
    }
];

// 執行測試
let passed = 0;
let failed = 0;

checks.forEach(check => {
    try {
        const result = check.test();
        console.log(`${check.name}: ${result}`);
        passed++;
    } catch (error) {
        console.error(`❌ ${check.name}: ${error.message}`);
        failed++;
    }
});

console.log('\n📊 測試結果:');
console.log(`✅ 通過: ${passed}`);
console.log(`❌ 失敗: ${failed}`);

if (failed > 0) {
    console.log('\n⚠️  警告: 清理可能導致問題，請謹慎進行！');
    process.exit(1);
} else {
    console.log('\n🎉 所有檢查通過，可以安全繼續清理！');
    process.exit(0);
}