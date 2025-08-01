// src/components/ui/SafeIcon.tsx
// 安全的圖標組件，防止缺失圖標導致頁面崩潰

import React from 'react';
import { Icons } from './icons';

interface SafeIconProps {
  name: keyof typeof Icons;
  className?: string;
  fallback?: React.ReactNode;
}

export const SafeIcon: React.FC<SafeIconProps> = ({ 
  name, 
  className = '', 
  fallback = <span className="w-4 h-4 inline-block bg-gray-500 rounded" /> 
}) => {
  try {
    const IconComponent = Icons[name];
    
    if (!IconComponent) {
      console.warn(`Icon '${name}' not found in Icons object`);
      return <>{fallback}</>;
    }
    
    return <IconComponent className={className} />;
  } catch (error) {
    console.error(`Error rendering icon '${name}':`, error);
    return <>{fallback}</>;
  }
};

// 高階組件：為任何組件添加錯誤處理
export const withIconErrorHandling = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  const WithIconErrorHandling = (props: P) => {
    try {
      return <WrappedComponent {...props} />;
    } catch (error) {
      console.error('Icon component error:', error);
      return (
        <div className="text-red-400 text-xs p-2 bg-red-900/20 rounded">
          圖標載入失敗
        </div>
      );
    }
  };
  
  WithIconErrorHandling.displayName = `withIconErrorHandling(${WrappedComponent.displayName || WrappedComponent.name})`;
  return WithIconErrorHandling;
};

// 快捷函數：安全地使用圖標
export const safeIcon = (name: keyof typeof Icons, className?: string) => {
  return <SafeIcon name={name} className={className} />;
};