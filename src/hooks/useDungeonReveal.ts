import { useEffect, useState, useCallback } from 'react';
import { useAccount, useBlockNumber, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Address } from 'viem';
import { useAppToast } from '../contexts/SimpleToastContext';
import { getContractWithABI } from '../config/contractsWithABI';

interface ExpeditionCommitment {
  blockNumber: bigint;
  partyId: bigint;
  dungeonId: bigint;
  player: Address;
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
  forceReveal: (userAddress: Address) => Promise<void>;
  revealFor: (userAddress: Address) => Promise<void>;
}

const REVEAL_BLOCK_DELAY = 3n;
const MAX_REVEAL_WINDOW = 255n;

export function useDungeonReveal(
  userAddress?: Address
): UseDungeonRevealReturn {
  const { address: connectedAddress } = useAccount();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isWaiting } = useWaitForTransactionReceipt({ hash });
  const { showToast } = useAppToast();
  
  const [isRevealing, setIsRevealing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const address = userAddress || connectedAddress;
  const dungeonMasterContract = getContractWithABI('DUNGEONMASTER');

  // Read user commitment
  const { data: commitment, refetch: refetchCommitment } = useReadContract({
    address: dungeonMasterContract?.address as Address,
    abi: dungeonMasterContract?.abi,
    functionName: 'userCommitments',
    args: address ? [address] : undefined,
    enabled: !!address && !!dungeonMasterContract,
  });

  // Calculate reveal status
  const canReveal = commitment && blockNumber && 
    (commitment as ExpeditionCommitment).blockNumber > 0n &&
    !(commitment as ExpeditionCommitment).fulfilled &&
    blockNumber >= (commitment as ExpeditionCommitment).blockNumber + REVEAL_BLOCK_DELAY &&
    blockNumber <= (commitment as ExpeditionCommitment).blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW;

  const canForceReveal = commitment && blockNumber &&
    (commitment as ExpeditionCommitment).blockNumber > 0n &&
    !(commitment as ExpeditionCommitment).fulfilled &&
    blockNumber > (commitment as ExpeditionCommitment).blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW;

  // Calculate blocks remaining
  const blocksUntilReveal = commitment && blockNumber && (commitment as ExpeditionCommitment).blockNumber > 0n
    ? Math.max(0, Number((commitment as ExpeditionCommitment).blockNumber + REVEAL_BLOCK_DELAY - blockNumber))
    : 0;

  const blocksUntilExpire = commitment && blockNumber && (commitment as ExpeditionCommitment).blockNumber > 0n
    ? Math.max(0, Number((commitment as ExpeditionCommitment).blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW - blockNumber))
    : 0;

  // Refetch all data
  const refetch = useCallback(() => {
    refetchCommitment();
  }, [refetchCommitment]);

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
        address: dungeonMasterContract.address as Address,
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
  const forceReveal = useCallback(async (targetAddress: Address) => {
    if (!canForceReveal || !dungeonMasterContract) {
      showToast('無法強制揭示。揭示視窗尚未過期。', 'error');
      return;
    }

    setIsRevealing(true);
    setError(null);

    try {
      await writeContract({
        address: dungeonMasterContract.address as Address,
        abi: dungeonMasterContract.abi,
        functionName: 'forceRevealExpiredExpedition',
        args: [targetAddress],
      });

      showToast('正在強制揭示過期的探險...', 'success');
    } catch (err) {
      const error = err as Error;
      setError(error);
      showToast(`強制揭示失敗: ${error.message}`, 'error');
    } finally {
      setIsRevealing(false);
    }
  }, [canForceReveal, dungeonMasterContract, writeContract]);

  // Reveal for someone else
  const revealFor = useCallback(async (targetAddress: Address) => {
    if (!dungeonMasterContract) {
      return;
    }

    setIsRevealing(true);
    setError(null);

    try {
      await writeContract({
        address: dungeonMasterContract.address as Address,
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
  }, [dungeonMasterContract, writeContract]);

  return {
    commitment: commitment as ExpeditionCommitment | null,
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