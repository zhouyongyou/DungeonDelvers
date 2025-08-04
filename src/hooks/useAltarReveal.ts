import { useEffect, useState, useCallback } from 'react';
import { useAccount, useBlockNumber, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAppToast } from '../contexts/SimpleToastContext';
import { getContractWithABI } from '../config/contractsWithABI';

interface UpgradeCommitment {
  blockNumber: bigint;
  tokenContract: `0x${string}`;
  baseRarity: number;        // 改為 baseRarity
  burnedTokenIds: bigint[];  // 改為 burnedTokenIds
  commitment: `0x${string}`;
  fulfilled: boolean;
  payment: bigint;
}

interface AltarRevealState {
  commitment: UpgradeCommitment | null;
  canReveal: boolean;
  canForceReveal: boolean;
  blocksUntilReveal: number;
  blocksUntilExpire: number;
  isLoading: boolean;
  error: Error | null;
}

interface UseAltarRevealReturn extends AltarRevealState {
  refetch: () => void;
  reveal: () => Promise<void>;
  forceReveal: (userAddress: `0x${string}`) => Promise<void>;
}

const REVEAL_BLOCK_DELAY = 3n;
const MAX_REVEAL_WINDOW = 255n;

export function useAltarReveal(
  userAddress?: `0x${string}`
): UseAltarRevealReturn {
  const { address: connectedAddress } = useAccount();
  const { data: blockNumber } = useBlockNumber({ 
    watch: true,
    query: {
      refetchInterval: 3000, // 每3秒檢查新區塊，BSC 平均 3 秒一個區塊
    }
  });
  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isWaiting } = useWaitForTransactionReceipt({ hash });
  const { showToast } = useAppToast();
  
  const [isRevealing, setIsRevealing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const address = userAddress || connectedAddress;
  const altarContract = getContractWithABI('ALTAROFASCENSION');

  // Read user commitment
  const { data: commitment, refetch: refetchCommitment } = useReadContract({
    address: altarContract?.address as `0x${string}`,
    abi: altarContract?.abi,
    functionName: 'userCommitments',
    args: address ? [address] : undefined,
    enabled: !!address && !!altarContract,
    query: {
      staleTime: 1000 * 10, // 10秒快取 - 與鑄造頁面一致
      gcTime: 1000 * 60 * 5, // 5分鐘垃圾回收
      refetchOnWindowFocus: true, // 視窗聚焦時刷新
      refetchInterval: 30000, // 每30秒自動刷新，與鑄造頁面一致
      retry: 3, // 失敗時重試3次
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // 指數退避
    },
  });

  // 解析合約返回的數組格式數據
  const parsedCommitment: UpgradeCommitment | null = commitment && Array.isArray(commitment) && commitment.length >= 6 ? {
    blockNumber: commitment[0] as bigint,
    tokenContract: commitment[1] as `0x${string}`,
    baseRarity: Number(commitment[2]),
    burnedTokenIds: [], // 從數組格式無法獲取，設為空數組
    commitment: commitment[3] as `0x${string}`,
    fulfilled: commitment[4] as boolean,
    payment: commitment[5] as bigint,
  } : null;

  // Read can reveal status from contract (like mint page does)
  const { data: canReveal, refetch: refetchCanReveal } = useReadContract({
    address: altarContract?.address as `0x${string}`,
    abi: altarContract?.abi,
    functionName: 'canReveal',
    args: address ? [address] : undefined,
    enabled: !!address && !!altarContract,
    query: {
      staleTime: 1000 * 5, // 5秒快取
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: true,
      refetchInterval: 15000, // 每15秒檢查
      retry: 2,
    },
  });

  // Read can force reveal status from contract
  const { data: canForceReveal, refetch: refetchCanForceReveal } = useReadContract({
    address: altarContract?.address as `0x${string}`,
    abi: altarContract?.abi,
    functionName: 'canForceReveal',
    args: address ? [address] : undefined,
    enabled: !!address && !!altarContract,
    query: {
      staleTime: 1000 * 5,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: true,
      refetchInterval: 15000,
      retry: 2,
    },
  });

  // Calculate blocks remaining
  const blocksUntilReveal = parsedCommitment && blockNumber && parsedCommitment.blockNumber > 0n
    ? Math.max(0, Number(parsedCommitment.blockNumber + REVEAL_BLOCK_DELAY - blockNumber))
    : 0;

  const blocksUntilExpire = parsedCommitment && blockNumber && parsedCommitment.blockNumber > 0n
    ? Math.max(0, Number(parsedCommitment.blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW - blockNumber))
    : 0;

  // 調試日誌 - 幫助診斷區塊延遲問題
  useEffect(() => {
    if (parsedCommitment && blockNumber) {
      console.log('[useAltarReveal] 升級狀態:', {
        rawCommitment: commitment,
        parsedCommitment,
        commitmentBlock: parsedCommitment.blockNumber?.toString(),
        currentBlock: blockNumber?.toString(),
        blocksUntilReveal,
        blocksUntilExpire,
        canReveal,
        canForceReveal,
        fulfilled: parsedCommitment.fulfilled,
        rarity: parsedCommitment.rarity,
        materialsCount: parsedCommitment.materialsCount,
        address,
      });
    }
  }, [commitment, parsedCommitment, blockNumber, blocksUntilReveal, blocksUntilExpire, canReveal, canForceReveal, address]);

  // Refetch all data
  const refetch = useCallback(() => {
    refetchCommitment();
    refetchCanReveal();
    refetchCanForceReveal();
  }, [refetchCommitment, refetchCanReveal, refetchCanForceReveal]);

  // Auto-refetch when transaction completes
  useEffect(() => {
    if (hash && !isWaiting) {
      refetch();
    }
  }, [hash, isWaiting, refetch]);

  // Reveal function
  const reveal = useCallback(async () => {
    if (!address || !canReveal || !altarContract) {
      showToast('無法揭示升級結果。請等待所需區塊。', 'error');
      return;
    }

    setIsRevealing(true);
    setError(null);

    try {
      await writeContract({
        address: altarContract.address as `0x${string}`,
        abi: altarContract.abi,
        functionName: 'revealUpgrade',
      });

      showToast('正在揭示升級結果...', 'success');
    } catch (err) {
      const error = err as Error;
      setError(error);
      showToast(`揭示失敗: ${error.message}`, 'error');
    } finally {
      setIsRevealing(false);
    }
  }, [address, canReveal, altarContract, writeContract, showToast]);

  // Force reveal function (for expired upgrades)
  const forceReveal = useCallback(async (targetAddress: `0x${string}`) => {
    if (!canForceReveal || !altarContract) {
      showToast('無法強制揭示。揭示視窗尚未過期。', 'error');
      return;
    }

    setIsRevealing(true);
    setError(null);

    try {
      await writeContract({
        address: altarContract.address as `0x${string}`,
        abi: altarContract.abi,
        functionName: 'forceRevealExpiredUpgrade',
        args: [targetAddress],
      });

      showToast('正在強制揭示過期的升級...', 'success');
    } catch (err) {
      const error = err as Error;
      setError(error);
      showToast(`強制揭示失敗: ${error.message}`, 'error');
    } finally {
      setIsRevealing(false);
    }
  }, [canForceReveal, altarContract, writeContract, showToast]);

  return {
    commitment: parsedCommitment,
    canReveal: !!canReveal,
    canForceReveal: !!canForceReveal,
    blocksUntilReveal,
    blocksUntilExpire,
    isLoading: isRevealing || isWaiting,
    error: error || writeError,
    refetch,
    reveal,
    forceReveal,
  };
}