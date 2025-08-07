// Fixed version of marketplace V2 hook with proper error handling
import { useState, useCallback } from 'react';
import { 
  useAccount, 
  useWriteContract, 
  usePublicClient,
  useWalletClient 
} from 'wagmi';
import { 
  parseUnits, 
  type Address,
  type Hash,
  encodeFunctionData,
  decodeFunctionResult
} from 'viem';
import { useAppToast } from '../contexts/SimpleToastContext';
import {  HERO, RELIC, PARTY  } from '../config/env-contracts';
import { DUNGEONMARKETPLACE_V2, SUPPORTED_STABLECOINS } from '../config/marketplace';
import marketplaceV2Abi from '../abis/DungeonMarketplaceV2.json';
import type { HeroNft, RelicNft, PartyNft } from '../types/nft';

export type StablecoinSymbol = keyof typeof SUPPORTED_STABLECOINS;

// NFT contract mapping
const NFT_CONTRACTS = {
  0: HERO,
  1: RELIC,
  2: PARTY
} as const;

// Standard ERC20 ABI for approval
const ERC20_ABI = [
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Standard ERC721 ABI for approval
const ERC721_ABI = [
  {
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' }
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'operator', type: 'address' }
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

export function useMarketplaceV2Fixed() {
  const { address } = useAccount();
  const { showToast } = useAppToast();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // Safe contract read helper
  const safeReadContract = useCallback(async <T,>(
    contractAddress: `0x${string}`,
    abi: any,
    functionName: string,
    args?: any[]
  ): Promise<T | null> => {
    if (!publicClient) {
      console.error('Public client not available');
      return null;
    }
    
    try {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName,
        args: args || []
      });
      return result as T;
    } catch (error) {
      console.error(`Error reading ${functionName}:`, error);
      return null;
    }
  }, [publicClient]);

  // Check if NFT is approved for marketplace
  const checkNFTApproval = useCallback(async (
    nftContract: `0x${string}`,
    owner: `0x${string}`
  ): Promise<boolean> => {
    const result = await safeReadContract<boolean>(
      nftContract,
      ERC721_ABI,
      'isApprovedForAll',
      [owner, DUNGEONMARKETPLACE_V2]
    );
    return result || false;
  }, [safeReadContract]);

  // Check token allowance
  const checkTokenAllowance = useCallback(async (
    tokenAddress: `0x${string}`,
    owner: `0x${string}`,
    spender: `0x${string}`
  ): Promise<bigint> => {
    const result = await safeReadContract<bigint>(
      tokenAddress,
      ERC20_ABI,
      'allowance',
      [owner, spender]
    );
    return result || 0n;
  }, [safeReadContract]);

  // Check token balance
  const checkTokenBalance = useCallback(async (
    tokenAddress: `0x${string}`,
    owner: `0x${string}`
  ): Promise<bigint> => {
    const result = await safeReadContract<bigint>(
      tokenAddress,
      ERC20_ABI,
      'balanceOf',
      [owner]
    );
    return result || 0n;
  }, [safeReadContract]);

  // Safe transaction wait helper
  const waitForTransaction = useCallback(async (hash: Hash) => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }
    
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash,
        confirmations: 1 
      });
      return receipt;
    } catch (error) {
      console.error('Transaction wait error:', error);
      throw error;
    }
  }, [publicClient]);

  // Approve NFT for marketplace
  const approveNFT = useCallback(async (nftContract: `0x${string}`) => {
    if (!address) {
      showToast('請先連接錢包', 'error');
      return false;
    }

    setIsProcessing(true);
    try {
      const hash = await writeContractAsync({
        address: nftContract,
        abi: ERC721_ABI,
        functionName: 'setApprovalForAll',
        args: [DUNGEONMARKETPLACE_V2, true]
      });

      showToast('NFT 授權交易已發送', 'info');
      
      const receipt = await waitForTransaction(hash);
      
      if (receipt.status === 'success') {
        showToast('NFT 授權成功！', 'success');
        return true;
      } else {
        showToast('NFT 授權失敗', 'error');
        return false;
      }
    } catch (error: any) {
      console.error('NFT approval error:', error);
      showToast(error.message || 'NFT 授權失敗', 'error');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [address, writeContractAsync, showToast, waitForTransaction]);

  // Approve token for spending
  const approveToken = useCallback(async (
    tokenAddress: `0x${string}`,
    amount: bigint
  ) => {
    if (!address) {
      showToast('請先連接錢包', 'error');
      return false;
    }

    setIsProcessing(true);
    try {
      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [DUNGEONMARKETPLACE_V2, amount]
      });

      showToast('代幣授權交易已發送', 'info');
      
      const receipt = await waitForTransaction(hash);
      
      if (receipt.status === 'success') {
        showToast('代幣授權成功！', 'success');
        return true;
      } else {
        showToast('代幣授權失敗', 'error');
        return false;
      }
    } catch (error: any) {
      console.error('Token approval error:', error);
      showToast(error.message || '代幣授權失敗', 'error');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [address, writeContractAsync, showToast, waitForTransaction]);

  // Create listing with multiple accepted tokens
  const createListing = useCallback(async (
    nft: HeroNft | RelicNft | PartyNft,
    priceInUSD: string,
    acceptedTokens: StablecoinSymbol[]
  ) => {
    if (!address) {
      showToast('請先連接錢包', 'error');
      return false;
    }

    if (acceptedTokens.length === 0) {
      showToast('請至少選擇一種接受的支付幣種', 'error');
      return false;
    }

    setIsProcessing(true);
    try {
      // Get NFT contract address
      const nftContract = NFT_CONTRACTS[nft.nftType as 0 | 1 | 2];
      
      // Check NFT approval
      const isApproved = await checkNFTApproval(nftContract, address);
      if (!isApproved) {
        showToast('需要先授權 NFT', 'info');
        const approved = await approveNFT(nftContract);
        if (!approved) return false;
      }

      // Convert price to wei (18 decimals)
      const priceWei = parseUnits(priceInUSD, 18);
      
      // Get accepted token addresses
      const acceptedTokenAddresses = acceptedTokens.map(
        symbol => SUPPORTED_STABLECOINS[symbol].address
      );

      // Create listing
      const hash = await writeContractAsync({
        address: DUNGEONMARKETPLACE_V2,
        abi: marketplaceV2Abi,
        functionName: 'createListing',
        args: [
          nft.nftType,
          nftContract,
          BigInt(nft.tokenId),
          priceWei,
          acceptedTokenAddresses
        ]
      });

      showToast('掛單交易已發送', 'info');
      
      const receipt = await waitForTransaction(hash);
      
      if (receipt.status === 'success') {
        showToast('NFT 掛單成功！', 'success');
        return true;
      } else {
        showToast('掛單失敗', 'error');
        return false;
      }
    } catch (error: any) {
      console.error('Create listing error:', error);
      showToast(error.message || '掛單失敗', 'error');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [address, writeContractAsync, showToast, checkNFTApproval, approveNFT, waitForTransaction]);

  // Purchase NFT with selected token
  const purchaseNFT = useCallback(async (
    listingId: string,
    priceInUSD: string,
    paymentToken: StablecoinSymbol
  ) => {
    if (!address) {
      showToast('請先連接錢包', 'error');
      return false;
    }

    setIsProcessing(true);
    try {
      const tokenInfo = SUPPORTED_STABLECOINS[paymentToken];
      const priceWei = parseUnits(priceInUSD, 18);
      
      // Check token balance
      const balance = await checkTokenBalance(tokenInfo.address, address);
      if (balance < priceWei) {
        showToast(`${tokenInfo.symbol} 餘額不足`, 'error');
        return false;
      }

      // Check token allowance
      const allowance = await checkTokenAllowance(
        tokenInfo.address,
        address,
        DUNGEONMARKETPLACE_V2
      );
      
      if (allowance < priceWei) {
        showToast(`需要先授權 ${tokenInfo.symbol}`, 'info');
        const approved = await approveToken(tokenInfo.address, priceWei);
        if (!approved) return false;
      }

      // Purchase NFT
      const hash = await writeContractAsync({
        address: DUNGEONMARKETPLACE_V2,
        abi: marketplaceV2Abi,
        functionName: 'purchaseNFT',
        args: [BigInt(listingId), tokenInfo.address]
      });

      showToast('購買交易已發送', 'info');
      
      const receipt = await waitForTransaction(hash);
      
      if (receipt.status === 'success') {
        showToast('購買成功！', 'success');
        return true;
      } else {
        showToast('購買失敗', 'error');
        return false;
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      showToast(error.message || '購買失敗', 'error');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [address, writeContractAsync, showToast, checkTokenBalance, checkTokenAllowance, approveToken, waitForTransaction]);

  // Cancel listing
  const cancelListing = useCallback(async (listingId: string) => {
    if (!address) {
      showToast('請先連接錢包', 'error');
      return false;
    }

    setIsProcessing(true);
    try {
      const hash = await writeContractAsync({
        address: DUNGEONMARKETPLACE_V2,
        abi: marketplaceV2Abi,
        functionName: 'cancelListing',
        args: [BigInt(listingId)]
      });

      showToast('取消掛單交易已發送', 'info');
      
      const receipt = await waitForTransaction(hash);
      
      if (receipt.status === 'success') {
        showToast('掛單已取消', 'success');
        return true;
      } else {
        showToast('取消失敗', 'error');
        return false;
      }
    } catch (error: any) {
      console.error('Cancel listing error:', error);
      showToast(error.message || '取消失敗', 'error');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [address, writeContractAsync, showToast, waitForTransaction]);

  // Update listing price
  const updateListingPrice = useCallback(async (
    listingId: string,
    newPriceInUSD: string
  ) => {
    if (!address) {
      showToast('請先連接錢包', 'error');
      return false;
    }

    setIsProcessing(true);
    try {
      const priceWei = parseUnits(newPriceInUSD, 18);
      
      const hash = await writeContractAsync({
        address: DUNGEONMARKETPLACE_V2,
        abi: marketplaceV2Abi,
        functionName: 'updateListingPrice',
        args: [BigInt(listingId), priceWei]
      });

      showToast('更新價格交易已發送', 'info');
      
      const receipt = await waitForTransaction(hash);
      
      if (receipt.status === 'success') {
        showToast('價格更新成功', 'success');
        return true;
      } else {
        showToast('更新失敗', 'error');
        return false;
      }
    } catch (error: any) {
      console.error('Update price error:', error);
      showToast(error.message || '更新失敗', 'error');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [address, writeContractAsync, showToast, waitForTransaction]);

  // Update accepted tokens for listing
  const updateListingTokens = useCallback(async (
    listingId: string,
    acceptedTokens: StablecoinSymbol[]
  ) => {
    if (!address) {
      showToast('請先連接錢包', 'error');
      return false;
    }

    if (acceptedTokens.length === 0) {
      showToast('請至少選擇一種接受的支付幣種', 'error');
      return false;
    }

    setIsProcessing(true);
    try {
      const acceptedTokenAddresses = acceptedTokens.map(
        symbol => SUPPORTED_STABLECOINS[symbol].address
      );
      
      const hash = await writeContractAsync({
        address: DUNGEONMARKETPLACE_V2,
        abi: marketplaceV2Abi,
        functionName: 'updateListingTokens',
        args: [BigInt(listingId), acceptedTokenAddresses]
      });

      showToast('更新接受幣種交易已發送', 'info');
      
      const receipt = await waitForTransaction(hash);
      
      if (receipt.status === 'success') {
        showToast('接受幣種更新成功', 'success');
        return true;
      } else {
        showToast('更新失敗', 'error');
        return false;
      }
    } catch (error: any) {
      console.error('Update tokens error:', error);
      showToast(error.message || '更新失敗', 'error');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [address, writeContractAsync, showToast, waitForTransaction]);

  return {
    createListing,
    purchaseNFT,
    cancelListing,
    updateListingPrice,
    updateListingTokens,
    checkNFTApproval,
    checkTokenAllowance,
    checkTokenBalance,
    approveNFT,
    approveToken,
    isProcessing
  };
}