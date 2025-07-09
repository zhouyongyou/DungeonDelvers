import React from 'react';

interface LoadingSpinnerProps {
  size?: string;
  color?: string;
  inline?: boolean; // 新增 inline 屬性
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'h-5 w-5', 
  color = 'border-white',
  inline = false
}) => {
  // 如果是 inline 模式，使用 span 而不是 div
  const Element = inline ? 'span' : 'div';
  
  return (
    <Element className={`animate-spin rounded-full ${size} border-b-2 ${color} ${inline ? 'inline-block' : ''}`}></Element>
  );
};