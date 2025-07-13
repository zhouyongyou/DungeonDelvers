import React from 'react';
import { useBreakpoint } from '../../hooks/useMobileOptimization';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  mobileHeader?: React.ReactNode;
  desktopPadding?: string;
  mobilePadding?: string;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  sidebar,
  mobileHeader,
  desktopPadding = 'p-6',
  mobilePadding = 'p-4',
}) => {
  const { isMobileBreakpoint } = useBreakpoint();

  if (isMobileBreakpoint) {
    return (
      <div className="min-h-screen flex flex-col">
        {mobileHeader && (
          <div className="sticky top-0 z-30 bg-gray-900 border-b border-gray-800">
            {mobileHeader}
          </div>
        )}
        <div className={`flex-1 ${mobilePadding}`}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {sidebar && (
        <aside className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          {sidebar}
        </aside>
      )}
      <main className={`flex-1 ${desktopPadding} overflow-y-auto`}>
        {children}
      </main>
    </div>
  );
};

// 響應式網格組件
interface ResponsiveGridProps {
  children: React.ReactNode;
  mobileColumns?: number;
  tabletColumns?: number;
  desktopColumns?: number;
  gap?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  mobileColumns = 1,
  tabletColumns = 2,
  desktopColumns = 3,
  gap = 'gap-4',
}) => {
  return (
    <div 
      className={`
        grid ${gap}
        grid-cols-${mobileColumns}
        sm:grid-cols-${mobileColumns}
        md:grid-cols-${tabletColumns}
        lg:grid-cols-${desktopColumns}
      `}
    >
      {children}
    </div>
  );
};

// 響應式卡片容器
interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  className = '',
  noPadding = false,
}) => {
  const { isMobileBreakpoint } = useBreakpoint();

  return (
    <div 
      className={`
        bg-gray-800 
        ${isMobileBreakpoint ? 'rounded-xl' : 'rounded-2xl'}
        ${noPadding ? '' : isMobileBreakpoint ? 'p-4' : 'p-6'}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// 響應式按鈕組
interface ResponsiveButtonGroupProps {
  children: React.ReactNode;
  vertical?: boolean;
  fullWidth?: boolean;
}

export const ResponsiveButtonGroup: React.FC<ResponsiveButtonGroupProps> = ({
  children,
  vertical = false,
  fullWidth = false,
}) => {
  const { isMobileBreakpoint } = useBreakpoint();

  return (
    <div 
      className={`
        flex 
        ${vertical || (isMobileBreakpoint && fullWidth) ? 'flex-col' : 'flex-row'}
        ${vertical ? 'space-y-2' : isMobileBreakpoint ? 'space-y-2' : 'space-x-3'}
        ${fullWidth ? 'w-full' : ''}
      `}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && (fullWidth || (isMobileBreakpoint && fullWidth))) {
          return React.cloneElement(child, {
            className: `${child.props.className || ''} w-full`,
          } as any);
        }
        return child;
      })}
    </div>
  );
};