import React, { useState } from 'react';
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConnectWallet } from '../components/ui/ConnectWallet';
import { getContractConfig } from '../config/contracts';

const MintPage: React.FC = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [selectedNft, setSelectedNft] = useState<'hero' | 'relic' | 'party'>('hero');
  
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleMint = async () => {
    if (!address) return;
    
    try {
      const contract = getContractConfig(chainId, selectedNft);
      writeContract({
        ...contract,
        functionName: 'mint',
        args: [address, 1n],
      });
    } catch (err) {
      console.error('Mint failed:', err);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <ConnectWallet />
      </div>
    );
  }

  if (chainId !== bsc.id) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">錯誤的網路</h2>
          <p className="text-gray-300">請切換到 BSC 網路</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8">NFT 鑄造</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {(['hero', 'relic', 'party'] as const).map((nftType) => (
            <Card 
              key={nftType}
              className={`cursor-pointer transition-all ${
                selectedNft === nftType ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedNft(nftType)}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">
                  {nftType === 'hero' && '⚔️'}
                  {nftType === 'relic' && '🏺'}
                  {nftType === 'party' && '👥'}
                </div>
                <h3 className="text-xl font-bold text-white capitalize">{nftType}</h3>
                <p className="text-gray-300 mt-2">
                  {nftType === 'hero' && '強大的戰士'}
                  {nftType === 'relic' && '神秘的遺物'}
                  {nftType === 'party' && '冒險隊伍'}
                </p>
              </div>
            </Card>
          ))}
        </div>

        <Card className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            鑄造 {selectedNft.toUpperCase()}
          </h2>
          
          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-4">
              <p className="text-red-300">錯誤: {error.message}</p>
            </div>
          )}
          
          {isSuccess && (
            <div className="bg-green-900/50 border border-green-500 rounded-lg p-4 mb-4">
              <p className="text-green-300">鑄造成功！</p>
            </div>
          )}
          
          <Button
            onClick={handleMint}
            loading={isPending || isConfirming}
            disabled={!address}
            size="lg"
            className="w-full"
          >
            {isPending ? '確認中...' : isConfirming ? '鑄造中...' : '鑄造 NFT'}
          </Button>
          
          {hash && (
            <p className="text-sm text-gray-400 mt-4">
              交易哈希: {hash.slice(0, 10)}...{hash.slice(-8)}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default MintPage;
