import React, { useMemo } from 'react';
import { useAccount, useConnect, useDisconnect, useReadContract } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { ActionButton } from '../ui/ActionButton';
import type { Page } from '../../App';
import { useTheme } from '../../contexts/ThemeContext';
import logoUrl from '/assets/images/logo-192x192.png';
import { DEVELOPER_ADDRESS } from '../../config/constants';
import { getContract } from '../../config/contracts'; // 引入 getContract

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
        <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-gray-300 hover:bg-white/20 transition-colors"
            aria-label={`Switch to ${effectiveTheme === 'light' ? 'dark' : 'light'} mode`}
        >
            {effectiveTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
    );
};

export const Header: React.FC<{ activePage: Page; setActivePage: (page: Page) => void }> = ({ activePage, setActivePage }) => {
  const { address, chainId, isConnected, isConnecting } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  // [新增] 讀取玩家等級的邏輯
  const playerProfileContract = getContract(chainId, 'playerProfile');
  const { data: tokenId } = useReadContract({
    ...playerProfileContract,
    functionName: 'profileTokenOf',
    args: [address!],
    query: { enabled: !!address && !!playerProfileContract }
  });
  const { data: experience } = useReadContract({
    ...playerProfileContract,
    functionName: 'playerExperience',
    args: [tokenId!],
    query: { enabled: typeof tokenId === 'bigint' && tokenId > 0n }
  });
  const level = useMemo(() => {
    if (typeof experience !== 'bigint') return null;
    if (experience < 100n) return 1;
    // 注意：BigInt 沒有 Math.sqrt，這裡用近似演算法或直接轉換
    return Math.floor(Math.sqrt(Number(experience) / 100)) + 1;
  }, [experience]);

  const isDeveloper = isConnected && address?.toLowerCase() === DEVELOPER_ADDRESS.toLowerCase();
  const navItems: { key: Page; label: string }[] = [
      { key: 'dashboard', label: '儀表板' },
      { key: 'profile', label: '個人檔案' },
      { key: 'mint', label: '鑄造' },
      { key: 'party', label: '我的資產' },
      { key: 'dungeon', label: '地下城' },
      { key: 'altar', label: '升星祭壇' },
      { key: 'explorer', label: '數據查詢' },
  ];
  if (isDeveloper) {
      navItems.push({ key: 'admin', label: '管理後台' });
  }
  
  const handleConnectClick = () => { if (isConnected) disconnect(); else connect({ connector: injected() }); };

  return (
    <header className="bg-[#1F1D36] shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <img src={logoUrl} alt="Dungeon Delvers Logo" className="h-12 w-12 rounded-full border-2 border-[#C0A573]"/>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white text-shadow-gold">Dungeon Delvers</h1>
                        <div className="text-sm text-gray-300 dark:text-gray-400 flex items-center gap-2">
                           {isConnected && level && (
                                <span className="font-bold text-yellow-400 bg-black/20 px-2 py-0.5 rounded">LV {level}</span>
                           )}
                           <span>你的奇幻冒險由此開始</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggleButton />
                    <ActionButton onClick={handleConnectClick} isLoading={isConnecting} disabled={isConnecting} className="px-4 py-2 rounded-full text-sm md:text-base w-36">
                      {isConnected && address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '連接錢包'}
                    </ActionButton>
                </div>
            </div>
        <nav className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
          {navItems.map(item => (
              <a 
                 key={item.key} 
                 href={`#${item.key}`} 
                 className={`nav-item ${activePage === item.key ? 'active' : ''}`} 
                 onClick={(e) => { e.preventDefault(); setActivePage(item.key); }}
              >
                {item.label}
              </a>
          ))}
        </nav>
        </div>
    </header>
  );
};