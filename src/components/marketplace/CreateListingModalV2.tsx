// src/components/marketplace/CreateListingModalV2.tsx
// 整合批量功能的創建掛單模態框組件

import React, { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { ActionButton } from '../ui/ActionButton';
import { Icons } from '../ui/icons';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Modal } from '../ui/Modal';
import type { HeroNft, RelicNft, PartyNft, NftType } from '../../types/nft';
import { formatSoul } from '../../utils/formatters';
import { useAppToast } from '../../contexts/SimpleToastContext';
import { useMarketplaceV2 } from '../../hooks/useMarketplaceV2Contract';
import { useHeroPower, usePartyPower, useHeroDetails, useRelicDetails, usePartyDetails, getElementName, getClassName, getRelicCategoryName } from '../../hooks/useNftPower';
import { StablecoinSelector } from './StablecoinSelector';
import type { StablecoinSymbol } from '../../hooks/useMarketplaceV2Contract';
import { emitListingCreated } from '../../utils/marketplaceEvents';
import { CONTRACT_ADDRESSES } from '../../config/contracts';

interface CreateListingModalV2Props {
    isOpen: boolean;
    onClose: () => void;
    userNfts: {
        heros?: HeroNft[];
        relics?: RelicNft[];
        parties?: PartyNft[];
    };
    onListingCreated?: () => void;
}

interface ListingItem {
    nft: HeroNft | RelicNft | PartyNft;
    price: string;
    selected: boolean;
}

type SortType = 'power' | 'rarity' | 'id';
type SortOrder = 'asc' | 'desc';

export const CreateListingModalV2: React.FC<CreateListingModalV2Props> = ({
    isOpen,
    onClose,
    userNfts,
    onListingCreated
}) => {
    const { address } = useAccount();
    const { showToast } = useAppToast();
    const {
        createListing,
        checkNFTApproval,
        approveNFT,
        isProcessing
    } = useMarketplaceV2();
    
    const [selectedType, setSelectedType] = useState<NftType>('hero');
    const [acceptedTokens, setAcceptedTokens] = useState<StablecoinSymbol[]>(['USDT']);
    const [listingItems, setListingItems] = useState<ListingItem[]>([]);
    const [bulkPrice, setBulkPrice] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortType, setSortType] = useState<SortType>('power');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [rarityFilter, setRarityFilter] = useState<number[]>([]);
    
    const itemsPerPage = 10;
    
    // 初始化列表項目
    React.useEffect(() => {
        if (isOpen) {
            let nfts: (HeroNft | RelicNft | PartyNft)[] = [];
            
            switch (selectedType) {
                case 'hero':
                    nfts = userNfts.heros || [];
                    break;
                case 'relic':
                    nfts = userNfts.relics || [];
                    break;
                case 'party':
                    nfts = userNfts.parties || [];
                    break;
            }
            
            // 過濾掉沒有 id 的 NFT
            const validNfts = nfts.filter(nft => nft.id);
            
            setListingItems(validNfts.map(nft => ({
                nft,
                price: '',
                selected: false
            })));
            setCurrentPage(1);
        }
    }, [isOpen, selectedType, userNfts]);
    
    // 篩選和排序
    const filteredAndSortedItems = useMemo(() => {
        let items = [...listingItems];
        
        // 稀有度篩選
        if (rarityFilter.length > 0) {
            items = items.filter(item => {
                if ('rarity' in item.nft && item.nft.rarity !== undefined) {
                    return rarityFilter.includes(Number(item.nft.rarity));
                }
                return false;
            });
        }
        
        // 排序
        items.sort((a, b) => {
            let aValue = 0;
            let bValue = 0;
            
            switch (sortType) {
                case 'power':
                    aValue = 'power' in a.nft ? (a.nft.power || 0) : 0;
                    bValue = 'power' in b.nft ? (b.nft.power || 0) : 0;
                    break;
                case 'rarity':
                    aValue = 'rarity' in a.nft ? (a.nft.rarity || 0) : 0;
                    bValue = 'rarity' in b.nft ? (b.nft.rarity || 0) : 0;
                    break;
                case 'id':
                    aValue = Number(a.nft.id) || 0;
                    bValue = Number(b.nft.id) || 0;
                    break;
            }
            
            return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
        });
        
        return items;
    }, [listingItems, rarityFilter, sortType, sortOrder]);
    
    // 分頁
    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedItems.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAndSortedItems, currentPage]);
    
    const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage);
    
    // 選中的項目
    const selectedItems = useMemo(() => {
        return listingItems.filter(item => item.selected && item.price);
    }, [listingItems]);
    
    // 切換選擇
    const toggleItemSelection = (nft: HeroNft | RelicNft | PartyNft) => {
        setListingItems(items => items.map((item) => 
            item.nft.id === nft.id && item.nft.type === nft.type ? { 
                ...item, 
                selected: !item.selected,
                price: !item.selected && !item.price ? bulkPrice : item.price
            } : item
        ));
    };
    
    // 更新價格
    const updateItemPrice = (nft: HeroNft | RelicNft | PartyNft, price: string) => {
        setListingItems(items => items.map((item) => 
            item.nft.id === nft.id && item.nft.type === nft.type ? { ...item, price } : item
        ));
    };
    
    // 應用批量價格
    const applyBulkPrice = () => {
        if (!bulkPrice) return;
        
        setListingItems(items => items.map(item => 
            item.selected ? { ...item, price: bulkPrice } : item
        ));
    };
    
    // 全選/取消全選
    const toggleSelectAll = () => {
        const allSelected = paginatedItems.every(item => item.selected);
        const paginatedNftIds = paginatedItems.map(item => ({ id: item.nft.id, type: item.nft.type }));
        
        setListingItems(items => items.map((item) => {
            const isInCurrentPage = paginatedNftIds.some(
                nft => nft.id === item.nft.id && nft.type === item.nft.type
            );
            if (isInCurrentPage) {
                return {
                    ...item,
                    selected: !allSelected,
                    price: !allSelected && !item.price ? bulkPrice : item.price
                };
            }
            return item;
        }));
    };
    
    // 創建掛單
    const handleCreateListings = async () => {
        if (selectedItems.length === 0) {
            showToast('請選擇要掛單的 NFT 並設定價格', 'error');
            return;
        }
        
        if (acceptedTokens.length === 0) {
            showToast('請選擇接受的支付幣種', 'error');
            return;
        }
        
        try {
            let successCount = 0;
            
            for (const item of selectedItems) {
                const success = await createListing(item.nft, item.price, acceptedTokens);
                
                if (success) {
                    successCount++;
                    // 觸發通知事件
                    emitListingCreated({
                        nftType: item.nft.type,
                        tokenId: item.nft.id?.toString() || 'Unknown',
                        price: item.price,
                        seller: address
                    });
                }
            }
            
            if (successCount > 0) {
                showToast(`成功創建 ${successCount} 個掛單！`, 'success');
                onListingCreated?.();
                onClose();
            } else {
                showToast('創建掛單失敗', 'error');
            }
        } catch (error) {
            showToast(`創建掛單失敗: ${error}`, 'error');
        }
    };
    
    // NFT 卡片組件
    const NftCard = ({ item }: { item: ListingItem }) => {
        const safeTokenId = item.nft.id ? BigInt(item.nft.id) : 0n;
        const heroPower = useHeroPower(item.nft.type === 'hero' ? safeTokenId : 0n);
        const partyPower = usePartyPower(item.nft.type === 'party' ? safeTokenId : 0n);
        const heroDetails = useHeroDetails(item.nft.type === 'hero' ? safeTokenId : 0n);
        const relicDetails = useRelicDetails(item.nft.type === 'relic' ? safeTokenId : 0n);
        
        const powerValue = item.nft.type === 'hero' ? heroPower.power : 
                          item.nft.type === 'party' ? partyPower.power : null;
        
        const getRarityStars = (rarity: number) => {
            return '★'.repeat(rarity) + '☆'.repeat(5 - rarity);
        };
        
        return (
            <div
                onClick={() => toggleItemSelection(item.nft)}
                className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    item.selected
                        ? 'border-[#C0A573] bg-gray-700/50 ring-1 ring-[#C0A573]/50'
                        : 'border-gray-600 hover:border-gray-500 bg-gray-800/30'
                }`}
            >
                <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => {}} // 由卡片點擊處理
                        className="w-4 h-4 text-[#C0A573] bg-gray-700 border-gray-600 rounded focus:ring-[#C0A573] pointer-events-none"
                    />
                    
                    {/* NFT 圖片 */}
                    <div className="w-16 h-16 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0">
                        {item.nft.image ? (
                            <img 
                                src={item.nft.image} 
                                alt={item.nft.name || `${item.nft.type} #${item.nft.id}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.nextElementSibling;
                                    if (fallback) fallback.classList.remove('hidden');
                                }}
                            />
                        ) : null}
                        <div className={`w-full h-full flex items-center justify-center text-2xl ${item.nft.image ? 'hidden' : ''}`}>
                            {item.nft.type === 'hero' ? '⚔️' :
                             item.nft.type === 'relic' ? '🛡️' : '👥'}
                        </div>
                    </div>
                    
                    {/* NFT 信息 */}
                    <div className="flex-1">
                        <div className="font-medium text-white">
                            {item.nft.name || `${item.nft.type === 'hero' ? '英雄' : item.nft.type === 'relic' ? '聖物' : '隊伍'} #${item.nft.id}`}
                        </div>
                        
                        {/* 屬性 */}
                        <div className="flex items-center gap-3 mt-1">
                            {'rarity' in item.nft && item.nft.rarity !== undefined && (
                                <span className="text-xs text-yellow-400">
                                    {getRarityStars(Number(item.nft.rarity))}
                                </span>
                            )}
                            
                            
                            {item.nft.type === 'hero' && powerValue !== null && (
                                <span className="text-xs text-[#C0A573] font-bold">
                                    戰力 {powerValue.toLocaleString()}
                                </span>
                            )}
                            
                            {item.nft.type === 'relic' && relicDetails.details && (
                                <span className="text-xs text-blue-400">
                                    容量 {relicDetails.details.capacity}
                                </span>
                            )}
                            
                            {item.nft.type === 'party' && powerValue !== null && (
                                <span className="text-xs text-[#C0A573] font-bold">
                                    戰力 {powerValue.toLocaleString()}
                                </span>
                            )}
                        </div>
                    </div>
                    
                    {/* 價格輸入 */}
                    <div className="w-32" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateItemPrice(item.nft, e.target.value)}
                            placeholder="USD 價格"
                            className="w-full px-2 py-1 bg-gray-800 text-white rounded border border-gray-600 focus:border-[#C0A573] focus:outline-none text-sm"
                            step="0.1"
                            min="0.1"
                        />
                        {item.price && (
                            <p className="text-xs text-gray-400 mt-0.5">
                                ${parseFloat(item.price).toFixed(2)}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    };
    
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="🏪 創建掛單"
            onConfirm={handleCreateListings}
            confirmText={isProcessing ? '處理中...' : 
                        selectedItems.length > 0 ? `確認創建 ${selectedItems.length} 個掛單` : '確認創建'}
            maxWidth="4xl"
            disabled={selectedItems.length === 0 || acceptedTokens.length === 0 || isProcessing}
            isLoading={isProcessing}
        >
            <div className="space-y-4">
                
                {/* NFT 類型選擇 */}
                <div>
                    <label className="block text-gray-400 mb-2">選擇類型</label>
                    <div className="flex gap-2">
                        {(['hero', 'relic', 'party'] as NftType[]).map(type => (
                            <button
                                key={type}
                                onClick={() => {
                                    setSelectedType(type);
                                    setRarityFilter([]);
                                }}
                                className={`px-4 py-2 rounded font-medium transition-colors ${
                                    selectedType === type
                                        ? 'bg-[#C0A573] text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                {type === 'hero' ? '⚔️ 英雄' :
                                 type === 'relic' ? '🛡️ 聖物' : '👥 隊伍'}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* 篩選和排序 */}
                <div className="flex flex-wrap gap-4 items-center">
                    {/* 稀有度篩選 */}
                    <div>
                        <label className="block text-gray-400 mb-1 text-sm">稀有度篩選</label>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(rarity => (
                                <button
                                    key={rarity}
                                    onClick={() => {
                                        setRarityFilter(prev => 
                                            prev.includes(rarity) 
                                                ? prev.filter(r => r !== rarity)
                                                : [...prev, rarity]
                                        );
                                    }}
                                    className={`px-2 py-1 text-sm rounded transition-colors ${
                                        rarityFilter.includes(rarity)
                                            ? 'bg-yellow-600 text-white'
                                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                    }`}
                                >
                                    {'★'.repeat(rarity)}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* 排序 */}
                    <div className="flex gap-2 items-end">
                        <div>
                            <label className="block text-gray-400 mb-1 text-sm">排序方式</label>
                            <select
                                value={sortType}
                                onChange={(e) => setSortType(e.target.value as SortType)}
                                className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#C0A573] focus:outline-none text-sm"
                            >
                                <option value="power">戰力</option>
                                <option value="rarity">稀有度</option>
                                <option value="id">編號</option>
                            </select>
                        </div>
                        
                        <button
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                        >
                            {sortOrder === 'desc' ? '↓ 降序' : '↑ 升序'}
                        </button>
                    </div>
                </div>
                
                {/* 批量價格設定 */}
                <div className="p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex gap-3 items-end">
                        <div className="flex-1">
                            <label className="block text-gray-400 mb-1 text-sm">批量設定價格</label>
                            <input
                                type="number"
                                value={bulkPrice}
                                onChange={(e) => setBulkPrice(e.target.value)}
                                placeholder="輸入統一價格"
                                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-[#C0A573] focus:outline-none"
                                step="0.1"
                                min="0.1"
                            />
                        </div>
                        <ActionButton
                            onClick={applyBulkPrice}
                            disabled={!bulkPrice || selectedItems.length === 0}
                            className="px-4 py-2"
                        >
                            應用到選中項目
                        </ActionButton>
                    </div>
                </div>
                
                {/* 支付幣種選擇 */}
                <div>
                    <label className="block text-gray-400 mb-2">選擇接受的支付幣種</label>
                    <StablecoinSelector
                        selectedTokens={acceptedTokens}
                        onToggle={(token) => {
                            // 修復單選邏輯：如果已選中則取消，未選中則選擇
                            if (acceptedTokens.includes(token)) {
                                setAcceptedTokens([]);
                            } else {
                                setAcceptedTokens([token]);
                            }
                        }}
                        mode="single"
                        address={address}
                    />
                </div>
                
                {/* NFT 列表 */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-medium">
                            選擇 NFT ({selectedItems.length}/{filteredAndSortedItems.length})
                        </h3>
                        <ActionButton
                            onClick={toggleSelectAll}
                            className="px-3 py-1 text-sm"
                        >
                            {paginatedItems.every(item => item.selected) ? '取消全選' : '全選本頁'}
                        </ActionButton>
                    </div>
                    
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {paginatedItems.map((item) => (
                            <NftCard key={`${item.nft.type}-${item.nft.id}`} item={item} />
                        ))}
                    </div>
                    
                    {filteredAndSortedItems.length === 0 && (
                        <p className="text-gray-500 text-center py-8">
                            沒有可出售的 {selectedType === 'hero' ? '英雄' :
                                         selectedType === 'relic' ? '聖物' : '隊伍'}
                        </p>
                    )}
                </div>
                
                {/* 分頁 */}
                {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500"
                        >
                            ← 上一頁
                        </button>
                        
                        <span className="px-3 py-1 text-white">
                            {currentPage} / {totalPages}
                        </span>
                        
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500"
                        >
                            下一頁 →
                        </button>
                    </div>
                )}
                
                {/* 預覽 */}
                {selectedItems.length > 0 && (
                    <div className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
                        <div className="text-blue-400">
                            即將創建 {selectedItems.length} 個掛單，
                            總價值約 ${selectedItems.reduce((sum, item) => 
                                sum + parseFloat(item.price || '0'), 0
                            ).toFixed(2)} USD
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                            接受支付：{acceptedTokens.join(', ')}
                        </div>
                    </div>
                )}
                
            </div>
        </Modal>
    );
};