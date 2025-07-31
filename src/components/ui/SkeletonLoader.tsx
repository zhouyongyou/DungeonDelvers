// SkeletonLoader.tsx - 骨架屏載入組件，提供更好的載入體驗
import React from 'react';
import { cn } from '../../utils/cn';

interface SkeletonLoaderProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number;
  animate?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  className = '',
  variant = 'rect',
  width,
  height,
  count = 1,
  animate = true,
}) => {
  const baseClasses = cn(
    'bg-gray-700/50',
    animate && 'animate-pulse',
    className
  );

  const getStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {};
    
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;
    
    return style;
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded';
      case 'circle':
        return 'rounded-full';
      case 'card':
        return 'h-32 rounded-lg';
      case 'rect':
      default:
        return 'rounded-lg';
    }
  };

  const skeletonClasses = cn(baseClasses, getVariantClasses());

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={skeletonClasses}
          style={getStyle()}
        />
      ))}
    </>
  );
};

// 預設的骨架屏模板
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-3', className)}>
    <SkeletonLoader variant="rect" height={200} />
    <SkeletonLoader variant="text" width="75%" />
    <SkeletonLoader variant="text" width="50%" />
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; className?: string }> = ({ 
  rows = 5, 
  className 
}) => (
  <div className={cn('space-y-2', className)}>
    {/* Header */}
    <div className="flex gap-4 p-4 border-b border-gray-700">
      <SkeletonLoader width="25%" height={20} />
      <SkeletonLoader width="25%" height={20} />
      <SkeletonLoader width="25%" height={20} />
      <SkeletonLoader width="25%" height={20} />
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="flex gap-4 p-4">
        <SkeletonLoader width="25%" height={16} />
        <SkeletonLoader width="25%" height={16} />
        <SkeletonLoader width="25%" height={16} />
        <SkeletonLoader width="25%" height={16} />
      </div>
    ))}
  </div>
);

export const SkeletonStats: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-4', className)}>
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="bg-gray-800 p-6 rounded-lg space-y-2">
        <SkeletonLoader variant="text" width="40%" height={16} />
        <SkeletonLoader variant="text" width="60%" height={32} />
        <SkeletonLoader variant="text" width="80%" height={12} />
      </div>
    ))}
  </div>
);