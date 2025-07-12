// src/components/layout/Footer.tsx

import { useChainId } from 'wagmi';
import { bsc } from 'wagmi/chains';

export function Footer() {
  // 移除 i18n 依賴，使用固定文本
  const chainId = useChainId();

  // 獲取當前鏈的名稱
  const getChainName = (id: number) => {
    switch (id) {
      case bsc.id:
        return 'BSC';
      default:
        return 'Unknown Network';
    }
  };

  return (
    <footer className="bg-bg-secondary/50 backdrop-blur-sm border-t border-white/10">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <p className="text-sm text-text-secondary">
              © {new Date().getFullYear()} Dungeon Delvers. All rights reserved.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <div className="text-sm text-text-secondary">
              Network: <span className="text-text-primary">{getChainName(chainId)}</span>
            </div>
            <div className="text-sm text-text-secondary">
              Version: <span className="text-text-primary">v1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
