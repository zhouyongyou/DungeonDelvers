import React from 'react';

interface NftSkeletonLoaderProps {
  count?: number;
  className?: string;
  variant?: 'grid' | 'list';
}

const NftSkeletonLoader: React.FC<NftSkeletonLoaderProps> = ({ 
  count = 6, 
  className = '',
  variant = 'grid'
}) => {
  const SkeletonCard = () => (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden animate-pulse">
      {/* Image skeleton */}
      <div className="aspect-square bg-gray-200 dark:bg-gray-700" />
      
      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Title skeleton */}
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        
        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
        </div>
        
        {/* Price/Stats skeleton */}
        <div className="flex justify-between items-center pt-2">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        </div>
        
        {/* Button skeleton */}
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mt-4" />
      </div>
    </div>
  );

  const SkeletonListItem = () => (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 flex gap-4 animate-pulse">
      {/* Image skeleton */}
      <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
      
      {/* Content skeleton */}
      <div className="flex-1 space-y-3">
        {/* Title skeleton */}
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        
        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
        </div>
        
        {/* Stats skeleton */}
        <div className="flex gap-4">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        </div>
      </div>
      
      {/* Action skeleton */}
      <div className="flex flex-col gap-2 justify-center">
        <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );

  if (variant === 'list') {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: count }).map((_, index) => (
          <SkeletonListItem key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
};

export default NftSkeletonLoader;