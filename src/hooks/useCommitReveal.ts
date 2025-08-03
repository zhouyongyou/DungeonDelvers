import { useEffect, useState, useCallback } from 'react';
import { useAccount, useBlockNumber, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAppToast } from '../contexts/SimpleToastContext';
import { CONTRACTS } from '../config/contracts';
import HERO_ABI from '../abis/Hero.json';
import RELIC_ABI from '../abis/Relic.json';

interface MintCommitment {
  blockNumber: bigint;
  quantity: bigint;
  payment: bigint;
  commitment: `0x${string}`;
  fulfilled: boolean;
  maxRarity: number;
  fromVault: boolean;
}

interface CommitRevealState {
  commitment: MintCommitment | null;
  pendingTokens: bigint[];
  canReveal: boolean;
  canForceReveal: boolean;
  blocksUntilReveal: number;
  blocksUntilExpire: number;
  isLoading: boolean;
  error: Error | null;
}

interface UseCommitRevealReturn extends CommitRevealState {
  refetch: () => void;
  reveal: () => Promise<void>;
  forceReveal: (userAddress: `0x${string}`) => Promise<void>;
  revealFor: (userAddress: `0x${string}`) => Promise<void>;
}

const REVEAL_BLOCK_DELAY = 3n;
const MAX_REVEAL_WINDOW = 255n;

export function useCommitReveal(
  contractType: 'hero' | 'relic',
  userAddress?: `0x${string}`
): UseCommitRevealReturn {
  const { address: connectedAddress } = useAccount();
  const { data: blockNumber } = useBlockNumber({ 
    watch: true,
    query: {
      refetchInterval: 3000, // 每3秒更新一次區塊號（BSC 約 3 秒一個區塊）
    }
  });
  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isWaiting } = useWaitForTransactionReceipt({ hash });
  const { showToast } = useAppToast();
  
  const [isRevealing, setIsRevealing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const address = userAddress || connectedAddress;
  const contractAddress = contractType === 'hero' ? CONTRACTS[56].HERO : CONTRACTS[56].RELIC;
  const abi = contractType === 'hero' ? HERO_ABI : RELIC_ABI;

  // Read user commitment
  const { data: commitment, refetch: refetchCommitment } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'getUserCommitment',
    args: address ? [address] : undefined,
    enabled: !!address,
    query: {
      staleTime: 1000 * 10, // 10秒快取 - commitment 狀態更新頻繁
      gcTime: 1000 * 60 * 5, // 5分鐘垃圾回收
      refetchOnWindowFocus: true, // 視窗聚焦時刷新
      refetchInterval: 10000, // 每10秒自動刷新 - 鑄造後能更快檢測到新承諾
      retry: 3, // 失敗時重試3次
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // 指數退避
    },
  });

  // Read pending tokens
  const { data: pendingTokens, refetch: refetchTokens } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'getUserPendingTokens',
    args: address ? [address] : undefined,
    enabled: !!address,
    query: {
      staleTime: 1000 * 15, // 15秒快取
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: true,
      refetchInterval: 30000,
      retry: 2,
    },
  });

  // Read can reveal status
  const { data: canReveal, refetch: refetchCanReveal } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'canReveal',
    args: address ? [address] : undefined,
    enabled: !!address,
    query: {
      staleTime: 1000 * 5, // 5秒快取 - 狀態變化快
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: true,
      refetchInterval: 15000, // 更頻繁檢查
      retry: 2,
    },
  });

  // Read can force reveal status
  const { data: canForceReveal, refetch: refetchCanForceReveal } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'canForceReveal',
    args: address ? [address] : undefined,
    enabled: !!address,
    query: {
      staleTime: 1000 * 5, // 5秒快取
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: true,
      refetchInterval: 15000,
      retry: 2,
    },
  });

  // Calculate blocks remaining
  const blocksUntilReveal = commitment && blockNumber && commitment.blockNumber > 0n
    ? Math.max(0, Number(commitment.blockNumber + REVEAL_BLOCK_DELAY - blockNumber))
    : 0;

  const blocksUntilExpire = commitment && blockNumber && commitment.blockNumber > 0n
    ? Math.max(0, Number(commitment.blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW - blockNumber))
    : 0;

  // 調試日志 - 僅在開發環境且有重要變化時記錄
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && commitment && blockNumber && commitment.blockNumber > 0n) {
      const elapsedBlocks = Number(blockNumber - commitment.blockNumber);
      const totalBlocks = Number(REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW);
      console.log(`[useCommitReveal] ${contractType} 區塊進度:`, {
        承諾區塊: commitment.blockNumber.toString(),
        當前區塊: blockNumber.toString(),
        已過區塊: elapsedBlocks,
        剩餘揭示: blocksUntilReveal,
        剩餘過期: blocksUntilExpire,
        總區塊數: totalBlocks,
        應顯示: `${blocksUntilExpire}/${totalBlocks}`
      });
    }
  }, [commitment, blockNumber, contractType, blocksUntilReveal, blocksUntilExpire]);

  // Refetch all data
  const refetch = useCallback(() => {
    refetchCommitment();
    refetchTokens();
    refetchCanReveal();
    refetchCanForceReveal();
  }, [refetchCommitment, refetchTokens, refetchCanReveal, refetchCanForceReveal]);

  // Auto-refetch when transaction completes
  useEffect(() => {
    if (hash && !isWaiting) {
      refetch();
    }
  }, [hash, isWaiting, refetch]);

  // Reveal function
  const reveal = useCallback(async () => {
    if (!address || !canReveal) {
      showToast('Cannot reveal yet. Please wait for the required blocks.', 'error');
      return;
    }

    setIsRevealing(true);
    setError(null);

    try {
      await writeContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: 'revealMint',
      });

      showToast('Revealing your NFTs...', 'success');
    } catch (err) {
      const error = err as Error;
      setError(error);
      showToast(`Reveal failed: ${error.message}`, 'error');
    } finally {
      setIsRevealing(false);
    }
  }, [address, canReveal, contractAddress, abi, writeContract, showToast]);

  // Force reveal function (for expired mints)
  const forceReveal = useCallback(async (targetAddress: `0x${string}`) => {
    if (!canForceReveal) {
      showToast('Cannot force reveal yet. The reveal window has not expired.', 'error');
      return;
    }

    setIsRevealing(true);
    setError(null);

    try {
      await writeContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: 'forceRevealExpired',
        args: [targetAddress],
      });

      showToast('Force revealing expired NFTs...', 'success');
    } catch (err) {
      const error = err as Error;
      setError(error);
      showToast(`Force reveal failed: ${error.message}`, 'error');
    } finally {
      setIsRevealing(false);
    }
  }, [canForceReveal, contractAddress, abi, writeContract, showToast]);

  // Reveal for someone else
  const revealFor = useCallback(async (targetAddress: `0x${string}`) => {
    setIsRevealing(true);
    setError(null);

    try {
      await writeContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: 'revealMintFor',
        args: [targetAddress],
      });

      showToast('Revealing NFTs for user...', 'success');
    } catch (err) {
      const error = err as Error;
      setError(error);
      showToast(`Reveal failed: ${error.message}`, 'error');
    } finally {
      setIsRevealing(false);
    }
  }, [contractAddress, abi, writeContract, showToast]);

  return {
    commitment: commitment as MintCommitment | null,
    pendingTokens: (pendingTokens as bigint[]) || [],
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