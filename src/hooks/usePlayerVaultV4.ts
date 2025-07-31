// src/hooks/usePlayerVaultV4.ts
// Hook for new PlayerVault v4.0 features

import { useAccount, useReadContract } from 'wagmi';
import { bsc } from 'viem/chains';
import { getContractWithABI } from '../config/contractsWithABI';
import { useMemo } from 'react';

export const usePlayerVaultV4 = () => {
  const { address } = useAccount();
  const playerVaultContract = getContractWithABI('PLAYERVAULT');

  // Read player info (includes withdrawableBalance, lastWithdrawTimestamp, lastFreeWithdrawTimestamp)
  const { data: playerInfo, isLoading: isPlayerInfoLoading, refetch: refetchPlayerInfo } = useReadContract({
    address: playerVaultContract?.address,
    abi: playerVaultContract?.abi,
    functionName: 'playerInfo',
    args: address ? [address] : undefined,
    chainId: bsc.id,
    query: { enabled: !!address }
  });

  // Read commission balance (new feature)
  const { data: commissionBalance, isLoading: isCommissionLoading, refetch: refetchCommission } = useReadContract({
    address: playerVaultContract?.address,
    abi: playerVaultContract?.abi,
    functionName: 'getCommissionBalance',
    args: address ? [address] : undefined,
    chainId: bsc.id,
    query: { enabled: !!address }
  });

  // Read total commission paid
  const { data: totalCommissionPaid, refetch: refetchTotalCommission } = useReadContract({
    address: playerVaultContract?.address,
    abi: playerVaultContract?.abi,
    functionName: 'getTotalCommissionPaid',
    args: address ? [address] : undefined,
    chainId: bsc.id,
    query: { enabled: !!address }
  });

  // Create a function to get tax rate for specific amount
  const createTaxRateQuery = (amount: bigint) => {
    return useReadContract({
      address: playerVaultContract?.address,
      abi: playerVaultContract?.abi,
      functionName: 'getTaxRateForAmount',
      args: address && amount > 0n ? [address, amount] : undefined,
      chainId: bsc.id,
      query: { enabled: !!address && amount > 0n }
    });
  };

  // Parse player info
  const parsedPlayerInfo = useMemo(() => {
    if (!playerInfo) return null;
    
    return {
      withdrawableBalance: playerInfo[0] as bigint,
      lastWithdrawTimestamp: Number(playerInfo[1] as bigint),
      lastFreeWithdrawTimestamp: Number(playerInfo[2] as bigint),
      referrer: playerInfo[3] as string
    };
  }, [playerInfo]);

  // Refetch all data
  const refetchAll = async () => {
    await Promise.all([
      refetchPlayerInfo(),
      refetchCommission(),
      refetchTotalCommission()
    ]);
  };

  return {
    // Basic info
    playerInfo: parsedPlayerInfo,
    isLoading: isPlayerInfoLoading,
    
    // Balances
    withdrawableBalance: parsedPlayerInfo?.withdrawableBalance || 0n,
    commissionBalance: commissionBalance || 0n,
    totalCommissionPaid: totalCommissionPaid || 0n,
    
    // Loading states
    isCommissionLoading,
    
    // Functions
    createTaxRateQuery,
    refetchAll,
    refetchPlayerInfo,
    refetchCommission,
    refetchTotalCommission,
    
    // Contract info
    playerVaultContract
  };
};

export default usePlayerVaultV4;