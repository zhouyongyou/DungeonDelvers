// src/components/ui/Skeleton.tsx

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}) => {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  
  const variantClasses: Record<string, string> = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const animationClasses: Record<string, string> = {
    pulse: 'animate-pulse',
    wave: 'animate-bounce',
    none: '',
  };

  const style: React.CSSProperties = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
};

// 預設的骨架屏組件
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`p-4 border rounded-lg bg-white dark:bg-gray-800 ${className}`}>
    <div className="flex items-center space-x-4">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="space-y-2 flex-1">
        <Skeleton width="60%" />
        <Skeleton width="40%" />
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <Skeleton width="100%" />
      <Skeleton width="80%" />
      <Skeleton width="90%" />
    </div>
  </div>
);

// NFT 網格骨架屏
export const NFTGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
        <Skeleton variant="rectangular" height={200} className="mb-4" />
        <div className="space-y-2">
          <Skeleton width="80%" />
          <Skeleton width="60%" />
          <div className="flex justify-between">
            <Skeleton width="40%" />
            <Skeleton width="30%" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// 列表骨架屏
export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg border">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton width="70%" />
          <Skeleton width="50%" />
        </div>
        <Skeleton width="20%" />
      </div>
    ))}
  </div>
);

// 統計卡片骨架屏
export const StatCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton width="60%" />
        <Skeleton width="40%" height={32} />
      </div>
      <Skeleton variant="circular" width={48} height={48} />
    </div>
  </div>
);

// 統計卡片網格骨架屏
export const StatGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <StatCardSkeleton key={i} />
    ))}
  </div>
);

// 表格骨架屏
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ 
  rows = 5, 
  cols = 4 
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
    {/* 表頭 */}
    <div className="p-4 border-b bg-gray-50 dark:bg-gray-700">
      <div className="flex space-x-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width="20%" height={20} />
        ))}
      </div>
    </div>
    
    {/* 表格內容 */}
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4">
          <div className="flex space-x-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} width="20%" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// 儀表板骨架屏
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* 頂部統計 */}
    <StatGridSkeleton count={4} />
    
    {/* 主要內容區域 */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
          <Skeleton width="30%" height={24} className="mb-4" />
          <NFTGridSkeleton count={6} />
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
          <Skeleton width="40%" height={24} className="mb-4" />
          <ListSkeleton count={3} />
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
          <Skeleton width="35%" height={24} className="mb-4" />
          <div className="space-y-4">
            <Skeleton width="100%" height={20} />
            <Skeleton width="80%" height={20} />
            <Skeleton width="90%" height={20} />
          </div>
        </div>
      </div>
    </div>
  </div>
);