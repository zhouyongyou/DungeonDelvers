import { useEffect, useState, useCallback } from 'react';
import { useAccount, useBlockNumber, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Address } from 'viem';
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
  forceReveal: (userAddress: Address) => Promise<void>;
  revealFor: (userAddress: Address) => Promise<void>;
}

const REVEAL_BLOCK_DELAY = 3n;
const MAX_REVEAL_WINDOW = 255n;

export function useCommitReveal(
  contractType: 'hero' | 'relic',
  userAddress?: Address
): UseCommitRevealReturn {
  const { address: connectedAddress } = useAccount();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isWaiting } = useWaitForTransactionReceipt({ hash });
  const { showToast } = useAppToast();
  
  const [isRevealing, setIsRevealing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const address = userAddress || connectedAddress;
  const contractAddress = contractType === 'hero' ? CONTRACTS.HERO_ADDRESS : CONTRACTS.RELIC_ADDRESS;
  const abi = contractType === 'hero' ? HERO_ABI : RELIC_ABI;

  // Read user commitment
  const { data: commitment, refetch: refetchCommitment } = useReadContract({
    address: contractAddress as Address,
    abi,
    functionName: 'getUserCommitment',
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  // Read pending tokens
  const { data: pendingTokens, refetch: refetchTokens } = useReadContract({
    address: contractAddress as Address,
    abi,
    functionName: 'getUserPendingTokens',
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  // Read can reveal status
  const { data: canReveal, refetch: refetchCanReveal } = useReadContract({
    address: contractAddress as Address,
    abi,
    functionName: 'canReveal',
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  // Read can force reveal status
  const { data: canForceReveal, refetch: refetchCanForceReveal } = useReadContract({
    address: contractAddress as Address,
    abi,
    functionName: 'canForceReveal',
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  // Calculate blocks remaining
  const blocksUntilReveal = commitment && blockNumber && commitment.blockNumber > 0n
    ? Math.max(0, Number(commitment.blockNumber + REVEAL_BLOCK_DELAY - blockNumber))
    : 0;

  const blocksUntilExpire = commitment && blockNumber && commitment.blockNumber > 0n
    ? Math.max(0, Number(commitment.blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW - blockNumber))
    : 0;

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
        address: contractAddress as Address,
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
  const forceReveal = useCallback(async (targetAddress: Address) => {
    if (!canForceReveal) {
      showToast('Cannot force reveal yet. The reveal window has not expired.', 'error');
      return;
    }

    setIsRevealing(true);
    setError(null);

    try {
      await writeContract({
        address: contractAddress as Address,
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
  const revealFor = useCallback(async (targetAddress: Address) => {
    setIsRevealing(true);
    setError(null);

    try {
      await writeContract({
        address: contractAddress as Address,
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