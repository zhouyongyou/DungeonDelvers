// src/types/marketplace.ts
// 統一的 Marketplace V2 類型定義，基於統一子圖 schema

import type { HeroNft, RelicNft, PartyNft, NftType } from './nft';

// 從統一子圖查詢的 MarketListingV2 類型
export interface MarketListingV2 {
  id: string;
  listingId: string;
  seller: string;
  nftType: NftType;
  nftContract: string;
  tokenId: string;
  price: string; // BigDecimal as string
  acceptedTokens: string[]; // Array of token addresses
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  
  // Relations
  soldTransaction?: MarketTransactionV2;
  priceUpdates?: ListingPriceUpdateV2[];
  
  // Legacy compatibility - attached NFT data
  nft?: HeroNft | RelicNft | PartyNft;
  
  // Legacy fields for backward compatibility
  status?: 'active' | 'sold' | 'cancelled';
  contractAddress?: string; // alias for nftContract
}

export interface MarketTransactionV2 {
  id: string;
  listingId: string;
  buyer: string;
  seller: string;
  nftType: NftType;
  nftContract: string;
  tokenId: string;
  price: string;
  paymentToken: string;
  platformFee: string;
  timestamp: string;
  blockNumber: string;
  transactionHash: string;
  
  // Relations
  listing: MarketListingV2;
}

export interface ListingPriceUpdateV2 {
  id: string;
  listingId: string;
  oldPrice: string;
  newPrice: string;
  timestamp: string;
  transactionHash: string;
  
  // Relations
  listing: MarketListingV2;
}

// Offer System V2 types
export interface OfferV2 {
  id: string;
  offerId: string;
  offeror: string;
  nftType: NftType;
  nftContract: string;
  tokenId: string;
  offerAmount: string;
  paymentToken: string;
  expiresAt: string;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  acceptedTransaction?: OfferAcceptedTransactionV2;
}

export enum OfferStatus {
  ACTIVE = 'ACTIVE',
  ACCEPTED = 'ACCEPTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

export interface OfferAcceptedTransactionV2 {
  id: string;
  offerId: string;
  seller: string;
  buyer: string;
  nftType: NftType;
  nftContract: string;
  tokenId: string;
  amount: string;
  paymentToken: string;
  platformFee: string;
  timestamp: string;
  blockNumber: string;
  transactionHash: string;
  
  // Relations
  offer: OfferV2;
}

// GraphQL query helpers
export const MARKET_LISTING_FRAGMENT = `
  fragment MarketListingV2Fragment on MarketListingV2 {
    id
    listingId
    seller
    nftType
    nftContract
    tokenId
    price
    acceptedTokens
    isActive
    createdAt
    updatedAt
    expiresAt
  }
`;

export const MARKET_TRANSACTION_FRAGMENT = `
  fragment MarketTransactionV2Fragment on MarketTransactionV2 {
    id
    listingId
    buyer
    seller
    nftType
    nftContract
    tokenId
    price
    paymentToken
    platformFee
    timestamp
    blockNumber
    transactionHash
  }
`;

// Helper functions for backward compatibility
export function convertToLegacyStatus(isActive: boolean, soldTransaction?: MarketTransactionV2): 'active' | 'sold' | 'cancelled' {
  if (soldTransaction) return 'sold';
  if (isActive) return 'active';
  return 'cancelled';
}

export function convertToLegacyListing(listing: MarketListingV2): MarketListingV2 {
  return {
    ...listing,
    status: convertToLegacyStatus(listing.isActive, listing.soldTransaction),
    contractAddress: listing.nftContract,
  };
}