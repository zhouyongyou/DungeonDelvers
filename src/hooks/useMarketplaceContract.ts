// src/hooks/useMarketplaceContract.ts
// Smart contract integration hooks for marketplace

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, type Address } from 'viem';
import { useAppToast } from '../contexts/SimpleToastContext';
import { DUNGEONMARKETPLACE, OFFERSYSTEM, SOULSHARD } from '../config/contracts';
import type { HeroNft, RelicNft, PartyNft, NftType } from '../types/nft';
import { getContractWithABI } from '../config/contractsWithABI';

// Contract ABIs (simplified for demo - full ABIs would be imported)
const MARKETPLACE_ABI = [
    {
        "name": "createListing",
        "type": "function",
        "inputs": [
            {"name": "nftType", "type": "uint8"},
            {"name": "nftContract", "type": "address"},
            {"name": "tokenId", "type": "uint256"},
            {"name": "price", "type": "uint256"}
        ]
    },
    {
        "name": "purchaseNFT",
        "type": "function",
        "inputs": [
            {"name": "listingId", "type": "uint256"}
        ]
    },
    {
        "name": "cancelListing",
        "type": "function",
        "inputs": [
            {"name": "listingId", "type": "uint256"}
        ]
    },
    {
        "name": "updateListingPrice",
        "type": "function",
        "inputs": [
            {"name": "listingId", "type": "uint256"},
            {"name": "newPrice", "type": "uint256"}
        ]
    },
    {
        "name": "getListing",
        "type": "function",
        "inputs": [
            {"name": "listingId", "type": "uint256"}
        ],
        "outputs": [
            {
                "name": "", 
                "type": "tuple",
                "components": [
                    {"name": "id", "type": "uint256"},
                    {"name": "seller", "type": "address"},
                    {"name": "nftType", "type": "uint8"},
                    {"name": "nftContract", "type": "address"},
                    {"name": "tokenId", "type": "uint256"},
                    {"name": "price", "type": "uint256"},
                    {"name": "status", "type": "uint8"},
                    {"name": "createdAt", "type": "uint256"},
                    {"name": "updatedAt", "type": "uint256"}
                ]
            }
        ]
    }
] as const;

const OFFER_SYSTEM_ABI = [
    {
        "name": "makeOffer",
        "type": "function",
        "inputs": [
            {"name": "seller", "type": "address"},
            {"name": "nftType", "type": "uint8"},
            {"name": "nftContract", "type": "address"},
            {"name": "tokenId", "type": "uint256"},
            {"name": "amount", "type": "uint256"},
            {"name": "duration", "type": "uint256"},
            {"name": "message", "type": "string"}
        ]
    },
    {
        "name": "acceptOffer",
        "type": "function",
        "inputs": [
            {"name": "offerId", "type": "uint256"}
        ]
    },
    {
        "name": "declineOffer",
        "type": "function",
        "inputs": [
            {"name": "offerId", "type": "uint256"}
        ]
    },
    {
        "name": "cancelOffer",
        "type": "function",
        "inputs": [
            {"name": "offerId", "type": "uint256"}
        ]
    }
] as const;

// ERC20 ABI for SOUL token approvals
const ERC20_ABI = [
    {
        "name": "approve",
        "type": "function",
        "inputs": [
            {"name": "spender", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ]
    },
    {
        "name": "allowance",
        "type": "function",
        "inputs": [
            {"name": "owner", "type": "address"},
            {"name": "spender", "type": "address"}
        ],
        "outputs": [
            {"name": "", "type": "uint256"}
        ]
    }
] as const;

// NFT Contract ABI for approvals
const NFT_ABI = [
    {
        "name": "approve",
        "type": "function",
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "tokenId", "type": "uint256"}
        ]
    },
    {
        "name": "setApprovalForAll",
        "type": "function",
        "inputs": [
            {"name": "operator", "type": "address"},
            {"name": "approved", "type": "bool"}
        ]
    },
    {
        "name": "isApprovedForAll",
        "type": "function",
        "inputs": [
            {"name": "owner", "type": "address"},
            {"name": "operator", "type": "address"}
        ],
        "outputs": [
            {"name": "", "type": "bool"}
        ]
    },
    {
        "name": "getApproved",
        "type": "function",
        "inputs": [
            {"name": "tokenId", "type": "uint256"}
        ],
        "outputs": [
            {"name": "", "type": "address"}
        ]
    }
] as const;

// Helper function to get NFT contract address
function getNftContractAddress(nftType: NftType): Address {
    switch (nftType) {
        case 'hero':
            return (getContractWithABI('HERO')?.address || '') as Address;
        case 'relic':
            return (getContractWithABI('RELIC')?.address || '') as Address;
        case 'party':
            return (getContractWithABI('PARTY')?.address || '') as Address;
        default:
            throw new Error(`Unknown NFT type: ${nftType}`);
    }
}

// Helper function to convert NFT type to enum
function nftTypeToEnum(nftType: NftType): number {
    switch (nftType) {
        case 'hero':
            return 0;
        case 'relic':
            return 1;
        case 'party':
            return 2;
        default:
            throw new Error(`Unknown NFT type: ${nftType}`);
    }
}

// Hook for marketplace contract interactions
export const useMarketplaceContract = () => {
    const { address } = useAccount();
    const { showToast } = useAppToast();
    const { writeContract, data: hash, isPending } = useWriteContract();
    
    const { isLoading: isConfirming, isSuccess: isConfirmed } = 
        useWaitForTransactionReceipt({ hash });

    // Create listing
    const createListing = useCallback(async (
        nft: HeroNft | RelicNft | PartyNft,
        price: bigint
    ) => {
        if (!address) throw new Error('Wallet not connected');

        const nftContract = getNftContractAddress(nft.type);
        const nftTypeEnum = nftTypeToEnum(nft.type);

        try {
            await writeContract({
                address: DUNGEONMARKETPLACE as Address,
                abi: MARKETPLACE_ABI,
                functionName: 'createListing',
                args: [nftTypeEnum, nftContract, nft.tokenId, price],
            });
        } catch (error) {
            showToast(`創建掛單失敗: ${error}`, 'error');
            throw error;
        }
    }, [address, writeContract, showToast]);

    // Purchase NFT
    const purchaseNFT = useCallback(async (listingId: bigint) => {
        if (!address) throw new Error('Wallet not connected');

        try {
            await writeContract({
                address: DUNGEONMARKETPLACE as Address,
                abi: MARKETPLACE_ABI,
                functionName: 'purchaseNFT',
                args: [listingId],
            });
        } catch (error) {
            showToast(`購買失敗: ${error}`, 'error');
            throw error;
        }
    }, [address, writeContract, showToast]);

    // Cancel listing
    const cancelListing = useCallback(async (listingId: bigint) => {
        if (!address) throw new Error('Wallet not connected');

        try {
            await writeContract({
                address: DUNGEONMARKETPLACE as Address,
                abi: MARKETPLACE_ABI,
                functionName: 'cancelListing',
                args: [listingId],
            });
        } catch (error) {
            showToast(`取消掛單失敗: ${error}`, 'error');
            throw error;
        }
    }, [address, writeContract, showToast]);

    // Update listing price
    const updateListingPrice = useCallback(async (listingId: bigint, newPrice: bigint) => {
        if (!address) throw new Error('Wallet not connected');

        try {
            await writeContract({
                address: DUNGEONMARKETPLACE as Address,
                abi: MARKETPLACE_ABI,
                functionName: 'updateListingPrice',
                args: [listingId, newPrice],
            });
        } catch (error) {
            showToast(`更新價格失敗: ${error}`, 'error');
            throw error;
        }
    }, [address, writeContract, showToast]);

    return {
        createListing,
        purchaseNFT,
        cancelListing,
        updateListingPrice,
        isPending,
        isConfirming,
        isConfirmed,
        hash
    };
};

// Hook for offer system contract interactions
export const useOfferSystemContract = () => {
    const { address } = useAccount();
    const { showToast } = useAppToast();
    const { writeContract, data: hash, isPending } = useWriteContract();
    
    const { isLoading: isConfirming, isSuccess: isConfirmed } = 
        useWaitForTransactionReceipt({ hash });

    // Make offer
    const makeOffer = useCallback(async (
        seller: Address,
        nftType: NftType,
        tokenId: bigint,
        amount: bigint,
        duration: number,
        message: string
    ) => {
        if (!address) throw new Error('Wallet not connected');

        const nftContract = getNftContractAddress(nftType);
        const nftTypeEnum = nftTypeToEnum(nftType);

        try {
            await writeContract({
                address: OFFERSYSTEM as Address,
                abi: OFFER_SYSTEM_ABI,
                functionName: 'makeOffer',
                args: [seller, nftTypeEnum, nftContract, tokenId, amount, BigInt(duration), message],
            });
        } catch (error) {
            showToast(`出價失敗: ${error}`, 'error');
            throw error;
        }
    }, [address, writeContract, showToast]);

    // Accept offer
    const acceptOffer = useCallback(async (offerId: bigint) => {
        if (!address) throw new Error('Wallet not connected');

        try {
            await writeContract({
                address: OFFERSYSTEM as Address,
                abi: OFFER_SYSTEM_ABI,
                functionName: 'acceptOffer',
                args: [offerId],
            });
        } catch (error) {
            showToast(`接受出價失敗: ${error}`, 'error');
            throw error;
        }
    }, [address, writeContract, showToast]);

    // Decline offer
    const declineOffer = useCallback(async (offerId: bigint) => {
        if (!address) throw new Error('Wallet not connected');

        try {
            await writeContract({
                address: OFFERSYSTEM as Address,
                abi: OFFER_SYSTEM_ABI,
                functionName: 'declineOffer',
                args: [offerId],
            });
        } catch (error) {
            showToast(`拒絕出價失敗: ${error}`, 'error');
            throw error;
        }
    }, [address, writeContract, showToast]);

    // Cancel offer
    const cancelOffer = useCallback(async (offerId: bigint) => {
        if (!address) throw new Error('Wallet not connected');

        try {
            await writeContract({
                address: OFFERSYSTEM as Address,
                abi: OFFER_SYSTEM_ABI,
                functionName: 'cancelOffer',
                args: [offerId],
            });
        } catch (error) {
            showToast(`取消出價失敗: ${error}`, 'error');
            throw error;
        }
    }, [address, writeContract, showToast]);

    return {
        makeOffer,
        acceptOffer,
        declineOffer,
        cancelOffer,
        isPending,
        isConfirming,
        isConfirmed,
        hash
    };
};

// Hook for NFT approvals
export const useNftApproval = () => {
    const { address } = useAccount();
    const { showToast } = useAppToast();
    const { writeContract, data: hash, isPending } = useWriteContract();
    
    const { isLoading: isConfirming, isSuccess: isConfirmed } = 
        useWaitForTransactionReceipt({ hash });

    // Check if marketplace is approved for all NFTs
    const { data: isApprovedForAll } = useReadContract({
        address: undefined, // Will be set dynamically
        abi: NFT_ABI,
        functionName: 'isApprovedForAll',
        args: [address as Address, DUNGEONMARKETPLACE as Address],
        query: { enabled: !!address }
    });

    // Approve marketplace for all NFTs
    const approveMarketplace = useCallback(async (nftType: NftType) => {
        if (!address) throw new Error('Wallet not connected');

        const nftContract = getNftContractAddress(nftType);

        try {
            await writeContract({
                address: nftContract,
                abi: NFT_ABI,
                functionName: 'setApprovalForAll',
                args: [DUNGEONMARKETPLACE as Address, true],
            });
        } catch (error) {
            showToast(`授權失敗: ${error}`, 'error');
            throw error;
        }
    }, [address, writeContract, showToast]);

    return {
        approveMarketplace,
        isApprovedForAll,
        isPending,
        isConfirming,
        isConfirmed,
        hash
    };
};

// Hook for SOUL token approvals
export const useSoulApproval = () => {
    const { address } = useAccount();
    const { showToast } = useAppToast();
    const { writeContract, data: hash, isPending } = useWriteContract();
    
    const { isLoading: isConfirming, isSuccess: isConfirmed } = 
        useWaitForTransactionReceipt({ hash });

    // Check SOUL allowance for marketplace
    const { data: marketplaceAllowance } = useReadContract({
        address: SOULSHARD as Address,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address as Address, DUNGEONMARKETPLACE as Address],
        query: { enabled: !!address }
    });

    // Check SOUL allowance for offer system
    const { data: offerAllowance } = useReadContract({
        address: SOULSHARD as Address,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address as Address, OFFERSYSTEM as Address],
        query: { enabled: !!address }
    });

    // Approve SOUL for marketplace
    const approveMarketplace = useCallback(async (amount: bigint) => {
        if (!address) throw new Error('Wallet not connected');

        try {
            await writeContract({
                address: SOULSHARD as Address,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [DUNGEONMARKETPLACE as Address, amount],
            });
        } catch (error) {
            showToast(`SOUL 授權失敗: ${error}`, 'error');
            throw error;
        }
    }, [address, writeContract, showToast]);

    // Approve SOUL for offer system
    const approveOfferSystem = useCallback(async (amount: bigint) => {
        if (!address) throw new Error('Wallet not connected');

        try {
            await writeContract({
                address: SOULSHARD as Address,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [OFFERSYSTEM as Address, amount],
            });
        } catch (error) {
            showToast(`SOUL 授權失敗: ${error}`, 'error');
            throw error;
        }
    }, [address, writeContract, showToast]);

    return {
        approveMarketplace,
        approveOfferSystem,
        marketplaceAllowance,
        offerAllowance,
        isPending,
        isConfirming,
        isConfirmed,
        hash
    };
};