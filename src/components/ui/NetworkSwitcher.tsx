import React, { useState } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { ActionButton } from './ActionButton';
import { Icons } from './icons';

export const NetworkSwitcher: React.FC = () => {
  const { chain, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const [isHovered, setIsHovered] = useState(false);

  const isOnBSC = chain?.id === bsc.id;
  const isOnWrongNetwork = isConnected && !isOnBSC;

  const handleSwitchToBSC = () => {
    switchChain({ chainId: bsc.id });
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="relative">
      {/* 網路狀態指示器 */}
      <div 
        className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium cursor-pointer transition-all ${
          isOnBSC 
            ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
            : 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={isOnWrongNetwork ? handleSwitchToBSC : undefined}
      >
        <div className={`w-2 h-2 rounded-full ${isOnBSC ? 'bg-green-400' : 'bg-red-400'}`} />
        <span className="hidden sm:inline">
          {isOnBSC ? 'BSC 主網' : chain?.name || '未知網路'}
        </span>
        {isOnWrongNetwork && (
          <Icons.AlertTriangle className="w-4 h-4" />
        )}
      </div>

      {/* 錯誤網路提示 */}
      {isOnWrongNetwork && (
        <div className="absolute top-full mt-2 right-0 bg-red-500/90 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-50 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <Icons.AlertTriangle className="w-3 h-3" />
            <span>請切換至 BSC 主網</span>
          </div>
          <div className="mt-2">
            <ActionButton
              onClick={handleSwitchToBSC}
              isLoading={isPending}
              disabled={isPending}
              className="bg-white/20 hover:bg-white/30 text-white text-xs px-2 py-1 rounded"
            >
              {isPending ? '切換中...' : '切換到 BSC'}
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkSwitcher;