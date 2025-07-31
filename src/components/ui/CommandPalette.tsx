// CommandPalette.tsx - 快速導航命令面板（Ctrl+K）
import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './icons';
import { cn } from '../../utils/cn';

interface Command {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category?: string;
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 定義所有命令
  const commands: Command[] = [
    // 導航命令
    {
      id: 'nav-overview',
      label: '總覽',
      icon: <Icons.Home className="h-4 w-4" />,
      shortcut: 'G H',
      action: () => { window.location.hash = '/dashboard'; },
      category: '導航'
    },
    {
      id: 'nav-dungeon',
      label: '地城',
      icon: <Icons.Dungeon className="h-4 w-4" />,
      shortcut: 'G D',
      action: () => { window.location.hash = '/dungeon'; },
      category: '導航'
    },
    {
      id: 'nav-marketplace',
      label: '市場',
      icon: <Icons.ShoppingCart className="h-4 w-4" />,
      shortcut: 'G M',
      action: () => { window.location.hash = '/marketplace'; },
      category: '導航'
    },
    {
      id: 'nav-altar',
      label: '祭壇',
      icon: <Icons.Altar className="h-4 w-4" />,
      shortcut: 'G A',
      action: () => { window.location.hash = '/altar'; },
      category: '導航'
    },
    {
      id: 'nav-vip',
      label: 'VIP',
      icon: <Icons.Vip className="h-4 w-4" />,
      shortcut: 'G V',
      action: () => { window.location.hash = '/vip'; },
      category: '導航'
    },
    // 操作命令
    {
      id: 'action-mint',
      label: '鑄造英雄',
      icon: <Icons.Mint className="h-4 w-4" />,
      action: () => { window.location.hash = '/mint'; },
      category: '操作'
    },
    {
      id: 'action-party',
      label: '組建隊伍',
      icon: <Icons.Party className="h-4 w-4" />,
      action: () => { window.location.hash = '/myAssets'; },
      category: '操作'
    },
    // 系統命令
    {
      id: 'system-refresh',
      label: '刷新頁面',
      icon: <Icons.RefreshCw className="h-4 w-4" />,
      action: () => window.location.reload(),
      category: '系統'
    }
  ];

  // 過濾命令
  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category?.toLowerCase().includes(search.toLowerCase())
  );

  // 按類別分組
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    const category = cmd.category || '其他';
    if (!acc[category]) acc[category] = [];
    acc[category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  // 監聽開啟事件
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('openCommandPalette', handleOpen);
    return () => window.removeEventListener('openCommandPalette', handleOpen);
  }, []);

  // 監聽關閉事件
  useEffect(() => {
    const handleClose = () => {
      setIsOpen(false);
      setSearch('');
      setSelectedIndex(0);
    };
    window.addEventListener('closeAllModals', handleClose);
    return () => window.removeEventListener('closeAllModals', handleClose);
  }, []);

  // 處理鍵盤事件
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          setIsOpen(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            setIsOpen(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  // 自動聚焦輸入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-32">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl border border-gray-700">
        {/* 搜索輸入 */}
        <div className="flex items-center border-b border-gray-700 p-4">
          <Icons.Search className="h-5 w-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="輸入命令或搜索..."
            className="flex-1 bg-transparent outline-none text-white placeholder-gray-400"
          />
          <kbd className="text-xs bg-gray-700 px-2 py-1 rounded">ESC</kbd>
        </div>

        {/* 命令列表 */}
        <div className="max-h-96 overflow-y-auto p-2">
          {Object.entries(groupedCommands).map(([category, cmds]) => (
            <div key={category} className="mb-2">
              <div className="text-xs text-gray-500 px-3 py-1">{category}</div>
              {cmds.map((cmd, idx) => {
                const globalIndex = filteredCommands.indexOf(cmd);
                const isSelected = globalIndex === selectedIndex;

                return (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      cmd.action();
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors',
                      isSelected
                        ? 'bg-purple-600/20 text-white'
                        : 'text-gray-300 hover:bg-gray-700/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {cmd.icon}
                      <span>{cmd.label}</span>
                    </div>
                    {cmd.shortcut && (
                      <kbd className="text-xs bg-gray-700 px-2 py-1 rounded">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {filteredCommands.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              沒有找到匹配的命令
            </div>
          )}
        </div>

        {/* 提示 */}
        <div className="border-t border-gray-700 p-3 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span>↑↓ 選擇</span>
            <span>Enter 執行</span>
            <span>ESC 關閉</span>
          </div>
          <span>Ctrl+K 快速開啟</span>
        </div>
      </div>
    </div>
  );
};