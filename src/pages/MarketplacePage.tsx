// src/pages/MarketplacePage.tsx
// P2P 內部市場頁面

import React, { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ActionButton } from '../components/ui/ActionButton';
import { Icons } from '../components/ui/icons';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { formatSoul } from '../utils/formatters';
import type { HeroNft, RelicNft, PartyNft, NftType } from '../types/nft';
import { THE_GRAPH_API_URL } from '../config/graphConfig';
import { graphQLRateLimiter } from '../utils/rateLimiter';
import { logger } from '../utils/logger';
import { CreateListingModal } from '../components/marketplace/CreateListingModal';
import { PurchaseModal } from '../components/marketplace/PurchaseModal';
import { fetchAllOwnedNfts } from '../api/nfts';
import { getLocalListings, type MarketListing as MarketListingType } from '../hooks/useMarketplace';
import { useHeroPower, usePartyPower, useHeroDetails, useRelicDetails, usePartyDetails, getElementName, getClassName, getRelicCategoryName } from '../hooks/useNftPower';
import { useAppToast } from '../contexts/SimpleToastContext';
import { MarketStats } from '../components/marketplace/MarketStats';
import { MarketplaceDevTools } from '../components/marketplace/MarketplaceDevTools';
import { MarketplaceNotifications } from '../components/marketplace/MarketplaceNotifications';
import { BatchOperations } from '../components/marketplace/BatchOperations';
import { MakeOfferModal } from '../components/marketplace/MakeOfferModal';
import { OffersPanel } from '../components/marketplace/OffersPanel';

// =================================================================
// Section: Types
// =================================================================

interface MarketListing {
    id: string;
    seller: string;
    nftType: NftType;
    tokenId: string;
    price: string;
    status: 'active' | 'sold' | 'cancelled';
    createdAt: string;
    nft: HeroNft | RelicNft | PartyNft;
}

interface MarketFilters {
    nftType: 'all' | NftType;
    priceRange: { min: number; max: number };
    powerRange: { min: number; max: number };
    sortBy: 'price' | 'power' | 'newest';
    sortOrder: 'asc' | 'desc';
    searchTerm: string;
}

// =================================================================
// Section: GraphQL Queries
// =================================================================

const GET_MARKET_LISTINGS_QUERY = `
  query GetMarketListings($skip: Int, $first: Int, $where: ListingFilter) {
    listings(
      skip: $skip
      first: $first
      where: $where
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      seller
      nftType
      tokenId
      price
      status
      createdAt
      hero {
        id
        tokenId
        tier
        power
        element
        class
      }
      relic {
        id
        tokenId
        tier
        category
        capacity
      }
      party {
        id
        tokenId
        totalPower
        heroes {
          tokenId
          tier
          power
        }
        relics {
          tokenId
          tier
        }
      }
    }
  }
`;

// =================================================================
// Section: Hooks
// =================================================================

const useMarketListings = (filters: MarketFilters, page: number, pageSize: number) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['marketListings', filters, page],
        queryFn: async () => {
            if (!THE_GRAPH_API_URL) return null;
            
            const where: any = { status: 'active' };
            if (filters.nftType !== 'all') {
                where.nftType = filters.nftType;
            }
            
            try {
                const response = await graphQLRateLimiter.execute(async () => {
                    return fetch(THE_GRAPH_API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            query: GET_MARKET_LISTINGS_QUERY,
                            variables: { 
                                skip: page * pageSize,
                                first: pageSize,
                                where
                            },
                        }),
                    });
                });
                
                if (!response.ok) throw new Error('Network response was not ok');
                const { data, errors } = await response.json();
                
                if (errors) {
                    logger.error('GraphQL errors:', errors);
                    throw new Error(errors[0]?.message || 'GraphQL error');
                }
                
                return data?.listings || [];
            } catch (error) {
                logger.error('Error fetching market listings:', error);
                throw error;
            }
        },
        enabled: !!THE_GRAPH_API_URL,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
    });

    return { data, isLoading, isError, refetch };
};

// =================================================================
// Section: Components
// =================================================================

const MarketplaceHeader: React.FC<{
    filters: MarketFilters;
    onFiltersChange: (filters: MarketFilters) => void;
}> = ({ filters, onFiltersChange }) => {
    const [showAdvanced, setShowAdvanced] = useState(false);
    
    return (
        <div className="bg-gray-800 rounded-lg p-4 space-y-4">
            {/* NFT Type Filter */}
            <div className="flex flex-wrap gap-2">
                {(['all', 'hero', 'relic', 'party'] as const).map(type => (
                    <button
                        key={type}
                        onClick={() => onFiltersChange({ ...filters, nftType: type })}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            filters.nftType === type
                                ? 'bg-[#C0A573] text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                        {type === 'all' ? '全部' : 
                         type === 'hero' ? '英雄' :
                         type === 'relic' ? '聖物' : '隊伍'}
                    </button>
                ))}
            </div>
            
            {/* Search Bar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="搜尋 Token ID 或賣家地址..."
                            value={filters.searchTerm}
                            onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#C0A573] focus:outline-none transition-colors"
                        />
                        {filters.searchTerm && (
                            <button
                                onClick={() => onFiltersChange({ ...filters, searchTerm: '' })}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                            >
                                <Icons.X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Basic Controls */}
            <div className="flex flex-wrap items-center gap-4">
                {/* Sort Options */}
                <div className="flex items-center gap-2">
                    <label className="text-gray-400">排序：</label>
                    <select
                        value={filters.sortBy}
                        onChange={(e) => onFiltersChange({ ...filters, sortBy: e.target.value as any })}
                        className="bg-gray-700 text-white rounded px-3 py-1"
                    >
                        <option value="newest">最新</option>
                        <option value="price">價格</option>
                        <option value="power">戰力</option>
                    </select>
                    <button
                        onClick={() => onFiltersChange({ 
                            ...filters, 
                            sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' 
                        })}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                    >
                        {filters.sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                </div>
                
                {/* Advanced Filter Toggle */}
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                >
                    <Icons.Filter className="h-4 w-4" />
                    進階篩選
                    {showAdvanced ? <Icons.ChevronUp className="h-4 w-4" /> : <Icons.ChevronDown className="h-4 w-4" />}
                </button>
            </div>
            
            {/* Advanced Filters */}
            {showAdvanced && (
                <div className="space-y-4 pt-4 border-t border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Price Range */}
                        <div>
                            <label className="block text-gray-400 mb-2">價格範圍 (SOUL)</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    placeholder="最低"
                                    value={filters.priceRange.min || ''}
                                    onChange={(e) => onFiltersChange({
                                        ...filters,
                                        priceRange: { ...filters.priceRange, min: Number(e.target.value) || 0 }
                                    })}
                                    className="flex-1 px-3 py-1 bg-gray-700 text-white rounded text-sm"
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="number"
                                    placeholder="最高"
                                    value={filters.priceRange.max === 1000000 ? '' : filters.priceRange.max}
                                    onChange={(e) => onFiltersChange({
                                        ...filters,
                                        priceRange: { ...filters.priceRange, max: Number(e.target.value) || 1000000 }
                                    })}
                                    className="flex-1 px-3 py-1 bg-gray-700 text-white rounded text-sm"
                                />
                            </div>
                        </div>
                        
                        {/* Power Range */}
                        {(filters.nftType === 'hero' || filters.nftType === 'party' || filters.nftType === 'all') && (
                            <div>
                                <label className="block text-gray-400 mb-2">戰力範圍</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        placeholder="最低"
                                        value={filters.powerRange.min || ''}
                                        onChange={(e) => onFiltersChange({
                                            ...filters,
                                            powerRange: { ...filters.powerRange, min: Number(e.target.value) || 0 }
                                        })}
                                        className="flex-1 px-3 py-1 bg-gray-700 text-white rounded text-sm"
                                    />
                                    <span className="text-gray-400">-</span>
                                    <input
                                        type="number"
                                        placeholder="最高"
                                        value={filters.powerRange.max === 10000 ? '' : filters.powerRange.max}
                                        onChange={(e) => onFiltersChange({
                                            ...filters,
                                            powerRange: { ...filters.powerRange, max: Number(e.target.value) || 10000 }
                                        })}
                                        className="flex-1 px-3 py-1 bg-gray-700 text-white rounded text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Quick Filters */}
                    <div>
                        <label className="block text-gray-400 mb-2">快速篩選</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => onFiltersChange({
                                    ...filters,
                                    priceRange: { min: 0, max: 1000 }
                                })}
                                className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm transition-colors"
                            >
                                &lt; 1K SOUL
                            </button>
                            <button
                                onClick={() => onFiltersChange({
                                    ...filters,
                                    priceRange: { min: 1000, max: 10000 }
                                })}
                                className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm transition-colors"
                            >
                                1K - 10K SOUL
                            </button>
                            <button
                                onClick={() => onFiltersChange({
                                    ...filters,
                                    powerRange: { min: 1000, max: 10000 }
                                })}
                                className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm transition-colors"
                            >
                                高戰力 (1K+)
                            </button>
                            <button
                                onClick={() => onFiltersChange({
                                    ...filters,
                                    priceRange: { min: 0, max: 1000000 },
                                    powerRange: { min: 0, max: 10000 },
                                    searchTerm: ''
                                })}
                                className="px-3 py-1 bg-red-700 text-white rounded hover:bg-red-600 text-sm transition-colors"
                            >
                                重置篩選
                            </button>
                        </div>
                    </div>
                    
                    {/* Active Filters Summary */}
                    {(filters.priceRange.min > 0 || filters.priceRange.max < 1000000 || 
                      filters.powerRange.min > 0 || filters.powerRange.max < 10000 || 
                      filters.searchTerm.trim()) && (
                        <div className="text-sm text-gray-400">
                            <span>當前篩選：</span>
                            {filters.searchTerm.trim() && (
                                <span className="ml-2 px-2 py-1 bg-green-900/30 text-green-400 rounded">
                                    搜尋: "{filters.searchTerm}"
                                </span>
                            )}
                            {filters.priceRange.min > 0 || filters.priceRange.max < 1000000 ? (
                                <span className="ml-2 px-2 py-1 bg-blue-900/30 text-blue-400 rounded">
                                    價格 {filters.priceRange.min} - {filters.priceRange.max} SOUL
                                </span>
                            ) : null}
                            {filters.powerRange.min > 0 || filters.powerRange.max < 10000 ? (
                                <span className="ml-2 px-2 py-1 bg-purple-900/30 text-purple-400 rounded">
                                    戰力 {filters.powerRange.min} - {filters.powerRange.max}
                                </span>
                            ) : null}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const ListingCard: React.FC<{
    listing: MarketListingType;
    onBuy: () => void;
    isOwner?: boolean;
    onCancel?: () => void;
    onMakeOffer?: () => void;
}> = ({ listing, onBuy, isOwner = false, onCancel, onMakeOffer }) => {
    
    // 獲取 NFT 戰力和詳細資訊
    const heroPower = useHeroPower(listing.nftType === 'hero' ? BigInt(listing.tokenId) : 0n);
    const partyPower = usePartyPower(listing.nftType === 'party' ? BigInt(listing.tokenId) : 0n);
    const heroDetails = useHeroDetails(listing.nftType === 'hero' ? BigInt(listing.tokenId) : 0n);
    const relicDetails = useRelicDetails(listing.nftType === 'relic' ? BigInt(listing.tokenId) : 0n);
    const partyDetails = usePartyDetails(listing.nftType === 'party' ? BigInt(listing.tokenId) : 0n);
    
    // 獲取戰力值
    const getPowerValue = () => {
        if (listing.nftType === 'hero' && heroPower.power) return heroPower.power;
        if (listing.nftType === 'party' && partyPower.power) return partyPower.power;
        return null;
    };
    
    const powerValue = getPowerValue();
    const isLoadingPower = heroPower.isLoading || partyPower.isLoading;
    
    return (
        <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors">
            <div className="aspect-square bg-gray-900 rounded mb-3 flex items-center justify-center relative">
                <span className="text-4xl">
                    {listing.nftType === 'hero' ? '⚔️' :
                     listing.nftType === 'relic' ? '🛡️' : '👥'}
                </span>
                {/* 戰力角標 */}
                {powerValue && (
                    <div className="absolute top-2 right-2 bg-[#C0A573] text-white text-xs px-2 py-1 rounded-full font-bold">
                        {powerValue.toLocaleString()}
                    </div>
                )}
                {isLoadingPower && (
                    <div className="absolute top-2 right-2 bg-gray-600 text-white text-xs px-2 py-1 rounded-full">
                        <LoadingSpinner size="xs" />
                    </div>
                )}
            </div>
            
            <div className="space-y-2">
                <h3 className="font-bold text-white">
                    {listing.nftType === 'hero' ? '英雄' :
                     listing.nftType === 'relic' ? '聖物' : '隊伍'} #{listing.tokenId.toString()}
                </h3>
                
                {/* NFT 詳細資訊 */}
                {listing.nftType === 'hero' && heroDetails.details && (
                    <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-400">等級</span>
                            <span className="text-white">Lv.{heroDetails.details.level}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">職業</span>
                            <span className="text-white">{getClassName(heroDetails.details.heroClass)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">元素</span>
                            <span className="text-white">{getElementName(heroDetails.details.element)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">品階</span>
                            <span className="text-white">T{heroDetails.details.tier}</span>
                        </div>
                    </div>
                )}
                
                {listing.nftType === 'relic' && relicDetails.details && (
                    <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-400">類別</span>
                            <span className="text-white">{getRelicCategoryName(relicDetails.details.category)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">品階</span>
                            <span className="text-white">T{relicDetails.details.tier}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">容量</span>
                            <span className="text-white">{relicDetails.details.capacity}</span>
                        </div>
                    </div>
                )}
                
                {listing.nftType === 'party' && partyDetails.details && (
                    <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-400">英雄數量</span>
                            <span className="text-white">{partyDetails.details.heroes.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">聖物數量</span>
                            <span className="text-white">{partyDetails.details.relics.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">總戰力</span>
                            <span className="text-[#C0A573] font-bold">{partyDetails.details.totalPower.toLocaleString()}</span>
                        </div>
                    </div>
                )}
                
                <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
                    <p>賣家: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}</p>
                    <p>時間: {new Date(listing.createdAt).toLocaleDateString()}</p>
                </div>
                
                <p className="text-lg font-bold text-white">
                    {formatSoul(listing.price.toString())} SOUL
                </p>
                
                {isOwner ? (
                    <div className="space-y-2">
                        <div className="text-xs text-green-400 font-medium">我的掛單</div>
                        <div className="flex gap-2">
                            <ActionButton
                                onClick={() => console.log('修改價格')}
                                className="flex-1 py-2 bg-blue-700 hover:bg-blue-600"
                            >
                                修改價格
                            </ActionButton>
                            <ActionButton
                                onClick={onCancel}
                                className="flex-1 py-2 bg-red-700 hover:bg-red-600"
                            >
                                取消掛單
                            </ActionButton>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <ActionButton
                            onClick={onBuy}
                            className="w-full py-2"
                        >
                            購買
                        </ActionButton>
                        <ActionButton
                            onClick={onMakeOffer}
                            className="w-full py-2 bg-blue-700 hover:bg-blue-600"
                        >
                            出價
                        </ActionButton>
                    </div>
                )}
            </div>
        </div>
    );
};

// =================================================================
// Section: Main Component
// =================================================================

const MarketplacePage: React.FC = () => {
    const { address, isConnected } = useAccount();
    const { showToast } = useAppToast();
    const [page, setPage] = useState(0);
    const pageSize = 12;
    const [showCreateListing, setShowCreateListing] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [selectedListing, setSelectedListing] = useState<MarketListingType | null>(null);
    const [localListings, setLocalListings] = useState<MarketListingType[]>([]);
    const [showMyListings, setShowMyListings] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [showBatchOperations, setShowBatchOperations] = useState(false);
    const [showOffers, setShowOffers] = useState(false);
    const [showMakeOffer, setShowMakeOffer] = useState(false);
    const [selectedOfferListing, setSelectedOfferListing] = useState<MarketListingType | null>(null);
    
    const [filters, setFilters] = useState<MarketFilters>({
        nftType: 'all',
        priceRange: { min: 0, max: 1000000 },
        powerRange: { min: 0, max: 10000 },
        sortBy: 'newest',
        sortOrder: 'desc',
        searchTerm: ''
    });
    
    // 獲取用戶的 NFT
    const { data: userNfts, isLoading: isLoadingNfts, refetch: refetchNfts } = useQuery({
        queryKey: ['ownedNfts', address],
        queryFn: () => fetchAllOwnedNfts(address!),
        enabled: !!address,
        gcTime: 5 * 60 * 1000,
        staleTime: 30 * 1000,
    });
    
    // 監聽本地存儲變化
    React.useEffect(() => {
        const loadListings = () => {
            setLocalListings(getLocalListings());
        };
        
        loadListings();
        
        const handleStorageUpdate = () => {
            loadListings();
        };
        
        window.addEventListener('marketplaceUpdate', handleStorageUpdate);
        return () => {
            window.removeEventListener('marketplaceUpdate', handleStorageUpdate);
        };
    }, []);
    
    // 處理和篩選掛單數據
    const filteredListings = useMemo(() => {
        let filtered = localListings.filter(listing => listing.status === 'active');
        
        // 如果顯示「我的掛單」，只顯示當前用戶的掛單
        if (showMyListings && address) {
            filtered = filtered.filter(listing => 
                listing.seller.toLowerCase() === address.toLowerCase()
            );
        }
        
        // 按類型篩選
        if (filters.nftType !== 'all') {
            filtered = filtered.filter(listing => listing.nftType === filters.nftType);
        }
        
        // 按價格範圍篩選
        if (filters.priceRange.min > 0 || filters.priceRange.max < 1000000) {
            filtered = filtered.filter(listing => {
                const price = Number(listing.price);
                return price >= filters.priceRange.min && price <= filters.priceRange.max;
            });
        }
        
        // 按戰力範圍篩選 (需要異步獲取戰力數據，這裡先跳過)
        // TODO: 實現戰力篩選邏輯
        
        // 按搜尋詞篩選
        if (filters.searchTerm.trim()) {
            const searchTerm = filters.searchTerm.toLowerCase().trim();
            filtered = filtered.filter(listing => {
                // 搜尋 Token ID
                if (listing.tokenId.toString().includes(searchTerm)) {
                    return true;
                }
                // 搜尋賣家地址
                if (listing.seller.toLowerCase().includes(searchTerm)) {
                    return true;
                }
                // 搜尋合約地址
                if (listing.contractAddress.toLowerCase().includes(searchTerm)) {
                    return true;
                }
                return false;
            });
        }
        
        // 排序
        filtered.sort((a, b) => {
            switch (filters.sortBy) {
                case 'price':
                    const priceA = Number(a.price);
                    const priceB = Number(b.price);
                    return filters.sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
                case 'newest':
                    return filters.sortOrder === 'asc' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt;
                case 'power':
                    // TODO: 實現戰力排序，需要異步獲取戰力數據
                    return 0;
                default:
                    return 0;
            }
        });
        
        return filtered;
    }, [localListings, filters, showMyListings, address]);
    
    const handleBuy = (listing: MarketListingType) => {
        setSelectedListing(listing);
        setShowPurchaseModal(true);
    };
    
    const handleMakeOffer = (listing: MarketListingType) => {
        setSelectedOfferListing(listing);
        setShowMakeOffer(true);
    };
    
    const handleListingCreated = () => {
        // 重新載入掛單列表
        setLocalListings(getLocalListings());
        refetchNfts(); // 重新載入用戶 NFT，因為可能有變化
    };
    
    const handlePurchaseComplete = () => {
        // 重新載入掛單列表和用戶 NFT
        setLocalListings(getLocalListings());
        refetchNfts();
        setSelectedListing(null);
    };
    
    const handleCancelListing = (listingId: string) => {
        try {
            // 從本地存儲移除掛單
            const existingListings = getLocalListings();
            const updatedListings = existingListings.map(listing => 
                listing.id === listingId ? { ...listing, status: 'cancelled' as const } : listing
            );
            
            localStorage.setItem('marketplace_listings', JSON.stringify(updatedListings));
            
            // 觸發更新事件
            window.dispatchEvent(new Event('marketplaceUpdate'));
            
            showToast('成功取消掛單', 'success');
        } catch (error) {
            showToast(`取消掛單失敗: ${error}`, 'error');
        }
    };
    
    if (!isConnected) {
        return <EmptyState message="請先連接錢包以訪問市場" />;
    }
    
    return (
        <ErrorBoundary>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">內部市場</h1>
                        <p className="text-gray-400 mt-1">直接交易英雄、聖物和隊伍</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <MarketplaceNotifications />
                        <ActionButton
                            className="px-4 py-2"
                            onClick={() => setShowStats(!showStats)}
                        >
                            <Icons.TrendingUp className="h-4 w-4 mr-2" />
                            {showStats ? '隱藏統計' : '市場統計'}
                        </ActionButton>
                        <ActionButton
                            className="px-4 py-2"
                            onClick={() => setShowOffers(!showOffers)}
                        >
                            <Icons.DollarSign className="h-4 w-4 mr-2" />
                            {showOffers ? '隱藏出價' : '出價管理'}
                        </ActionButton>
                        <ActionButton
                            className="px-4 py-2"
                            onClick={() => setShowMyListings(!showMyListings)}
                        >
                            <Icons.List className="h-4 w-4 mr-2" />
                            {showMyListings ? '所有掛單' : '我的掛單'}
                        </ActionButton>
                        <ActionButton
                            className="px-4 py-2"
                            onClick={() => setShowBatchOperations(true)}
                        >
                            <Icons.Package className="h-4 w-4 mr-2" />
                            批量操作
                        </ActionButton>
                        <ActionButton
                            className="px-4 py-2"
                            onClick={() => setShowCreateListing(true)}
                        >
                            <Icons.Plus className="h-4 w-4 mr-2" />
                            創建掛單
                        </ActionButton>
                    </div>
                </div>
                
                {/* Filters */}
                <MarketplaceHeader
                    filters={filters}
                    onFiltersChange={setFilters}
                />
                
                {/* Market Statistics */}
                {showStats && (
                    <MarketStats className="mb-6" />
                )}
                
                {/* Offers Panel */}
                {showOffers && (
                    <OffersPanel className="mb-6" />
                )}
                
                {/* Stats Summary */}
                <div className="flex items-center justify-between text-sm text-gray-400">
                    <div>
                        {showMyListings ? (
                            <span>我的掛單：共 {filteredListings.length} 個</span>
                        ) : (
                            <span>顯示 {filteredListings.length} 個掛單</span>
                        )}
                        {filteredListings.length > 0 && (
                            <span className="ml-4">
                                第 {page * pageSize + 1}-{Math.min((page + 1) * pageSize, filteredListings.length)} 個
                            </span>
                        )}
                    </div>
                    {showMyListings && address && (
                        <div className="text-xs">
                            <span className="text-green-400">
                                我的錢包：{address.slice(0, 6)}...{address.slice(-4)}
                            </span>
                        </div>
                    )}
                </div>
                
                {/* Listings Grid */}
                {filteredListings.length === 0 ? (
                    <EmptyState 
                        message={showMyListings ? "您還沒有任何掛單" : "目前沒有符合條件的掛單"} 
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredListings.slice(page * pageSize, (page + 1) * pageSize).map(listing => {
                            const isOwner = address && listing.seller.toLowerCase() === address.toLowerCase();
                            return (
                                <ListingCard
                                    key={listing.id}
                                    listing={listing}
                                    onBuy={() => handleBuy(listing)}
                                    isOwner={isOwner}
                                    onCancel={() => handleCancelListing(listing.id)}
                                    onMakeOffer={() => handleMakeOffer(listing)}
                                />
                            );
                        })}
                    </div>
                )}
                
                {/* Pagination */}
                {filteredListings.length > pageSize && (
                    <div className="flex justify-center gap-2">
                        <ActionButton
                            onClick={() => setPage(Math.max(0, page - 1))}
                            disabled={page === 0}
                            className="px-4 py-2"
                        >
                            上一頁
                        </ActionButton>
                        <span className="py-2 px-4 text-gray-400">
                            第 {page + 1} 頁 / 共 {Math.ceil(filteredListings.length / pageSize)} 頁
                        </span>
                        <ActionButton
                            onClick={() => setPage(page + 1)}
                            disabled={(page + 1) * pageSize >= filteredListings.length}
                            className="px-4 py-2"
                        >
                            下一頁
                        </ActionButton>
                    </div>
                )}
                
                {/* Create Listing Modal */}
                {userNfts && (
                    <CreateListingModal
                        isOpen={showCreateListing}
                        onClose={() => setShowCreateListing(false)}
                        userNfts={userNfts}
                        onListingCreated={handleListingCreated}
                    />
                )}
                
                {/* Purchase Modal */}
                <PurchaseModal
                    isOpen={showPurchaseModal}
                    onClose={() => {
                        setShowPurchaseModal(false);
                        setSelectedListing(null);
                    }}
                    listing={selectedListing}
                    onPurchaseComplete={handlePurchaseComplete}
                />
                
                {/* Batch Operations Modal */}
                {userNfts && (
                    <BatchOperations
                        isOpen={showBatchOperations}
                        onClose={() => setShowBatchOperations(false)}
                        userNfts={userNfts}
                        userListings={localListings.filter(l => 
                            address && l.seller.toLowerCase() === address.toLowerCase()
                        )}
                        onBatchComplete={() => {
                            setLocalListings(getLocalListings());
                            refetchNfts();
                        }}
                    />
                )}

                {/* Make Offer Modal */}
                <MakeOfferModal
                    isOpen={showMakeOffer}
                    onClose={() => {
                        setShowMakeOffer(false);
                        setSelectedOfferListing(null);
                    }}
                    listing={selectedOfferListing}
                    onOfferSubmitted={() => {
                        // Refresh offers in OffersPanel
                        window.dispatchEvent(new Event('offersUpdate'));
                    }}
                />

                {/* Development Tools */}
                <MarketplaceDevTools />
            </div>
        </ErrorBoundary>
    );
};

export default MarketplacePage;