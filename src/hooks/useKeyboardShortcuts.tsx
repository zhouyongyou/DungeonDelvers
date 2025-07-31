// useKeyboardShortcuts.tsx - 全局鍵盤快捷鍵系統
import React, { useEffect, useCallback, useState } from 'react';
import { useAppToast } from '../contexts/SimpleToastContext';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

export const useKeyboardShortcuts = () => {
  const { showToast } = useAppToast();
  const [showHelp, setShowHelp] = useState(false);
  const [commandMode, setCommandMode] = useState<string | null>(null);

  // 定義所有快捷鍵
  const shortcuts: Shortcut[] = [
    // 全局快捷鍵
    {
      key: 'k',
      ctrl: true,
      description: '打開快速導航',
      action: () => openCommandPalette()
    },
    {
      key: '?',
      shift: true,
      description: '顯示快捷鍵幫助',
      action: () => setShowHelp(true)
    },
    {
      key: 'Escape',
      description: '關閉所有彈窗',
      action: () => closeAllModals()
    },
    // 導航快捷鍵 (使用 g 作為前綴)
    {
      key: 'g',
      description: '進入導航模式',
      action: () => setCommandMode('g')
    }
  ];

  // 導航模式的快捷鍵
  const navigationShortcuts: Record<string, () => void> = {
    h: () => { window.location.hash = '/dashboard'; },  // Home
    d: () => { window.location.hash = '/dungeon'; },    // Dungeon
    m: () => { window.location.hash = '/marketplace'; }, // Marketplace
    a: () => { window.location.hash = '/altar'; },      // Altar
    v: () => { window.location.hash = '/vip'; },        // VIP
    p: () => { window.location.hash = '/profile'; },    // Profile
  };

  const openCommandPalette = useCallback(() => {
    // 實現命令面板
    const event = new CustomEvent('openCommandPalette');
    window.dispatchEvent(event);
  }, []);

  const closeAllModals = useCallback(() => {
    // 關閉所有彈窗
    const event = new CustomEvent('closeAllModals');
    window.dispatchEvent(event);
    setShowHelp(false);
    setCommandMode(null);
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // 忽略輸入框中的按鍵
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // 處理導航模式
      if (commandMode === 'g') {
        e.preventDefault();
        const action = navigationShortcuts[e.key];
        if (action) {
          action();
          showToast(`導航到: ${e.key.toUpperCase()}`, 'info');
        }
        setCommandMode(null);
        return;
      }

      // 處理一般快捷鍵
      const shortcut = shortcuts.find(s => {
        const keyMatch = s.key.toLowerCase() === e.key.toLowerCase();
        const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const shiftMatch = s.shift ? e.shiftKey : true;
        const altMatch = s.alt ? e.altKey : true;
        
        return keyMatch && ctrlMatch && shiftMatch && altMatch;
      });

      if (shortcut) {
        e.preventDefault();
        shortcut.action();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    
    // 30秒後自動退出導航模式
    let commandModeTimeout: NodeJS.Timeout;
    if (commandMode) {
      commandModeTimeout = setTimeout(() => {
        setCommandMode(null);
      }, 3000);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (commandModeTimeout) {
        clearTimeout(commandModeTimeout);
      }
    };
  }, [shortcuts, navigationShortcuts, commandMode, showToast]);

  return {
    showHelp,
    setShowHelp,
    commandMode,
    shortcuts
  };
};

// 快捷鍵幫助面板組件
export const KeyboardShortcutsHelp: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  shortcuts: Shortcut[];
}> = ({ isOpen, onClose, shortcuts }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">鍵盤快捷鍵</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-purple-400 mb-2">全局快捷鍵</h3>
            <div className="space-y-2">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-300">{shortcut.description}</span>
                  <kbd className="px-2 py-1 bg-gray-700 rounded text-sm font-mono">
                    {shortcut.ctrl && 'Ctrl + '}
                    {shortcut.shift && 'Shift + '}
                    {shortcut.alt && 'Alt + '}
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-purple-400 mb-2">導航快捷鍵 (按 G 後)</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">總覽</span>
                <kbd className="px-2 py-1 bg-gray-700 rounded text-sm font-mono">G → H</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">地城</span>
                <kbd className="px-2 py-1 bg-gray-700 rounded text-sm font-mono">G → D</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">市場</span>
                <kbd className="px-2 py-1 bg-gray-700 rounded text-sm font-mono">G → M</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">祭壇</span>
                <kbd className="px-2 py-1 bg-gray-700 rounded text-sm font-mono">G → A</kbd>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};