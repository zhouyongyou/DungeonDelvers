// src/components/marketplace/BatchOperations.tsx
// 批量掛單和取消功能組件

import React, { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { parseEther, type Address } from 'viem';
import { Icons } from '../ui/icons';
import { ActionButton } from '../ui/ActionButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Modal } from '../ui/Modal';
import { formatSoul } from '../../utils/formatters';
import { useAppToast } from '../../contexts/SimpleToastContext';
import type { HeroNft, RelicNft, PartyNft, NftType } from '../../types/nft';
import { emitListingCreated, emitListingCancelled } from '../../utils/marketplaceEvents';

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
    const [mode, setMode] = useState<'create' | 'cancel'>('create');
    const [isProcessing, setIsProcessing] = useState(false);
    const [batchPrice, setBatchPrice] = useState('');
    
    // Batch create state
    const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
    
    // Batch cancel state
    const [cancelItems, setCancelItems] = useState<BatchCancelItem[]>([]);
    
    // Initialize batch items when modal opens
    React.useEffect(() => {
        if (isOpen && mode === 'create') {
            const allNfts = [
                ...(userNfts?.heros || []),
                ...(userNfts?.relics || []),
                ...(userNfts?.parties || [])
                // Note: VIP cards are typically not tradeable on marketplace, so we exclude them
            ];
            
            // Filter out NFTs that are already listed
            const listedTokenIds = new Set(userListings.map(l => l.tokenId?.toString()).filter(Boolean));
            const availableNfts = allNfts.filter(nft => {
                // Use id from BaseNft instead of tokenId
                // Make sure the NFT has a valid id and is a tradeable type
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
            // Simulate batch creation
            for (const item of selectedCreateItems) {
                // In a real implementation, this would call the actual listing API
                console.log(`Creating listing for ${item.nft.type} #${item.nft.id} at ${item.price} SOUL`);
                
                // 觸發通知事件
                emitListingCreated({
                    nftType: item.nft.type,
                    tokenId: item.nft.id?.toString() || 'Unknown',
                    price: item.price,
                    seller: address
                });
                
                // Simulate API delay
                await new Promise(resolve => setTimeout(resolve, 500));
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
            // Simulate batch cancellation
            for (const item of selectedCancelItems) {
                console.log(`Cancelling listing ${item.listing.id}`);
                
                // 觸發通知事件
                emitListingCancelled({
                    nftType: item.listing.nftType,
                    tokenId: item.listing.tokenId?.toString() || 'Unknown',
                    price: item.listing.price?.toString(),
                    seller: address
                });
                
                // Simulate API delay
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
    const isDisabled = isProcessing || 
        (mode === 'create' && selectedCreateItems.length === 0) ||
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
            isLoading={isProcessing}
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
                                    <label className="block text-gray-400 mb-2">統一價格 (SOUL)</label>
                                    <input
                                        type="number"
                                        value={batchPrice}
                                        onChange={(e) => setBatchPrice(e.target.value)}
                                        placeholder="輸入統一價格"
                                        className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-[#C0A573] focus:outline-none"
                                        step="0.01"
                                        min="0"
                                    />
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
                                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                                            item.selected
                                                ? 'border-[#C0A573] bg-gray-700'
                                                : 'border-gray-600 hover:border-gray-500'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={item.selected}
                                            onChange={() => handleItemSelect(index, 'create')}
                                            className="w-4 h-4 text-[#C0A573] bg-gray-700 border-gray-600 rounded focus:ring-[#C0A573]"
                                        />
                                        
                                        <div className="text-2xl">
                                            {item.nft.type === 'hero' ? '⚔️' :
                                             item.nft.type === 'relic' ? '🛡️' : '👥'}
                                        </div>
                                        
                                        <div className="flex-1">
                                            <div className="font-medium text-white">
                                                {item.nft.type === 'hero' ? '英雄' :
                                                 item.nft.type === 'relic' ? '聖物' : '隊伍'} #{item.nft.id?.toString() || 'N/A'}
                                            </div>
                                            {'power' in item.nft && (
                                                <div className="text-sm text-gray-400">
                                                    戰力: {item.nft.power}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="w-32">
                                            <input
                                                type="number"
                                                value={item.price}
                                                onChange={(e) => handlePriceChange(index, e.target.value)}
                                                placeholder="價格"
                                                className="w-full px-2 py-1 bg-gray-800 text-white rounded border border-gray-600 focus:border-[#C0A573] focus:outline-none text-sm"
                                                step="0.01"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Create Summary */}
                        {selectedCreateItems.length > 0 && (
                            <div className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
                                <div className="text-blue-400 text-sm">
                                    即將創建 {selectedCreateItems.length} 個掛單，
                                    總價值約 {formatSoul(
                                        selectedCreateItems.reduce((sum, item) => 
                                            sum + parseFloat(item.price || '0'), 0
                                        ).toString()
                                    )} SOUL
                                </div>
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
                                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                                            item.selected
                                                ? 'border-red-500 bg-gray-700'
                                                : 'border-gray-600 hover:border-gray-500'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={item.selected}
                                            onChange={() => handleItemSelect(index, 'cancel')}
                                            className="w-4 h-4 text-red-500 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
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
                                                價格: {formatSoul(item.listing.price.toString())} SOUL
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