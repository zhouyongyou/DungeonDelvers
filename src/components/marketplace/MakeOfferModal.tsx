// src/components/marketplace/MakeOfferModal.tsx
// 出價系統模態框

import React, { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { Icons } from '../ui/icons';
import { ActionButton } from '../ui/ActionButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Modal } from '../ui/Modal';
import { formatSoul } from '../../utils/formatters';
import { useAppToast } from '../../contexts/SimpleToastContext';
import { useHeroPower, usePartyPower, useHeroDetails, useRelicDetails, usePartyDetails, getElementName, getClassName, getRelicCategoryName } from '../../hooks/useNftPower';
import type { MarketListing } from '../../hooks/useMarketplace';

interface MakeOfferModalProps {
    isOpen: boolean;
    onClose: () => void;
    listing: MarketListing | null;
    onOfferSubmitted?: () => void;
}

interface Offer {
    id: string;
    buyer: string;
    listingId: string;
    amount: bigint;
    expiresAt: number;
    status: 'active' | 'accepted' | 'declined' | 'expired';
    createdAt: number;
    message?: string;
}

const OFFERS_STORAGE_KEY = 'marketplace_offers';

export const MakeOfferModal: React.FC<MakeOfferModalProps> = ({
    isOpen,
    onClose,
    listing,
    onOfferSubmitted
}) => {
    const { address } = useAccount();
    const { showToast } = useAppToast();
    const [offerAmount, setOfferAmount] = useState('');
    const [expiryDays, setExpiryDays] = useState(7);
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Early return if no listing to prevent errors
    // 獲取 NFT 戰力和詳細資訊 - 無條件調用所有 Hook，使用 enabled 控制
    const heroPower = useHeroPower(
        listing?.tokenId ? BigInt(listing.tokenId) : 0n,
        { enabled: listing?.nftType === 'hero' && !!listing?.tokenId }
    );
    const partyPower = usePartyPower(
        listing?.tokenId ? BigInt(listing.tokenId) : 0n,
        { enabled: listing?.nftType === 'party' && !!listing?.tokenId }
    );
    const heroDetails = useHeroDetails(
        listing?.tokenId ? BigInt(listing.tokenId) : 0n,
        { enabled: listing?.nftType === 'hero' && !!listing?.tokenId }
    );
    const relicDetails = useRelicDetails(
        listing?.tokenId ? BigInt(listing.tokenId) : 0n,
        { enabled: listing?.nftType === 'relic' && !!listing?.tokenId }
    );
    const partyDetails = usePartyDetails(
        listing?.tokenId ? BigInt(listing.tokenId) : 0n,
        { enabled: listing?.nftType === 'party' && !!listing?.tokenId }
    );

    // 計算出價建議 - 移到 early return 之前
    const priceSuggestions = useMemo(() => {
        if (!listing) return [];
        
        const listingPrice = Number(listing.price);
        return [
            Math.floor(listingPrice * 0.7),  // 70%
            Math.floor(listingPrice * 0.8),  // 80%
            Math.floor(listingPrice * 0.9),  // 90%
            Math.floor(listingPrice * 0.95), // 95%
        ].filter(price => price > 0);
    }, [listing]);

    // 驗證出價 - 移到 early return 之前
    const validation = useMemo(() => {
        if (!listing || !offerAmount) return null;
        
        const amount = parseFloat(offerAmount);
        const listingPrice = Number(listing.price);
        
        if (isNaN(amount) || amount <= 0) {
            return { isValid: false, error: '請輸入有效的出價金額' };
        }
        
        if (amount >= listingPrice) {
            return { isValid: false, error: '出價不能大於或等於賣價' };
        }
        
        const minOffer = listingPrice * 0.1; // 最低 10%
        if (amount < minOffer) {
            return { isValid: false, error: `出價不能低於 ${minOffer.toFixed(2)} USDT (賣價的 10%)` };
        }
        
        return { isValid: true, error: null };
    }, [listing, offerAmount]);

    if (!listing) {
        return null;
    }

    const handleSubmitOffer = async () => {
        if (!listing || !address || !validation?.isValid) return;

        setIsSubmitting(true);

        try {
            const offerData: Offer = {
                id: `offer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                buyer: address,
                listingId: listing.id,
                amount: BigInt(Math.floor(parseFloat(offerAmount))),
                expiresAt: Date.now() + (expiryDays * 24 * 60 * 60 * 1000),
                status: 'active',
                createdAt: Date.now(),
                message: message.trim() || undefined
            };

            // 保存到本地存儲
            const existingOffers = JSON.parse(localStorage.getItem(OFFERS_STORAGE_KEY) || '[]');
            existingOffers.push(offerData);
            localStorage.setItem(OFFERS_STORAGE_KEY, JSON.stringify(existingOffers));

            // 觸發更新事件
            window.dispatchEvent(new Event('offersUpdate'));

            showToast(`成功向 ${listing?.nftType === 'hero' ? '英雄' : listing?.nftType === 'relic' ? '聖物' : '隊伍'} #${listing?.tokenId || ''} 出價 ${formatSoul(offerAmount)} SOUL`, 'success');
            
            onOfferSubmitted?.();
            onClose();
            
            // 重置表單
            setOfferAmount('');
            setMessage('');
            setExpiryDays(7);
        } catch (error) {
            showToast(`出價失敗: ${error}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen && !!listing}
            onClose={onClose}
            title="💰 向賣家出價"
            onConfirm={handleSubmitOffer}
            confirmText={isSubmitting ? '提交中...' : '確認出價'}
            maxWidth="lg"
            disabled={!offerAmount || parseFloat(offerAmount) <= 0 || !validation?.isValid || isSubmitting}
            isLoading={isSubmitting}
        >
            <div className="space-y-6">

                {/* NFT Information */}
                <div className="bg-gray-700 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="text-4xl">
                            {listing?.nftType === 'hero' ? '⚔️' :
                             listing?.nftType === 'relic' ? '🛡️' : '👥'}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-white">
                                {listing?.nftType === 'hero' ? '英雄' :
                                 listing?.nftType === 'relic' ? '聖物' : '隊伍'} #{listing?.tokenId?.toString() || ''}
                            </h3>
                            
                            {/* NFT 詳細資訊 */}
                            {listing?.nftType === 'hero' && heroDetails.details && (
                                <div className="text-xs text-gray-300 mt-1">
                                    Lv.{heroDetails.details.level} {getClassName(heroDetails.details.heroClass)} | 
                                    {getElementName(heroDetails.details.element)} | T{heroDetails.details.tier}
                                    {heroPower.power && <span className="text-[#C0A573] ml-2">⚡{heroPower.power.toLocaleString()}</span>}
                                </div>
                            )}
                            
                            {listing?.nftType === 'relic' && relicDetails.details && (
                                <div className="text-xs text-gray-300 mt-1">
                                    {getRelicCategoryName(relicDetails.details.category)} | 
                                    T{relicDetails.details.tier} | 容量 {relicDetails.details.capacity}
                                </div>
                            )}
                            
                            {listing?.nftType === 'party' && partyDetails.details && (
                                <div className="text-xs text-gray-300 mt-1">
                                    {partyDetails.details.heroes.length} 英雄 | {partyDetails.details.relics.length} 聖物
                                    {partyPower.power && <span className="text-[#C0A573] ml-2">⚡{partyPower.power.toLocaleString()}</span>}
                                </div>
                            )}
                            
                            <div className="text-sm text-gray-400 mt-1">
                                掛單價格: <span className="text-white font-medium">{formatSoul(listing?.price?.toString() || '0')} SOUL</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Offer Amount */}
                <div className="mb-4">
                    <label className="block text-gray-400 mb-2">出價金額 (SOUL)</label>
                    <input
                        type="number"
                        value={offerAmount}
                        onChange={(e) => setOfferAmount(e.target.value)}
                        placeholder="請輸入出價金額"
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#C0A573] focus:outline-none"
                        step="0.01"
                        min="0"
                        max={listing?.price ? Number(listing.price) - 1 : 0}
                    />
                    
                    {/* Price Suggestions */}
                    <div className="flex flex-wrap gap-2 mt-2">
                        {priceSuggestions.map((price, index) => (
                            <button
                                key={index}
                                onClick={() => setOfferAmount(price.toString())}
                                className="px-2 py-1 bg-gray-600 text-gray-300 rounded text-xs hover:bg-gray-500 transition-colors"
                            >
                                {formatSoul(price.toString())}
                            </button>
                        ))}
                    </div>
                    
                    {/* Validation Message */}
                    {validation && !validation.isValid && (
                        <div className="text-red-400 text-xs mt-1">
                            {validation.message}
                        </div>
                    )}
                </div>

                {/* Expiry */}
                <div className="mb-4">
                    <label className="block text-gray-400 mb-2">出價有效期</label>
                    <select
                        value={expiryDays}
                        onChange={(e) => setExpiryDays(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#C0A573] focus:outline-none"
                    >
                        <option value={1}>1 天</option>
                        <option value={3}>3 天</option>
                        <option value={7}>7 天</option>
                        <option value={14}>14 天</option>
                        <option value={30}>30 天</option>
                    </select>
                </div>

                {/* Message */}
                <div className="mb-6">
                    <label className="block text-gray-400 mb-2">給賣家的話 (可選)</label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="留下您的出價理由或其他信息..."
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#C0A573] focus:outline-none resize-none"
                        rows={3}
                        maxLength={200}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                        {message.length}/200
                    </div>
                </div>

            </div>
        </Modal>
    );
};

export default MakeOfferModal;