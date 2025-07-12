import { useAccount, useReadContract } from 'wagmi';
import { getContract } from '../config/contracts';
import { bsc } from 'wagmi/chains';

export const useVipStatus = () => {
  const { address, chainId } = useAccount();
  const soulShardContract = getContract(chainId === bsc.id ? chainId : bsc.id, 'soulShard');

  // 獲取 SoulShard 餘額
  const { data: soulShardBalance } = useReadContract({
    address: soulShardContract?.address,
    abi: soulShardContract?.abi,
    functionName: 'balanceOf',
    args: [address!],
    query: {
      enabled: !!address && !!soulShardContract && chainId === bsc.id,
    },
  });

  const isLoading = false;

  const refetchAll = () => {
    console.log('Refetching VIP data...');
  };

  // 模擬 VIP 數據（因為合約配置不完整）
  const mockVipData = {
    stakedAmount: 0n,
    stakedValueUSD: 0,
    tokenId: null,
    vipLevel: 0,
    taxReduction: 0,
    pendingUnstakeAmount: 0n,
    isCooldownOver: true,
    countdown: 0n,
    allowance: 0n,
  };

  return {
    isLoading,
    vipStakingContract: null,
    soulShardContract,
    soulShardBalance: soulShardBalance || 0n,
    ...mockVipData,
    refetchAll,
  };
}; 