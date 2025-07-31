// src/hooks/useMarketplaceApi.ts
// API-based marketplace hooks replacing localStorage functionality

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { parseEther, type Address } from 'viem';
import { useAppToast } from '../contexts/SimpleToastContext';
import { marketplaceApi, type ApiMarketListing, type CreateListingRequest } from '../services/marketplaceApi';
import type { HeroNft, RelicNft, PartyNft, NftType } from '../types/nft';
import { getContractWithABI } from '../config/contractsWithABI';

// Convert API listing to internal format
export interface MarketListing {
    id: string;
    seller: string;
    nftType: NftType;
    tokenId: bigint;
    contractAddress: string;
    price: bigint;
    status: 'active' | 'sold' | 'cancelled';
    createdAt: number;
    updatedAt: number;
}

function apiListingToInternal(apiListing: ApiMarketListing): MarketListing {
    return {
        ...apiListing,
        tokenId: BigInt(apiListing.tokenId),
        price: BigInt(apiListing.price),
    };
}

// Hook to fetch all active listings
export const useActiveListings = () => {
    return useQuery({
        queryKey: ['marketplace', 'listings', 'active'],
        queryFn: async () => {
            const response = await marketplaceApi.getListings({ status: 'active' });
            return response.listings.map(apiListingToInternal);
        },
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
    });
};

// Hook to fetch user's listings
export const useUserListings = (seller?: string) => {
    return useQuery({
        queryKey: ['marketplace', 'listings', 'user', seller],
        queryFn: async () => {
            if (!seller) return [];
            const response = await marketplaceApi.getUserListings(seller);
            return response.listings.map(apiListingToInternal);
        },
        enabled: !!seller,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
    });
};

// Hook to create listings
export const useCreateListingApi = () => {
    const { address } = useAccount();
    const { showToast } = useAppToast();
    const queryClient = useQueryClient();
    const [isCreating, setIsCreating] = useState(false);

    const createListing = useCallback(async (
        nft: HeroNft | RelicNft | PartyNft,
        price: bigint,
        marketplaceAddress: Address
    ) => {
        if (!address) throw new Error('Wallet not connected');
        
        setIsCreating(true);
        
        try {
            const listingData: CreateListingRequest = {
                seller: address,
                nftType: nft.type,
                tokenId: nft.tokenId.toString(),
                contractAddress: getContractAddress(nft.type),
                price: price.toString(),
            };
            
            const response = await marketplaceApi.createListing(listingData);
            
            // Invalidate and refetch listings
            queryClient.invalidateQueries({ queryKey: ['marketplace', 'listings'] });
            
            return response.listing;
        } finally {
            setIsCreating(false);
        }
    }, [address, queryClient]);

    return { createListing, isCreating };
};

// Hook to purchase NFTs
export const usePurchaseItemApi = () => {
    const { address } = useAccount();
    const { showToast } = useAppToast();
    const queryClient = useQueryClient();
    const [isPurchasing, setIsPurchasing] = useState(false);

    const purchaseItem = useCallback(async (listing: MarketListing, txHash?: string) => {
        if (!address) throw new Error('Wallet not connected');
        
        setIsPurchasing(true);
        
        try {
            const response = await marketplaceApi.purchaseNft({
                listingId: listing.id,
                buyer: address,
                txHash,
            });
            
            // Invalidate and refetch listings
            queryClient.invalidateQueries({ queryKey: ['marketplace', 'listings'] });
            
            return response.transaction;
        } finally {
            setIsPurchasing(false);
        }
    }, [address, queryClient]);

    return { purchaseItem, isPurchasing };
};

// Hook to cancel listings
export const useCancelListingApi = () => {
    const { showToast } = useAppToast();
    const queryClient = useQueryClient();
    const [isCancelling, setIsCancelling] = useState(false);

    const cancelListing = useCallback(async (listingId: string) => {
        setIsCancelling(true);
        
        try {
            await marketplaceApi.cancelListing(listingId);
            
            // Invalidate and refetch listings
            queryClient.invalidateQueries({ queryKey: ['marketplace', 'listings'] });
            
            showToast('掛單已取消', 'success');
        } catch (error) {
            showToast(`取消掛單失敗: ${error}`, 'error');
            throw error;
        } finally {
            setIsCancelling(false);
        }
    }, [queryClient, showToast]);

    return { cancelListing, isCancelling };
};

// Hook to update listing price
export const useUpdateListingApi = () => {
    const { showToast } = useAppToast();
    const queryClient = useQueryClient();
    const [isUpdating, setIsUpdating] = useState(false);

    const updateListingPrice = useCallback(async (listingId: string, newPrice: bigint) => {
        setIsUpdating(true);
        
        try {
            await marketplaceApi.updateListing(listingId, {
                price: newPrice.toString(),
            });
            
            // Invalidate and refetch listings
            queryClient.invalidateQueries({ queryKey: ['marketplace', 'listings'] });
            
            showToast('價格已更新', 'success');
        } catch (error) {
            showToast(`更新價格失敗: ${error}`, 'error');
            throw error;
        } finally {
            setIsUpdating(false);
        }
    }, [queryClient, showToast]);

    return { updateListingPrice, isUpdating };
};

// Hook to get market statistics
export const useMarketStats = () => {
    return useQuery({
        queryKey: ['marketplace', 'stats'],
        queryFn: () => marketplaceApi.getMarketStats(),
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
    });
};

// Utility function to get contract address based on NFT type
function getContractAddress(nftType: NftType): string {
    switch (nftType) {
        case 'hero':
            return getContractWithABI('HERO')?.address || '';
        case 'relic':
            return getContractWithABI('RELIC')?.address || '';
        case 'party':
            return getContractWithABI('PARTY')?.address || '';
        default:
            throw new Error(`Unknown NFT type: ${nftType}`);
    }
}

// Export legacy interface for backward compatibility
export const getApiListings = async (): Promise<MarketListing[]> => {
    const response = await marketplaceApi.getListings({ status: 'active' });
    return response.listings.map(apiListingToInternal);
};