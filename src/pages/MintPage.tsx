import React, { useState } from 'react';
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useAppToast } from '../hooks/useAppToast';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { heroABI, relicABI, partyABI } from '../config/abis';
import { useChainId } from 'wagmi';

type NFTType = 'hero' | 'relic' | 'party';

const MintPage: React.FC = () => {
  const { address } = useAccount();
  const chainId = useChainId();
  const { showToast } = useAppToast();
  
  const [selectedType, setSelectedType] = useState<NFTType>('hero');
  const [quantity, setQuantity] = useState<number>(1);
  const [isApproving, setIsApproving] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  // 獲取合約地址
  const getContractAddress = (type: NFTType) => {
    const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
    if (!addresses) return null;
    
    switch (type) {
      case 'hero': return addresses.hero;
      case 'relic': return addresses.relic;
      case 'party': return addresses.party;
      default: return null;
    }
  };

  const contractAddress = getContractAddress(selectedType);
  const getABI = (type: NFTType) => {
    switch (type) {
      case 'hero': return heroABI;
      case 'relic': return relicABI;
      case 'party': return partyABI;
      default: return heroABI;
    }
  };

  // 讀取鑄造價格 (USD)
  const { data: mintPriceUSD } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: getABI(selectedType),
    functionName: 'mintPriceUSD',
  });

  // 讀取平台費用 (BNB)
  const { data: platformFee } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: getABI(selectedType),
    functionName: 'platformFee',
  });

  // 讀取 SoulShard 餘額
  const { data: soulShardBalance } = useBalance({
    address: address as `0x${string}`,
    token: CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.soulShard as `0x${string}`,
  });

  // 讀取 SoulShard 授權額度
  const { data: allowance } = useReadContract({
    address: CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.soulShard as `0x${string}`,
    abi: [
      {
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' }
        ],
        name: 'allowance',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      }
    ],
    functionName: 'allowance',
    args: [address as `0x${string}`, contractAddress as `0x${string}`],
  });

  // 讀取所需的 SoulShard 數量 (通過合約計算)
  const { data: requiredSoulShardAmount } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: getABI(selectedType),
    functionName: 'getRequiredSoulShardAmount',
    args: [BigInt(quantity)],
  });

  // Debug logs
  console.log('DEBUG MintPage:');
  console.log('platformFee:', platformFee);
  console.log('mintPriceUSD:', mintPriceUSD);
  console.log('soulShardBalance:', soulShardBalance);
  console.log('allowance:', allowance);
  console.log('requiredSoulShardAmount:', requiredSoulShardAmount);

  // SoulShard 授權
  const { writeContract: approve, data: approveData } = useWriteContract();

  // 鑄造 NFT
  const { writeContract: mint, data: mintData } = useWriteContract();

  // 等待授權交易
  const { isLoading: isApprovingTx } = useWaitForTransactionReceipt({
    hash: approveData,
    onSuccess: () => {
      setIsApproving(false);
      showToast('授權成功！', 'success');
    },
    onError: () => {
      setIsApproving(false);
      showToast('授權失敗！', 'error');
    },
  });

  // 等待鑄造交易
  const { isLoading: isMintingTx } = useWaitForTransactionReceipt({
    hash: mintData,
    onSuccess: () => {
      setIsMinting(false);
      showToast(`成功鑄造 ${quantity} 個 ${selectedType === 'hero' ? '英雄' : selectedType === 'relic' ? '聖物' : '隊伍'}！`, 'success');
      setQuantity(1);
    },
    onError: () => {
      setIsMinting(false);
      showToast('鑄造失敗！', 'error');
    },
  });

  // 計算總平台費用 (BNB)
  const totalPlatformFee = platformFee ? platformFee * BigInt(quantity) : 0n;

  // 檢查是否需要授權
  const needsApproval = allowance && requiredSoulShardAmount ? allowance < requiredSoulShardAmount : true;

  // 處理授權
  const handleApprove = async () => {
    if (!contractAddress || !requiredSoulShardAmount) return;
    
    setIsApproving(true);
    approve({
      address: CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.soulShard as `0x${string}`,
      abi: [
        {
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          name: 'approve',
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable',
          type: 'function',
        }
      ],
      functionName: 'approve',
      args: [contractAddress, requiredSoulShardAmount],
    });
  };

  // 處理鑄造
  const handleMint = async () => {
    if (!contractAddress || !totalPlatformFee) return;
    
    setIsMinting(true);
    
    mint({
      address: contractAddress,
      abi: getABI(selectedType),
      functionName: 'mintFromWallet', // 修正：使用正確的函數名
      args: [BigInt(quantity)],
      value: totalPlatformFee, // 修正：value 是 BNB 平台費用
    });
  };

  // 快速選擇數量
  const quickSelectQuantity = (amount: number) => {
    setQuantity(amount);
  };

  if (!address) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">🔨 NFT 鑄造</h1>
            <p className="text-xl text-gray-400">請先連接錢包以開始鑄造</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">🔨 NFT 鑄造</h1>
        
        {/* NFT 類型選擇 */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">選擇 NFT 類型</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { type: 'hero' as NFTType, name: '英雄', icon: '⚔️', desc: '強大的戰鬥單位' },
              { type: 'relic' as NFTType, name: '聖物', icon: '💎', desc: '提供特殊能力' },
              { type: 'party' as NFTType, name: '隊伍', icon: '👥', desc: '組建探險隊伍' },
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => setSelectedType(item.type)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedType === item.type
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="text-3xl mb-2">{item.icon}</div>
                <div className="font-semibold">{item.name}</div>
                <div className="text-sm text-gray-400">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 鑄造界面 */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-6">鑄造設定</h2>
          
          {/* 數量選擇 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              鑄造數量
            </label>
            <div className="flex gap-2 mb-3">
              {[1, 5, 10, 20, 50].map((amount) => (
                <button
                  key={amount}
                  onClick={() => quickSelectQuantity(amount)}
                  className={`px-4 py-2 rounded-lg border transition-all ${
                    quantity === amount
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className="w-full p-3 border rounded-lg bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* 價格資訊 */}
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold mb-3">價格詳情</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">單價 (USD)</span>
                <span className="text-white">
                  {mintPriceUSD ? formatEther(mintPriceUSD) : '0'} USD
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">總價 (USD)</span>
                <span className="text-white">
                  {mintPriceUSD ? formatEther(mintPriceUSD * BigInt(quantity)) : '0'} USD
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">所需 SOUL</span>
                <span className="text-yellow-400 font-mono">
                  {requiredSoulShardAmount ? formatEther(requiredSoulShardAmount) : '0'} SOUL
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">平台費用 (BNB)</span>
                <span className="text-green-400 font-mono">
                  {totalPlatformFee ? formatEther(totalPlatformFee) : '0'} BNB
                </span>
              </div>
              {soulShardBalance && (
                <div className="flex justify-between">
                  <span className="text-gray-300">錢包餘額</span>
                  <span className="text-blue-400 font-mono">
                    {formatEther(soulShardBalance.value)} SOUL
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-4">
            {needsApproval ? (
              <button
                onClick={handleApprove}
                disabled={isApproving || isApprovingTx}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {isApproving || isApprovingTx ? '授權中...' : '授權 SOUL'}
              </button>
            ) : (
              <button
                onClick={handleMint}
                disabled={isMinting || isMintingTx}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {isMinting || isMintingTx ? '鑄造中...' : `鑄造 ${quantity} 個 ${selectedType === 'hero' ? '英雄' : selectedType === 'relic' ? '聖物' : '隊伍'}`}
              </button>
            )}
          </div>

          {/* 提示資訊 */}
          <div className="mt-4 text-sm text-gray-400">
            <p>• 鑄造需要支付 BNB 作為平台費用</p>
            <p>• 首次鑄造需要先授權 SOUL 代幣</p>
            <p>• 鑄造成功後 NFT 將直接發送到您的錢包</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MintPage;
