import { useEffect, useState, useCallback } from 'react';
import { useAccount, useBlockNumber, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAppToast } from '../contexts/SimpleToastContext';
import { getContractWithABI } from '../config/contractsWithABI';

interface ExpeditionCommitment {
  blockNumber: bigint;
  partyId: bigint;
  dungeonId: bigint;
  player: `0x${string}`;
  commitment: `0x${string}`;
  fulfilled: boolean;
  payment: bigint;
}

interface DungeonRevealState {
  commitment: ExpeditionCommitment | null;
  canReveal: boolean;
  canForceReveal: boolean;
  blocksUntilReveal: number;
  blocksUntilExpire: number;
  isLoading: boolean;
  error: Error | null;
}

interface UseDungeonRevealReturn extends DungeonRevealState {
  refetch: () => void;
  reveal: () => Promise<void>;
  forceReveal: (userAddress: `0x${string}`) => Promise<void>;
  revealFor: (userAddress: `0x${string}`) => Promise<void>;
}

const REVEAL_BLOCK_DELAY = 3n;
const MAX_REVEAL_WINDOW = 255n;

export function useDungeonReveal(
  userAddress?: `0x${string}`
): UseDungeonRevealReturn {
  const { address: connectedAddress } = useAccount();
  const { data: blockNumber } = useBlockNumber({ 
    watch: true,
    query: {
      refetchInterval: 3000, // 每3秒檢查新區塊
    }
  });
  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isWaiting } = useWaitForTransactionReceipt({ hash });
  const { showToast } = useAppToast();
  
  const [isRevealing, setIsRevealing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const address = userAddress || connectedAddress;
  const dungeonMasterContract = getContractWithABI('DUNGEONMASTER');

  // Read user commitment
  const { data: commitment, refetch: refetchCommitment } = useReadContract({
    address: dungeonMasterContract?.address as `0x${string}`,
    abi: dungeonMasterContract?.abi,
    functionName: 'userCommitments',
    args: address ? [address] : undefined,
    enabled: !!address && !!dungeonMasterContract,
    query: {
      staleTime: 1000 * 2, // 2秒快取
      gcTime: 1000 * 60 * 5, // 5分鐘垃圾回收
      refetchOnWindowFocus: true, // 視窗聚焦時刷新
      refetchInterval: 5000, // 每5秒自動刷新
      retry: 3, // 失敗時重試3次
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  });

  // 解析合約返回的數組格式數據
  const parsedCommitment: ExpeditionCommitment | null = commitment && Array.isArray(commitment) && commitment.length >= 7 ? {
    blockNumber: commitment[0] as bigint,
    partyId: commitment[1] as bigint,
    dungeonId: commitment[2] as bigint,
    player: commitment[3] as `0x${string}`,
    commitment: commitment[4] as `0x${string}`,
    fulfilled: commitment[5] as boolean,
    payment: commitment[6] as bigint,
  } : null;

  // Read can reveal status from contract (like mint page does)
  const { data: canReveal, refetch: refetchCanReveal } = useReadContract({
    address: dungeonMasterContract?.address as `0x${string}`,
    abi: dungeonMasterContract?.abi,
    functionName: 'canReveal',
    args: address ? [address] : undefined,
    enabled: !!address && !!dungeonMasterContract,
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
    address: dungeonMasterContract?.address as `0x${string}`,
    abi: dungeonMasterContract?.abi,
    functionName: 'canForceReveal',
    args: address ? [address] : undefined,
    enabled: !!address && !!dungeonMasterContract,
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

  // 調試日誌 - 幫助診斷數據解析問題
  useEffect(() => {
    console.log('[useDungeonReveal] Raw data:', {
      rawCommitment: commitment,
      isArray: Array.isArray(commitment),
      length: commitment?.length,
      parsedCommitment,
      canReveal,
      canForceReveal,
      address,
    });
    
    if (parsedCommitment && blockNumber) {
      console.log('[useDungeonReveal] 探險狀態:', {
        commitmentBlock: parsedCommitment.blockNumber?.toString(),
        currentBlock: blockNumber?.toString(),
        blocksUntilReveal,
        blocksUntilExpire,
        fulfilled: parsedCommitment.fulfilled,
        partyId: parsedCommitment.partyId?.toString(),
        dungeonId: parsedCommitment.dungeonId?.toString(),
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
    if (!address || !canReveal || !dungeonMasterContract) {
      showToast('無法揭示探險結果。請等待所需區塊。', 'error');
      return;
    }

    setIsRevealing(true);
    setError(null);

    try {
      await writeContract({
        address: dungeonMasterContract.address as `0x${string}`,
        abi: dungeonMasterContract.abi,
        functionName: 'revealExpedition',
      });

      showToast('正在揭示探險結果...', 'success');
    } catch (err) {
      const error = err as Error;
      setError(error);
      showToast(`揭示失敗: ${error.message}`, 'error');
    } finally {
      setIsRevealing(false);
    }
  }, [address, canReveal, dungeonMasterContract, writeContract, showToast]);

  // Force reveal function (for expired expeditions)
  const forceReveal = useCallback(async (targetAddress: `0x${string}`) => {
    console.log('[useDungeonReveal] Force reveal called:', {
      targetAddress,
      canForceReveal,
      dungeonMasterContract: !!dungeonMasterContract,
      contractAddress: dungeonMasterContract?.address,
    });

    if (!canForceReveal || !dungeonMasterContract) {
      showToast('無法強制揭示。揭示視窗尚未過期。', 'error');
      return;
    }

    setIsRevealing(true);
    setError(null);

    try {
      console.log('[useDungeonReveal] Calling forceRevealExpired...');
      await writeContract({
        address: dungeonMasterContract.address as `0x${string}`,
        abi: dungeonMasterContract.abi,
        functionName: 'forceRevealExpired',
        args: [targetAddress],
      });

      showToast('正在強制揭示過期的探險...', 'success');
    } catch (err) {
      const error = err as Error;
      console.error('[useDungeonReveal] Force reveal error:', error);
      setError(error);
      showToast(`強制揭示失敗: ${error.message}`, 'error');
    } finally {
      setIsRevealing(false);
    }
  }, [canForceReveal, dungeonMasterContract, writeContract, showToast]);

  // Reveal for someone else
  const revealFor = useCallback(async (targetAddress: `0x${string}`) => {
    if (!dungeonMasterContract) {
      return;
    }

    setIsRevealing(true);
    setError(null);

    try {
      await writeContract({
        address: dungeonMasterContract.address as `0x${string}`,
        abi: dungeonMasterContract.abi,
        functionName: 'revealExpeditionFor',
        args: [targetAddress],
      });

      showToast('正在為用戶揭示探險結果...', 'success');
    } catch (err) {
      const error = err as Error;
      setError(error);
      showToast(`揭示失敗: ${error.message}`, 'error');
    } finally {
      setIsRevealing(false);
    }
  }, [dungeonMasterContract, writeContract, showToast]);

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
    revealFor,
  };
}