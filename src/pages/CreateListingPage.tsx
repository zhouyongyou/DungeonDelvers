// src/pages/CreateListingPage.tsx
// 創建掛單頁面 - 全頁面版本，提供更好的體驗

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ActionButton } from '../components/ui/ActionButton';
import { Icons } from '../components/ui/icons';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import type { HeroNft, RelicNft, PartyNft, NftType } from '../types/nft';
import { useAppToast } from '../contexts/SimpleToastContext';
import { useMarketplaceV2 } from '../hooks/useMarketplaceV2Contract';
import { useHeroPower, usePartyPower, useHeroDetails, useRelicDetails, usePartyDetails, getElementName, getClassName, getRelicCategoryName } from '../hooks/useNftPower';
import { StablecoinSelector } from '../components/marketplace/StablecoinSelector';
import type { StablecoinSymbol } from '../hooks/useMarketplaceV2Contract';
import { emitListingCreated } from '../utils/marketplaceEvents';
import { useEnhancedNfts } from '../hooks/useEnhancedNfts';

interface ListingItem {
    nft: HeroNft | RelicNft | PartyNft;
    price: string;
    selected: boolean;
}

type SortType = 'power' | 'rarity' | 'id';
type SortOrder = 'asc' | 'desc';

const CreateListingPage: React.FC = () => {
    const navigate = useNavigate();
    const { address, isConnected, chain } = useAccount();
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
    
    const itemsPerPage = 20; // 全頁面顯示更多項目
    
    // 獲取用戶的 NFT
    const { data: userNfts, isLoading: isLoadingNfts } = useEnhancedNfts({
        owner: address,
        chainId: chain?.id || 56
    });
    
    // 初始化列表項目
    React.useEffect(() => {
        if (!userNfts) return;
        
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
    }, [selectedType, userNfts]);
    
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
                navigate('/marketplace'); // 返回市場頁面
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
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    item.selected
                        ? 'border-[#C0A573] bg-gray-700/50 ring-1 ring-[#C0A573]/50'
                        : 'border-gray-600 hover:border-gray-500 bg-gray-800/30'
                }`}
            >
                <div className="flex items-center gap-4">
                    {/* Checkbox */}
                    <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => {}} // 由卡片點擊處理
                        className="w-5 h-5 text-[#C0A573] bg-gray-700 border-gray-600 rounded focus:ring-[#C0A573] pointer-events-none"
                    />
                    
                    {/* NFT 圖片 */}
                    <div className="w-20 h-20 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0">
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
                        <div className={`w-full h-full flex items-center justify-center text-3xl ${item.nft.image ? 'hidden' : ''}`}>
                            {item.nft.type === 'hero' ? '⚔️' :
                             item.nft.type === 'relic' ? '🛡️' : '👥'}
                        </div>
                    </div>
                    
                    {/* NFT 信息 */}
                    <div className="flex-1">
                        <div className="font-medium text-white text-lg">
                            {item.nft.name || `${item.nft.type === 'hero' ? '英雄' : item.nft.type === 'relic' ? '聖物' : '隊伍'} #${item.nft.id}`}
                        </div>
                        
                        {/* 屬性 */}
                        <div className="flex items-center gap-4 mt-2">
                            {'rarity' in item.nft && item.nft.rarity !== undefined && (
                                <span className="text-sm text-yellow-400">
                                    {getRarityStars(Number(item.nft.rarity))}
                                </span>
                            )}
                            
                            {item.nft.type === 'hero' && powerValue !== null && (
                                <span className="text-sm text-[#C0A573] font-bold">
                                    戰力 {powerValue.toLocaleString()}
                                </span>
                            )}
                            
                            {item.nft.type === 'relic' && relicDetails.details && (
                                <span className="text-sm text-blue-400">
                                    容量 {relicDetails.details.capacity}
                                </span>
                            )}
                            
                            {item.nft.type === 'party' && powerValue !== null && (
                                <span className="text-sm text-[#C0A573] font-bold">
                                    戰力 {powerValue.toLocaleString()}
                                </span>
                            )}
                        </div>
                    </div>
                    
                    {/* 價格輸入 */}
                    <div className="w-40" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateItemPrice(item.nft, e.target.value)}
                            placeholder="USD 價格"
                            className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-[#C0A573] focus:outline-none"
                            step="0.1"
                            min="0.1"
                        />
                        {item.price && (
                            <p className="text-sm text-gray-400 mt-1">
                                ${parseFloat(item.price).toFixed(2)}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    };
    
    if (!isConnected) {
        return <EmptyState message="請先連接錢包以創建掛單" />;
    }
    
    if (isLoadingNfts) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        );
    }
    
    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* 頁面標題 */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Icons.Plus className="h-8 w-8 text-[#C0A573]" />
                    創建掛單
                </h1>
                <ActionButton
                    onClick={() => navigate('/marketplace')}
                    variant="secondary"
                    className="px-4 py-2"
                >
                    <Icons.ArrowLeft className="h-4 w-4 mr-2" />
                    返回市場
                </ActionButton>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* 左側控制面板 */}
                <div className="lg:col-span-1 space-y-6">
                    {/* NFT 類型選擇 */}
                    <div className="bg-gray-800 rounded-lg p-4">
                        <label className="block text-gray-400 mb-3">選擇類型</label>
                        <div className="space-y-2">
                            {(['hero', 'relic', 'party'] as NftType[]).map(type => (
                                <button
                                    key={type}
                                    onClick={() => {
                                        setSelectedType(type);
                                        setRarityFilter([]);
                                    }}
                                    className={`w-full px-4 py-3 rounded font-medium transition-colors text-left ${
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
                    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
                        {/* 稀有度篩選 */}
                        <div>
                            <label className="block text-gray-400 mb-2 text-sm">稀有度篩選</label>
                            <div className="grid grid-cols-5 gap-1">
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
                                        {rarity}★
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        {/* 排序 */}
                        <div>
                            <label className="block text-gray-400 mb-2 text-sm">排序方式</label>
                            <select
                                value={sortType}
                                onChange={(e) => setSortType(e.target.value as SortType)}
                                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#C0A573] focus:outline-none"
                            >
                                <option value="power">戰力</option>
                                <option value="rarity">稀有度</option>
                                <option value="id">編號</option>
                            </select>
                            
                            <button
                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                className="w-full mt-2 px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                            >
                                {sortOrder === 'desc' ? '↓ 降序' : '↑ 升序'}
                            </button>
                        </div>
                    </div>
                    
                    {/* 批量價格設定 */}
                    <div className="bg-gray-800 rounded-lg p-4">
                        <h3 className="text-white font-medium mb-3">批量設定價格</h3>
                        <input
                            type="number"
                            value={bulkPrice}
                            onChange={(e) => setBulkPrice(e.target.value)}
                            placeholder="輸入統一價格"
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#C0A573] focus:outline-none mb-3"
                            step="0.1"
                            min="0.1"
                        />
                        <ActionButton
                            onClick={applyBulkPrice}
                            disabled={!bulkPrice || selectedItems.length === 0}
                            className="w-full"
                        >
                            應用到選中項目
                        </ActionButton>
                    </div>
                    
                    {/* 支付幣種選擇 */}
                    <div className="bg-gray-800 rounded-lg p-4">
                        <h3 className="text-white font-medium mb-3">接受的支付幣種</h3>
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
                </div>
                
                {/* 右側 NFT 列表 */}
                <div className="lg:col-span-3">
                    <div className="bg-gray-800 rounded-lg p-6">
                        {/* 列表頭部 */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-white">
                                選擇 NFT ({selectedItems.length}/{filteredAndSortedItems.length})
                            </h2>
                            <ActionButton
                                onClick={toggleSelectAll}
                                variant="secondary"
                                className="px-4 py-2"
                            >
                                {paginatedItems.every(item => item.selected) ? '取消全選' : '全選本頁'}
                            </ActionButton>
                        </div>
                        
                        {/* NFT 列表 */}
                        <div className="space-y-3 mb-6">
                            {paginatedItems.map((item) => (
                                <NftCard key={`${item.nft.type}-${item.nft.id}`} item={item} />
                            ))}
                        </div>
                        
                        {filteredAndSortedItems.length === 0 && (
                            <EmptyState 
                                message={`沒有可出售的${selectedType === 'hero' ? '英雄' : selectedType === 'relic' ? '聖物' : '隊伍'}`} 
                            />
                        )}
                        
                        {/* 分頁 */}
                        {totalPages > 1 && (
                            <div className="flex justify-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500"
                                >
                                    ← 上一頁
                                </button>
                                
                                <span className="px-4 py-2 text-white">
                                    {currentPage} / {totalPages}
                                </span>
                                
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500"
                                >
                                    下一頁 →
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {/* 底部操作區 */}
                    <div className="mt-6 bg-gray-800 rounded-lg p-6">
                        {/* 預覽 */}
                        {selectedItems.length > 0 && (
                            <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                                <div className="text-blue-400 text-lg">
                                    即將創建 {selectedItems.length} 個掛單
                                </div>
                                <div className="text-white text-2xl font-bold mt-1">
                                    總價值約 ${selectedItems.reduce((sum, item) => 
                                        sum + parseFloat(item.price || '0'), 0
                                    ).toFixed(2)} USD
                                </div>
                                <div className="text-sm text-gray-400 mt-2">
                                    接受支付：{acceptedTokens.join(', ')}
                                </div>
                            </div>
                        )}
                        
                        {/* 操作按鈕 */}
                        <div className="flex gap-4">
                            <ActionButton
                                onClick={() => navigate('/marketplace')}
                                variant="secondary"
                                className="flex-1 py-3"
                            >
                                取消
                            </ActionButton>
                            <ActionButton
                                onClick={handleCreateListings}
                                disabled={selectedItems.length === 0 || acceptedTokens.length === 0 || isProcessing}
                                isLoading={isProcessing}
                                className="flex-1 py-3"
                            >
                                {isProcessing ? '處理中...' : 
                                 selectedItems.length > 0 ? `確認創建 ${selectedItems.length} 個掛單` : '確認創建'}
                            </ActionButton>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateListingPage;