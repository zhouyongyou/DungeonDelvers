// src/components/marketplace/PurchaseModal.tsx
// 購買確認模態框組件

import React, { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { ActionButton } from '../ui/ActionButton';
import { Icons } from '../ui/icons';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { formatSoul } from '../../utils/formatters';
import { useAppToast } from '../../contexts/SimpleToastContext';
import { usePurchaseItem, type MarketListing } from '../../hooks/useMarketplace';
import { useHeroPower, usePartyPower, useHeroDetails, useRelicDetails, usePartyDetails, getElementName, getClassName, getRelicCategoryName } from '../../hooks/useNftPower';

interface PurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    listing: MarketListing | null;
    onPurchaseComplete?: () => void;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
    isOpen,
    onClose,
    listing,
    onPurchaseComplete
}) => {
    const { address } = useAccount();
    const { showToast } = useAppToast();
    const { purchaseItem, isPurchasing, soulBalance } = usePurchaseItem();
    const [confirmPurchase, setConfirmPurchase] = useState(false);
    
    // 獲取 NFT 戰力和詳細資訊
    const heroPower = useHeroPower(listing?.nftType === 'hero' ? BigInt(listing.tokenId) : 0n);
    const partyPower = usePartyPower(listing?.nftType === 'party' ? BigInt(listing.tokenId) : 0n);
    const heroDetails = useHeroDetails(listing?.nftType === 'hero' ? BigInt(listing.tokenId) : 0n);
    const relicDetails = useRelicDetails(listing?.nftType === 'relic' ? BigInt(listing.tokenId) : 0n);
    const partyDetails = usePartyDetails(listing?.nftType === 'party' ? BigInt(listing.tokenId) : 0n);
    
    const hasEnoughBalance = useMemo(() => {
        if (!listing || !soulBalance) return false;
        return soulBalance >= listing.price;
    }, [listing, soulBalance]);
    
    const handlePurchase = async () => {
        if (!listing) return;
        
        try {
            await purchaseItem(listing);
            showToast('購買成功！NFT 已轉移到您的錢包', 'success');
            onClose();
            onPurchaseComplete?.();
            setConfirmPurchase(false);
        } catch (error) {
            showToast(`購買失敗: ${error}`, 'error');
        }
    };
    
    if (!isOpen || !listing) return null;
    
    const nftTypeLabel = listing.nftType === 'hero' ? '英雄' :
                        listing.nftType === 'relic' ? '聖物' : '隊伍';
                        
    // 獲取戰力值
    const getPowerValue = () => {
        if (listing.nftType === 'hero' && heroPower.power) return heroPower.power;
        if (listing.nftType === 'party' && partyPower.power) return partyPower.power;
        return null;
    };
    
    const powerValue = getPowerValue();
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">確認購買</h2>
                    <button
                        onClick={onClose}
                        disabled={isPurchasing}
                        className="text-gray-400 hover:text-white"
                    >
                        <Icons.X className="h-6 w-6" />
                    </button>
                </div>
                
                {/* NFT 預覽 */}
                <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center text-2xl relative">
                            {listing.nftType === 'hero' ? '⚔️' :
                             listing.nftType === 'relic' ? '🛡️' : '👥'}
                            {/* 戰力角標 */}
                            {powerValue && (
                                <div className="absolute -top-1 -right-1 bg-[#C0A573] text-white text-xs px-1 py-0.5 rounded-full font-bold min-w-[20px] text-center">
                                    {powerValue > 999 ? `${Math.floor(powerValue/1000)}k` : powerValue}
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-white">
                                {nftTypeLabel} #{listing.tokenId.toString()}
                            </h3>
                            {powerValue && (
                                <p className="text-sm text-[#C0A573] font-bold">
                                    戰力: {powerValue.toLocaleString()}
                                </p>
                            )}
                            <p className="text-sm text-gray-400">
                                合約: {listing.contractAddress.slice(0, 8)}...{listing.contractAddress.slice(-6)}
                            </p>
                            <p className="text-sm text-gray-400">
                                賣家: {listing.seller.slice(0, 8)}...{listing.seller.slice(-6)}
                            </p>
                        </div>
                    </div>
                    
                    {/* NFT 詳細資訊 */}
                    {listing.nftType === 'hero' && heroDetails.details && (
                        <div className="mt-3 pt-3 border-t border-gray-600">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">等級:</span>
                                    <span className="text-white">Lv.{heroDetails.details.level}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">品階:</span>
                                    <span className="text-white">T{heroDetails.details.tier}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">職業:</span>
                                    <span className="text-white">{getClassName(heroDetails.details.heroClass)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">元素:</span>
                                    <span className="text-white">{getElementName(heroDetails.details.element)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {listing.nftType === 'relic' && relicDetails.details && (
                        <div className="mt-3 pt-3 border-t border-gray-600">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">類別:</span>
                                    <span className="text-white">{getRelicCategoryName(relicDetails.details.category)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">品階:</span>
                                    <span className="text-white">T{relicDetails.details.tier}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">容量:</span>
                                    <span className="text-white">{relicDetails.details.capacity}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {listing.nftType === 'party' && partyDetails.details && (
                        <div className="mt-3 pt-3 border-t border-gray-600">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">英雄數量:</span>
                                    <span className="text-white">{partyDetails.details.heroes.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">聖物數量:</span>
                                    <span className="text-white">{partyDetails.details.relics.length}</span>
                                </div>
                                <div className="flex justify-between col-span-2">
                                    <span className="text-gray-400">總戰力:</span>
                                    <span className="text-[#C0A573] font-bold">{partyDetails.details.totalPower.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* 價格信息 */}
                <div className="mb-4 space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                        <span className="text-gray-400">購買價格</span>
                        <span className="text-[#C0A573] font-bold text-lg">
                            {formatSoul(listing.price.toString())} SOUL
                        </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                        <span className="text-gray-400">您的餘額</span>
                        <span className={`font-medium ${hasEnoughBalance ? 'text-green-400' : 'text-red-400'}`}>
                            {soulBalance ? formatSoul(soulBalance.toString()) : '0'} SOUL
                        </span>
                    </div>
                    
                    {!hasEnoughBalance && (
                        <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
                            <div className="flex items-center gap-2 text-red-400 text-sm">
                                <Icons.AlertTriangle className="h-4 w-4" />
                                餘額不足，無法完成購買
                            </div>
                        </div>
                    )}
                </div>
                
                {/* 購買後信息 */}
                {hasEnoughBalance && (
                    <div className="mb-4 p-3 bg-gray-700 rounded">
                        <p className="text-sm text-gray-400 mb-1">購買後餘額</p>
                        <p className="text-white font-medium">
                            {formatSoul((soulBalance! - listing.price).toString())} SOUL
                        </p>
                    </div>
                )}
                
                {/* 確認勾選 */}
                {hasEnoughBalance && (
                    <div className="mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={confirmPurchase}
                                onChange={(e) => setConfirmPurchase(e.target.checked)}
                                className="w-4 h-4 text-[#C0A573] bg-gray-700 border-gray-600 rounded focus:ring-[#C0A573]"
                                disabled={isPurchasing}
                            />
                            <span className="text-sm text-gray-300">
                                我確認要購買此 NFT，並了解交易完成後不可撤銷
                            </span>
                        </label>
                    </div>
                )}
                
                {/* 操作按鈕 */}
                <div className="flex gap-2">
                    <ActionButton
                        onClick={handlePurchase}
                        disabled={!hasEnoughBalance || !confirmPurchase || isPurchasing}
                        isLoading={isPurchasing}
                        className="flex-1 py-2"
                    >
                        {isPurchasing ? '購買中...' : `確認購買 ${formatSoul(listing.price.toString())} SOUL`}
                    </ActionButton>
                    <ActionButton
                        onClick={onClose}
                        disabled={isPurchasing}
                        className="px-6 py-2 bg-gray-700 hover:bg-gray-600"
                    >
                        取消
                    </ActionButton>
                </div>
                
                {/* 安全提示 */}
                <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                    <div className="flex items-start gap-2 text-blue-400 text-xs">
                        <Icons.Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium mb-1">安全提示：</p>
                            <ul className="space-y-1 text-blue-300">
                                <li>• 請確認 NFT 信息正確無誤</li>
                                <li>• 交易完成後 NFT 將立即轉移到您的錢包</li>
                                <li>• 請確保網絡穩定，避免交易失敗</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};