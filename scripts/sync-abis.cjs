#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 統一 ABI 管理工具
 * 
 * 功能：
 * 1. 從 DungeonDelversContracts/abis/ 作為主要來源
 * 2. 同步到前端 src/abis/
 * 3. 同步到子圖 abis/
 * 4. 同步到後端 abis/
 * 5. 驗證 ABI 文件完整性
 */

class ABISyncManager {
  constructor() {
    this.sourceDir = '/Users/sotadic/Documents/DungeonDelversContracts/abis';
    this.targets = {
      frontend: '/Users/sotadic/Documents/GitHub/DungeonDelvers/src/abis',
      subgraph: '/Users/sotadic/Documents/GitHub/DungeonDelvers/DDgraphql/dungeon-delvers/abis',
      backend: '/Users/sotadic/Documents/dungeon-delvers-metadata-server/src/abis'
    };
    
    // V25 核心合約 ABI 映射
    this.v25Contracts = {
      'Hero.json': ['Hero.json'],
      'Relic.json': ['Relic.json'],
      'PartyV3.json': ['PartyV3.json', 'Party.json'], // PartyV3 也複製為 Party.json
      'DungeonMasterV8.json': ['DungeonMaster.json', 'DungeonMasterV8.json'],
      'AltarOfAscension.json': ['AltarOfAscension.json', 'AltarOfAscensionVRF.json'],
      'DungeonStorage.json': ['DungeonStorage.json'],
      'DungeonCore.json': ['DungeonCore.json'],
      'PlayerVault.json': ['PlayerVault.json'],
      'PlayerProfile.json': ['PlayerProfile.json'],
      'VIPStaking.json': ['VIPStaking.json'],
      'Oracle.json': ['Oracle.json'],
      'VRFManagerV2PlusFixed.json': ['VRFManagerV2Plus.json', 'VRFManager.json']
    };

    console.log('🏗️  V25 ABI 統一管理工具');
    console.log('=' .repeat(60));
  }

  // 檢查來源目錄
  checkSourceDir() {
    if (!fs.existsSync(this.sourceDir)) {
      throw new Error(`ABI 來源目錄不存在: ${this.sourceDir}`);
    }

    console.log('📂 檢查 ABI 來源目錄...');
    const files = fs.readdirSync(this.sourceDir).filter(f => f.endsWith('.json'));
    console.log(`✅ 找到 ${files.length} 個 ABI 文件`);

    // 檢查必要的 ABI 是否存在
    const missingFiles = [];
    Object.keys(this.v25Contracts).forEach(sourceFile => {
      if (!files.includes(sourceFile)) {
        missingFiles.push(sourceFile);
      }
    });

    if (missingFiles.length > 0) {
      console.log(`⚠️  缺少以下 ABI 文件:`);
      missingFiles.forEach(f => console.log(`    - ${f}`));
    }

    return { totalFiles: files.length, missingFiles };
  }

  // 同步 ABI 到指定目標
  syncToTarget(targetName, targetPath) {
    console.log(`\\n📋 同步到 ${targetName}...`);
    
    if (!fs.existsSync(targetPath)) {
      console.log(`  📁 創建目錄: ${targetPath}`);
      fs.mkdirSync(targetPath, { recursive: true });
    }

    let syncedCount = 0;
    let errorCount = 0;

    Object.entries(this.v25Contracts).forEach(([sourceFile, targetFiles]) => {
      const sourcePath = path.join(this.sourceDir, sourceFile);
      
      if (!fs.existsSync(sourcePath)) {
        console.log(`  ⚠️  來源文件不存在: ${sourceFile}`);
        errorCount++;
        return;
      }

      try {
        const abiContent = fs.readFileSync(sourcePath, 'utf8');
        
        // 驗證 JSON 格式
        JSON.parse(abiContent);

        // 同步到所有目標文件名
        targetFiles.forEach(targetFile => {
          const targetFilePath = path.join(targetPath, targetFile);
          fs.writeFileSync(targetFilePath, abiContent);
          console.log(`    ✅ ${sourceFile} → ${targetFile}`);
          syncedCount++;
        });

      } catch (error) {
        console.log(`    ❌ 同步失敗 ${sourceFile}: ${error.message}`);
        errorCount++;
      }
    });

    console.log(`  📊 同步結果: ${syncedCount} 成功, ${errorCount} 錯誤`);
    return { syncedCount, errorCount };
  }

  // 同步到所有目標
  syncToAllTargets() {
    console.log('🔄 開始同步 ABI 文件到所有目標...');
    
    let totalSynced = 0;
    let totalErrors = 0;

    Object.entries(this.targets).forEach(([targetName, targetPath]) => {
      try {
        const result = this.syncToTarget(targetName, targetPath);
        totalSynced += result.syncedCount;
        totalErrors += result.errorCount;
      } catch (error) {
        console.log(`❌ ${targetName} 同步失敗: ${error.message}`);
        totalErrors++;
      }
    });

    return { totalSynced, totalErrors };
  }

  // 特殊處理：子圖 ABI 結構調整
  adjustSubgraphABIs() {
    console.log('\\n🔧 調整子圖 ABI 結構...');
    
    const subgraphPath = this.targets.subgraph;
    
    // 創建子目錄結構（如果需要）
    const subDirs = ['Hero', 'Relic'];
    subDirs.forEach(dir => {
      const dirPath = path.join(subgraphPath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`  📁 創建子目錄: ${dir}/`);
      }
      
      // 複製對應的 ABI 到子目錄
      const sourceABI = path.join(subgraphPath, `${dir}.json`);
      const targetABI = path.join(dirPath, `${dir}.json`);
      
      if (fs.existsSync(sourceABI)) {
        fs.copyFileSync(sourceABI, targetABI);
        console.log(`    ✅ 複製 ${dir}.json 到 ${dir}/ 子目錄`);
      }
    });
  }

  // 清理舊的 ABI 文件
  cleanupOldABIs() {
    console.log('\\n🧹 清理過時的 ABI 文件...');
    
    // 清理列表：已經不再使用的 ABI 文件
    const obsoleteFiles = [
      'DungeonMasterV5.json',
      'DungeonMasterV7.json',
      'AltarOfAscensionV2Fixed.json',
      'IVRFManager.json',
      'OfferSystem.json',
      'OfferSystemV2.json',
      'DungeonMarketplace.json',
      'DungeonMarketplaceV2.json'
    ];

    Object.entries(this.targets).forEach(([targetName, targetPath]) => {
      if (!fs.existsSync(targetPath)) return;

      obsoleteFiles.forEach(obsoleteFile => {
        const filePath = path.join(targetPath, obsoleteFile);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`  🗑️  刪除過時文件: ${targetName}/${obsoleteFile}`);
        }
      });
    });
  }

  // 驗證同步結果
  validateSync() {
    console.log('\\n🔍 驗證同步結果...');
    
    const results = {};
    
    Object.entries(this.targets).forEach(([targetName, targetPath]) => {
      if (!fs.existsSync(targetPath)) {
        results[targetName] = { status: 'missing_directory', files: 0 };
        return;
      }

      const files = fs.readdirSync(targetPath).filter(f => f.endsWith('.json'));
      const expectedFiles = new Set();
      
      // 收集所有預期的文件名
      Object.values(this.v25Contracts).forEach(targetFiles => {
        targetFiles.forEach(file => expectedFiles.add(file));
      });

      const missing = Array.from(expectedFiles).filter(f => !files.includes(f));
      const extra = files.filter(f => !Array.from(expectedFiles).includes(f) && 
                                    !f.startsWith('ERC') && 
                                    !f.includes('Standard'));

      results[targetName] = {
        status: missing.length === 0 ? 'complete' : 'incomplete',
        total: files.length,
        expected: expectedFiles.size,
        missing: missing,
        extra: extra.length
      };

      console.log(`  📊 ${targetName}:`);
      console.log(`      文件總數: ${files.length}`);
      console.log(`      預期文件: ${expectedFiles.size}`);
      if (missing.length > 0) {
        console.log(`      ⚠️  缺少: ${missing.join(', ')}`);
      }
      if (extra.length > 0) {
        console.log(`      📄 額外: ${extra.length} 個文件`);
      }
      console.log(`      狀態: ${results[targetName].status === 'complete' ? '✅ 完整' : '⚠️  不完整'}`);
    });

    return results;
  }

  // 生成 ABI 同步報告
  generateReport() {
    console.log('\\n📋 ABI 同步報告');
    console.log('=' .repeat(60));
    
    console.log('🎯 V25 核心合約 ABI 映射:');
    Object.entries(this.v25Contracts).forEach(([source, targets]) => {
      console.log(`  📄 ${source}`);
      targets.forEach(target => {
        console.log(`      → ${target}`);
      });
    });

    console.log('\\n📂 同步目標:');
    Object.entries(this.targets).forEach(([name, path]) => {
      const exists = fs.existsSync(path);
      console.log(`  ${exists ? '✅' : '❌'} ${name}: ${path}`);
    });

    console.log('\\n💡 使用建議:');
    console.log('1. 合約部署後，更新 DungeonDelversContracts/abis/ 中的 ABI');
    console.log('2. 執行 npm run abi:sync 同步到所有項目');
    console.log('3. 執行 npm run abi:validate 驗證同步結果');
    console.log('4. 重新啟動前端和子圖服務');
  }

  // 主執行函數
  async run(options = {}) {
    try {
      // 檢查來源
      const sourceCheck = this.checkSourceDir();
      
      if (sourceCheck.missingFiles.length > 0 && !options.force) {
        console.log('\\n⚠️  發現缺少的 ABI 文件，建議先檢查 DungeonDelversContracts/abis/');
        console.log('如要強制執行，請使用 --force 參數');
        return;
      }

      // 執行同步
      const syncResult = this.syncToAllTargets();
      
      // 特殊處理
      this.adjustSubgraphABIs();
      
      // 清理過時文件
      this.cleanupOldABIs();
      
      // 驗證結果
      const validation = this.validateSync();
      
      // 生成報告
      this.generateReport();

      console.log('\\n🎉 ABI 同步完成!');
      console.log(`📊 總計: ${syncResult.totalSynced} 個文件同步成功, ${syncResult.totalErrors} 個錯誤`);
      
      if (syncResult.totalErrors === 0) {
        console.log('\\n📌 下一步操作:');
        console.log('1. 檢查 ABI 同步結果');
        console.log('2. 重新生成子圖代碼: npm run codegen');
        console.log('3. 重新啟動前端開發服務器');
        console.log('4. 驗證合約調用功能');
      }

    } catch (error) {
      console.error('❌ ABI 同步失敗:', error.message);
      process.exit(1);
    }
  }
}

// 執行同步
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    force: args.includes('--force'),
    validate: args.includes('--validate-only')
  };

  const manager = new ABISyncManager();
  
  if (options.validate) {
    manager.validateSync();
    manager.generateReport();
  } else {
    manager.run(options);
  }
}

module.exports = ABISyncManager;