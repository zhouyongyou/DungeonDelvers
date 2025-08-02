// 手機版標籤導航組件
import React, { useRef, useEffect } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

interface MobileTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  variant?: 'default' | 'pill' | 'underline';
}

export const MobileTabs: React.FC<MobileTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = '',
  variant = 'default'
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  
  // 自動滾動到活動標籤
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeElement = activeTabRef.current;
      
      const containerWidth = container.offsetWidth;
      const scrollLeft = activeElement.offsetLeft - (containerWidth - activeElement.offsetWidth) / 2;
      
      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    }
  }, [activeTab]);
  
  const getTabClasses = (isActive: boolean) => {
    const baseClasses = 'px-4 py-2 font-medium transition-all whitespace-nowrap flex items-center gap-2';
    
    switch (variant) {
      case 'pill':
        return `${baseClasses} rounded-full ${
          isActive 
            ? 'bg-purple-600 text-white' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`;
      
      case 'underline':
        return `${baseClasses} border-b-2 ${
          isActive 
            ? 'border-purple-500 text-white' 
            : 'border-transparent text-gray-400 hover:text-gray-300'
        }`;
      
      default:
        return `${baseClasses} rounded-lg ${
          isActive 
            ? 'bg-gray-700 text-white' 
            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
        }`;
    }
  };
  
  return (
    <div className={`relative ${className}`}>
      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto scrollbar-hide"
      >
        <div className={`flex ${variant === 'underline' ? '' : 'gap-2'} min-w-max`}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                ref={isActive ? activeTabRef : undefined}
                onClick={() => onTabChange(tab.id)}
                className={getTabClasses(isActive)}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`
                    ml-1 px-1.5 py-0.5 text-xs rounded-full
                    ${isActive ? 'bg-purple-700 text-purple-200' : 'bg-gray-600 text-gray-300'}
                  `}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* 左右漸變效果，提示可滾動 */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-900 to-transparent pointer-events-none md:hidden" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-900 to-transparent pointer-events-none md:hidden" />
    </div>
  );
};

// 底部固定標籤欄 - 適合主要導航
interface MobileBottomTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const MobileBottomTabs: React.FC<MobileBottomTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = ''
}) => {
  // 最多顯示 5 個標籤
  const displayTabs = tabs.slice(0, 5);
  
  return (
    <div className={`
      fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700
      px-2 py-1 z-40 ${className}
    `}>
      <div className="flex justify-around">
        {displayTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex-1 flex flex-col items-center gap-1 py-2 px-1
                transition-colors relative
                ${isActive ? 'text-purple-400' : 'text-gray-400 hover:text-gray-300'}
              `}
            >
              {Icon && <Icon className="h-5 w-5" />}
              <span className="text-xs">{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileTabs;