// src/hooks/useMarketplaceV2Contract.ts
// Multi-currency marketplace contract hooks

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, type Address } from 'viem';
import { useAppToast } from '../contexts/SimpleToastContext';
import { DUNGEONMARKETPLACE_V2, OFFERSYSTEM_V2, USDT, BUSD, USD1, HERO, RELIC, PARTY } from '../config/contracts';
import marketplaceV2Abi from '../abis/DungeonMarketplaceV2.json';
import offerSystemV2Abi from '../abis/OfferSystemV2.json';
import erc20Abi from '../abis/ERC20.json';
import erc721Abi from '../abis/ERC721.json';
import type { HeroNft, RelicNft, PartyNft, NftType } from '../types/nft';

// Supported stablecoins
export const SUPPORTED_STABLECOINS = {
  USDT: {
    address: USDT,
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 18,
    icon: '💵'
  },
  BUSD: {
    address: BUSD,
    symbol: 'BUSD', 
    name: 'Binance USD',
    decimals: 18,
    icon: '💰'
  },
  USD1: {
    address: USD1,
    symbol: 'USD1',
    name: 'USD1',
    decimals: 18,
    icon: '🪙'
  }
} as const;

export type StablecoinSymbol = keyof typeof SUPPORTED_STABLECOINS;

// NFT contract mapping
const NFT_CONTRACTS = {
  0: HERO,  // HERO
  1: RELIC, // RELIC
  2: PARTY  // PARTY
};

// Minimal ERC20 ABI for allowance and approval
const ERC20_ABI = [
  {
    "name": "allowance",
    "type": "function",
    "inputs": [
      {"name": "owner", "type": "address"},
      {"name": "spender", "type": "address"}
    ],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "name": "approve",
    "type": "function",
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable"
  },
  {
    "name": "balanceOf",
    "type": "function",
    "inputs": [{"name": "account", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  }
];

// Minimal ERC721 ABI for approval
const ERC721_ABI = [
  {
    "name": "setApprovalForAll",
    "type": "function",
    "inputs": [
      {"name": "operator", "type": "address"},
      {"name": "approved", "type": "bool"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "isApprovedForAll",
    "type": "function",
    "inputs": [
      {"name": "owner", "type": "address"},
      {"name": "operator", "type": "address"}
    ],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view"
  }
];

export function useMarketplaceV2() {
  const { address } = useAccount();
  const { showToast } = useAppToast();
  const { writeContractAsync } = useWriteContract();
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if NFT is approved for marketplace
  const checkNFTApproval = useCallback(async (
    nftContract: Address,
    owner: Address
  ): Promise<boolean> => {
    try {
      const isApproved = await readContract({
        address: nftContract,
        abi: ERC721_ABI,
        functionName: 'isApprovedForAll',
        args: [owner, DUNGEONMARKETPLACE_V2]
      });
      return isApproved as boolean;
    } catch (error) {
      console.error('Error checking NFT approval:', error);
      return false;
    }
  }, []);

  // Check token allowance
  const checkTokenAllowance = useCallback(async (
    tokenAddress: Address,
    owner: Address,
    spender: Address
  ): Promise<bigint> => {
    try {
      const allowance = await readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [owner, spender]
      });
      return allowance as bigint;
    } catch (error) {
      console.error('Error checking token allowance:', error);
      return 0n;
    }
  }, []);

  // Check token balance
  const checkTokenBalance = useCallback(async (
    tokenAddress: Address,
    owner: Address
  ): Promise<bigint> => {
    try {
      const balance = await readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [owner]
      });
      return balance as bigint;
    } catch (error) {
      console.error('Error checking token balance:', error);
      return 0n;
    }
  }, []);

  // Approve NFT for marketplace
  const approveNFT = useCallback(async (nftContract: Address) => {
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
      
      // Wait for confirmation
      const receipt = await waitForTransactionReceipt({ hash });
      
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
  }, [address, writeContractAsync, showToast]);

  // Approve token for spending
  const approveToken = useCallback(async (
    tokenAddress: Address,
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
      
      // Wait for confirmation
      const receipt = await waitForTransactionReceipt({ hash });
      
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
  }, [address, writeContractAsync, showToast]);

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
      
      // Wait for confirmation
      const receipt = await waitForTransactionReceipt({ hash });
      
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
  }, [address, writeContractAsync, showToast, checkNFTApproval, approveNFT]);

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
      
      // Wait for confirmation
      const receipt = await waitForTransactionReceipt({ hash });
      
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
  }, [address, writeContractAsync, showToast, checkTokenBalance, checkTokenAllowance, approveToken]);

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
      
      // Wait for confirmation
      const receipt = await waitForTransactionReceipt({ hash });
      
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
  }, [address, writeContractAsync, showToast]);

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
      
      // Wait for confirmation
      const receipt = await waitForTransactionReceipt({ hash });
      
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
  }, [address, writeContractAsync, showToast]);

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
      
      // Wait for confirmation
      const receipt = await waitForTransactionReceipt({ hash });
      
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
  }, [address, writeContractAsync, showToast]);

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
    isProcessing,
    SUPPORTED_STABLECOINS
  };
}

// Helper functions
async function readContract(config: any) {
  // This would use wagmi's readContract in actual implementation
  // For now, returning placeholder
  return null;
}

async function waitForTransactionReceipt(config: any) {
  // This would use wagmi's waitForTransactionReceipt in actual implementation
  // For now, returning placeholder
  return { status: 'success' };
}