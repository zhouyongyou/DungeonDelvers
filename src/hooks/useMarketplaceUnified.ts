// src/hooks/useMarketplaceUnified.ts
// Unified marketplace hooks that can switch between localStorage and API

import { useMemo } from 'react';
import { getMarketplaceMode } from '../config/marketplaceConfig';

// Import both implementations
import { 
    getLocalListings as getLocalListingsImpl,
    useCreateListing as useCreateListingLocal,
    usePurchaseItem as usePurchaseItemLocal,
    useApproveNFT as useApproveNFTLocal,
    type MarketListing as LocalMarketListing
} from './useMarketplace';

import {
    useActiveListings,
    useUserListings,
    useCreateListingApi,
    usePurchaseItemApi,
    useCancelListingApi,
    useUpdateListingApi,
    useMarketStats,
    getApiListings,
    type MarketListing as ApiMarketListing
} from './useMarketplaceApi';

// Unified types
export type MarketListing = LocalMarketListing | ApiMarketListing;

// Unified hooks
export const useUnifiedListings = () => {
    const useApi = getMarketplaceMode();
    
    // API mode
    const apiListings = useActiveListings();
    
    // Local mode - convert to React Query format
    const localListings = useMemo(() => {
        if (useApi) return { data: undefined, isLoading: false, isError: false };
        
        try {
            const listings = getLocalListingsImpl();
            return {
                data: listings.filter(l => l.status === 'active'),
                isLoading: false,
                isError: false,
                refetch: () => Promise.resolve()
            };
        } catch (error) {
            return {
                data: undefined,
                isLoading: false,
                isError: true,
                error,
                refetch: () => Promise.resolve()
            };
        }
    }, [useApi]);
    
    return useApi ? apiListings : localListings;
};

export const useUnifiedUserListings = (seller?: string) => {
    const useApi = getMarketplaceMode();
    
    // API mode
    const apiUserListings = useUserListings(seller);
    
    // Local mode
    const localUserListings = useMemo(() => {
        if (useApi || !seller) return { data: undefined, isLoading: false, isError: false };
        
        try {
            const allListings = getLocalListingsImpl();
            const userListings = allListings.filter(l => 
                l.seller.toLowerCase() === seller.toLowerCase()
            );
            return {
                data: userListings,
                isLoading: false,
                isError: false,
                refetch: () => Promise.resolve()
            };
        } catch (error) {
            return {
                data: undefined,
                isLoading: false,
                isError: true,
                error,
                refetch: () => Promise.resolve()
            };
        }
    }, [useApi, seller]);
    
    return useApi ? apiUserListings : localUserListings;
};

export const useUnifiedCreateListing = () => {
    const useApi = getMarketplaceMode();
    
    const apiCreate = useCreateListingApi();
    const localCreate = useCreateListingLocal();
    
    return useApi ? apiCreate : localCreate;
};

export const useUnifiedPurchaseItem = () => {
    const useApi = getMarketplaceMode();
    
    const apiPurchase = usePurchaseItemApi();
    const localPurchase = usePurchaseItemLocal();
    
    return useApi ? apiPurchase : localPurchase;
};

export const useUnifiedCancelListing = () => {
    const useApi = getMarketplaceMode();
    
    const apiCancel = useCancelListingApi();
    
    // Local implementation
    const localCancel = useMemo(() => {
        if (useApi) return { cancelListing: () => {}, isCancelling: false };
        
        return {
            cancelListing: async (listingId: string) => {
                const existingListings = getLocalListingsImpl();
                const updatedListings = existingListings.map(listing => 
                    listing.id === listingId ? { ...listing, status: 'cancelled' as const } : listing
                );
                
                localStorage.setItem('marketplace_listings', JSON.stringify(updatedListings));
                window.dispatchEvent(new Event('marketplaceUpdate'));
            },
            isCancelling: false
        };
    }, [useApi]);
    
    return useApi ? apiCancel : localCancel;
};

export const useUnifiedUpdateListing = () => {
    const useApi = getMarketplaceMode();
    
    const apiUpdate = useUpdateListingApi();
    
    // Local implementation (placeholder)
    const localUpdate = useMemo(() => {
        if (useApi) return { updateListingPrice: () => {}, isUpdating: false };
        
        return {
            updateListingPrice: async (listingId: string, newPrice: bigint) => {
                // TODO: Implement local price update
                console.log('Local price update not implemented yet');
            },
            isUpdating: false
        };
    }, [useApi]);
    
    return useApi ? apiUpdate : localUpdate;
};

// Utility function to get all listings (backward compatibility)
export const getUnifiedListings = async (): Promise<MarketListing[]> => {
    const useApi = getMarketplaceMode();
    
    if (useApi) {
        return getApiListings();
    } else {
        return getLocalListingsImpl().filter(l => l.status === 'active');
    }
};

// Export mode checker for components that need to know
export const useMarketplaceMode = () => {
    return {
        useApi: getMarketplaceMode(),
        isLocal: !getMarketplaceMode(),
    };
};