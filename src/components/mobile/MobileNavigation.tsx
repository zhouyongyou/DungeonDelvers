import React from 'react';
import { useLocation } from 'react-router-dom';
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
      label: '首頁',
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
      page: 'party',
      label: '隊伍',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      page: 'dungeon',
      label: '探險',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
    {
      page: 'profile',
      label: '我的',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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