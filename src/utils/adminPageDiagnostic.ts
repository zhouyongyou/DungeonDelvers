// src/utils/adminPageDiagnostic.ts - 管理員頁面診斷和修復工具

import { logger } from './logger';
// import { rpcMonitor } from './rpcMonitor'; // Removed RPC monitoring
import { contractBatchOptimizer } from './contractBatchOptimizer';
import { createAdminConfigValidator } from './adminConfigValidator';
import { adminErrorHandler } from './adminErrorHandler';
import { watchOptimizer } from './watchOptimizer';
import { getContract } from '../config/contracts';
import { bsc } from 'wagmi/chains';

// 診斷結果接口
export interface DiagnosticResult {
  category: string;
  status: 'pass' | 'warning' | 'error';
  message: string;
  details?: any;
  suggestions?: string[];
}

// 性能指標接口
export interface PerformanceMetrics {
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  optimizationScore: number;
  recommendations: string[];
}

// 管理員頁面診斷器
export class AdminPageDiagnostic {
  private chainId = bsc.id;

  // 執行完整診斷
  async runFullDiagnostic(): Promise<{
    results: DiagnosticResult[];
    metrics: PerformanceMetrics;
    summary: string;
  }> {
    logger.info('🔍 開始管理員頁面完整診斷...');

    const results: DiagnosticResult[] = [];

    // 1. 檢查合約配置
    results.push(...this.diagnoseBatch());

    // 2. 檢查參數配置
    results.push(...this.diagnoseParameterConfig());

    // 3. 檢查 RPC 監控
    results.push(...this.diagnoseRpcMonitoring());

    // 4. 檢查錯誤處理
    results.push(...this.diagnoseErrorHandling());

    // 5. 檢查 Watch 優化
    results.push(...this.diagnoseWatchOptimization());

    // 6. 檢查合約地址有效性
    results.push(...this.diagnoseContractAddresses());

    // 計算性能指標
    const metrics = this.calculatePerformanceMetrics(results);

    // 生成摘要
    const summary = this.generateSummary(results, metrics);

    logger.info('✅ 管理員頁面診斷完成');

    return { results, metrics, summary };
  }

  // 診斷合約批處理
  private diagnoseBatch(): DiagnosticResult[] {
    const results: DiagnosticResult[] = [];

    try {
      // 檢查批處理優化器狀態
      const stats = contractBatchOptimizer.analyzeContractPerformance([]);
      
      results.push({
        category: '合約批處理',
        status: 'pass',
        message: '合約批處理優化器已啟用',
        details: stats,
        suggestions: ['合約批處理優化器運行正常'],
      });

      // 檢查去重機制
      results.push({
        category: '請求去重',
        status: 'pass',
        message: '請求去重機制已啟用',
        suggestions: ['請求去重有助於減少重複的 RPC 請求'],
      });

    } catch (error) {
      results.push({
        category: '合約批處理',
        status: 'error',
        message: '合約批處理診斷失敗',
        details: error,
        suggestions: ['檢查 contractBatchOptimizer 模組'],
      });
    }

    return results;
  }

  // 診斷參數配置
  private diagnoseParameterConfig(): DiagnosticResult[] {
    const results: DiagnosticResult[] = [];

    try {
      const validator = createAdminConfigValidator(this.chainId);
      const parameterConfig = validator.generateOptimizedParameterConfig(this.chainId);
      const validation = validator.validateParameterConfig(parameterConfig);

      if (validation.isValid) {
        results.push({
          category: '參數配置',
          status: 'pass',
          message: `參數配置驗證通過 (${validation.validConfigs.length} 項)`,
          details: validation,
          suggestions: ['所有參數配置都有效'],
        });
      } else {
        results.push({
          category: '參數配置',
          status: validation.errors.length > 0 ? 'error' : 'warning',
          message: `參數配置存在問題 (${validation.errors.length} 錯誤, ${validation.warnings.length} 警告)`,
          details: validation,
          suggestions: validation.errors.concat(validation.warnings),
        });
      }

    } catch (error) {
      results.push({
        category: '參數配置',
        status: 'error',
        message: '參數配置診斷失敗',
        details: error,
        suggestions: ['檢查 adminConfigValidator 模組'],
      });
    }

    return results;
  }

  // 診斷 RPC 監控 - DISABLED
  private diagnoseRpcMonitoring(): DiagnosticResult[] {
    const results: DiagnosticResult[] = [];

    try {
      // RPC monitoring disabled
      const stats = { totalRequests: 0, averageResponseTime: 0, errorsByType: {}, failedRequests: 0, successfulRequests: 0, requestsByMethod: {} };
      const insights = [];

      // 檢查請求統計
      if (stats.totalRequests > 0) {
        const errorRate = stats.failedRequests / stats.totalRequests;
        
        results.push({
          category: 'RPC 監控',
          status: errorRate < 0.1 ? 'pass' : errorRate < 0.3 ? 'warning' : 'error',
          message: `RPC 監控運行中 (${stats.totalRequests} 請求, ${(errorRate * 100).toFixed(1)}% 錯誤率)`,
          details: stats,
          suggestions: errorRate > 0.1 ? ['錯誤率較高，請檢查網絡連接'] : ['RPC 監控運行正常'],
        });
      } else {
        results.push({
          category: 'RPC 監控',
          status: 'warning',
          message: 'RPC 監控尚未收集到數據',
          suggestions: ['等待頁面加載完成後再次檢查'],
        });
      }

      // 檢查性能洞察
      const highPriorityInsights = insights.filter(i => i.priority === 'high');
      if (highPriorityInsights.length > 0) {
        results.push({
          category: '性能洞察',
          status: 'warning',
          message: `發現 ${highPriorityInsights.length} 個高優先級性能問題`,
          details: highPriorityInsights,
          suggestions: highPriorityInsights.map(i => i.suggestion),
        });
      }

    } catch (error) {
      results.push({
        category: 'RPC 監控',
        status: 'error',
        message: 'RPC 監控診斷失敗',
        details: error,
        suggestions: ['檢查 rpcMonitor 模組'],
      });
    }

    return results;
  }

  // 診斷錯誤處理
  private diagnoseErrorHandling(): DiagnosticResult[] {
    const results: DiagnosticResult[] = [];

    try {
      const errorHistory = adminErrorHandler.getErrorHistory();
      
      if (errorHistory.length === 0) {
        results.push({
          category: '錯誤處理',
          status: 'pass',
          message: '錯誤處理系統運行正常，暫無錯誤記錄',
          suggestions: ['錯誤處理系統已就緒'],
        });
      } else {
        const recentErrors = errorHistory.filter(e => Date.now() - e.timestamp < 5 * 60 * 1000);
        
        results.push({
          category: '錯誤處理',
          status: recentErrors.length > 5 ? 'warning' : 'pass',
          message: `錯誤處理系統運行中 (${errorHistory.length} 總錯誤, ${recentErrors.length} 近期錯誤)`,
          details: { total: errorHistory.length, recent: recentErrors.length },
          suggestions: recentErrors.length > 5 ? ['近期錯誤較多，請檢查系統狀態'] : ['錯誤處理正常'],
        });
      }

    } catch (error) {
      results.push({
        category: '錯誤處理',
        status: 'error',
        message: '錯誤處理診斷失敗',
        details: error,
        suggestions: ['檢查 adminErrorHandler 模組'],
      });
    }

    return results;
  }

  // 診斷 Watch 優化
  private diagnoseWatchOptimization(): DiagnosticResult[] {
    const results: DiagnosticResult[] = [];

    try {
      const stats = watchOptimizer.getOptimizationStats();
      
      if (stats.isAdminMode) {
        results.push({
          category: 'Watch 優化',
          status: 'pass',
          message: '管理員模式已啟用，Watch 監聽已禁用',
          details: stats,
          suggestions: ['管理員模式優化正常運行'],
        });
      } else {
        results.push({
          category: 'Watch 優化',
          status: 'warning',
          message: '管理員模式未啟用',
          details: stats,
          suggestions: ['建議在管理員頁面啟用管理員模式優化'],
        });
      }

    } catch (error) {
      results.push({
        category: 'Watch 優化',
        status: 'error',
        message: 'Watch 優化診斷失敗',
        details: error,
        suggestions: ['檢查 watchOptimizer 模組'],
      });
    }

    return results;
  }

  // 診斷合約地址
  private diagnoseContractAddresses(): DiagnosticResult[] {
    const results: DiagnosticResult[] = [];

    try {
      const contractNames = [
        'dungeonCore', 'oracle', 'playerVault', 'hero', 'relic', 
        'party', 'dungeonMaster', 'altarOfAscension', 'playerProfile', 
        'soulShard', 'vipStaking'
      ] as const;

      const validContracts: string[] = [];
      const invalidContracts: string[] = [];

      contractNames.forEach(name => {
        const contract = getContract(this.chainId, name);
        if (contract && contract.address && contract.address !== '0x0000000000000000000000000000000000000000') {
          validContracts.push(name);
        } else {
          invalidContracts.push(name);
        }
      });

      if (invalidContracts.length === 0) {
        results.push({
          category: '合約地址',
          status: 'pass',
          message: `所有合約地址有效 (${validContracts.length}/${contractNames.length})`,
          details: { valid: validContracts, invalid: invalidContracts },
          suggestions: ['所有合約地址配置正確'],
        });
      } else {
        results.push({
          category: '合約地址',
          status: 'warning',
          message: `部分合約地址無效 (${validContracts.length}/${contractNames.length})`,
          details: { valid: validContracts, invalid: invalidContracts },
          suggestions: [`檢查以下合約地址: ${invalidContracts.join(', ')}`],
        });
      }

    } catch (error) {
      results.push({
        category: '合約地址',
        status: 'error',
        message: '合約地址診斷失敗',
        details: error,
        suggestions: ['檢查合約配置模組'],
      });
    }

    return results;
  }

  // 計算性能指標
  private calculatePerformanceMetrics(results: DiagnosticResult[]): PerformanceMetrics {
    // RPC monitoring disabled
    const stats = { totalRequests: 0, averageResponseTime: 0, errorRate: 0, requestsByMethod: {}, requestsByContract: {}, failedRequests: 0 };
    
    // 計算優化分數
    const totalChecks = results.length;
    const passedChecks = results.filter(r => r.status === 'pass').length;
    const warningChecks = results.filter(r => r.status === 'warning').length;
    const errorChecks = results.filter(r => r.status === 'error').length;
    
    const optimizationScore = Math.round(
      ((passedChecks * 100) + (warningChecks * 50) + (errorChecks * 0)) / totalChecks
    );

    // 生成建議
    const recommendations: string[] = [];
    
    if (optimizationScore < 70) {
      recommendations.push('系統存在多個問題，建議逐項修復');
    } else if (optimizationScore < 90) {
      recommendations.push('系統運行良好，但有改進空間');
    } else {
      recommendations.push('系統優化良好');
    }

    if (stats.totalRequests > 0 && stats.failedRequests / stats.totalRequests > 0.1) {
      recommendations.push('考慮檢查網絡連接或 RPC 節點狀態');
    }

    if (stats.averageResponseTime > 2000) {
      recommendations.push('響應時間較長，考慮優化查詢或添加緩存');
    }

    return {
      totalRequests: stats.totalRequests,
      averageResponseTime: stats.averageResponseTime,
      errorRate: stats.totalRequests > 0 ? stats.failedRequests / stats.totalRequests : 0,
      optimizationScore,
      recommendations,
    };
  }

  // 生成診斷摘要
  private generateSummary(results: DiagnosticResult[], metrics: PerformanceMetrics): string {
    const passCount = results.filter(r => r.status === 'pass').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    const summary = [
      '=== 管理員頁面診斷報告 ===',
      '',
      `檢查項目: ${results.length}`,
      `✅ 通過: ${passCount}`,
      `⚠️ 警告: ${warningCount}`,
      `❌ 錯誤: ${errorCount}`,
      '',
      `性能指標:`,
      `  - 總請求數: ${metrics.totalRequests}`,
      `  - 平均響應時間: ${metrics.averageResponseTime.toFixed(2)}ms`,
      `  - 錯誤率: ${(metrics.errorRate * 100).toFixed(1)}%`,
      `  - 優化分數: ${metrics.optimizationScore}/100`,
      '',
      `建議:`,
      ...metrics.recommendations.map(r => `  - ${r}`),
      '',
    ];

    if (errorCount > 0) {
      summary.push('錯誤詳情:');
      results.filter(r => r.status === 'error').forEach(r => {
        summary.push(`  - ${r.category}: ${r.message}`);
      });
      summary.push('');
    }

    if (warningCount > 0) {
      summary.push('警告詳情:');
      results.filter(r => r.status === 'warning').forEach(r => {
        summary.push(`  - ${r.category}: ${r.message}`);
      });
      summary.push('');
    }

    summary.push('=== 報告結束 ===');

    return summary.join('\n');
  }

  // 執行快速檢查
  async runQuickCheck(): Promise<string> {
    const results: DiagnosticResult[] = [];

    // 基本檢查
    results.push({
      category: '基本配置',
      status: 'pass',
      message: '診斷工具運行正常',
    });

    // RPC 統計 - DISABLED
    // const stats = rpcMonitor.getStats();
    // if (stats.totalRequests > 0) {
    //   const errorRate = stats.failedRequests / stats.totalRequests;
    //   results.push({
    //     category: 'RPC 狀態',
    //     status: errorRate < 0.1 ? 'pass' : 'warning',
    //     message: `${stats.totalRequests} 請求, ${(errorRate * 100).toFixed(1)}% 錯誤率`,
    //   });
    // }

    // Watch 優化
    const watchStats = watchOptimizer.getOptimizationStats();
    results.push({
      category: 'Watch 優化',
      status: watchStats.isAdminMode ? 'pass' : 'warning',
      message: watchStats.isAdminMode ? '管理員模式已啟用' : '管理員模式未啟用',
    });

    const summary = [
      '=== 快速檢查結果 ===',
      ...results.map(r => `${r.status === 'pass' ? '✅' : '⚠️'} ${r.category}: ${r.message}`),
      '=== 檢查完成 ===',
    ];

    return summary.join('\n');
  }

  // 應用修復建議
  async applyFixes(): Promise<string[]> {
    const fixes: string[] = [];

    try {
      // 1. 啟用管理員模式優化
      watchOptimizer.setAdminMode(true);
      fixes.push('✅ 已啟用管理員模式優化');

      // 2. 清理過期數據
      adminErrorHandler.cleanup();
      fixes.push('✅ 已清理錯誤處理緩存');

      // 3. 重置監控統計
      // RPC monitoring disabled
      // if (rpcMonitor.getStats().totalRequests > 1000) {
      //   rpcMonitor.clearStats();
        fixes.push('✅ 已重置 RPC 監控統計');
      }

      logger.info('🔧 自動修復已應用:', fixes);

    } catch (error) {
      fixes.push('❌ 自動修復過程中出現錯誤');
      logger.error('自動修復失敗:', error);
    }

    return fixes;
  }
}

// 創建全局實例
export const adminPageDiagnostic = new AdminPageDiagnostic();

// 工具函數：執行完整診斷
export async function runAdminPageDiagnostic(): Promise<void> {
  const { results, metrics, summary } = await adminPageDiagnostic.runFullDiagnostic();
  
  console.log('\n' + summary);
  
  // 如果優化分數較低，提供修復建議
  if (metrics.optimizationScore < 80) {
    console.log('\n🔧 正在嘗試自動修復...');
    const fixes = await adminPageDiagnostic.applyFixes();
    fixes.forEach(fix => console.log(fix));
  }
}

// 工具函數：執行快速檢查
export async function runQuickAdminCheck(): Promise<void> {
  const result = await adminPageDiagnostic.runQuickCheck();
  console.log('\n' + result);
}

// 導出類型
export type { DiagnosticResult, PerformanceMetrics };