import { logger } from './logger';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();
  private slowThreshold: number = 1000; // 1 秒

  // 開始計時
  start(name: string): void {
    this.timers.set(name, performance.now());
  }

  // 結束計時並記錄
  end(name: string, metadata?: Record<string, any>): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      logger.warn(`No start time found for metric: ${name}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // 如果超過閾值，記錄警告
    if (duration > this.slowThreshold) {
      logger.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`, metadata);
    }

    // 保持最近 100 個指標
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }

    return duration;
  }

  // 測量異步函數的執行時間
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name);
    try {
      const result = await fn();
      this.end(name, { ...metadata, success: true });
      return result;
    } catch (error) {
      this.end(name, { ...metadata, success: false, error: error.message });
      throw error;
    }
  }

  // 獲取性能統計
  getStats(name?: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number;
  } {
    const relevantMetrics = name
      ? this.metrics.filter(m => m.name === name)
      : this.metrics;

    if (relevantMetrics.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, p95: 0 };
    }

    const durations = relevantMetrics.map(m => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((acc, d) => acc + d, 0);
    const p95Index = Math.floor(durations.length * 0.95);

    return {
      count: durations.length,
      average: sum / durations.length,
      min: durations[0],
      max: durations[durations.length - 1],
      p95: durations[p95Index],
    };
  }

  // 獲取慢操作
  getSlowOperations(threshold?: number): PerformanceMetric[] {
    const limit = threshold || this.slowThreshold;
    return this.metrics
      .filter(m => m.duration > limit)
      .sort((a, b) => b.duration - a.duration);
  }

  // 清除指標
  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }

  // 導出指標
  export(): PerformanceMetric[] {
    return [...this.metrics];
  }

  // 設置慢操作閾值
  setSlowThreshold(ms: number): void {
    this.slowThreshold = ms;
  }
}

// 創建全局實例
export const performanceMonitor = new PerformanceMonitor();

// React Hook 用於測量組件渲染時間
export function useRenderTime(componentName: string) {
  const startTime = performance.now();

  useEffect(() => {
    const duration = performance.now() - startTime;
    performanceMonitor.metrics.push({
      name: `render:${componentName}`,
      duration,
      timestamp: Date.now(),
    });

    if (duration > 100) {
      logger.warn(`Slow render detected: ${componentName} took ${duration.toFixed(2)}ms`);
    }
  });
}

// 用於 API 調用的性能裝飾器
export function measureApiCall(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const apiName = `api:${target.constructor.name}.${propertyKey}`;
    return performanceMonitor.measure(apiName, () => originalMethod.apply(this, args));
  };

  return descriptor;
}

// 用於測量 GraphQL 查詢
export async function measureGraphQLQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return performanceMonitor.measure(`graphql:${queryName}`, queryFn);
}

// 用於測量合約調用
export async function measureContractCall<T>(
  contractName: string,
  methodName: string,
  callFn: () => Promise<T>
): Promise<T> {
  return performanceMonitor.measure(
    `contract:${contractName}.${methodName}`,
    callFn,
    { contract: contractName, method: methodName }
  );
}

// 性能報告生成器
export function generatePerformanceReport(): string {
  const report: string[] = ['=== Performance Report ==='];
  
  // API 性能
  const apiStats = performanceMonitor.getStats('api');
  if (apiStats.count > 0) {
    report.push(`\nAPI Calls:`);
    report.push(`  Count: ${apiStats.count}`);
    report.push(`  Average: ${apiStats.average.toFixed(2)}ms`);
    report.push(`  P95: ${apiStats.p95.toFixed(2)}ms`);
  }

  // GraphQL 性能
  const graphqlStats = performanceMonitor.getStats('graphql');
  if (graphqlStats.count > 0) {
    report.push(`\nGraphQL Queries:`);
    report.push(`  Count: ${graphqlStats.count}`);
    report.push(`  Average: ${graphqlStats.average.toFixed(2)}ms`);
    report.push(`  P95: ${graphqlStats.p95.toFixed(2)}ms`);
  }

  // 慢操作
  const slowOps = performanceMonitor.getSlowOperations();
  if (slowOps.length > 0) {
    report.push(`\nSlow Operations (>1s):`);
    slowOps.slice(0, 5).forEach(op => {
      report.push(`  ${op.name}: ${op.duration.toFixed(2)}ms`);
    });
  }

  return report.join('\n');
}

// 定期輸出性能報告（開發環境）
if (import.meta.env.DEV) {
  setInterval(() => {
    const report = generatePerformanceReport();
    if (report.includes('Count:')) {
      logger.debug(report);
    }
  }, 60000); // 每分鐘
}