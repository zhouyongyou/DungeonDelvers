import React from 'react';

export const SkeletonCard: React.FC = () => (
  <div className="card-bg p-3 rounded-lg text-center border-2 border-transparent transition-all overflow-hidden animate-pulse">
    <div className="w-full bg-gray-300 rounded-md mb-2 aspect-square"></div>
    <div className="h-5 bg-gray-300 rounded w-3/4 mx-auto mb-2"></div>
    <div className="h-4 bg-gray-300 rounded w-1/2 mx-auto mb-2"></div>
    <div className="h-6 bg-gray-300 rounded w-1/3 mx-auto"></div>
  </div>
);
