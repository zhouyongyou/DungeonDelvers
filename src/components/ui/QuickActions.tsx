// src/components/ui/QuickActions.tsx
// 快速操作組件 - 在關鍵位置提供便捷操作

import React from 'react';
import { Icons } from './icons';
import { ActionButton } from './ActionButton';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  onClick: () => void;
  condition?: () => boolean;
  badge?: string | number;
  variant?: 'primary' | 'secondary' | 'modal' | 'navigation';
}

interface QuickActionsProps {
  actions: QuickAction[];
  layout?: 'horizontal' | 'vertical' | 'grid';
  size?: 'sm' | 'md' | 'lg';
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  layout = 'horizontal',
  size = 'md'
}) => {
  const visibleActions = actions.filter(action => 
    !action.condition || action.condition()
  );

  if (visibleActions.length === 0) return null;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const layoutClasses = {
    horizontal: 'flex gap-2 flex-wrap',
    vertical: 'flex flex-col gap-2',
    grid: 'grid grid-cols-2 md:grid-cols-3 gap-2'
  };

  // 根據按鈕 ID 決定樣式
  const getButtonClassName = (actionId: string) => {
    const baseClasses = `${sizeClasses[size]} flex items-center gap-2 relative`;
    
    switch (actionId) {
      case 'createParty':
        return `${baseClasses} bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20 border border-emerald-400/30`;
      default:
        return baseClasses;
    }
  };

  return (
    <div className={layoutClasses[layout]}>
      {visibleActions.map(action => (
        <ActionButton
          key={action.id}
          onClick={action.onClick}
          className={getButtonClassName(action.id)}
        >
          {action.icon && <action.icon className="h-4 w-4" />}
          <span>{action.label}</span>
          {action.badge && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {action.badge}
            </span>
          )}
        </ActionButton>
      ))}
    </div>
  );
};

// 頁面級別的快速操作
export const usePageQuickActions = () => {
  // 簡化的導航操作，移除重複的導航項面按鈕
  // 用戶可以直接從主導航訪問這些頁面
  const navigationActions: QuickAction[] = [];

  return navigationActions;
};

// NFT 卡片上的快速操作
interface NftQuickActionsProps {
  nft: any;
  onUpgrade?: () => void;
  onSell?: () => void;
  onView?: () => void;
}

export const NftQuickActions: React.FC<NftQuickActionsProps> = ({
  nft,
  onUpgrade,
  onSell,
  onView
}) => {
  const actions: QuickAction[] = [
    {
      id: 'view',
      label: '查看',
      icon: Icons.Eye,
      onClick: () => onView?.(),
    },
    {
      id: 'upgrade',
      label: '升級',
      icon: Icons.Star,
      onClick: () => onUpgrade?.(),
      condition: () => nft.type !== 'party' && !!onUpgrade
    },
    {
      id: 'sell',
      label: '出售',
      icon: Icons.DollarSign,
      onClick: () => onSell?.(),
      condition: () => !!onSell
    }
  ];

  return (
    <QuickActions 
      actions={actions}
      layout="horizontal"
      size="sm"
    />
  );
};

// 浮動操作按鈕（FAB）
interface FloatingActionButtonProps {
  actions: QuickAction[];
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  actions,
  position = 'bottom-right'
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  const mainAction = actions[0];
  const subActions = actions.slice(1);

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* 子操作按鈕 */}
      {isOpen && subActions.length > 0 && (
        <div className="absolute bottom-12 right-0 flex flex-col gap-2 mb-2">
          {subActions.map((action, index) => (
            <ActionButton
              key={action.id}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center bg-gray-700 hover:bg-gray-600"
              style={{
                animationDelay: `${index * 50}ms`,
                animation: 'fadeInUp 0.2s ease-out forwards'
              }}
            >
              {action.icon && <action.icon className="h-5 w-5" />}
            </ActionButton>
          ))}
        </div>
      )}

      {/* 主操作按鈕 */}
      <ActionButton
        onClick={() => {
          if (subActions.length > 0) {
            setIsOpen(!isOpen);
          } else {
            mainAction.onClick();
          }
        }}
        className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center bg-[#C0A573] hover:bg-[#A08A5A]"
      >
        {subActions.length > 0 ? (
          <Icons.Plus 
            className={`h-6 w-6 transition-transform ${isOpen ? 'rotate-45' : ''}`} 
          />
        ) : (
          mainAction.icon && <mainAction.icon className="h-6 w-6" />
        )}
      </ActionButton>
    </div>
  );
};

// 頁面頂部的操作欄
interface PageActionBarProps {
  title: string;
  subtitle?: string;
  actions?: QuickAction[];
  showRefresh?: boolean;
  onRefresh?: () => void;
}

export const PageActionBar: React.FC<PageActionBarProps> = ({
  title,
  subtitle,
  actions = [],
  showRefresh = true,
  onRefresh
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-gray-400 mt-1">{subtitle}</p>}
      </div>
      
      <div className="flex items-center gap-2">
        <QuickActions actions={actions} size="md" />
        {showRefresh && onRefresh && (
          <ActionButton
            onClick={onRefresh}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600"
            variant="secondary"
            title="刷新數據"
          >
            <Icons.RefreshCw className="h-4 w-4" />
          </ActionButton>
        )}
      </div>
    </div>
  );
};