import React from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { bsc } from 'wagmi/chains';

export const NetworkSwitcher: React.FC = () => {
  const { chain, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

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
        onClick={isOnWrongNetwork ? handleSwitchToBSC : undefined}
      >
        <div className={`w-2 h-2 rounded-full ${isOnBSC ? 'bg-green-400' : 'bg-red-400'}`} />
        <span className="hidden sm:inline">
          {isOnBSC ? 'BSC 主網' : chain?.name || '未知網路'}
        </span>
        {isOnWrongNetwork && (
          <span className="text-xs">
            {isPending ? '切換中...' : '點擊切換'}
          </span>
        )}
      </div>
    </div>
  );
};

export default NetworkSwitcher;