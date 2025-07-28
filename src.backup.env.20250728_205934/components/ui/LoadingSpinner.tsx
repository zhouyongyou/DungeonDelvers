import React from 'react';

interface LoadingSpinnerProps {
  size?: string;
  color?: string;
  className?: string;
  containerSize?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'h-5 w-5', 
  color = 'border-white',
  className = '',
  containerSize
}) => {
  const spinner = (
    <div className={`animate-spin rounded-full ${size} border-b-2 ${color} ${className}`}></div>
  );

  if (containerSize) {
    return (
      <div className={`flex items-center justify-center ${containerSize}`}>
        {spinner}
      </div>
    );
  }

  return spinner;
};