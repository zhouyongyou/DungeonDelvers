import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

// 定義 Network Information API 的類型
interface NetworkInformation {
  type: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  addEventListener: (event: string, listener: () => void) => void;
  removeEventListener: (event: string, listener: () => void) => void;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

export const useNetworkMonitoring = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    connectionType: 'unknown',
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false
  });

  const [connectivityHistory, setConnectivityHistory] = useState<Array<{ timestamp: number; isOnline: boolean }>>([]);

  const updateNetworkStatus = useCallback(() => {
    const navigatorWithConnection = navigator as NavigatorWithConnection;
    const connection = navigatorWithConnection.connection || navigatorWithConnection.mozConnection || navigatorWithConnection.webkitConnection;
    
    const newStatus: NetworkStatus = {
      isOnline: navigator.onLine,
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || false
    };

    setNetworkStatus(newStatus);
    
    // 記錄連接狀態歷史
    setConnectivityHistory((prev: Array<{ timestamp: number; isOnline: boolean }>) => {
      const newEntry = { timestamp: Date.now(), isOnline: newStatus.isOnline };
      const filtered = prev.filter((entry: { timestamp: number; isOnline: boolean }) => Date.now() - entry.timestamp < 300000); // 保留5分鐘歷史
      return [...filtered, newEntry].slice(-20); // 最多保留20條記錄
    });

    // 日誌記錄

      isOnline: newStatus.isOnline,
      type: newStatus.connectionType,
      effectiveType: newStatus.effectiveType,
      speed: `${newStatus.downlink}Mbps`,
      rtt: `${newStatus.rtt}ms`,
      saveData: newStatus.saveData
    });
}, []);

useEffect(() => {
    const handleOnline = () => {

      updateNetworkStatus();
    };

    const handleOffline = () => {

      updateNetworkStatus();
    };

    // 添加事件監聽器
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 監聽網路變化
    const navigatorWithConnection = navigator as NavigatorWithConnection;
    const connection = navigatorWithConnection.connection || navigatorWithConnection.mozConnection || navigatorWithConnection.webkitConnection;
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    // 初始化狀態
    updateNetworkStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, [updateNetworkStatus]);

  // 計算網路穩定性
  const networkStability = useCallback(() => {
    if (connectivityHistory.length < 2) return 1;
    
    const changes = connectivityHistory.slice(1).reduce((count: number, current: { timestamp: number; isOnline: boolean }, index: number) => {
      return current.isOnline !== connectivityHistory[index].isOnline ? count + 1 : count;
    }, 0);
    
    return Math.max(0, 1 - (changes / connectivityHistory.length));
  }, [connectivityHistory]);

  return {
    ...networkStatus,
    isSlowConnection: networkStatus.effectiveType === 'slow-2g' || networkStatus.effectiveType === '2g',
    isFastConnection: networkStatus.effectiveType === '4g' || networkStatus.downlink > 1.5,
    isStableConnection: networkStability() > 0.8,
    connectivityHistory,
    stability: networkStability()
  };
};

// 智能載入策略 Hook
export const useSmartLoading = () => {
  const network = useNetworkMonitoring();
  
  return {
    shouldPreload: network.isOnline && !network.isSlowConnection && !network.saveData,
    timeout: network.isSlowConnection ? 10000 : network.isFastConnection ? 3000 : 5000,
    retryDelay: network.isSlowConnection ? 3000 : network.isStableConnection ? 1000 : 2000,
    maxRetries: network.isSlowConnection ? 1 : network.isStableConnection ? 3 : 2,
    batchSize: network.isFastConnection ? 10 : network.isSlowConnection ? 3 : 5,
    enableCaching: true,
    compressionPreference: network.saveData || network.isSlowConnection ? 'high' : 'low'
  };
};

// NFT 載入優化 Hook
export const useNftLoadingStrategy = (nftType: 'hero' | 'relic' | 'party' | 'vip' = 'hero') => {
  const smartLoading = useSmartLoading();
  const network = useNetworkMonitoring();
  
  // 根據 NFT 類型和網路狀況優化載入策略
  const getLoadingPriority = useCallback(() => {
    const basePriority = {
      hero: 2,
      relic: 2,
      party: 1,
      vip: 3
    };
    
    // 網路狀況不好時降低優先級
    const networkMultiplier = network.isSlowConnection ? 0.5 : network.isFastConnection ? 1.5 : 1;
    
    return basePriority[nftType] * networkMultiplier;
  }, [nftType, network.isSlowConnection, network.isFastConnection]);

  return {
    ...smartLoading,
    priority: getLoadingPriority(),
    enableLazyLoading: !network.isFastConnection,
    imageQuality: network.saveData ? 'low' : 'high',
    useWebP: network.isFastConnection && !network.saveData
  };
};