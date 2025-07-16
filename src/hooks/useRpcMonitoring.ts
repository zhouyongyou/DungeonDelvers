// src/hooks/useRpcMonitoring.ts - RPC 監控相關 Hook

import { useState, useEffect, useCallback } from 'react';
// import { rpcMonitor } from '../utils/rpcMonitor'; // Removed RPC monitoring
// import type { RpcStats, PerformanceInsight } from '../utils/rpcMonitor';

// Mock types for disabled RPC monitoring
type RpcStats = {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDuration: number;
  averageResponseTime: number;
  requestsByMethod: Record<string, number>;
  requestsByContract: Record<string, number>;
  requestsByPage: Record<string, number>;
  errorsByType: Record<string, number>;
  hourlyRequests: number[];
  lastUpdated: number;
};

type PerformanceInsight = {
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
};
// import { rpcAnalytics } from '../utils/rpcAnalytics'; // Removed RPC monitoring
// import type { CacheRecommendation, OptimizationSuggestion } from '../utils/rpcAnalytics';

// Mock types for disabled RPC analytics
type CacheRecommendation = {
  queryKey: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  recommendedStaleTime: number;
  recommendedGcTime: number;
};

type OptimizationSuggestion = {
  type: string;
  title: string;
  description: string;
  implementation: string;
  expectedImpact: string;
  difficulty: string;
};

// RPC 監控狀態 Hook
export const useRpcMonitoring = (updateInterval: number = 5000) => {
  const [stats, setStats] = useState<RpcStats | null>(null);
  const [insights, setInsights] = useState<PerformanceInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const updateData = useCallback(() => {
    // RPC monitoring disabled - return mock data
    setStats({
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalDuration: 0,
      averageResponseTime: 0,
      requestsByMethod: {},
      requestsByContract: {},
      requestsByPage: {},
      errorsByType: {},
      hourlyRequests: new Array(24).fill(0),
      lastUpdated: Date.now(),
    });
    setInsights([]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    updateData();
    // TEMP_DISABLED: 暫時禁用輪詢以避免 RPC 過載
    // const interval = setInterval(updateData, updateInterval);
    // return () => clearInterval(interval);
  }, [updateData, updateInterval]);

  const clearStats = useCallback(() => {
    // RPC monitoring disabled
    updateData();
  }, [updateData]);

  const exportStats = useCallback(() => {
    // RPC monitoring disabled
    return JSON.stringify({ disabled: true, message: 'RPC monitoring has been disabled' }, null, 2);
  }, []);

  return {
    stats,
    insights,
    isLoading,
    clearStats,
    exportStats,
    refresh: updateData,
  };
};

// RPC 性能分析 Hook
export const useRpcAnalytics = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const generateReport = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      // RPC analytics disabled
      return { disabled: true, message: 'RPC analytics has been disabled' };
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const getCacheRecommendations = useCallback(async (): Promise<CacheRecommendation[]> => {
    setIsAnalyzing(true);
    try {
      // RPC analytics disabled
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const getOptimizationSuggestions = useCallback(async (): Promise<OptimizationSuggestion[]> => {
    setIsAnalyzing(true);
    try {
      // RPC analytics disabled
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const detectBottlenecks = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      // RPC analytics disabled
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const generatePerformanceReport = useCallback(async (): Promise<string> => {
    setIsAnalyzing(true);
    try {
      // RPC analytics disabled
      return 'RPC performance monitoring has been disabled.';
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return {
    isAnalyzing,
    generateReport,
    getCacheRecommendations,
    getOptimizationSuggestions,
    detectBottlenecks,
    generatePerformanceReport,
  };
};

// RPC 頁面統計 Hook
export const useRpcPageStats = (pageName: string) => {
  const [pageStats, setPageStats] = useState<Partial<RpcStats> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updatePageStats = useCallback(() => {
    // RPC monitoring disabled
    setPageStats({ totalRequests: 0 });
    setIsLoading(false);
  }, [pageName]);

  useEffect(() => {
    updatePageStats();
    // TEMP_DISABLED: 暫時禁用輪詢以避免 RPC 過載
    // const interval = setInterval(updatePageStats, 10000); // 每10秒更新
    // return () => clearInterval(interval);
  }, [updatePageStats]);

  return {
    pageStats,
    isLoading,
    refresh: updatePageStats,
  };
};

// RPC 合約統計 Hook
export const useRpcContractStats = (contractName: string) => {
  const [contractStats, setContractStats] = useState<Partial<RpcStats> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateContractStats = useCallback(() => {
    // RPC monitoring disabled
    setContractStats({ totalRequests: 0 });
    setIsLoading(false);
  }, [contractName]);

  useEffect(() => {
    updateContractStats();
    // TEMP_DISABLED: 暫時禁用輪詢以避免 RPC 過載
    // const interval = setInterval(updateContractStats, 10000); // 每10秒更新
    // return () => clearInterval(interval);
  }, [updateContractStats]);

  return {
    contractStats,
    isLoading,
    refresh: updateContractStats,
  };
};

// RPC 實時監控 Hook
export const useRpcRealTimeMonitoring = () => {
  const [realtimeStats, setRealtimeStats] = useState({
    activeRequests: 0,
    requestsPerSecond: 0,
    averageResponseTime: 0,
    errorRate: 0,
  });

  const [requestHistory, setRequestHistory] = useState<number[]>([]);

  useEffect(() => {
    // TEMP_DISABLED: 暫時禁用實時監控輪詢以避免 RPC 過載
    /* 
    const interval = setInterval(() => {
      // RPC monitoring disabled
      const stats = { averageResponseTime: 0, totalRequests: 0, failedRequests: 0 };
      const history = []; // 最近60個請求
      
      // 計算每秒請求數
      const now = Date.now();
      const oneSecondAgo = now - 1000;
      const recentRequests = history.filter(req => req.timestamp > oneSecondAgo);
      
      // 計算當前錯誤率
      const recentErrors = recentRequests.filter(req => req.status === 'error').length;
      const errorRate = recentRequests.length > 0 ? recentErrors / recentRequests.length : 0;
      
      // 更新實時統計
      setRealtimeStats({
        activeRequests: 0, // 待實現：跟踪進行中的請求
        requestsPerSecond: recentRequests.length,
        averageResponseTime: stats.averageResponseTime,
        errorRate,
      });

      // 更新請求歷史（用於圖表）
      setRequestHistory(prev => {
        const newHistory = [...prev, recentRequests.length];
        return newHistory.slice(-60); // 保留最近60秒的數據
      });
    }, 1000);

    return () => clearInterval(interval);
    */
  }, []);

  return {
    realtimeStats,
    requestHistory,
  };
};

// RPC 警報 Hook
export const useRpcAlerts = () => {
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    type: 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: number;
  }>>([]);

  const [thresholds, setThresholds] = useState({
    maxRequestsPerMinute: 100,
    maxResponseTime: 3000,
    maxErrorRate: 0.1,
  });

  const addAlert = useCallback((alert: Omit<typeof alerts[0], 'id' | 'timestamp'>) => {
    const newAlert = {
      ...alert,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    setAlerts(prev => [...prev, newAlert]);
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // 監控閾值
  useEffect(() => {
    // TEMP_DISABLED: 暫時禁用閾值監控輪詢以避免 RPC 過載
    /*
    const interval = setInterval(() => {
      // RPC monitoring disabled
      const stats = { averageResponseTime: 0, totalRequests: 0, failedRequests: 0 };
      const history = [];
      
      // 檢查請求頻率
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      const requestsInLastMinute = history.filter(req => req.timestamp > oneMinuteAgo).length;
      
      if (requestsInLastMinute > thresholds.maxRequestsPerMinute) {
        addAlert({
          type: 'warning',
          title: '請求頻率過高',
          message: `最近一分鐘內發送了 ${requestsInLastMinute} 個請求，超過閾值 ${thresholds.maxRequestsPerMinute}`,
        });
      }
      
      // 檢查響應時間
      if (stats.averageResponseTime > thresholds.maxResponseTime) {
        addAlert({
          type: 'error',
          title: '響應時間過長',
          message: `平均響應時間 ${stats.averageResponseTime.toFixed(0)}ms 超過閾值 ${thresholds.maxResponseTime}ms`,
        });
      }
      
      // 檢查錯誤率
      const errorRate = stats.totalRequests > 0 ? stats.failedRequests / stats.totalRequests : 0;
      if (errorRate > thresholds.maxErrorRate) {
        addAlert({
          type: 'error',
          title: '錯誤率過高',
          message: `錯誤率 ${(errorRate * 100).toFixed(1)}% 超過閾值 ${(thresholds.maxErrorRate * 100).toFixed(1)}%`,
        });
      }
    }, 30000); // 每30秒檢查一次

    return () => clearInterval(interval);
    */
  }, [thresholds, addAlert]);

  return {
    alerts,
    thresholds,
    setThresholds,
    addAlert,
    removeAlert,
    clearAllAlerts,
  };
};

// RPC 配置優化 Hook
export const useRpcOptimization = () => {
  const [optimizationSettings, setOptimizationSettings] = useState({
    enableMonitoring: true,
    enableCaching: true,
    enableRetry: true,
    enableBatching: false,
  });

  const updateOptimizationSettings = useCallback((settings: Partial<typeof optimizationSettings>) => {
    setOptimizationSettings(prev => ({ ...prev, ...settings }));
    
    // RPC monitoring disabled - settings not applied
    // rpcMonitor.setEnabled(settings.enableMonitoring ?? optimizationSettings.enableMonitoring);
  }, [optimizationSettings]);

  const applyOptimizationSettings = useCallback(() => {
    // 這裡可以應用各種優化設置
    console.log('應用 RPC 優化設置:', optimizationSettings);
  }, [optimizationSettings]);

  return {
    optimizationSettings,
    updateOptimizationSettings,
    applyOptimizationSettings,
  };
};