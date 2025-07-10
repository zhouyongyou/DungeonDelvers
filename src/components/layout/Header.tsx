// src/components/layout/Header.tsx

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAccount, useConnect, useDisconnect, useReadContract } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { ActionButton } from '../ui/ActionButton';
import type { Page } from '../../types/page';
import { useTheme } from '../../contexts/ThemeContext';
import logoUrl from '/logo-192x192.png';
import { DEVELOPER_ADDRESS } from '../../config/constants';
import { getContract } from '../../config/contracts';
import { RecentTransactions } from '../ui/RecentTransactions';
import { Icons } from '../ui/icons';
import { bsc } from 'wagmi/chains';
import { NetworkSwitcher } from '../ui/NetworkSwitcher';

// (此處省略未變更的 ThemeToggleButton, MenuIcon, XIcon 元件程式碼)
const ThemeToggleButton: React.FC = () => {
    const { theme, setTheme, effectiveTheme } = useTheme();
    const toggleTheme = () => {
        const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
        const currentIndex = themes.indexOf(theme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        setTheme(nextTheme);
    };
    const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>;
    const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>;

    return (
        <button onClick={toggleTheme} className="p-2 rounded-full text-gray-300 hover:bg-white/20 transition-colors" aria-label={`Switch to ${effectiveTheme === 'light' ? 'dark' : 'light'} mode`}>
            {effectiveTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
    );
};

const usePlayerLevel = () => {
    const { address, chainId } = useAccount();
    
    // Always call hooks unconditionally
    const playerProfileContract = getContract(bsc.id, 'playerProfile');
    
    const { data: tokenId } = useReadContract({ 
        ...playerProfileContract, 
        functionName: 'profileTokenOf', 
        args: [address!], 
        query: { enabled: !!address && !!playerProfileContract && chainId === bsc.id }
    });
    
    const { data: experience } = useReadContract({ 
        ...playerProfileContract, 
        functionName: 'playerExperience', 
        args: [tokenId!], 
        query: { enabled: typeof tokenId === 'bigint' && tokenId > 0n && chainId === bsc.id }
    });
    
    const level = useMemo(() => {
        // Move conditional logic inside the hook
        if (!chainId || chainId !== bsc.id) return null;
        if (typeof experience !== 'bigint') return null;
        if (experience < 100n) return 1;
        return Math.floor(Math.sqrt(Number(experience) / 100)) + 1;
    }, [experience, chainId]);
    
    return { level };
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

export const Header: React.FC<{ activePage: Page; setActivePage: (page: Page) => void }> = ({ activePage, setActivePage }) => {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const [isTxPopoverOpen, setIsTxPopoverOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { level } = usePlayerLevel();

  const isDeveloper = isConnected && address?.toLowerCase() === DEVELOPER_ADDRESS.toLowerCase();

  const navItems: { key: Page; label: string }[] = useMemo(() => {
      const items: { key: Page; label: string }[] = [
          { key: 'dashboard', label: '儀表板' },
          { key: 'profile', label: '個人檔案' },
          { key: 'mint', label: '鑄造' },
          { key: 'party', label: '隊伍' },
          { key: 'dungeon', label: '地下城' },
          { key: 'altar', label: '升星祭壇' },
          // ★ 新增：圖鑑頁面連結
          { key: 'codex', label: '圖鑑' },
          { key: 'vip', label: 'VIP' },
          { key: 'referral', label: '邀請' },
          { key: 'explorer', label: '數據查詢' },
      ];
      if (isDeveloper) {
          items.push({ key: 'admin', label: '管理後台' });
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
                        <div className="hidden md:flex text-xs text-gray-300 dark:text-gray-400 items-center gap-2">
                           {isConnected && level && (
                                <span className="font-bold text-yellow-400 bg-black/20 px-2 py-0.5 rounded">LV {level}</span>
                           )}
                           <span>你的奇幻冒險由此開始</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-1 md:gap-2">
                    <ThemeToggleButton />
                    <NetworkSwitcher />
                    {isConnected && (
                      <div className="relative" ref={popoverRef}>
                        <button onClick={() => setIsTxPopoverOpen(prev => !prev)} className="p-2 rounded-full text-gray-300 hover:bg-white/20 transition-colors" aria-label="顯示最近交易">
                          <Icons.History className="h-5 w-5" />
                        </button>
                        {isTxPopoverOpen && <RecentTransactions />}
                      </div>
                    )}
                    <ActionButton onClick={handleConnectClick} isLoading={isConnecting} disabled={isConnecting} className="px-3 py-2 md:px-4 rounded-full text-sm w-32 md:w-36">
                      {isConnected && address ? `${address.substring(0, 4)}...${address.substring(address.length - 4)}` : '連接錢包'}
                    </ActionButton>
                    <div className="md:hidden">
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-full text-gray-300 hover:bg-white/20 transition-colors">
                            <MenuIcon />
                        </button>
                    </div>
                </div>
            </div>
            
            <nav className="hidden md:flex mt-4 flex-wrap justify-center gap-2 text-sm">
              {navItems.map(item => (
                  <a key={item.key} href={`#/${item.key}`} className={`nav-item ${activePage === item.key ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActivePage(item.key); }}>
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
                <nav className="flex flex-col items-center gap-4">
                    {navItems.map(item => (
                        <a 
                           key={item.key} 
                           href={`#/${item.key}`} 
                           className={`w-full text-center py-3 text-lg rounded-lg transition-colors ${activePage === item.key ? 'bg-white/20 font-semibold text-white' : 'text-gray-300'}`}
                           onClick={(e) => { e.preventDefault(); handleNavClick(item.key); }}
                        >
                          {item.label}
                        </a>
                    ))}
                </nav>
            </div>
        )}
    </header>
  );
};
