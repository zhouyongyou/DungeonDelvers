// src/services/marketplaceApi.ts
// API client for marketplace operations

import type { NftType } from '../types/nft';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://your-vercel-deployment.vercel.app/api'
    : '/api';

export interface ApiMarketListing {
    id: string;
    seller: string;
    nftType: NftType;
    tokenId: string;
    contractAddress: string;
    price: string; // BigInt as string
    status: 'active' | 'sold' | 'cancelled';
    createdAt: number;
    updatedAt: number;
    buyer?: string;
    soldAt?: number;
    txHash?: string;
}

export interface ListingsResponse {
    listings: ApiMarketListing[];
    total: number;
    limit: number;
    offset: number;
}

export interface CreateListingRequest {
    seller: string;
    nftType: NftType;
    tokenId: string;
    contractAddress: string;
    price: string; // BigInt as string
}

export interface UpdateListingRequest {
    price?: string;
    status?: 'active' | 'sold' | 'cancelled';
}

export interface PurchaseRequest {
    listingId: string;
    buyer: string;
    txHash?: string;
}

class MarketplaceApi {
    private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const url = `${API_BASE_URL}${endpoint}`;
        
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            ...options,
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        return response.json();
    }
    
    // Get listings with optional filters
    async getListings(params?: {
        status?: 'active' | 'sold' | 'cancelled';
        seller?: string;
        nftType?: NftType;
        limit?: number;
        offset?: number;
    }): Promise<ListingsResponse> {
        const searchParams = new URLSearchParams();
        
        if (params?.status) searchParams.set('status', params.status);
        if (params?.seller) searchParams.set('seller', params.seller);
        if (params?.nftType) searchParams.set('nftType', params.nftType);
        if (params?.limit) searchParams.set('limit', params.limit.toString());
        if (params?.offset) searchParams.set('offset', params.offset.toString());
        
        const query = searchParams.toString();
        const endpoint = `/listings${query ? `?${query}` : ''}`;
        
        return this.request<ListingsResponse>(endpoint);
    }
    
    // Create a new listing
    async createListing(data: CreateListingRequest): Promise<{ message: string; listing: ApiMarketListing }> {
        return this.request('/listings', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    
    // Update an existing listing
    async updateListing(id: string, data: UpdateListingRequest): Promise<{ message: string; listing: ApiMarketListing }> {
        return this.request(`/listings?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }
    
    // Cancel a listing
    async cancelListing(id: string): Promise<{ message: string }> {
        return this.request(`/listings?id=${id}`, {
            method: 'DELETE',
        });
    }
    
    // Purchase an NFT
    async purchaseNft(data: PurchaseRequest): Promise<{ message: string; transaction: any }> {
        return this.request('/purchase', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    
    // Get user's listings
    async getUserListings(seller: string, status?: 'active' | 'sold' | 'cancelled'): Promise<ListingsResponse> {
        return this.getListings({ seller, status });
    }
    
    // Get market statistics
    async getMarketStats(): Promise<{
        totalListings: number;
        activeListings: number;
        totalVolume: string;
        avgPrice: string;
        typeDistribution: Record<NftType, number>;
    }> {
        // This would be a separate API endpoint in a real implementation
        // For now, we'll calculate it client-side
        const response = await this.getListings({ status: 'active' });
        
        const totalListings = response.total;
        const activeListings = response.listings.length;
        const prices = response.listings.map(l => BigInt(l.price));
        const totalVolume = prices.reduce((sum, price) => sum + price, BigInt(0));
        const avgPrice = prices.length > 0 ? totalVolume / BigInt(prices.length) : BigInt(0);
        
        const typeDistribution = response.listings.reduce((acc, listing) => {
            acc[listing.nftType] = (acc[listing.nftType] || 0) + 1;
            return acc;
        }, {} as Record<NftType, number>);
        
        return {
            totalListings,
            activeListings,
            totalVolume: totalVolume.toString(),
            avgPrice: avgPrice.toString(),
            typeDistribution
        };
    }
}

export const marketplaceApi = new MarketplaceApi();

// Utility functions to convert between API format and internal format
export function apiListingToMarketListing(apiListing: ApiMarketListing): any {
    return {
        ...apiListing,
        price: BigInt(apiListing.price),
        createdAt: apiListing.createdAt,
    };
}

export function marketListingToApiListing(listing: any): Omit<CreateListingRequest, 'seller'> {
    return {
        nftType: listing.nftType,
        tokenId: listing.tokenId,
        contractAddress: listing.contractAddress,
        price: listing.price.toString(),
    };
}