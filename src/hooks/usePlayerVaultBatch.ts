// src/hooks/usePlayerVaultBatch.ts
// 批次獲取 PlayerVault 合約數據，優化 RPC 請求頻率

import { useMemo } from 'react';
import { useReadContracts, useAccount } from 'wagmi';
import { getContractWithABI } from '../config/contractsWithABI';
import { bsc } from 'wagmi/chains';
import type { Address } from 'viem';

interface PlayerVaultBatchData {
  standardInitialRate: bigint;
  largeWithdrawInitialRate: bigint;
  freeWithdrawThresholdUSD: bigint;
  largeWithdrawThresholdUSD: bigint;
  decreaseRatePerPeriod: bigint;
  periodDuration: bigint;
  playerInfo: readonly [bigint, bigint]; // [balance, lastWithdrawTimestamp]
}

export function usePlayerVaultBatch() {
  const { address } = useAccount();
  const playerVaultContract = getContractWithABI('PLAYERVAULT');

  // 構建批次合約調用
  const contracts = useMemo(() => {
    if (!playerVaultContract || !address) return [];

    const baseContract = {
      address: playerVaultContract.address as Address,
      abi: playerVaultContract.abi,
      chainId: bsc.id,
    };

    return [
      // 稅率參數
      { ...baseContract, functionName: 'standardInitialRate' },
      { ...baseContract, functionName: 'largeWithdrawInitialRate' },
      { ...baseContract, functionName: 'freeWithdrawThresholdUSD' },
      { ...baseContract, functionName: 'largeWithdrawThresholdUSD' },
      { ...baseContract, functionName: 'decreaseRatePerPeriod' },
      { ...baseContract, functionName: 'periodDuration' },
      // 玩家特定數據
      { ...baseContract, functionName: 'playerInfo', args: [address] },
    ];
  }, [playerVaultContract, address]);

  // 批次調用
  const { data, isLoading, isError, error, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
      staleTime: 30 * 1000, // 30秒緩存
      gcTime: 2 * 60 * 1000, // 2分鐘垃圾回收
    },
  });

  // 解析結果
  const parsedData = useMemo((): Partial<PlayerVaultBatchData> => {
    if (!data || data.length !== 7) return {};

    const results: Partial<PlayerVaultBatchData> = {};

    try {
      // 稅率參數
      if (data[0]?.status === 'success') {
        results.standardInitialRate = data[0].result as bigint;
      }
      if (data[1]?.status === 'success') {
        results.largeWithdrawInitialRate = data[1].result as bigint;
      }
      if (data[2]?.status === 'success') {
        results.freeWithdrawThresholdUSD = data[2].result as bigint;
      }
      if (data[3]?.status === 'success') {
        results.largeWithdrawThresholdUSD = data[3].result as bigint;
      }
      if (data[4]?.status === 'success') {
        results.decreaseRatePerPeriod = data[4].result as bigint;
      }
      if (data[5]?.status === 'success') {
        results.periodDuration = data[5].result as bigint;
      }
      
      // 玩家數據
      if (data[6]?.status === 'success') {
        results.playerInfo = data[6].result as readonly [bigint, bigint];
      }
    } catch (error) {
      console.error('解析 PlayerVault 批次數據失敗:', error);
    }

    return results;
  }, [data]);

  // 計算稅率的輔助函數
  const calculateTaxRates = useMemo(() => {
    if (!parsedData.standardInitialRate || !parsedData.largeWithdrawInitialRate || 
        !parsedData.decreaseRatePerPeriod || !parsedData.periodDuration || 
        !parsedData.playerInfo) {
      return null;
    }

    const standardBaseTaxRate = Number(parsedData.standardInitialRate) / 100;
    const largeBaseTaxRate = Number(parsedData.largeWithdrawInitialRate) / 100;
    const lastWithdrawTimestamp = Number(parsedData.playerInfo[1]);
    const currentTime = Math.floor(Date.now() / 1000);
    
    return {
      standardBaseTaxRate,
      largeBaseTaxRate,
      lastWithdrawTimestamp,
      timeSinceLastWithdraw: currentTime - lastWithdrawTimestamp,
    };
  }, [parsedData]);

  return {
    data: parsedData,
    isLoading,
    isError,
    error,
    refetch,
    taxRates: calculateTaxRates,
    
    // 直接提供常用的值
    balance: parsedData.playerInfo?.[0] ?? 0n,
    lastWithdrawTimestamp: parsedData.playerInfo?.[1] ?? 0n,
    freeThresholdUSD: parsedData.freeWithdrawThresholdUSD ?? 0n,
    largeThresholdUSD: parsedData.largeWithdrawThresholdUSD ?? 0n,
  };
}