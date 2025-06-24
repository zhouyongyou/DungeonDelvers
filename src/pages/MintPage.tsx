import React from 'react';
import { useAccount, useReadContracts, useWriteContract } from 'wagmi';
import { formatEther, parseEther, maxUint256 } from 'viem';
import { useAppToast } from '../hooks/useAppToast';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const MintCard: React.FC<{ type: 'hero' | 'relic' }> = ({ type }) => {
  const { address, chainId } = useAccount();
  const { showToast } = useAppToast();

  const contractConfig = getContract(chainId, type);
  const soulShardContract = getContract(chainId, 'soulShardToken');

  const [isMinting, setIsMinting] = React.useState(false);
  const title = type === 'hero' ? '英雄' : '聖物';

  // 使用 useReadContracts 一次性讀取多個數據
  const { data, isLoading } = useReadContracts({
    contracts: [
      { ...contractConfig, functionName: 'mintPriceUSD' },
      { ...contractConfig, functionName: 'getSoulShardAmountForUSD', args: [2n * 10n**18n] }, // 假設價格為 2 USD
    ],
    query: { enabled: !!contractConfig },
  });

  const [mintPriceUSD, soulShardAmount] = data || [];

  const { writeContract: approve, isPending: isApproving } = useWriteContract({
      mutation: {
        onSuccess: () => {
            showToast('授權成功！現在可以鑄造了。', 'success');
            // 授權成功後可以觸發 mint
            handleMint();
        },
        onError: (err) => showToast(err.message.split('\n')[0], 'error'),
    }
  });

  const { writeContract: mint, isPending: isConfirmingMint } = useWriteContract({
    mutation: {
        onSuccess: () => showToast(`${title}鑄造請求已送出！`, 'success'),
        onError: (err) => showToast(err.message.split('\n')[0], 'error'),
    }
  });

  const handleMint = async () => {
    if (!address || !soulShardContract || !contractConfig || !soulShardAmount?.result) {
        showToast('錢包未連接或合約未就緒', 'error');
        return;
    }
    
    mint({
        ...contractConfig,
        functionName: type === 'hero' ? 'requestNewHero' : 'requestNewRelic',
    });
  };

  const startMintProcess = async () => {
      if (!address || !soulShardContract || !contractConfig || !soulShardAmount?.result) {
          showToast('錢包未連接或合約未就緒', 'error');
          return;
      }
      setIsMinting(true);
      // 直接授權最大值，簡化流程
      approve({
          ...soulShardContract,
          functionName: 'approve',
          args: [contractConfig.address, maxUint256]
      });
  };

  const isLoadingPrice = isLoading;
  const isProcessing = isApproving || isConfirmingMint;

  return (
    <div className="card-bg p-6 rounded-xl shadow-lg flex flex-col items-center">
      <h3 className="text-2xl font-bold mb-4">招募{title}</h3>
      <div className="text-center mb-4 min-h-[72px]">
        {isLoadingPrice ? <LoadingSpinner color="border-gray-500" /> : (
          <>
            <p>固定成本: <span className="font-bold text-lg">{mintPriceUSD?.result ? formatEther(mintPriceUSD.result) : '--'}</span> USD</p>
            <p className="text-gray-600">當前需支付: <span className="font-bold text-yellow-600">{soulShardAmount?.result ? parseFloat(formatEther(soulShardAmount.result)).toFixed(4) : '讀取中...'}</span> $SoulShard</p>
          </>
        )}
      </div>
      <ActionButton
        onClick={startMintProcess}
        disabled={isProcessing}
        isLoading={isProcessing}
        className="px-8 py-3 rounded-lg text-lg w-28 h-12"
      >
        {isApproving ? '授權中' : isConfirmingMint ? '鑄造中' : '鑄造'}
      </ActionButton>
    </div>
  );
};

export const MintPage: React.FC = () => {
  return (
    <section>
      <h2 className="text-3xl font-bold text-center mb-6 text-[#2D2A4A] font-serif">鑄造工坊</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <MintCard type="hero" />
        <MintCard type="relic" />
      </div>
    </section>
  );
};