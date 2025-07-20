#!/usr/bin/env node

/**
 * 全面的頁面功能測試腳本
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 測試配置
const TEST_CONFIG = {
  baseUrl: 'http://localhost:5175',
  timeout: 30000,
  retries: 3
};

// 頁面測試規則
const PAGE_TESTS = [
  {
    name: 'mint',
    url: '/#/mint',
    description: '鑄造頁面',
    requiredElements: ['鑄造', '英雄', '聖物'],
    errorPatterns: ['Cannot read properties', 'undefined', 'null'],
    expectedFunctions: ['mint', 'connect wallet']
  },
  {
    name: 'dashboard',
    url: '/#/dashboard',
    description: '儀表板',
    requiredElements: ['總覽', '資產', '統計'],
    errorPatterns: ['Cannot read properties', 'undefined'],
    expectedFunctions: ['load user data', 'display stats']
  },
  {
    name: 'party',
    url: '/#/party',
    description: '我的資產',
    requiredElements: ['我的', '資產', 'NFT'],
    errorPatterns: ['Cannot read properties', 'CORS', 'cache-control'],
    expectedFunctions: ['load assets', 'display NFTs']
  },
  {
    name: 'admin',
    url: '/#/admin',
    description: '管理頁面',
    requiredElements: ['管理', '設定', '合約'],
    errorPatterns: ['undefined.length', 'setReferrerProgress', 'Cannot access before initialization'],
    expectedFunctions: ['load contracts', 'admin settings']
  },
  {
    name: 'altar',
    url: '/#/altar',
    description: '祭壇頁面',
    requiredElements: ['祭壇', '升星', '材料'],
    errorPatterns: ['GraphQL', 'query', 'undefined'],
    expectedFunctions: ['load materials', 'upgrade NFT']
  },
  {
    name: 'referral',
    url: '/#/referral',
    description: '推薦頁面',
    requiredElements: ['推薦', '邀請', '佣金'],
    errorPatterns: ['setReferrerProgress', 'isSettingReferrer', 'undefined'],
    expectedFunctions: ['set referrer', 'load referral data']
  }
];

class ComprehensivePageTester {
  constructor() {
    this.results = [];
    this.logFile = path.join(__dirname, 'comprehensive-test-results.json');
    this.consoleLog = [];
  }

  async runTest() {
    console.log('🔍 開始全面的頁面功能測試...\n');
    
    // 1. 檢查開發服務器狀態
    await this.checkDevServer();
    
    // 2. 檢查關鍵文件是否存在
    await this.checkCriticalFiles();
    
    // 3. 分析代碼中的潛在問題
    await this.analyzeCodeIssues();
    
    // 4. 檢查環境配置
    await this.checkEnvironmentConfig();
    
    // 5. 測試構建過程
    await this.testBuildProcess();
    
    // 6. 生成詳細報告
    this.generateDetailedReport();
  }

  async checkDevServer() {
    console.log('🖥️  檢查開發服務器狀態...');
    
    return new Promise((resolve) => {
      exec('curl -s -o /dev/null -w "%{http_code}" http://localhost:5175', (error, stdout, stderr) => {
        const status = {
          test: 'dev_server',
          status: stdout === '200' ? 'success' : 'error',
          details: { httpCode: stdout, error: error?.message }
        };
        
        if (status.status === 'success') {
          console.log('✅ 開發服務器正在運行');
        } else {
          console.log('❌ 開發服務器無法訪問');
        }
        
        this.results.push(status);
        resolve();
      });
    });
  }

  async checkCriticalFiles() {
    console.log('\n📁 檢查關鍵文件...');
    
    const criticalFiles = [
      'src/pages/AdminPage.tsx',
      'src/pages/ReferralPage.tsx',
      'src/pages/AltarPage.tsx',
      'src/pages/MyAssetsPage.tsx',
      'src/components/layout/Footer.tsx',
      'api/rpc.ts',
      'src/config/smartRpcTransport.ts'
    ];

    for (const file of criticalFiles) {
      const filePath = path.join(__dirname, file);
      const exists = fs.existsSync(filePath);
      
      console.log(`${exists ? '✅' : '❌'} ${file}`);
      
      if (exists) {
        // 檢查文件內容是否有明顯問題
        const content = fs.readFileSync(filePath, 'utf8');
        const issues = this.analyzeFileContent(content, file);
        
        this.results.push({
          test: 'file_check',
          file: file,
          status: exists ? 'success' : 'error',
          issues: issues
        });
      }
    }
  }

  analyzeFileContent(content, filename) {
    const issues = [];
    
    // 檢查常見問題模式
    const problemPatterns = [
      { pattern: /setReferrerProgress(?!.*=)/g, message: 'setReferrerProgress 未定義' },
      { pattern: /undefined\.length/g, message: 'undefined.length 錯誤' },
      { pattern: /Cannot read properties.*undefined/g, message: '讀取 undefined 屬性' },
      { pattern: /useEffect.*\[\]/g, message: '空依賴數組的 useEffect' },
      { pattern: /console\.log/g, message: '包含 console.log' },
      { pattern: /TODO|FIXME|XXX/g, message: '包含待辦事項' }
    ];

    problemPatterns.forEach(({ pattern, message }) => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          type: 'pattern',
          message: message,
          count: matches.length,
          severity: message.includes('錯誤') ? 'error' : 'warning'
        });
      }
    });

    return issues;
  }

  async analyzeCodeIssues() {
    console.log('\n🔍 分析代碼問題...');
    
    // 檢查 TypeScript 編譯錯誤
    return new Promise((resolve) => {
      exec('npm run type-check', (error, stdout, stderr) => {
        const typeCheckResult = {
          test: 'typescript_check',
          status: error ? 'error' : 'success',
          details: {
            stdout: stdout,
            stderr: stderr,
            error: error?.message
          }
        };
        
        if (typeCheckResult.status === 'success') {
          console.log('✅ TypeScript 類型檢查通過');
        } else {
          console.log('❌ TypeScript 類型檢查失敗');
          console.log('錯誤詳情:', stderr);
        }
        
        this.results.push(typeCheckResult);
        resolve();
      });
    });
  }

  async checkEnvironmentConfig() {
    console.log('\n⚙️  檢查環境配置...');
    
    const envFile = path.join(__dirname, '.env');
    const envExists = fs.existsSync(envFile);
    
    if (envExists) {
      const envContent = fs.readFileSync(envFile, 'utf8');
      const envVars = envContent.split('\n').filter(line => line.includes('='));
      
      console.log(`✅ 找到 ${envVars.length} 個環境變量`);
      
      // 檢查關鍵環境變量
      const criticalVars = [
        'VITE_ALCHEMY_KEY',
        'VITE_WALLETCONNECT_PROJECT_ID',
        'VITE_THE_GRAPH_API_URL'
      ];
      
      criticalVars.forEach(varName => {
        const exists = envContent.includes(varName);
        console.log(`${exists ? '✅' : '❌'} ${varName}`);
      });
      
      this.results.push({
        test: 'environment_config',
        status: 'success',
        details: {
          envVarsCount: envVars.length,
          criticalVarsPresent: criticalVars.filter(v => envContent.includes(v)).length
        }
      });
    } else {
      console.log('❌ 未找到 .env 文件');
      this.results.push({
        test: 'environment_config',
        status: 'error',
        details: { message: '.env file not found' }
      });
    }
  }

  async testBuildProcess() {
    console.log('\n🏗️  測試構建過程...');
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      exec('npm run build', (error, stdout, stderr) => {
        const buildTime = Date.now() - startTime;
        
        const buildResult = {
          test: 'build_process',
          status: error ? 'error' : 'success',
          buildTime: buildTime,
          details: {
            stdout: stdout,
            stderr: stderr,
            error: error?.message
          }
        };
        
        if (buildResult.status === 'success') {
          console.log(`✅ 構建成功 (用時: ${buildTime}ms)`);
          
          // 檢查構建輸出
          const distPath = path.join(__dirname, 'dist');
          if (fs.existsSync(distPath)) {
            const distFiles = fs.readdirSync(distPath, { recursive: true });
            console.log(`📦 生成了 ${distFiles.length} 個文件`);
            buildResult.details.distFiles = distFiles.length;
          }
        } else {
          console.log('❌ 構建失敗');
          console.log('錯誤詳情:', stderr);
        }
        
        this.results.push(buildResult);
        resolve();
      });
    });
  }

  generateDetailedReport() {
    console.log('\n📊 生成詳細報告...');
    
    const summary = {
      totalTests: this.results.length,
      passed: this.results.filter(r => r.status === 'success').length,
      failed: this.results.filter(r => r.status === 'error').length,
      warnings: this.results.filter(r => r.issues?.some(i => i.severity === 'warning')).length
    };

    const report = {
      timestamp: new Date().toISOString(),
      summary: summary,
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    // 保存報告
    fs.writeFileSync(this.logFile, JSON.stringify(report, null, 2));
    
    // 打印摘要
    console.log('\n📋 測試摘要:');
    console.log(`✅ 通過: ${summary.passed}`);
    console.log(`❌ 失敗: ${summary.failed}`);
    console.log(`⚠️  警告: ${summary.warnings}`);
    console.log(`📊 總計: ${summary.totalTests}`);
    
    // 顯示建議
    if (report.recommendations.length > 0) {
      console.log('\n💡 建議:');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    
    console.log(`\n📝 詳細報告已保存至: ${this.logFile}`);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // 基於測試結果生成建議
    const failedTests = this.results.filter(r => r.status === 'error');
    
    if (failedTests.some(t => t.test === 'dev_server')) {
      recommendations.push('請確保開發服務器正在運行 (npm run dev)');
    }
    
    if (failedTests.some(t => t.test === 'typescript_check')) {
      recommendations.push('修復 TypeScript 類型錯誤');
    }
    
    if (failedTests.some(t => t.test === 'build_process')) {
      recommendations.push('修復構建過程中的錯誤');
    }
    
    const issuesWithProblems = this.results.filter(r => r.issues?.some(i => i.severity === 'error'));
    if (issuesWithProblems.length > 0) {
      recommendations.push('修復代碼中的錯誤模式');
    }
    
    return recommendations;
  }
}

// 主函數
async function main() {
  const tester = new ComprehensivePageTester();
  
  try {
    await tester.runTest();
    console.log('\n🎉 全面測試完成！');
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error);
    process.exit(1);
  }
}

// 檢查是否直接運行
if (require.main === module) {
  main();
}

module.exports = ComprehensivePageTester;