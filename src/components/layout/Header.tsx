// src/components/layout/Header.tsx

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { ActionButton } from '../ui/ActionButton';
import type { Page } from '../../types/page';
import logoUrl from '/logo-192x192.png';
import { DEVELOPER_ADDRESS } from '../../config/constants';
import { RecentTransactions } from '../ui/RecentTransactions';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { Icons } from '../ui/icons';
import { NetworkSwitcher } from '../ui/NetworkSwitcher';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import { formatMobileAddress } from '../../utils/mobileUtils';
import { usePagePreload } from '../ui/PageTransition';

const usePlayerLevel = () => {
    // 簡化版本，暫時返回 null 避免 TypeScript 錯誤
    return { level: null };
};

const MenuIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

// 手機版交易列表內容組件
const RecentTransactionsInner: React.FC = () => {
    const { transactions, clearCompleted } = useTransactionStore();
    const { chain } = useAccount();
    
    const explorerUrl = chain?.blockExplorers?.default.url;
    
    if (transactions.length === 0) {
        return (
            <p className="text-sm text-center text-gray-500 p-4">沒有最近的交易記錄。</p>
        );
    }
    
    return (
        <ul className="space-y-1">
            {transactions.map((tx) => (
                <li key={tx.hash} className="flex items-center justify-between gap-2 py-2 px-3 hover:bg-white/10 rounded-md">
                    <div className="flex items-center gap-2">
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                            {tx.status === 'pending' && <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                            {tx.status === 'success' && <span className="text-green-500 text-sm">✅</span>}
                            {tx.status === 'error' && <span className="text-red-500 text-sm">❌</span>}
                        </div>
                        <div className="text-sm">
                            <p className="font-medium text-gray-200">{tx.description}</p>
                            <p className="text-xs text-gray-500">{new Date(tx.timestamp).toLocaleTimeString()}</p>
                        </div>
                    </div>
                    {explorerUrl && (
                        <a
                            href={`${explorerUrl}/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-gray-400 hover:text-indigo-500"
                            aria-label="View on explorer"
                        >
                            <Icons.ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                </li>
            ))}
        </ul>
    );
};

interface HeaderProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  onHoverMint?: () => void;
  onHoverParty?: () => void;
  onHoverDashboard?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  activePage, 
  setActivePage,
  onHoverMint,
  onHoverParty,
  onHoverDashboard,
}) => {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { isMobile } = useMobileOptimization();

  const [isTxPopoverOpen, setIsTxPopoverOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { level } = usePlayerLevel();
  const { preloadPage } = usePagePreload();

  const isDeveloper = isConnected && address?.toLowerCase() === DEVELOPER_ADDRESS.toLowerCase();

  const navItems: { key: Page; label: string; icon: JSX.Element }[] = useMemo(() => {
      // 按照用戶体験流程排序：总览 → 铸造 → 升星 → 资产管理(组队) → 地城冒险 → 交易市场 → 高级功能
      const items = [
          { 
              key: 'dashboard' as Page, 
              label: '總覽', 
              icon: <Icons.Home className="w-6 h-6" />
          },
          { 
              key: 'mint' as Page, 
              label: '鑄造', 
              icon: <Icons.Plus className="w-6 h-6" />
          },
          { 
              key: 'altar' as Page, 
              label: '升星', 
              icon: <Icons.Star className="w-6 h-6" />
          },
          { 
              key: 'myAssets' as Page, 
              label: '組隊', 
              icon: <Icons.Package className="w-6 h-6" />
          },
          { 
              key: 'dungeon' as Page, 
              label: '地城', 
              icon: <Icons.Castle className="w-6 h-6" />
          },
          { 
              key: 'marketplace' as Page, 
              label: '市場', 
              icon: <Icons.ShoppingCart className="w-6 h-6" />
          },
          { 
              key: 'gameData' as Page, 
              label: '數據中心', 
              icon: <Icons.BarChart className="w-6 h-6" />
          },
          { 
              key: 'vip' as Page, 
              label: 'VIP', 
              icon: <Icons.Crown className="w-6 h-6" />
          },
          { 
              key: 'referral' as Page, 
              label: '推薦', 
              icon: <Icons.Users className="w-6 h-6" />
          },
      ];
      
      if (isDeveloper) {
          items.push({ 
              key: 'admin' as Page, 
              label: '管理',
              icon: <Icons.Settings className="w-6 h-6" />
          });
      }
      
      return items;
  }, [isDeveloper]);

  const handleConnectClick = () => { if (isConnected) disconnect(); else connect({ connector: injected() }); };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsTxPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.body.style.overflow = isMenuOpen ? 'hidden' : 'auto';
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.body.style.overflow = 'auto';
    };
  }, [isMenuOpen]);

  const handleNavClick = (page: Page) => {
      setActivePage(page);
      setIsMenuOpen(false);
  };

  return (
    <header className="bg-[#1F1D36] shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2 md:space-x-4">
                    <img src={logoUrl} alt="Soulbound Saga Logo" className="h-10 w-10 md:h-12 md:w-12 rounded-full border-2 border-[#C0A573]"/>
                    <div>
                        <h1 className="text-xl md:text-3xl font-bold text-white text-shadow-gold">Soulbound Saga</h1>
                        <div className="hidden md:flex text-xs text-gray-400 items-center gap-2">
                           {isConnected && level && (
                                <span className="font-bold text-yellow-400 bg-black/20 px-2 py-0.5 rounded">LV {level}</span>
                           )}
                           <span>靈魂傳奇：魂之探索者</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-1 md:gap-2">
                    {/* 桌面端顯示所有功能 */}
                    <div className="hidden md:flex items-center gap-3">
                        {/* 網路狀態指示器 */}
                        <NetworkSwitcher />
                        
                        {/* 交易歷史按鈕 */}
                        {isConnected && (
                          <div className="relative" ref={popoverRef}>
                            <button 
                                onClick={() => setIsTxPopoverOpen(prev => !prev)} 
                                className="flex items-center gap-2 p-2 rounded-full bg-gray-700/50 text-gray-300 hover:bg-gray-700 transition-colors" 
                                aria-label="最近交易"
                                title="查看最近交易"
                            >
                              <Icons.History className="h-5 w-5" />
                              <span className="text-xs">交易歷史</span>
                            </button>
                            {isTxPopoverOpen && <RecentTransactions />}
                          </div>
                        )}
                    </div>
                    
                    {/* 移動端只顯示連接按鈕和菜單 */}
                    <ActionButton onClick={handleConnectClick} isLoading={isConnecting} disabled={isConnecting} className="px-2 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm w-24 md:w-36">
                      {isConnected && address ? `${address.substring(0, 4)}...${address.substring(address.length - 4)}` : '連接錢包'}
                    </ActionButton>
                    <div className="md:hidden">
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-full text-gray-300 hover:bg-gray-700 transition-colors">
                            <MenuIcon />
                        </button>
                    </div>
                </div>
            </div>
            
            <nav className="hidden md:flex mt-4 flex-wrap justify-center gap-4 text-sm">
              {navItems.map(item => (
                  <a 
                      key={item.key} 
                      href={`#/${item.key}`} 
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                          activePage === item.key 
                              ? 'bg-[#C0A573] text-white shadow-lg transform scale-105' 
                              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                      onClick={(e) => { e.preventDefault(); handleNavClick(item.key); }}
                      onMouseEnter={() => preloadPage(item.key)}
                  >
                      <span className="flex items-center gap-1">
                          <span className="w-4 h-4">{React.cloneElement(item.icon, { className: 'w-4 h-4' })}</span>
                          {item.label}
                      </span>
                  </a>
              ))}
            </nav>
        </div>

        {isMenuOpen && (
            <div className="md:hidden fixed inset-0 bg-[#1F1D36]/95 backdrop-blur-sm z-50 flex flex-col animate-zoom-in">
                {/* 標題區域 - 進一步減少間距 */}
                <div className="flex justify-between items-center px-4 pt-3 pb-1">
                    <h2 className="text-lg font-bold text-white">選單</h2>
                    <button onClick={() => setIsMenuOpen(false)} className="p-1 text-gray-300">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                
                {/* 功能工具欄 - 緊湊化設計 */}
                <div className="flex justify-center gap-3 mb-2 px-4">
                    <div className="flex items-center gap-3">
                        {/* 網路狀態 - 更突出顯示 */}
                        <NetworkSwitcher />
                        
                        {/* 交易歷史按鈕 - 增強可見性 */}
                        {isConnected && (
                          <div className="relative">
                            <button 
                                onClick={() => setIsTxPopoverOpen(prev => !prev)} 
                                className="flex items-center gap-2 p-2 rounded-full bg-gray-700/50 text-gray-300 hover:bg-gray-700 transition-colors border border-gray-600" 
                                aria-label="最近交易"
                            >
                              <Icons.History className="h-5 w-5" />
                              <span className="text-xs">交易</span>
                            </button>
                            {/* 修復手機版交易歷史顯示 - 使用全屏覆蓋避免定位衝突 */}
                            {isTxPopoverOpen && (
                                <>
                                    {/* 點擊遮罩關閉 */}
                                    <div 
                                        className="fixed inset-0 z-[59] bg-black/20"
                                        onClick={() => setIsTxPopoverOpen(false)}
                                    />
                                    {/* 交易記錄彈窗 - 覆蓋原有定位 */}
                                    <div className="fixed top-16 left-2 right-2 z-[60] bg-gray-800/98 backdrop-blur-lg shadow-2xl rounded-xl border border-white/10 overflow-hidden max-h-[70vh]">
                                        <div className="p-3 border-b border-white/10 flex justify-between items-center">
                                            <h4 className="font-bold text-base text-gray-200">最近交易</h4>
                                            <button
                                                onClick={() => setIsTxPopoverOpen(false)}
                                                className="text-xs text-gray-400 hover:text-gray-200 p-1"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <div className="p-1 max-h-80 overflow-y-auto">
                                            {/* 直接嵌入交易列表內容 */}
                                            <RecentTransactionsInner />
                                        </div>
                                    </div>
                                </>
                            )}
                          </div>
                        )}
                    </div>
                </div>
                
                {/* 導航選項 - 改為網格布局，更適合手機操作 */}
                <nav className="grid grid-cols-2 gap-2 overflow-y-auto px-4 pb-4 flex-1">
                    {navItems.map(item => (
                        <a 
                            key={item.key} 
                            href={`#/${item.key}`} 
                            className={`flex flex-col items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm transition-all ${
                                activePage === item.key 
                                    ? 'bg-[#C0A573] text-white font-semibold shadow-lg' 
                                    : 'bg-gray-700/30 text-gray-300 hover:bg-gray-600'
                            }`}
                            onClick={(e) => { e.preventDefault(); handleNavClick(item.key); }}
                        >
                            <span className="w-5 h-5">{React.cloneElement(item.icon, { className: 'w-5 h-5' })}</span>
                            <span className="font-medium">{item.label}</span>
                        </a>
                    ))}
                </nav>
                
                {/* 底部說明文字 - 簡化 */}
                <div className="px-4 py-2 text-center text-gray-400 text-xs border-t border-gray-700">
                    <p>請連接錢包以查看網路狀態和交易歷史</p>
                </div>
            </div>
        )}
    </header>
  );
};
