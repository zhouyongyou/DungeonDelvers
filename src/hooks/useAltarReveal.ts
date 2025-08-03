import { useEffect, useState, useCallback } from 'react';
import { useAccount, useBlockNumber, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAppToast } from '../contexts/SimpleToastContext';
import { getContractWithABI } from '../config/contractsWithABI';

interface UpgradeCommitment {
  blockNumber: bigint;
  tokenContract: `0x${string}`;
  rarity: number;
  materialsCount: number;
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
  const { data: blockNumber } = useBlockNumber({ watch: true });
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
  });

  // Calculate reveal status
  const canReveal = commitment && blockNumber && 
    (commitment as UpgradeCommitment).blockNumber > 0n &&
    !(commitment as UpgradeCommitment).fulfilled &&
    blockNumber >= (commitment as UpgradeCommitment).blockNumber + REVEAL_BLOCK_DELAY &&
    blockNumber <= (commitment as UpgradeCommitment).blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW;

  const canForceReveal = commitment && blockNumber &&
    (commitment as UpgradeCommitment).blockNumber > 0n &&
    !(commitment as UpgradeCommitment).fulfilled &&
    blockNumber > (commitment as UpgradeCommitment).blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW;

  // Calculate blocks remaining
  const blocksUntilReveal = commitment && blockNumber && (commitment as UpgradeCommitment).blockNumber > 0n
    ? Math.max(0, Number((commitment as UpgradeCommitment).blockNumber + REVEAL_BLOCK_DELAY - blockNumber))
    : 0;

  const blocksUntilExpire = commitment && blockNumber && (commitment as UpgradeCommitment).blockNumber > 0n
    ? Math.max(0, Number((commitment as UpgradeCommitment).blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW - blockNumber))
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
    commitment: commitment as UpgradeCommitment | null,
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