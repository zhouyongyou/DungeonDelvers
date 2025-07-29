import React from 'react';
import type { Page } from '../../types/page';

interface NavItem {
  page: Page;
  label: string;
  icon: JSX.Element;
}

interface MobileNavigationProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  isConnected: boolean;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  activePage,
  setActivePage,
  isConnected,
}) => {
  const navItems: NavItem[] = [
    {
      page: 'dashboard',
      label: '總覽',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      page: 'myAssets',
      label: '資產',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      page: 'mint',
      label: '鑄造',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      page: 'dungeon',
      label: '地城',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
    {
      page: 'vip',
      label: 'VIP',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-gray-800 sm:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = activePage === item.page;
          const isDisabled = !isConnected && item.page !== 'mint';

          return (
            <button
              key={item.page}
              onClick={() => !isDisabled && setActivePage(item.page)}
              disabled={isDisabled}
              className={`
                flex flex-col items-center justify-center flex-1 h-full px-2 py-1
                transition-all duration-200 relative
                ${isActive 
                  ? 'text-indigo-500' 
                  : isDisabled 
                    ? 'text-gray-600' 
                    : 'text-gray-400 active:text-gray-300'
                }
              `}
            >
              {/* 活躍指示器 */}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-indigo-500" />
              )}
              
              {/* 圖標 */}
              <div className={`
                transition-transform duration-200
                ${isActive ? 'scale-110' : 'active:scale-95'}
              `}>
                {item.icon}
              </div>
              
              {/* 標籤 */}
              <span className="text-xs mt-1 font-medium">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};