// PerformanceWrapper.tsx - 性能優化包裝器
// 在開發環境中啟用性能監控和調試工具

import React, { memo } from 'react';
import PerformanceMonitor from '../debug/PerformanceMonitor';

interface PerformanceWrapperProps {
  children: React.ReactNode;
  enableMonitoring?: boolean;
  monitorPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
}

/**
 * 性能優化包裝器
 * 為整個應用提供性能監控和優化工具
 */
export const PerformanceWrapper: React.FC<PerformanceWrapperProps> = memo(({
  children,
  enableMonitoring = process.env.NODE_ENV === 'development',
  monitorPosition = 'bottom-right',
  compact = false
}) => {
  return (
    <>
      {children}
      {enableMonitoring && (
        <PerformanceMonitor
          enabled={true}
          position={monitorPosition}
          compact={compact}
        />
      )}
    </>
  );
});

PerformanceWrapper.displayName = 'PerformanceWrapper';

export default PerformanceWrapper;