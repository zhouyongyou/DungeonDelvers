// 手機版操作選單組件 - 將多個按鈕整合為下拉選單
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../ui/icons';

export interface MobileAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger' | 'success';
}

interface MobileActionMenuProps {
  actions: MobileAction[];
  className?: string;
  triggerLabel?: string;
  showLabel?: boolean;
}

export const MobileActionMenu: React.FC<MobileActionMenuProps> = ({
  actions,
  className = '',
  triggerLabel = '更多操作',
  showLabel = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // 點擊外部關閉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  const getVariantClasses = (variant?: string) => {
    switch (variant) {
      case 'danger':
        return 'text-red-400 hover:bg-red-900/20';
      case 'success':
        return 'text-green-400 hover:bg-green-900/20';
      default:
        return 'text-gray-300 hover:bg-gray-700';
    }
  };
  
  // 如果只有一個操作，直接顯示為按鈕
  if (actions.length === 1) {
    const action = actions[0];
    const Icon = action.icon;
    
    return (
      <button
        onClick={action.onClick}
        disabled={action.disabled}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          ${getVariantClasses(action.variant)} ${className}
        `}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {showLabel && <span>{action.label}</span>}
      </button>
    );
  }
  
  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
      >
        <Icons.MoreVertical className="h-4 w-4" />
        {showLabel && <span>{triggerLabel}</span>}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
          <div className="py-1">
            {actions.map((action) => {
              const Icon = action.icon;
              
              return (
                <button
                  key={action.id}
                  onClick={() => {
                    if (!action.disabled) {
                      action.onClick();
                      setIsOpen(false);
                    }
                  }}
                  disabled={action.disabled}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2 text-left
                    transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                    ${getVariantClasses(action.variant)}
                  `}
                >
                  {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                  <span className="text-sm">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// 底部固定的操作欄 - 適合手機版
interface MobileActionBarProps {
  primaryAction?: MobileAction;
  secondaryActions?: MobileAction[];
  className?: string;
}

export const MobileActionBar: React.FC<MobileActionBarProps> = ({
  primaryAction,
  secondaryActions = [],
  className = ''
}) => {
  return (
    <div className={`
      fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700
      p-4 flex items-center gap-3 z-40 ${className}
    `}>
      {primaryAction && (
        <button
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
          className="
            flex-1 flex items-center justify-center gap-2 px-4 py-3
            bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500
            text-white rounded-lg font-semibold transition-all
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {primaryAction.icon && <primaryAction.icon className="h-5 w-5" />}
          <span>{primaryAction.label}</span>
        </button>
      )}
      
      {secondaryActions.length > 0 && (
        <MobileActionMenu
          actions={secondaryActions}
          showLabel={false}
        />
      )}
    </div>
  );
};

export default MobileActionMenu;