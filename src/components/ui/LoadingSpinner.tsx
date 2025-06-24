import React from 'react';

interface LoadingSpinnerProps {
  size?: string;
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'h-5 w-5', 
  color = 'border-white' 
}) => {
  return (
    <div className={`animate-spin rounded-full ${size} border-b-2 ${color}`}></div>
  );
};