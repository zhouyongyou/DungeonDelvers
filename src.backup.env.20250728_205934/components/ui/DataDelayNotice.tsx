// src/components/ui/DataDelayNotice.tsx
// 數據延遲提示組件

import React from 'react';
import { Clock, Info, Zap } from 'lucide-react';

interface DataDelayNoticeProps {
  hasDelay: boolean;
  endpointType: 'studio' | 'decentralized';
  className?: string;
}

export const DataDelayNotice: React.FC<DataDelayNoticeProps> = ({
  hasDelay,
  endpointType,
  className = ''
}) => {
  if (!hasDelay) return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm ${className}`}>
      <Clock className="w-4 h-4 text-yellow-600" />
      <span className="text-yellow-800">
        數據可能有 15-30 分鐘延遲
      </span>
      <Info className="w-4 h-4 text-yellow-600" />
    </div>
  );
};

export const EndpointIndicator: React.FC<{
  endpointType: 'studio' | 'decentralized';
  className?: string;
}> = ({ endpointType, className = '' }) => {
  const isRealTime = endpointType === 'decentralized';
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${className} ${
      isRealTime 
        ? 'bg-green-100 text-green-800' 
        : 'bg-blue-100 text-blue-800'
    }`}>
      {isRealTime ? (
        <>
          <Zap className="w-3 h-3" />
          即時數據
        </>
      ) : (
        <>
          <Clock className="w-3 h-3" />
          延遲數據
        </>
      )}
    </div>
  );
};