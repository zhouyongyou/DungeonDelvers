#!/usr/bin/env node

/**
 * 簡化的頁面測試腳本 - 使用 fetch 檢查頁面可訪問性
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 所有頁面列表
const pages = [
  { name: 'mint', path: '/#/mint', description: '鑄造頁面' },
  { name: 'dashboard', path: '/#/dashboard', description: '儀表板' },
  { name: 'party', path: '/#/party', description: '我的資產 (MyAssets)' },
  { name: 'dungeon', path: '/#/dungeon', description: '地城頁面' },
  { name: 'explorer', path: '/#/explorer', description: '探索頁面' },
  { name: 'admin', path: '/#/admin', description: '管理頁面' },
  { name: 'altar', path: '/#/altar', description: '祭壇頁面' },
  { name: 'profile', path: '/#/profile', description: '個人資料' },
  { name: 'vip', path: '/#/vip', description: 'VIP 頁面' },
  { name: 'referral', path: '/#/referral', description: '推薦頁面' },
  { name: 'codex', path: '/#/codex', description: '圖鑑頁面' },
  { name: 'debug', path: '/#/debug', description: '調試頁面' }
];

class SimplePageTester {
  constructor(baseUrl = 'http://localhost:5173') {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  async checkPage(pageInfo) {
    const { name, path, description } = pageInfo;
    const url = `${this.baseUrl}${path}`;
    
    console.log(`\n🧪 檢查頁面: ${description} (${name})`);
    console.log(`🔗 URL: ${url}`);
    
    return new Promise((resolve) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const req = client.request(urlObj, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const result = {
            name,
            description,
            status: res.statusCode,
            accessible: res.statusCode >= 200 && res.statusCode < 400,
            timestamp: new Date().toISOString()
          };
          
          if (result.accessible) {
            console.log(`✅ 頁面可訪問 (狀態: ${res.statusCode})`);
          } else {
            console.log(`❌ 頁面不可訪問 (狀態: ${res.statusCode})`);
          }
          
          resolve(result);
        });
      });
      
      req.on('error', (error) => {
        console.log(`❌ 連接錯誤: ${error.message}`);
        resolve({
          name,
          description,
          status: 'error',
          error: error.message,
          accessible: false,
          timestamp: new Date().toISOString()
        });
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
        console.log(`⏱️  請求超時`);
        resolve({
          name,
          description,
          status: 'timeout',
          accessible: false,
          timestamp: new Date().toISOString()
        });
      });
      
      req.end();
    });
  }

  async testAllPages() {
    console.log(`\n🎯 開始檢查 ${pages.length} 個頁面...\n`);
    
    for (const pageInfo of pages) {
      const result = await this.checkPage(pageInfo);
      this.results.push(result);
      
      // 短暫等待
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  generateReport() {
    const accessible = this.results.filter(r => r.accessible).length;
    const total = this.results.length;
    
    console.log('\n📊 測試結果摘要:');
    console.log(`總頁面數: ${total}`);
    console.log(`✅ 可訪問: ${accessible}`);
    console.log(`❌ 不可訪問: ${total - accessible}`);
    
    const problematicPages = this.results.filter(r => !r.accessible);
    if (problematicPages.length > 0) {
      console.log('\n🔍 需要關注的頁面:');
      problematicPages.forEach(page => {
        console.log(`  📄 ${page.description} (${page.name}): ${page.status}`);
        if (page.error) {
          console.log(`    ❌ 錯誤: ${page.error}`);
        }
      });
    }
    
    // 保存報告
    const reportFile = path.join(__dirname, 'simple-test-results.json');
    fs.writeFileSync(reportFile, JSON.stringify({
      summary: { total, accessible, failed: total - accessible },
      details: this.results,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log(`\n📝 報告已保存至: ${reportFile}`);
    
    return { total, accessible, failed: total - accessible };
  }
}

// 主函數
async function main() {
  const tester = new SimplePageTester();
  
  try {
    await tester.testAllPages();
    const report = tester.generateReport();
    
    if (report.failed > 0) {
      console.log('\n⚠️  發現問題頁面，建議進一步調查');
    } else {
      console.log('\n✅ 所有頁面都可以訪問');
    }
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error);
    process.exit(1);
  }
}

// 檢查是否直接運行
if (require.main === module) {
  main();
}

module.exports = SimplePageTester;