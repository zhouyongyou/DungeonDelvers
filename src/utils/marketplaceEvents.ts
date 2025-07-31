// src/utils/marketplaceEvents.ts
// 市場事件觸發工具

import type { NftType } from '../types/nft';

interface MarketplaceEventData {
    nftType: NftType;
    tokenId: string;
    price?: string;
    seller?: string;
    buyer?: string;
}

/**
 * 觸發掛單創建事件
 */
export function emitListingCreated(data: MarketplaceEventData) {
    const event = new CustomEvent('marketplaceListingCreated', {
        detail: {
            type: 'listing_created',
            data
        }
    });
    window.dispatchEvent(event);
}

/**
 * 觸發掛單售出事件
 */
export function emitListingSold(data: MarketplaceEventData) {
    const event = new CustomEvent('marketplaceListingSold', {
        detail: {
            type: 'listing_sold',
            data
        }
    });
    window.dispatchEvent(event);
}

/**
 * 觸發掛單取消事件
 */
export function emitListingCancelled(data: MarketplaceEventData) {
    const event = new CustomEvent('marketplaceListingCancelled', {
        detail: {
            type: 'listing_cancelled',
            data
        }
    });
    window.dispatchEvent(event);
}

/**
 * 觸發發現相似NFT事件
 */
export function emitSimilarListingFound(data: MarketplaceEventData) {
    const event = new CustomEvent('marketplaceSimilarListing', {
        detail: {
            type: 'new_listing_similar',
            data
        }
    });
    window.dispatchEvent(event);
}

/**
 * 觸發價格提醒事件
 */
export function emitPriceAlert(data: MarketplaceEventData) {
    const event = new CustomEvent('marketplacePriceAlert', {
        detail: {
            type: 'price_alert',
            data
        }
    });
    window.dispatchEvent(event);
}