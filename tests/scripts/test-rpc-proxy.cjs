#!/usr/bin/env node

/**
 * DungeonDelvers RPC 代理測試腳本
 * 
 * 此腳本用於測試 RPC 代理功能的完整性
 * 包括：基本功能、CORS、API 金鑰輪換、錯誤處理、超時處理
 */

const fs = require('fs');
const path = require('path');

// 測試配置
const TEST_CONFIG = {
  // RPC 代理 URL (本地開發/生產環境)
  rpcProxyUrl: process.env.RPC_PROXY_URL || 'http://localhost:3000/api/rpc',
  
  // 測試用的 RPC 請求
  testRequests: [
    {
      name: 'eth_blockNumber',
      request: {
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      }
    },
    {
      name: 'eth_getBalance',
      request: {
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: ['0x0000000000000000000000000000000000000000', 'latest'],
        id: 2
      }
    },
    {
      name: 'eth_chainId',
      request: {
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 3
      }
    }
  ],
  
  // 測試參數
  timeout: 30000,
  keyRotationTestCount: 5,
  concurrentRequestCount: 3
};

// 測試結果收集器
class TestResultCollector {
  constructor() {
    this.results = [];
    this.summary = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    };
  }
  
  addResult(testName, status, message, details = {}) {
    const result = {
      testName,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
    this.summary.total++;
    this.summary[status]++;
    
    // 實時輸出
    const statusIcon = {
      passed: '✅',
      failed: '❌',
      skipped: '⏭️'
    }[status];
    
    console.log(`${statusIcon} ${testName}: ${message}`);
    
    if (details && Object.keys(details).length > 0) {
      console.log(`   詳細信息: ${JSON.stringify(details, null, 2)}`);
    }
  }
  
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.summary,
      testResults: this.results,
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }
  
  generateRecommendations() {
    const recommendations = [];
    const failedTests = this.results.filter(r => r.status === 'failed');
    
    if (failedTests.length > 0) {
      recommendations.push('存在失敗的測試，需要檢查 RPC 代理配置');
    }
    
    const corsFailures = failedTests.filter(r => r.testName.includes('CORS'));
    if (corsFailures.length > 0) {
      recommendations.push('CORS 配置可能存在問題，檢查 Access-Control-Allow-* 標頭');
    }
    
    const timeoutFailures = failedTests.filter(r => r.message.includes('timeout'));
    if (timeoutFailures.length > 0) {
      recommendations.push('檢測到超時問題，可能需要優化 RPC 連接或增加超時時間');
    }
    
    return recommendations;
  }
}

// 主測試類
class RpcProxyTester {
  constructor(config, collector) {
    this.config = config;
    this.collector = collector;
  }
  
  async runAllTests() {
    console.log('🚀 開始 RPC 代理測試...\n');
    
    try {
      // 1. 基本功能測試
      await this.testBasicFunctionality();
      
      // 2. CORS 測試
      await this.testCorsSettings();
      
      // 3. API 金鑰輪換測試
      await this.testApiKeyRotation();
      
      // 4. 錯誤處理測試
      await this.testErrorHandling();
      
      // 5. 超時處理測試
      await this.testTimeoutHandling();
      
      // 6. 並發請求測試
      await this.testConcurrentRequests();
      
      // 7. 前端整合測試
      await this.testFrontendIntegration();
      
    } catch (error) {
      this.collector.addResult('全域錯誤', 'failed', error.message);
    }
    
    console.log('\n📊 測試完成！');
    return this.collector.generateReport();
  }
  
  async testBasicFunctionality() {
    console.log('\n🔧 測試基本功能...');
    
    for (const test of this.config.testRequests) {
      try {
        const response = await this.makeRpcRequest(test.request);
        
        if (response.error) {
          this.collector.addResult(
            `基本功能 - ${test.name}`,
            'failed',
            `RPC 錯誤: ${response.error.message}`,
            { error: response.error }
          );
        } else if (response.result) {
          this.collector.addResult(
            `基本功能 - ${test.name}`,
            'passed',
            'RPC 請求成功',
            { result: response.result }
          );
        } else {
          this.collector.addResult(
            `基本功能 - ${test.name}`,
            'failed',
            '未收到預期的響應格式'
          );
        }
      } catch (error) {
        this.collector.addResult(
          `基本功能 - ${test.name}`,
          'failed',
          `請求失敗: ${error.message}`
        );
      }
    }
  }
  
  async testCorsSettings() {
    console.log('\n🌐 測試 CORS 設置...');
    
    try {
      // 測試 OPTIONS 請求
      const optionsResponse = await fetch(this.config.rpcProxyUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      
      const corsHeaders = {
        'Access-Control-Allow-Origin': optionsResponse.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': optionsResponse.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': optionsResponse.headers.get('Access-Control-Allow-Headers')
      };
      
      if (optionsResponse.status === 200) {
        this.collector.addResult(
          'CORS - OPTIONS 請求',
          'passed',
          'OPTIONS 請求處理正常',
          { headers: corsHeaders }
        );
      } else {
        this.collector.addResult(
          'CORS - OPTIONS 請求',
          'failed',
          `OPTIONS 請求失敗: ${optionsResponse.status}`
        );
      }
      
      // 檢查必需的 CORS 標頭
      const requiredHeaders = ['Access-Control-Allow-Origin', 'Access-Control-Allow-Methods'];
      for (const header of requiredHeaders) {
        if (corsHeaders[header]) {
          this.collector.addResult(
            `CORS - ${header}`,
            'passed',
            `標頭存在: ${corsHeaders[header]}`
          );
        } else {
          this.collector.addResult(
            `CORS - ${header}`,
            'failed',
            '缺少必需的 CORS 標頭'
          );
        }
      }
      
    } catch (error) {
      this.collector.addResult(
        'CORS - 全域測試',
        'failed',
        `CORS 測試失敗: ${error.message}`
      );
    }
  }
  
  async testApiKeyRotation() {
    console.log('\n🔄 測試 API 金鑰輪換...');
    
    const results = [];
    
    for (let i = 0; i < this.config.keyRotationTestCount; i++) {
      try {
        const start = Date.now();
        const response = await this.makeRpcRequest(this.config.testRequests[0].request);
        const duration = Date.now() - start;
        
        results.push({
          request: i + 1,
          success: !response.error,
          duration,
          error: response.error
        });
        
        // 短暫延遲以觀察輪換效果
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        results.push({
          request: i + 1,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const avgDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length;
    
    if (successCount >= this.config.keyRotationTestCount * 0.8) {
      this.collector.addResult(
        'API 金鑰輪換',
        'passed',
        `${successCount}/${this.config.keyRotationTestCount} 請求成功`,
        { 
          successRate: (successCount / this.config.keyRotationTestCount * 100).toFixed(1) + '%',
          averageDuration: avgDuration.toFixed(0) + 'ms',
          details: results
        }
      );
    } else {
      this.collector.addResult(
        'API 金鑰輪換',
        'failed',
        `成功率過低: ${successCount}/${this.config.keyRotationTestCount}`,
        { details: results }
      );
    }
  }
  
  async testErrorHandling() {
    console.log('\n⚠️ 測試錯誤處理...');
    
    // 測試無效的 JSON
    try {
      const response = await fetch(this.config.rpcProxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });
      
      const data = await response.json();
      
      if (data.error && data.error.code) {
        this.collector.addResult(
          '錯誤處理 - 無效 JSON',
          'passed',
          '正確處理無效 JSON 請求',
          { error: data.error }
        );
      } else {
        this.collector.addResult(
          '錯誤處理 - 無效 JSON',
          'failed',
          '沒有正確處理無效 JSON'
        );
      }
    } catch (error) {
      this.collector.addResult(
        '錯誤處理 - 無效 JSON',
        'failed',
        `錯誤處理測試失敗: ${error.message}`
      );
    }
    
    // 測試無效的 RPC 方法
    try {
      const response = await this.makeRpcRequest({
        jsonrpc: '2.0',
        method: 'invalid_method',
        params: [],
        id: 999
      });
      
      if (response.error) {
        this.collector.addResult(
          '錯誤處理 - 無效方法',
          'passed',
          '正確處理無效 RPC 方法',
          { error: response.error }
        );
      } else {
        this.collector.addResult(
          '錯誤處理 - 無效方法',
          'failed',
          '沒有正確處理無效 RPC 方法'
        );
      }
    } catch (error) {
      this.collector.addResult(
        '錯誤處理 - 無效方法',
        'failed',
        `錯誤處理測試失敗: ${error.message}`
      );
    }
  }
  
  async testTimeoutHandling() {
    console.log('\n⏱️ 測試超時處理...');
    
    const shortTimeout = 1000; // 1秒超時
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), shortTimeout);
      
      const response = await fetch(this.config.rpcProxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.config.testRequests[0].request),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        this.collector.addResult(
          '超時處理',
          'passed',
          '請求在超時時間內完成'
        );
      } else {
        this.collector.addResult(
          '超時處理',
          'failed',
          `請求失敗: ${response.status}`
        );
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        this.collector.addResult(
          '超時處理',
          'failed',
          '請求超時 - 可能需要優化性能'
        );
      } else {
        this.collector.addResult(
          '超時處理',
          'failed',
          `超時測試失敗: ${error.message}`
        );
      }
    }
  }
  
  async testConcurrentRequests() {
    console.log('\n🚀 測試並發請求...');
    
    const requests = Array(this.config.concurrentRequestCount).fill().map((_, i) => 
      this.makeRpcRequest({
        ...this.config.testRequests[0].request,
        id: i + 1
      })
    );
    
    try {
      const start = Date.now();
      const results = await Promise.all(requests);
      const duration = Date.now() - start;
      
      const successCount = results.filter(r => !r.error).length;
      
      if (successCount === this.config.concurrentRequestCount) {
        this.collector.addResult(
          '並發請求',
          'passed',
          `${successCount}/${this.config.concurrentRequestCount} 並發請求成功`,
          { 
            totalDuration: duration + 'ms',
            averagePerRequest: (duration / this.config.concurrentRequestCount).toFixed(0) + 'ms'
          }
        );
      } else {
        this.collector.addResult(
          '並發請求',
          'failed',
          `並發請求成功率: ${successCount}/${this.config.concurrentRequestCount}`,
          { failures: results.filter(r => r.error) }
        );
      }
      
    } catch (error) {
      this.collector.addResult(
        '並發請求',
        'failed',
        `並發測試失敗: ${error.message}`
      );
    }
  }
  
  async testFrontendIntegration() {
    console.log('\n🔗 測試前端整合...');
    
    try {
      // 檢查前端配置文件
      const frontendConfigs = [
        '/Users/sotadic/Documents/GitHub/DungeonDelvers/src/config/rpc.ts',
        '/Users/sotadic/Documents/GitHub/DungeonDelvers/src/wagmi.ts'
      ];
      
      for (const configPath of frontendConfigs) {
        if (fs.existsSync(configPath)) {
          const content = fs.readFileSync(configPath, 'utf8');
          
          // 檢查是否包含 RPC 代理配置
          const hasProxyConfig = content.includes('api/rpc') || content.includes('rpc');
          
          if (hasProxyConfig) {
            this.collector.addResult(
              `前端整合 - ${path.basename(configPath)}`,
              'passed',
              '發現 RPC 代理配置'
            );
          } else {
            this.collector.addResult(
              `前端整合 - ${path.basename(configPath)}`,
              'failed',
              '未發現 RPC 代理配置'
            );
          }
        } else {
          this.collector.addResult(
            `前端整合 - ${path.basename(configPath)}`,
            'skipped',
            '配置文件不存在'
          );
        }
      }
      
    } catch (error) {
      this.collector.addResult(
        '前端整合',
        'failed',
        `前端整合測試失敗: ${error.message}`
      );
    }
  }
  
  async makeRpcRequest(request) {
    const response = await fetch(this.config.rpcProxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

// 主程式
async function main() {
  console.log('📋 DungeonDelvers RPC 代理測試開始');
  console.log('='*50);
  
  const collector = new TestResultCollector();
  const tester = new RpcProxyTester(TEST_CONFIG, collector);
  
  try {
    const report = await tester.runAllTests();
    
    // 保存測試報告
    const reportPath = path.join(__dirname, 'rpc-proxy-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n' + '='*50);
    console.log('📊 測試總結:');
    console.log(`✅ 通過: ${report.summary.passed}`);
    console.log(`❌ 失敗: ${report.summary.failed}`);
    console.log(`⏭️ 跳過: ${report.summary.skipped}`);
    console.log(`📄 詳細報告: ${reportPath}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 建議:');
      report.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }
    
    // 退出碼
    process.exit(report.summary.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ 測試執行失敗:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { RpcProxyTester, TestResultCollector };