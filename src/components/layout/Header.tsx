import React from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { ActionButton } from '../ui/ActionButton';
// 【修正】從 App.tsx 導入 Page 型別，而不是自己定義
import type { Page } from '../../App';

interface HeaderProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
}

export const Header: React.FC<HeaderProps> = ({ activePage, setActivePage }) => {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const navItems: { key: Page; label: string }[] = [
    { key: 'dashboard', label: '儀表板' },
    { key: 'mint', label: '鑄造' },
    { key: 'party', label: '我的資產' },
    { key: 'dungeon', label: '地下城' },
    { key: 'explorer', label: '數據查詢' },
  ];
  
  const handleConnectClick = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect({ connector: injected() });
    }
  };

  return (
    <header className="bg-[#1F1D36] shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <img src="https://www.soulshard.fun/assets/images/logo-192x192.png" alt="Dungeon Delvers Logo" className="h-12 w-12 rounded-full border-2 border-[#C0A573]"/>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white text-shadow-gold">Dungeon Delvers</h1>
              <p className="text-sm text-gray-300">你的奇幻冒險由此開始</p>
            </div>
          </div>
          <ActionButton
            onClick={handleConnectClick}
            isLoading={isConnecting}
            disabled={isConnecting}
            className="px-4 py-2 rounded-full text-sm md:text-base w-36"
          >
            {isConnected && address 
              ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
              : '連接錢包'}
          </ActionButton>
        </div>
        <nav className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
          {navItems.map(item => (
            <a 
               key={item.key} 
               href={`#${item.key}`}
               className={`nav-item ${activePage === item.key ? 'active' : ''}`} 
               onClick={(e) => {
                 e.preventDefault();
                 setActivePage(item.key);
               }}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
};
