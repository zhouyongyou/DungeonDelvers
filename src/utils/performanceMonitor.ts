// src/utils/performanceMonitor.ts - 前端性能監控工具

import React from 'react';
import { logger } from './logger';

// 性能指標類型
interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'render' | 'load' | 'network' | 'memory' | 'interaction';
  unit: 'ms' | 'mb' | 'count' | 'percentage';
}

// 性能監控管理器
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: Record<string, PerformanceObserver> = {};
  private isEnabled = true;

  constructor() {
    this.initializeObservers();
  }

  // 初始化性能觀察者
  private initializeObservers(): void {
    if (typeof window === 'undefined') return;

    try {
      // 監控 LCP (Largest Contentful Paint)
      if ('PerformanceObserver' in window) {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            this.recordMetric({
              name: 'LCP',
              value: entry.startTime,
              timestamp: Date.now(),
              category: 'render',
              unit: 'ms',
            });
          });
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.lcp = lcpObserver;

        // 監控 FID (First Input Delay)
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry: any) => {
            this.recordMetric({
              name: 'FID',
              value: entry.processingStart - entry.startTime,
              timestamp: Date.now(),
              category: 'interaction',
              unit: 'ms',
            });
          });
        });
        
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.fid = fidObserver;

        // 監控 CLS (Cumulative Layout Shift)
        const clsObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry: any) => {
            this.recordMetric({
              name: 'CLS',
              value: entry.value,
              timestamp: Date.now(),
              category: 'render',
              unit: 'count',
            });
          });
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.cls = clsObserver;
      }
    } catch (error) {
      logger.warn('性能監控初始化失敗:', error);
    }
  }

  // 記錄性能指標
  recordMetric(metric: PerformanceMetric): void {
    if (!this.isEnabled) return;

    this.metrics.push(metric);
    
    // 保持最近 100 個指標
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // 記錄警告級別的性能問題
    if (this.isPerformanceIssue(metric)) {
      logger.warn(`性能警告: ${metric.name} = ${metric.value}${metric.unit}`, metric);
    }
  }

  // 判斷是否為性能問題
  private isPerformanceIssue(metric: PerformanceMetric): boolean {
    switch (metric.name) {
      case 'LCP':
        return metric.value > 2500; // > 2.5s
      case 'FID':
        return metric.value > 100; // > 100ms
      case 'CLS':
        return metric.value > 0.1; // > 0.1
      case 'page-load':
        return metric.value > 3000; // > 3s
      case 'component-render':
        return metric.value > 16; // > 16ms (60fps)
      default:
        return false;
    }
  }

  // 測量頁面加載時間
  measurePageLoad(pageName: string): void {
    if (typeof window === 'undefined') return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      const loadTime = navigation.loadEventEnd - navigation.navigationStart;
      
      this.recordMetric({
        name: 'page-load',
        value: loadTime,
        timestamp: Date.now(),
        category: 'load',
        unit: 'ms',
      });

      logger.info(`頁面加載時間: ${pageName} = ${loadTime}ms`);
    }
  }

  // 測量組件渲染時間
  measureComponentRender<T>(componentName: string, renderFn: () => T): T {
    if (!this.isEnabled) return renderFn();

    const startTime = performance.now();
    const result = renderFn();
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    this.recordMetric({
      name: 'component-render',
      value: renderTime,
      timestamp: Date.now(),
      category: 'render',
      unit: 'ms',
    });

    if (renderTime > 16) {
      logger.debug(`組件渲染時間: ${componentName} = ${renderTime.toFixed(2)}ms`);
    }

    return result;
  }

  // 測量異步操作時間
  async measureAsync<T>(operationName: string, asyncFn: () => Promise<T>): Promise<T> {
    if (!this.isEnabled) return asyncFn();

    const startTime = performance.now();
    try {
      const result = await asyncFn();
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.recordMetric({
        name: operationName,
        value: duration,
        timestamp: Date.now(),
        category: 'network',
        unit: 'ms',
      });

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.recordMetric({
        name: `${operationName}-error`,
        value: duration,
        timestamp: Date.now(),
        category: 'network',
        unit: 'ms',
      });

      throw error;
    }
  }

  // 測量內存使用
  measureMemoryUsage(): void {
    if (typeof window === 'undefined') return;

    // @ts-ignore
    if (window.performance && window.performance.memory) {
      // @ts-ignore
      const memory = window.performance.memory;
      
      this.recordMetric({
        name: 'memory-used',
        value: memory.usedJSHeapSize / 1024 / 1024,
        timestamp: Date.now(),
        category: 'memory',
        unit: 'mb',
      });

      this.recordMetric({
        name: 'memory-total',
        value: memory.totalJSHeapSize / 1024 / 1024,
        timestamp: Date.now(),
        category: 'memory',
        unit: 'mb',
      });
    }
  }

  // 獲取性能報告
  getPerformanceReport(): {
    summary: Record<string, { avg: number; max: number; count: number; unit: string }>;
    metrics: PerformanceMetric[];
    recommendations: string[];
  } {
    const summary: Record<string, { avg: number; max: number; count: number; unit: string }> = {};
    const recommendations: string[] = [];

    // 計算統計數據
    this.metrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = {
          avg: 0,
          max: 0,
          count: 0,
          unit: metric.unit,
        };
      }

      const stat = summary[metric.name];
      stat.count++;
      stat.avg = ((stat.avg * (stat.count - 1)) + metric.value) / stat.count;
      stat.max = Math.max(stat.max, metric.value);
    });

    // 生成建議
    Object.entries(summary).forEach(([name, stat]) => {
      switch (name) {
        case 'LCP':
          if (stat.avg > 2500) {
            recommendations.push('優化 LCP: 減少圖片大小，使用 CDN，優化關鍵資源加載');
          }
          break;
        case 'FID':
          if (stat.avg > 100) {
            recommendations.push('優化 FID: 減少 JavaScript 執行時間，使用 Web Workers');
          }
          break;
        case 'CLS':
          if (stat.avg > 0.1) {
            recommendations.push('優化 CLS: 為圖片和廣告設置尺寸，避免動態內容插入');
          }
          break;
        case 'page-load':
          if (stat.avg > 3000) {
            recommendations.push('優化頁面加載: 使用代碼分割，減少初始包大小');
          }
          break;
        case 'memory-used':
          if (stat.avg > 50) {
            recommendations.push('優化內存使用: 檢查內存洩漏，優化數據結構');
          }
          break;
      }
    });

    return {
      summary,
      metrics: this.metrics,
      recommendations,
    };
  }

  // 清理資源
  cleanup(): void {
    Object.values(this.observers).forEach(observer => {
      observer.disconnect();
    });
    this.observers = {};
    this.metrics = [];
  }

  // 啟用/禁用監控
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.cleanup();
    } else {
      this.initializeObservers();
    }
  }
}

// 創建全局實例
export const performanceMonitor = new PerformanceMonitor();

// 工具函數
export function withPerformanceMonitoring<T>(
  componentName: string,
  renderFn: () => T
): T {
  return performanceMonitor.measureComponentRender(componentName, renderFn);
}

export async function withAsyncPerformanceMonitoring<T>(
  operationName: string,
  asyncFn: () => Promise<T>
): Promise<T> {
  return performanceMonitor.measureAsync(operationName, asyncFn);
}

// React Hook
export function usePerformanceMonitoring(componentName: string) {
  const measureRender = <T>(renderFn: () => T): T => {
    return performanceMonitor.measureComponentRender(componentName, renderFn);
  };

  const measureAsync = async <T>(operationName: string, asyncFn: () => Promise<T>): Promise<T> => {
    return performanceMonitor.measureAsync(`${componentName}-${operationName}`, asyncFn);
  };

  return { measureRender, measureAsync };
}

// 頁面性能監控 Hook
export function usePagePerformance(pageName: string) {
  React.useEffect(() => {
    // 測量頁面加載時間
    performanceMonitor.measurePageLoad(pageName);

    // 定期測量內存使用
    const memoryInterval = setInterval(() => {
      performanceMonitor.measureMemoryUsage();
    }, 30000); // 30秒

    return () => {
      clearInterval(memoryInterval);
    };
  }, [pageName]);
}