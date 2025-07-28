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
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openMobileCategory, setOpenMobileCategory] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { level } = usePlayerLevel();

  const isDeveloper = isConnected && address?.toLowerCase() === DEVELOPER_ADDRESS.toLowerCase();

  const gameMenus = useMemo(() => {
      const baseMenus = {
          '總覽': [
              { key: 'dashboard' as Page, label: '總覽' },
              { key: 'profile' as Page, label: '檔案' },
              { key: 'explorer' as Page, label: '探索' },
          ],
          '成長': [
              { key: 'mint' as Page, label: '鑄造' },
              { key: 'altar' as Page, label: '升星' },
          ],
          '冒險': [
              { key: 'party' as Page, label: '組隊' },
              { key: 'dungeon' as Page, label: '地城' },
          ],
          '社群': [
              { key: 'referral' as Page, label: '推薦' },
              { key: 'vip' as Page, label: 'VIP' },
          ]
      };
      
      if (isDeveloper) {
          baseMenus['總覽'].push({ key: 'admin' as Page, label: '管理' });
      }
      
      return baseMenus;
  }, [isDeveloper]);

  const navItems: { key: Page; label: string }[] = useMemo(() => {
      return Object.values(gameMenus).flat();
  }, [gameMenus]);

  const handleConnectClick = () => { if (isConnected) disconnect(); else connect({ connector: injected() }); };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsTxPopoverOpen(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
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
      setOpenDropdown(null);
  };

  const toggleDropdown = (category: string) => {
      setOpenDropdown(openDropdown === category ? null : category);
  };

  const toggleMobileCategory = (category: string) => {
      setOpenMobileCategory(openMobileCategory === category ? null : category);
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
            
            <nav className="hidden md:flex mt-4 flex-wrap justify-center gap-6 text-sm" ref={dropdownRef}>
              {Object.entries(gameMenus).map(([category, items]) => (
                  <div key={category} className="relative">
                      <button 
                          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                              items.some(item => item.key === activePage) 
                                  ? 'bg-[#C0A573] text-white' 
                                  : 'text-gray-300 hover:bg-gray-700'
                          }`}
                          onClick={() => toggleDropdown(category)}
                      >
                          {category}
                          <svg 
                              className={`w-4 h-4 transition-transform ${openDropdown === category ? 'rotate-180' : ''}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                          >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
                          </svg>
                      </button>
                      
                      {openDropdown === category && (
                          <div className="absolute top-full left-0 mt-2 bg-[#2A2B3D] border border-gray-600 rounded-lg shadow-lg z-50 min-w-[120px]">
                              {items.map(item => (
                                  <a 
                                      key={item.key} 
                                      href={`#/${item.key}`} 
                                      className={`block px-4 py-3 text-sm transition-colors border-b border-gray-600 last:border-b-0 ${
                                          activePage === item.key 
                                              ? 'bg-[#C0A573] text-white font-semibold' 
                                              : 'text-gray-300 hover:bg-gray-600'
                                      }`}
                                      onClick={(e) => { e.preventDefault(); handleNavClick(item.key); }}
                                  >
                                      {item.label}
                                  </a>
                              ))}
                          </div>
                      )}
                  </div>
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
                
                <nav className="flex flex-col gap-4">
                    {Object.entries(gameMenus).map(([category, items]) => (
                        <div key={category} className="bg-gray-700/30 rounded-lg overflow-hidden">
                            <button 
                                className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
                                    items.some(item => item.key === activePage) 
                                        ? 'bg-[#C0A573] text-white' 
                                        : 'text-gray-300 hover:bg-gray-600'
                                }`}
                                onClick={() => toggleMobileCategory(category)}
                            >
                                <span className="text-lg font-semibold">{category}</span>
                                <svg 
                                    className={`w-5 h-5 transition-transform ${openMobileCategory === category ? 'rotate-180' : ''}`} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
                                </svg>
                            </button>
                            
                            {openMobileCategory === category && (
                                <div className="border-t border-gray-600">
                                    {items.map((item, index) => (
                                        <a 
                                           key={item.key} 
                                           href={`#/${item.key}`} 
                                           className={`block px-6 py-4 text-lg transition-colors border-b border-gray-600 last:border-b-0 ${
                                               activePage === item.key 
                                                   ? 'bg-[#C0A573] text-white font-semibold' 
                                                   : 'text-gray-300 hover:bg-gray-600'
                                           }`}
                                           onClick={(e) => { e.preventDefault(); handleNavClick(item.key); }}
                                        >
                                          {item.label}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>
            </div>
        )}
    </header>
  );
};
