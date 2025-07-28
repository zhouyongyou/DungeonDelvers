import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { logger } from '../utils/logger';

interface BackgroundRefreshConfig {
  queryKey: any[];
  interval: number;
  enabled?: boolean;
  refetchInactive?: boolean;
  onRefresh?: () => void;
}

export function useBackgroundRefresh(config: BackgroundRefreshConfig) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { isConnected } = useAccount();

  const {
    queryKey,
    interval,
    enabled = true,
    refetchInactive = true,
    onRefresh,
  } = config;

  useEffect(() => {
    if (!enabled || !isConnected) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const refresh = async () => {
      try {
        logger.debug('Background refresh triggered for:', queryKey);
        
        await queryClient.invalidateQueries({
          queryKey,
          refetchType: refetchInactive ? 'inactive' : 'active',
        });

        onRefresh?.();
      } catch (error) {
        logger.error('Background refresh failed:', error);
      }
    };

    // Initial refresh after a short delay
    const initialTimer = setTimeout(refresh, 5000);

    // TEMP_DISABLED: 暫時禁用背景刷新輪詢以避免 RPC 過載
    // intervalRef.current = setInterval(refresh, interval);

    return () => {
      clearTimeout(initialTimer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [queryKey.join(','), interval, enabled, isConnected, refetchInactive, onRefresh, queryClient]);
}

// Adaptive refresh hook that adjusts interval based on user activity
export function useAdaptiveRefresh(baseQueryKey: any[]) {
  const queryClient = useQueryClient();
  const { address, isConnected } = useAccount();
  const lastActivityRef = useRef(Date.now());
  const currentIntervalRef = useRef(30000); // Start with 30 seconds

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateActivity));

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
    };
  }, []);

  // Adaptive refresh logic
  useBackgroundRefresh({
    queryKey: [...baseQueryKey, address],
    interval: currentIntervalRef.current,
    enabled: isConnected && !!address,
    onRefresh: () => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      
      // Adjust interval based on activity
      if (timeSinceActivity < 60000) { // Active in last minute
        currentIntervalRef.current = 30000; // 30 seconds
      } else if (timeSinceActivity < 300000) { // Active in last 5 minutes
        currentIntervalRef.current = 60000; // 1 minute
      } else { // Inactive
        currentIntervalRef.current = 300000; // 5 minutes
      }
    },
  });
}

// Smart refresh hook that considers network conditions
export function useSmartRefresh(queryKeys: any[][]) {
  const queryClient = useQueryClient();
  const { isConnected } = useAccount();
  const networkQualityRef = useRef<'good' | 'poor'>('good');

  // Monitor network quality
  useEffect(() => {
    if (!('connection' in navigator)) return;

    const connection = (navigator as any).connection;
    
    const updateNetworkQuality = () => {
      const effectiveType = connection.effectiveType;
      networkQualityRef.current = 
        effectiveType === '4g' || effectiveType === 'wifi' ? 'good' : 'poor';
    };

    updateNetworkQuality();
    connection.addEventListener('change', updateNetworkQuality);

    return () => {
      connection.removeEventListener('change', updateNetworkQuality);
    };
  }, []);

  // Refresh multiple query keys with smart batching
  useBackgroundRefresh({
    queryKey: ['smart-refresh'],
    interval: networkQualityRef.current === 'good' ? 60000 : 180000, // 1 or 3 minutes
    enabled: isConnected,
    onRefresh: async () => {
      // Batch refresh queries
      const promises = queryKeys.map(queryKey => 
        queryClient.invalidateQueries({
          queryKey,
          refetchType: 'inactive',
        })
      );

      // Stagger the refreshes to avoid overwhelming the API
      for (let i = 0; i < promises.length; i++) {
        await promises[i];
        if (i < promises.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
      }
    },
  });
}

// Prefetch hook for anticipated user actions
export function usePrefetchOnHover() {
  const queryClient = useQueryClient();
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const prefetch = (queryKey: any[], queryFn: () => Promise<any>) => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }

    prefetchTimeoutRef.current = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    }, 200); // 200ms delay to avoid prefetching on quick hover
  };

  const cancel = () => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
      prefetchTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => cancel();
  }, []);

  return { prefetch, cancel };
}