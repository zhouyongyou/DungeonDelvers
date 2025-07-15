// src/utils/rpcMonitorTest.ts - RPC 監控系統測試

import { rpcMonitor } from './rpcMonitor';
import { rpcAnalytics } from './rpcAnalytics';
import { rpcOptimizer } from './rpcOptimizer';
import { logger } from './logger';

// 模擬 RPC 請求數據
const mockRequests = [
  {
    url: 'https://bsc-dataseed1.binance.org/',
    method: 'eth_call',
    params: [{ to: '0x123...', data: '0x456...' }],
    source: 'AdminPage',
    contractName: 'vipStaking',
    functionName: 'getVipLevel',
    responseTime: 1200,
    success: true,
  },
  {
    url: 'https://bsc-dataseed1.binance.org/',
    method: 'eth_call',
    params: [{ to: '0x123...', data: '0x456...' }],
    source: 'AdminPage',
    contractName: 'vipStaking',
    functionName: 'getVipLevel',
    responseTime: 1150,
    success: true,
  },
  {
    url: 'https://bsc-dataseed1.binance.org/',
    method: 'eth_call',
    params: [{ to: '0x789...', data: '0xabc...' }],
    source: 'MintPage',
    contractName: 'hero',
    functionName: 'mintPriceUSD',
    responseTime: 800,
    success: true,
  },
  {
    url: 'https://bsc-dataseed1.binance.org/',
    method: 'eth_call',
    params: [{ to: '0x789...', data: '0xdef...' }],
    source: 'MintPage',
    contractName: 'hero',
    functionName: 'totalSupply',
    responseTime: 3200,
    success: false,
    error: 'Network timeout',
  },
];

class RpcMonitorTest {
  // 執行基本功能測試
  async runBasicTests(): Promise<void> {
    console.log('🧪 開始 RPC 監控系統基本功能測試');

    // 測試 1: 請求監控
    console.log('📊 測試 1: 請求監控功能');
    const requestIds: string[] = [];
    
    for (const mockReq of mockRequests) {
      const requestId = rpcMonitor.startRequest(
        mockReq.url,
        mockReq.method,
        mockReq.params,
        mockReq.source,
        mockReq.contractName,
        mockReq.functionName
      );
      requestIds.push(requestId);
      
      // 模擬異步響應
      await new Promise(resolve => setTimeout(resolve, mockReq.responseTime));
      
      if (mockReq.success) {
        rpcMonitor.completeRequest(requestId, { result: 'success' });
      } else {
        rpcMonitor.completeRequest(requestId, undefined, mockReq.error);
      }
    }

    // 測試 2: 統計數據
    console.log('📈 測試 2: 統計數據生成');
    const stats = rpcMonitor.getStats();
    console.log('統計結果:', {
      totalRequests: stats.totalRequests,
      successfulRequests: stats.successfulRequests,
      failedRequests: stats.failedRequests,
      averageResponseTime: stats.averageResponseTime.toFixed(2) + 'ms',
    });

    // 測試 3: 性能洞察
    console.log('💡 測試 3: 性能洞察');
    const insights = rpcMonitor.getInsights();
    console.log(`生成了 ${insights.length} 個洞察`);
    insights.forEach(insight => {
      console.log(`- ${insight.type}: ${insight.title}`);
    });

    console.log('✅ 基本功能測試完成');
  }

  // 測試分析功能
  async runAnalyticsTests(): Promise<void> {
    console.log('🔍 開始 RPC 分析功能測試');

    // 測試分析報告生成
    const report = rpcAnalytics.generateReport();
    console.log('📋 分析報告:', {
      totalRequests: report.summary.totalRequests,
      successRate: (report.summary.successRate * 100).toFixed(1) + '%',
      performanceGrade: report.performance.performanceGrade,
    });

    // 測試緩存建議
    const cacheRecommendations = rpcAnalytics.generateCacheRecommendations();
    console.log(`💾 生成了 ${cacheRecommendations.length} 個緩存建議`);
    cacheRecommendations.slice(0, 3).forEach(rec => {
      console.log(`- ${rec.queryKey}: ${rec.reason}`);
    });

    // 測試優化建議
    const optimizationSuggestions = rpcAnalytics.generateOptimizationSuggestions();
    console.log(`⚡ 生成了 ${optimizationSuggestions.length} 個優化建議`);
    optimizationSuggestions.forEach(sug => {
      console.log(`- ${sug.title}: ${sug.description}`);
    });

    console.log('✅ 分析功能測試完成');
  }

  // 測試優化器功能
  async runOptimizerTests(): Promise<void> {
    console.log('🎯 開始 RPC 優化器功能測試');

    // 等待優化器分析
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const optimizations = rpcOptimizer.getOptimizations();
    console.log(`🔧 生成了 ${optimizations.length} 個自動優化建議`);
    
    optimizations.forEach(opt => {
      console.log(`- ${opt.type}: ${opt.title} (預期改進: ${opt.estimatedImpact}%)`);
    });

    // 測試智能配置生成
    const smartConfig = rpcOptimizer.generateSmartConfig();
    console.log('🧠 智能配置生成:', {
      cacheConfigCount: Object.keys(smartConfig.cacheConfig).length,
      retryConfig: smartConfig.retryConfig,
      batchConfig: smartConfig.batchConfig,
    });

    console.log('✅ 優化器功能測試完成');
  }

  // 測試性能報告
  async runPerformanceTests(): Promise<void> {
    console.log('🚀 開始性能報告測試');

    const performanceReport = rpcAnalytics.generatePerformanceReport();
    console.log('📊 性能報告預覽:');
    console.log(performanceReport.split('\n').slice(0, 10).join('\n'));

    console.log('✅ 性能報告測試完成');
  }

  // 測試導出功能
  async runExportTests(): Promise<void> {
    console.log('📤 開始導出功能測試');

    const exportData = rpcMonitor.exportStats();
    const exportSize = new Blob([exportData]).size;
    console.log(`📁 導出數據大小: ${exportSize} 字節`);

    try {
      const parsedData = JSON.parse(exportData);
      console.log('✅ 導出數據格式正確');
      console.log('📋 導出內容:', {
        hasStats: !!parsedData.stats,
        hasInsights: !!parsedData.insights,
        hasRecentRequests: !!parsedData.recentRequests,
        exportTime: parsedData.exportTime,
      });
    } catch (error) {
      console.error('❌ 導出數據格式錯誤:', error);
    }

    console.log('✅ 導出功能測試完成');
  }

  // 運行所有測試
  async runAllTests(): Promise<void> {
    console.log('🧪 開始 RPC 監控系統完整測試');
    console.log('='.repeat(50));

    try {
      await this.runBasicTests();
      console.log('');
      
      await this.runAnalyticsTests();
      console.log('');
      
      await this.runOptimizerTests();
      console.log('');
      
      await this.runPerformanceTests();
      console.log('');
      
      await this.runExportTests();
      console.log('');
      
      console.log('🎉 所有測試完成！');
      console.log('='.repeat(50));
      
      // 輸出最終統計
      const finalStats = rpcMonitor.getStats();
      const finalInsights = rpcMonitor.getInsights();
      const finalOptimizations = rpcOptimizer.getOptimizations();
      
      console.log('📊 最終統計:');
      console.log(`- 總請求數: ${finalStats.totalRequests}`);
      console.log(`- 成功率: ${(finalStats.successfulRequests / finalStats.totalRequests * 100).toFixed(1)}%`);
      console.log(`- 平均響應時間: ${finalStats.averageResponseTime.toFixed(2)}ms`);
      console.log(`- 洞察數量: ${finalInsights.length}`);
      console.log(`- 優化建議: ${finalOptimizations.length}`);
      
    } catch (error) {
      console.error('❌ 測試執行失敗:', error);
    }
  }

  // 清理測試數據
  cleanup(): void {
    console.log('🧹 清理測試數據...');
    rpcMonitor.clearStats();
    rpcOptimizer.clearOptimizations();
    console.log('✅ 清理完成');
  }
}

// 創建測試實例
export const rpcMonitorTest = new RpcMonitorTest();

// 在開發環境下自動運行測試
if (import.meta.env.DEV) {
  // 延遲運行測試，避免影響應用啟動
  setTimeout(() => {
    console.log('🚀 自動運行 RPC 監控系統測試...');
    rpcMonitorTest.runAllTests();
  }, 5000);
}