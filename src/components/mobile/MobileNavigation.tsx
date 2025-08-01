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
      page: 'mint',
      label: '鑄造',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      page: 'altar',
      label: '升星',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
    },
    {
      page: 'myAssets',
      label: '組隊',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-gray-800 sm:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = activePage === item.page;
          // 允許用戶在未連接錢包時瀏覽預覽頁面
          const isDisabled = false;

          return (
            <button
              key={item.page}
              onClick={() => !isDisabled && setActivePage(item.page)}
              disabled={isDisabled}
              aria-label={item.label}
              className={`
                flex flex-col items-center justify-center flex-1 h-full px-2
                transition-all duration-200 relative
                ${isActive 
                  ? 'text-indigo-500' 
                  : isDisabled 
                    ? 'text-gray-600' 
                    : 'text-gray-400 active:text-gray-300'
                }
              `}
            >
              {/* 內容容器 - 確保垂直居中 */}
              <div className="flex flex-col items-center justify-center">
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
              </div>
              
              {/* 活躍指示器 - 移到底部 */}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-indigo-500" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};