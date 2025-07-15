#!/usr/bin/env node

/**
 * 自動化頁面測試腳本
 * 使用 puppeteer 自動瀏覽每個頁面並收集錯誤信息
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 所有頁面列表
const pages = [
  { name: 'mint', url: 'http://localhost:5173/#/mint', description: '鑄造頁面' },
  { name: 'dashboard', url: 'http://localhost:5173/#/dashboard', description: '儀表板' },
  { name: 'party', url: 'http://localhost:5173/#/party', description: '我的資產 (MyAssets)' },
  { name: 'dungeon', url: 'http://localhost:5173/#/dungeon', description: '地城頁面' },
  { name: 'explorer', url: 'http://localhost:5173/#/explorer', description: '探索頁面' },
  { name: 'admin', url: 'http://localhost:5173/#/admin', description: '管理頁面' },
  { name: 'altar', url: 'http://localhost:5173/#/altar', description: '祭壇頁面' },
  { name: 'profile', url: 'http://localhost:5173/#/profile', description: '個人資料' },
  { name: 'vip', url: 'http://localhost:5173/#/vip', description: 'VIP 頁面' },
  { name: 'referral', url: 'http://localhost:5173/#/referral', description: '推薦頁面' },
  { name: 'codex', url: 'http://localhost:5173/#/codex', description: '圖鑑頁面' },
  { name: 'debug', url: 'http://localhost:5173/#/debug', description: '調試頁面' }
];

class PageTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];
    this.logFile = path.join(__dirname, 'debug-results.json');
  }

  async init() {
    console.log('🚀 啟動 Puppeteer 瀏覽器...');
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // 設置視口
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // 監聽控制台訊息
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error' || type === 'warn') {
        console.log(`📝 [${type.toUpperCase()}] ${text}`);
      }
    });
    
    // 監聽頁面錯誤
    this.page.on('pageerror', error => {
      console.error(`❌ 頁面錯誤: ${error.message}`);
    });
    
    // 監聽請求失敗
    this.page.on('requestfailed', request => {
      console.error(`🔗 請求失敗: ${request.url()} - ${request.failure().errorText}`);
    });
  }

  async testPage(pageInfo) {
    const { name, url, description } = pageInfo;
    console.log(`\n🧪 測試頁面: ${description} (${name})`);
    console.log(`🔗 URL: ${url}`);
    
    const startTime = Date.now();
    const result = {
      name,
      url,
      description,
      timestamp: new Date().toISOString(),
      loadTime: 0,
      errors: [],
      warnings: [],
      performance: {},
      status: 'success'
    };
    
    try {
      // 收集控制台訊息
      const consoleMessages = [];
      const consoleHandler = (msg) => {
        const type = msg.type();
        const text = msg.text();
        consoleMessages.push({ type, text, timestamp: Date.now() });
      };
      
      this.page.on('console', consoleHandler);
      
      // 導航到頁面
      const response = await this.page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
      }
      
      // 等待頁面加載
      await this.page.waitForTimeout(3000);
      
      // 檢查是否有 React 錯誤邊界
      const hasErrorBoundary = await this.page.evaluate(() => {
        const errorElements = document.querySelectorAll('[data-testid="error-boundary"], .error-boundary');
        return errorElements.length > 0;
      });
      
      if (hasErrorBoundary) {
        result.errors.push('React Error Boundary 被觸發');
      }
      
      // 檢查是否有錢包連接要求
      const requiresWallet = await this.page.evaluate(() => {
        const text = document.body.textContent || '';
        return text.includes('請先連接錢包') || text.includes('Please connect wallet');
      });
      
      if (requiresWallet) {
        result.warnings.push('頁面需要錢包連接');
      }
      
      // 收集性能指標
      const performanceMetrics = await this.page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
        };
      });
      
      result.performance = performanceMetrics;
      
      // 分析控制台訊息
      consoleMessages.forEach(msg => {
        if (msg.type === 'error') {
          result.errors.push(msg.text);
        } else if (msg.type === 'warn') {
          result.warnings.push(msg.text);
        }
      });
      
      // 移除事件監聽器
      this.page.off('console', consoleHandler);
      
      result.loadTime = Date.now() - startTime;
      
      // 根據錯誤數量設置狀態
      if (result.errors.length > 0) {
        result.status = 'error';
        console.log(`❌ 發現 ${result.errors.length} 個錯誤`);
      } else if (result.warnings.length > 0) {
        result.status = 'warning';
        console.log(`⚠️  發現 ${result.warnings.length} 個警告`);
      } else {
        console.log(`✅ 頁面正常加載`);
      }
      
      console.log(`⏱️  加載時間: ${result.loadTime}ms`);
      
    } catch (error) {
      result.status = 'error';
      result.errors.push(`頁面加載失敗: ${error.message}`);
      console.error(`❌ 測試失敗: ${error.message}`);
    }
    
    return result;
  }

  async testAllPages() {
    console.log(`\n🎯 開始測試 ${pages.length} 個頁面...\n`);
    
    for (const pageInfo of pages) {
      const result = await this.testPage(pageInfo);
      this.results.push(result);
      
      // 短暫等待避免過度負載
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  generateReport() {
    const report = {
      summary: {
        total: this.results.length,
        success: this.results.filter(r => r.status === 'success').length,
        warning: this.results.filter(r => r.status === 'warning').length,
        error: this.results.filter(r => r.status === 'error').length,
        avgLoadTime: this.results.reduce((sum, r) => sum + r.loadTime, 0) / this.results.length
      },
      details: this.results,
      timestamp: new Date().toISOString()
    };
    
    // 保存詳細報告
    fs.writeFileSync(this.logFile, JSON.stringify(report, null, 2));
    
    // 打印摘要
    console.log('\n📊 測試結果摘要:');
    console.log(`總頁面數: ${report.summary.total}`);
    console.log(`✅ 成功: ${report.summary.success}`);
    console.log(`⚠️  警告: ${report.summary.warning}`);
    console.log(`❌ 錯誤: ${report.summary.error}`);
    console.log(`⏱️  平均加載時間: ${Math.round(report.summary.avgLoadTime)}ms`);
    
    // 顯示問題頁面
    const problematicPages = this.results.filter(r => r.status !== 'success');
    if (problematicPages.length > 0) {
      console.log('\n🔍 需要關注的頁面:');
      problematicPages.forEach(page => {
        console.log(`\n📄 ${page.description} (${page.name}):`);
        if (page.errors.length > 0) {
          console.log(`  ❌ 錯誤: ${page.errors.join(', ')}`);
        }
        if (page.warnings.length > 0) {
          console.log(`  ⚠️  警告: ${page.warnings.join(', ')}`);
        }
      });
    }
    
    console.log(`\n📝 詳細報告已保存至: ${this.logFile}`);
    
    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// 主函數
async function main() {
  const tester = new PageTester();
  
  try {
    await tester.init();
    await tester.testAllPages();
    const report = tester.generateReport();
    
    // 如果有錯誤，以非零狀態碼退出
    if (report.summary.error > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

// 檢查是否直接運行
if (require.main === module) {
  main();
}

module.exports = PageTester;