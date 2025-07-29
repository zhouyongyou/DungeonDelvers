// src/components/layout/Header.tsx

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { ActionButton } from '../ui/ActionButton';
import type { Page } from '../../types/page';
import logoUrl from '/logo-192x192.png';
import { DEVELOPER_ADDRESS } from '../../config/constants';
import { RecentTransactions } from '../ui/RecentTransactions';
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

  const navItems: { key: Page; label: string }[] = useMemo(() => {
      const items = [
          { key: 'dashboard' as Page, label: '總覽' },
          { key: 'myAssets' as Page, label: '我的資產' },
          { key: 'marketplace' as Page, label: '市場' },
          { key: 'mint' as Page, label: '鑄造' },
          { key: 'altar' as Page, label: '升星' },
          { key: 'dungeon' as Page, label: '地城' },
          { key: 'vip' as Page, label: 'VIP' },
          { key: 'referral' as Page, label: '推薦' },
      ];
      
      if (isDeveloper) {
          items.push({ key: 'admin' as Page, label: '管理' });
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
                    <img src={logoUrl} alt="Dungeon Delvers Logo" className="h-10 w-10 md:h-12 md:w-12 rounded-full border-2 border-[#C0A573]"/>
                    <div>
                        <h1 className="text-xl md:text-3xl font-bold text-white text-shadow-gold">Dungeon Delvers</h1>
                        <div className="hidden md:flex text-xs text-gray-400 items-center gap-2">
                           {isConnected && level && (
                                <span className="font-bold text-yellow-400 bg-black/20 px-2 py-0.5 rounded">LV {level}</span>
                           )}
                           <span>地下城冒險者</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-1 md:gap-2">
                    {/* 桌面端顯示所有功能 */}
                    <div className="hidden md:flex items-center gap-2">
                        <NetworkSwitcher />
                        {isConnected && (
                          <div className="relative" ref={popoverRef}>
                            <button onClick={() => setIsTxPopoverOpen(prev => !prev)} className="p-2 rounded-full text-gray-300 hover:bg-gray-700 transition-colors" aria-label="最近交易">
                              <Icons.History className="h-5 w-5" />
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
            
            <nav className="hidden md:flex mt-4 flex-wrap justify-center gap-3 text-sm">
              {navItems.map(item => (
                  <a 
                      key={item.key} 
                      href={`#/${item.key}`} 
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                          activePage === item.key 
                              ? 'bg-[#C0A573] text-white shadow-lg transform scale-105' 
                              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                      onClick={(e) => { e.preventDefault(); handleNavClick(item.key); }}
                      onMouseEnter={() => preloadPage(item.key)}
                  >
                      {item.icon && <span className="text-base">{item.icon}</span>}
                      {item.label}
                  </a>
              ))}
            </nav>
        </div>

        {isMenuOpen && (
            <div className="md:hidden fixed inset-0 bg-[#1F1D36]/95 backdrop-blur-sm z-50 flex flex-col p-4 animate-zoom-in">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-white">選單</h2>
                    <button onClick={() => setIsMenuOpen(false)} className="p-2 text-gray-300">
                        <XIcon />
                    </button>
                </div>
                
                {/* 移動端功能選項 */}
                <div className="flex justify-center gap-4 mb-6 bg-gray-700/50 rounded-lg p-3">
                    <NetworkSwitcher />
                    {isConnected && (
                      <div className="relative" ref={popoverRef}>
                        <button onClick={() => setIsTxPopoverOpen(prev => !prev)} className="p-2 rounded-full text-gray-300 hover:bg-gray-700 transition-colors" aria-label="最近交易">
                          <Icons.History className="h-5 w-5" />
                        </button>
                        {isTxPopoverOpen && <RecentTransactions />}
                      </div>
                    )}
                </div>
                
                <nav className="flex flex-col gap-2 overflow-y-auto">
                    {navItems.map(item => (
                        <a 
                            key={item.key} 
                            href={`#/${item.key}`} 
                            className={`flex items-center gap-3 px-5 py-4 rounded-lg text-lg transition-all ${
                                activePage === item.key 
                                    ? 'bg-[#C0A573] text-white font-semibold shadow-lg' 
                                    : 'bg-gray-700/30 text-gray-300 hover:bg-gray-600'
                            }`}
                            onClick={(e) => { e.preventDefault(); handleNavClick(item.key); }}
                        >
                            {item.icon && <span className="text-xl">{item.icon}</span>}
                            {item.label}
                        </a>
                    ))}
                </nav>
            </div>
        )}
    </header>
  );
};
