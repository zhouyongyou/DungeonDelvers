import React from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { ActionButton } from './ActionButton';
import { AlertTriangleIcon } from './icons';

export const WrongNetworkBanner: React.FC = () => {
  const { chain, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  const isOnBSC = chain?.id === bsc.id;
  const isOnWrongNetwork = isConnected && !isOnBSC;

  if (!isOnWrongNetwork) {
    return null;
  }

  const handleSwitchToBSC = () => {
    switchChain({ chainId: bsc.id });
  };

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mx-4 mt-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <AlertTriangleIcon className="w-6 h-6 text-red-400" />
        <div>
          <h3 className="text-red-400 font-medium">網路不正確</h3>
          <p className="text-red-300 text-sm">
            您目前連接到 {chain?.name || '未知網路'}，但此應用程式需要使用 BSC 主網。
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ActionButton
          onClick={handleSwitchToBSC}
          isLoading={isPending}
          disabled={isPending}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          {isPending ? '切換中...' : '切換到 BSC 主網'}
        </ActionButton>
      </div>
    </div>
  );
};

export default WrongNetworkBanner;