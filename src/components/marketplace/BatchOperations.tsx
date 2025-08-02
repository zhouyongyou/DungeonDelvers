// src/components/marketplace/BatchOperations.tsx
// 批量掛單和取消功能組件
// 注意：價格單位使用 USD 而非 SOUL

import React, { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import type { Address } from 'viem';
import { Icons } from '../ui/icons';
import { ActionButton } from '../ui/ActionButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Modal } from '../ui/Modal';
import { formatSoul } from '../../utils/formatters';
import { useAppToast } from '../../contexts/SimpleToastContext';
import type { HeroNft, RelicNft, PartyNft, NftType } from '../../types/nft';
import { emitListingCreated, emitListingCancelled } from '../../utils/marketplaceEvents';
import { StablecoinSelector } from './StablecoinSelector';
import type { StablecoinSymbol } from '../../hooks/useMarketplaceV2Contract';
import { useMarketplaceV2 } from '../../hooks/useMarketplaceV2Contract';

interface BatchOperationsProps {
    isOpen: boolean;
    onClose: () => void;
    userNfts: {
        heroes: HeroNft[];
        relics: RelicNft[];
        parties: PartyNft[];
    };
    userListings: any[];
    onBatchComplete?: () => void;
}

interface BatchItem {
    nft: HeroNft | RelicNft | PartyNft;
    price: string;
    selected: boolean;
}

interface BatchCancelItem {
    listing: any;
    selected: boolean;
}

export const BatchOperations: React.FC<BatchOperationsProps> = ({
    isOpen,
    onClose,
    userNfts,
    userListings,
    onBatchComplete
}) => {
    const { address } = useAccount();
    const { showToast } = useAppToast();
    const { createListing, isProcessing: isContractProcessing } = useMarketplaceV2();
    const [mode, setMode] = useState<'create' | 'cancel'>('create');
    const [isProcessing, setIsProcessing] = useState(false);
    const [batchPrice, setBatchPrice] = useState('');
    
    // Batch create state
    const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
    const [acceptedTokens, setAcceptedTokens] = useState<StablecoinSymbol[]>(['USDT']); // 預設選擇 USDT
    
    // Batch cancel state
    const [cancelItems, setCancelItems] = useState<BatchCancelItem[]>([]);
    
    // Initialize batch items when modal opens
    React.useEffect(() => {
        if (isOpen && mode === 'create') {
            const allNfts = [
                ...(userNfts?.heros || []),
                ...(userNfts?.relics || []),
                ...(userNfts?.parties || [])
                // 排除 VIP 卡片（通常不在市場上交易）
            ];
            
            // 過濾已經掛單的 NFT
            const listedTokenIds = new Set(userListings.map(l => l.tokenId?.toString()).filter(Boolean));
            const availableNfts = allNfts.filter(nft => {
                // 使用 BaseNft 的 id 而非 tokenId
                // 確保 NFT 有有效的 id 且是可交易類型
                if (!nft || !nft.id) return false;
                const nftId = nft.id.toString();
                return nftId && !listedTokenIds.has(nftId);
            });
            
            setBatchItems(availableNfts.map(nft => ({
                nft,
                price: '',
                selected: false
            })));
        } else if (isOpen && mode === 'cancel') {
            setCancelItems(userListings.map(listing => ({
                listing,
                selected: false
            })));
        }
    }, [isOpen, mode, userNfts, userListings]);
    
    const selectedCreateItems = useMemo(() => {
        return batchItems.filter(item => item.selected && item.price);
    }, [batchItems]);
    
    const selectedCancelItems = useMemo(() => {
        return cancelItems.filter(item => item.selected);
    }, [cancelItems]);
    
    const handleSelectAll = (type: 'create' | 'cancel') => {
        if (type === 'create') {
            const allSelected = batchItems.every(item => item.selected);
            setBatchItems(items => items.map(item => ({
                ...item,
                selected: !allSelected,
                price: !allSelected && !item.price ? batchPrice : item.price
            })));
        } else {
            const allSelected = cancelItems.every(item => item.selected);
            setCancelItems(items => items.map(item => ({
                ...item,
                selected: !allSelected
            })));
        }
    };
    
    const handleItemSelect = (index: number, type: 'create' | 'cancel') => {
        if (type === 'create') {
            setBatchItems(items => items.map((item, i) => 
                i === index ? { 
                    ...item, 
                    selected: !item.selected,
                    price: !item.selected && !item.price ? batchPrice : item.price
                } : item
            ));
        } else {
            setCancelItems(items => items.map((item, i) => 
                i === index ? { ...item, selected: !item.selected } : item
            ));
        }
    };
    
    const handlePriceChange = (index: number, price: string) => {
        setBatchItems(items => items.map((item, i) => 
            i === index ? { ...item, price } : item
        ));
    };
    
    const applyBatchPrice = () => {
        if (!batchPrice) return;
        
        setBatchItems(items => items.map(item => 
            item.selected ? { ...item, price: batchPrice } : item
        ));
    };
    
    const handleBatchCreate = async () => {
        if (selectedCreateItems.length === 0) {
            showToast('請選擇要掛單的 NFT', 'error');
            return;
        }
        
        setIsProcessing(true);
        
        try {
            // 批量創建掛單
            for (const item of selectedCreateItems) {
                console.log(`創建掛單: ${item.nft.type} #${item.nft.id} 價格: ${item.price} USD`);
                
                // 使用 MarketplaceV2 hook 創建掛單
                const success = await createListing(item.nft, item.price, acceptedTokens);
                
                if (success) {
                    // 觸發通知事件
                    emitListingCreated({
                        nftType: item.nft.type,
                        tokenId: item.nft.id?.toString() || 'Unknown',
                        price: item.price,
                        seller: address
                    });
                }
            }
            
            showToast(`成功創建 ${selectedCreateItems.length} 個掛單`, 'success');
            onBatchComplete?.();
            onClose();
        } catch (error) {
            showToast(`批量掛單失敗: ${error}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleBatchCancel = async () => {
        if (selectedCancelItems.length === 0) {
            showToast('請選擇要取消的掛單', 'error');
            return;
        }
        
        setIsProcessing(true);
        
        try {
            // 模擬批量取消
            for (const item of selectedCancelItems) {
                console.log(`取消掛單: ${item.listing.id}`);
                
                // 觸發通知事件
                emitListingCancelled({
                    nftType: item.listing.nftType,
                    tokenId: item.listing.tokenId?.toString() || 'Unknown',
                    price: item.listing.price?.toString(),
                    seller: address
                });
                
                // 模擬 API 延遲
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            showToast(`成功取消 ${selectedCancelItems.length} 個掛單`, 'success');
            onBatchComplete?.();
            onClose();
        } catch (error) {
            showToast(`批量取消失敗: ${error}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const primaryAction = mode === 'create' ? handleBatchCreate : handleBatchCancel;
    const isDisabled = isProcessing || isContractProcessing ||
        (mode === 'create' && (selectedCreateItems.length === 0 || acceptedTokens.length === 0)) ||
        (mode === 'cancel' && selectedCancelItems.length === 0);
    
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="🔄 批量操作"
            onConfirm={primaryAction}
            confirmText={
                isProcessing ? '處理中...' : 
                mode === 'create' ? `確認創建 ${selectedCreateItems.length} 個掛單` :
                `確認取消 ${selectedCancelItems.length} 個掛單`
            }
            maxWidth="4xl"
            disabled={isDisabled}
            isLoading={isProcessing || isContractProcessing}
            showCloseButton={!isProcessing}
        >
            <div className="space-y-6">
                
                {/* Mode Toggle */}
                <div className="flex gap-2">
                    <ActionButton
                        onClick={() => setMode('create')}
                        className={`px-4 py-2 ${
                            mode === 'create' ? 'bg-[#C0A573] text-white' : 'bg-gray-700'
                        }`}
                    >
                        <Icons.Plus className="h-4 w-4 mr-2" />
                        批量掛單
                    </ActionButton>
                    <ActionButton
                        onClick={() => setMode('cancel')}
                        className={`px-4 py-2 ${
                            mode === 'cancel' ? 'bg-[#C0A573] text-white' : 'bg-gray-700'
                        }`}
                    >
                        <Icons.X className="h-4 w-4 mr-2" />
                        批量取消
                    </ActionButton>
                </div>
                
                {/* Batch Create Mode */}
                {mode === 'create' && (
                    <div>
                        {/* Batch Price Input */}
                        <div className="p-4 bg-gray-700 rounded-lg">
                            <h3 className="text-lg font-semibold text-white mb-3">批量設定價格</h3>
                            <div className="flex gap-3 items-end">
                                <div className="flex-1">
                                    <label className="block text-gray-400 mb-2">統一價格 (USD)</label>
                                    <input
                                        type="number"
                                        value={batchPrice}
                                        onChange={(e) => setBatchPrice(e.target.value)}
                                        placeholder="輸入統一價格"
                                        className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-[#C0A573] focus:outline-none"
                                        step="0.01"
                                        min="0"
                                    />
                                    {batchPrice && (
                                        <p className="text-sm text-gray-400 mt-1">
                                            ${parseFloat(batchPrice).toFixed(2)} USD
                                        </p>
                                    )}
                                </div>
                                <ActionButton
                                    onClick={applyBatchPrice}
                                    disabled={!batchPrice}
                                    className="px-4 py-2"
                                >
                                    應用到選中項目
                                </ActionButton>
                            </div>
                        </div>
                        
                        {/* NFT Selection */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold text-white">
                                    選擇 NFT ({selectedCreateItems.length}/{batchItems.length})
                                </h3>
                                <ActionButton
                                    onClick={() => handleSelectAll('create')}
                                    className="px-3 py-1 text-sm"
                                >
                                    {batchItems.every(item => item.selected) ? '取消全選' : '全選'}
                                </ActionButton>
                            </div>
                            
                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {batchItems.map((item, index) => (
                                    <div
                                        key={`${item.nft.type}-${item.nft.id}`}
                                        onClick={() => handleItemSelect(index, 'create')}
                                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                                            item.selected
                                                ? 'border-[#C0A573] bg-gray-700/50 ring-1 ring-[#C0A573]/50'
                                                : 'border-gray-600 hover:border-gray-500 bg-gray-800/30'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={item.selected}
                                            onChange={() => {}} // 已由卡片點擊事件處理
                                            className="w-4 h-4 text-[#C0A573] bg-gray-700 border-gray-600 rounded focus:ring-[#C0A573] pointer-events-none"
                                        />
                                        
                                        <div className="text-2xl">
                                            {item.nft.type === 'hero' ? '⚔️' :
                                             item.nft.type === 'relic' ? '🛡️' : '👥'}
                                        </div>
                                        
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                {/* NFT 圖片 */}
                                                {item.nft.image && (
                                                    <div className="w-10 h-10 rounded overflow-hidden bg-gray-900">
                                                        <img 
                                                            src={item.nft.image} 
                                                            alt={item.nft.name || `${item.nft.type} #${item.nft.id}`}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-medium text-white">
                                                        {item.nft.name || `${item.nft.type === 'hero' ? '英雄' : item.nft.type === 'relic' ? '聖物' : '隊伍'} #${item.nft.id?.toString() || 'N/A'}`}
                                                    </div>
                                                    {'power' in item.nft && item.nft.power && (
                                                        <div className="text-xs text-gray-400">
                                                            戰力: {item.nft.power.toLocaleString()}
                                                        </div>
                                                    )}
                                                    {'rarity' in item.nft && (
                                                        <div className="text-xs text-yellow-400">
                                                            {'★'.repeat(Number(item.nft.rarity))}{'☆'.repeat(5 - Number(item.nft.rarity))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="w-32" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="number"
                                                value={item.price}
                                                onChange={(e) => handlePriceChange(index, e.target.value)}
                                                placeholder="USD價格"
                                                className="w-full px-2 py-1 bg-gray-800 text-white rounded border border-gray-600 focus:border-[#C0A573] focus:outline-none text-sm"
                                                step="0.01"
                                                min="0"
                                            />
                                            {item.price && (
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    ${parseFloat(item.price).toFixed(2)} USD
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* 支付幣種選擇 */}
                        <div className="mt-4 mb-4">
                            <label className="block text-gray-400 mb-2">選擇接受的支付幣種</label>
                            <StablecoinSelector
                                selectedTokens={acceptedTokens}
                                onToggle={(token) => {
                                    // 單選模式：選擇新的幣種時，清除之前的選擇
                                    setAcceptedTokens([token]);
                                }}
                                mode="single"
                                address={address}
                            />
                        </div>
                        
                        {/* Create Summary */}
                        {selectedCreateItems.length > 0 && (
                            <div className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg mt-4">
                                <div className="text-blue-400 text-sm">
                                    即將創建 {selectedCreateItems.length} 個掛單，
                                    總價值約 ${selectedCreateItems.reduce((sum, item) => 
                                        sum + parseFloat(item.price || '0'), 0
                                    ).toFixed(2)} USD
                                </div>
                                {acceptedTokens.length > 0 && (
                                    <div className="text-xs text-gray-400 mt-1">
                                        接受支付：{acceptedTokens.join(', ')}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
                
                {/* Batch Cancel Mode */}
                {mode === 'cancel' && (
                    <div>
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold text-white">
                                    選擇要取消的掛單 ({selectedCancelItems.length}/{cancelItems.length})
                                </h3>
                                <ActionButton
                                    onClick={() => handleSelectAll('cancel')}
                                    className="px-3 py-1 text-sm"
                                >
                                    {cancelItems.every(item => item.selected) ? '取消全選' : '全選'}
                                </ActionButton>
                            </div>
                            
                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {cancelItems.map((item, index) => (
                                    <div
                                        key={item.listing.id}
                                        onClick={() => handleItemSelect(index, 'cancel')}
                                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                                            item.selected
                                                ? 'border-red-500 bg-gray-700/50 ring-1 ring-red-500/50'
                                                : 'border-gray-600 hover:border-gray-500 bg-gray-800/30'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={item.selected}
                                            onChange={() => {}} // 已由卡片點擊事件處理
                                            className="w-4 h-4 text-red-500 bg-gray-700 border-gray-600 rounded focus:ring-red-500 pointer-events-none"
                                        />
                                        
                                        <div className="text-2xl">
                                            {item.listing.nftType === 'hero' ? '⚔️' :
                                             item.listing.nftType === 'relic' ? '🛡️' : '👥'}
                                        </div>
                                        
                                        <div className="flex-1">
                                            <div className="font-medium text-white">
                                                {item.listing.nftType === 'hero' ? '英雄' :
                                                 item.listing.nftType === 'relic' ? '聖物' : '隊伍'} #{item.listing.tokenId.toString()}
                                            </div>
                                            <div className="text-sm text-gray-400">
                                                價格: ${parseFloat(item.listing.price).toFixed(2)} USD
                                            </div>
                                        </div>
                                        
                                        <div className="text-sm text-gray-500">
                                            {new Date(item.listing.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Cancel Summary */}
                        {selectedCancelItems.length > 0 && (
                            <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
                                <div className="text-red-400 text-sm">
                                    即將取消 {selectedCancelItems.length} 個掛單
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
            </div>
        </Modal>
    );
};