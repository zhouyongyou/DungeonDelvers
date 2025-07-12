#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 開始清理前端檔案...\n');

// 1. 刪除所有 .DS_Store 檔案
console.log('1. 刪除 .DS_Store 檔案...');
const dsStoreFiles = [
  './.DS_Store',
  './src/.DS_Store',
  './src/components/.DS_Store',
  './src/components/ui/.DS_Store',
  './src/components/layout/.DS_Store',
  './src/hooks/.DS_Store',
  './src/pages/.DS_Store',
  './src/contexts/.DS_Store',
  './src/config/.DS_Store',
  './src/assets/.DS_Store',
  './public/.DS_Store',
  './public/locales/.DS_Store',
  './public/images/.DS_Store',
  './public/api/.DS_Store',
  './public/api/hero/.DS_Store',
  './public/assets/.DS_Store',
  './public/assets/images/.DS_Store',
  './public/assets/images/collections/.DS_Store',
  './assets/.DS_Store',
  './assets/images/.DS_Store',
  './images/.DS_Store',
  './images/hero/.DS_Store',
  './images/party/.DS_Store',
  './images/relic/.DS_Store',
  './ipfs-metadata-reorganized/.DS_Store',
  './contracts/.DS_Store'
];

dsStoreFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`   ✅ 已刪除: ${file}`);
  }
});

// 2. 刪除舊的診斷和修復腳本
console.log('\n2. 刪除舊的診斷和修復腳本...');
const oldScripts = [
  './diagnose_metadata.cjs',
  './fix_all_issues.cjs',
  './fix_vip_level.cjs',
  './check_baseuri.cjs',
  './diagnostic_script.js',
  './fix_verification_script.js',
  './consistency-check.js',
  './subgraph_fix_summary.cjs'
];

oldScripts.forEach(script => {
  if (fs.existsSync(script)) {
    fs.unlinkSync(script);
    console.log(`   ✅ 已刪除: ${script}`);
  }
});

// 3. 刪除重複的 hooks
console.log('\n3. 刪除重複的 hooks...');
if (fs.existsSync('./src/hooks/useContractEvents.ts')) {
  fs.unlinkSync('./src/hooks/useContractEvents.ts');
  console.log('   ✅ 已刪除: ./src/hooks/useContractEvents.ts (保留優化版本)');
}

// 4. 刪除舊的 IPFS 元資料目錄
console.log('\n4. 刪除舊的 IPFS 元資料目錄...');
if (fs.existsSync('./ipfs-metadata')) {
  fs.rmSync('./ipfs-metadata', { recursive: true, force: true });
  console.log('   ✅ 已刪除: ./ipfs-metadata (已被 ipfs-metadata-reorganized 取代)');
}

// 5. 創建封存目錄
console.log('\n5. 創建封存目錄...');
const archiveDirs = [
  './archive',
  './archive/scripts',
  './archive/docs',
  './archive/preview'
];

archiveDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`   ✅ 已創建: ${dir}`);
  }
});

// 6. 移動 SVG 預覽檔案到封存目錄
console.log('\n6. 移動 SVG 預覽檔案...');
if (fs.existsSync('./SVG_Preview')) {
  const files = fs.readdirSync('./SVG_Preview');
  files.forEach(file => {
    if (file.endsWith('.html')) {
      fs.renameSync(`./SVG_Preview/${file}`, `./archive/preview/${file}`);
      console.log(`   ✅ 已移動: SVG_Preview/${file} → archive/preview/${file}`);
    }
  });
  fs.rmdirSync('./SVG_Preview');
  console.log('   ✅ 已刪除空目錄: ./SVG_Preview');
}

// 7. 移動白皮書到 docs 目錄
console.log('\n7. 移動白皮書...');
if (fs.existsSync('./dungeon-delvers-whitepaper')) {
  fs.renameSync('./dungeon-delvers-whitepaper', './archive/docs/whitepaper');
  console.log('   ✅ 已移動: dungeon-delvers-whitepaper → archive/docs/whitepaper');
}

// 8. 移動舊腳本到封存目錄
console.log('\n8. 移動舊腳本...');
const oldScriptFiles = [
  './scripts/set-baseuri.js',
  './scripts/reorganize-ipfs-structure.cjs',
  './scripts/set-ipfs-baseuri.cjs',
  './scripts/fix-baseuri-deployment.cjs',
  './scripts/deploy-fixed.cjs'
];

oldScriptFiles.forEach(script => {
  if (fs.existsSync(script)) {
    const fileName = path.basename(script);
    fs.renameSync(script, `./archive/scripts/${fileName}`);
    console.log(`   ✅ 已移動: ${script} → archive/scripts/${fileName}`);
  }
});

// 9. 檢查並刪除重複的 vite 配置
console.log('\n9. 檢查 vite 配置檔案...');
if (fs.existsSync('./vite.config.optimized.ts') && fs.existsSync('./vite.config.ts')) {
  const optimizedSize = fs.statSync('./vite.config.optimized.ts').size;
  const normalSize = fs.statSync('./vite.config.ts').size;
  
  if (optimizedSize > normalSize) {
    fs.unlinkSync('./vite.config.ts');
    fs.renameSync('./vite.config.optimized.ts', './vite.config.ts');
    console.log('   ✅ 已保留優化版本的 vite.config.ts');
  } else {
    fs.unlinkSync('./vite.config.optimized.ts');
    console.log('   ✅ 已刪除舊的 vite.config.optimized.ts');
  }
}

// 10. 檢查重複的圖片資源
console.log('\n10. 檢查重複的圖片資源...');
const duplicateImages = [
  './assets/images/lose_screen.png',
  './assets/images/lose_screen_500x500.png',
  './assets/images/win_screen.png',
  './assets/images/win_screen_500x500.png'
];

duplicateImages.forEach(image => {
  if (fs.existsSync(image)) {
    const fileName = path.basename(image);
    if (fs.existsSync(`./public/images/${fileName}`)) {
      fs.unlinkSync(image);
      console.log(`   ✅ 已刪除重複圖片: ${image} (public/images 中已有)`);
    }
  }
});

console.log('\n🎉 前端檔案清理完成！');
console.log('\n📋 清理摘要:');
console.log('   • 刪除了 26 個 .DS_Store 檔案');
console.log('   • 刪除了 8 個舊的診斷腳本');
console.log('   • 刪除了重複的 hooks 檔案');
console.log('   • 刪除了舊的 IPFS 元資料目錄');
console.log('   • 創建了封存目錄結構');
console.log('   • 移動了 SVG 預覽檔案到封存目錄');
console.log('   • 移動了白皮書到 docs 目錄');
console.log('   • 移動了舊腳本到封存目錄');
console.log('   • 整理了 vite 配置檔案');
console.log('   • 清理了重複的圖片資源');

console.log('\n📁 新的目錄結構:');
console.log('   archive/');
console.log('   ├── docs/whitepaper/     (白皮書)');
console.log('   ├── preview/             (SVG 預覽檔案)');
console.log('   └── scripts/             (舊腳本)'); 