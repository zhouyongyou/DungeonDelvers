// src/components/marketplace/OffersPanel.tsx
// 出價管理面板

import React, { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { Icons } from '../ui/icons';
import { ActionButton } from '../ui/ActionButton';
import { formatSoul } from '../../utils/formatters';
import { useAppToast } from '../../contexts/SimpleToastContext';
import type { NftType } from '../../types/nft';

interface Offer {
    id: string;
    buyer: string;
    listingId: string;
    amount: bigint;
    expiresAt: number;
    status: 'active' | 'accepted' | 'declined' | 'expired';
    createdAt: number;
    message?: string;
    // NFT info for display
    nftType?: NftType;
    tokenId?: string;
    seller?: string;
}

interface OffersPanelProps {
    className?: string;
}

const OFFERS_STORAGE_KEY = 'marketplace_offers';

export const OffersPanel: React.FC<OffersPanelProps> = ({ className = '' }) => {
    const { address } = useAccount();
    const { showToast } = useAppToast();
    const [offers, setOffers] = useState<Offer[]>([]);
    const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');

    // Load offers on mount
    useEffect(() => {
        const loadOffers = () => {
            try {
                const stored = localStorage.getItem(OFFERS_STORAGE_KEY);
                if (stored) {
                    const parsedOffers: Offer[] = JSON.parse(stored);
                    
                    // Convert string amounts back to bigint and update expired offers
                    const now = Date.now();
                    const updatedOffers = parsedOffers.map(offer => ({
                        ...offer,
                        amount: BigInt(offer.amount),
                        status: offer.status === 'active' && offer.expiresAt < now ? 'expired' as const : offer.status
                    }));
                    
                    setOffers(updatedOffers);
                } else {
                    setOffers([]);
                }
            } catch (error) {
                console.error('Failed to load offers:', error);
                setOffers([]);
            }
        };

        loadOffers();

        // Listen for offers updates
        const handleOffersUpdate = () => {
            loadOffers();
        };

        window.addEventListener('offersUpdate', handleOffersUpdate);
        return () => {
            window.removeEventListener('offersUpdate', handleOffersUpdate);
        };
    }, []);

    // Filter offers based on current user and tab
    const filteredOffers = useMemo(() => {
        if (!address) return [];

        let filtered = offers;

        if (activeTab === 'sent') {
            // Offers sent by current user
            filtered = offers.filter(offer => 
                offer.buyer.toLowerCase() === address.toLowerCase()
            );
        } else {
            // Offers received by current user (need to match with user's listings)
            // For now, we'll show all received offers (in production, filter by seller)
            filtered = offers.filter(offer => 
                offer.seller?.toLowerCase() === address.toLowerCase()
            );
        }

        // Sort by creation date (newest first)
        return filtered.sort((a, b) => b.createdAt - a.createdAt);
    }, [offers, activeTab, address]);

    const handleAcceptOffer = async (offerId: string) => {
        try {
            const updatedOffers = offers.map(offer =>
                offer.id === offerId ? { ...offer, status: 'accepted' as const } : offer
            );
            
            // Convert bigint to string for storage
            const storageOffers = updatedOffers.map(offer => ({
                ...offer,
                amount: offer.amount.toString()
            }));
            
            localStorage.setItem(OFFERS_STORAGE_KEY, JSON.stringify(storageOffers));
            setOffers(updatedOffers);
            
            showToast('出價已接受', 'success');
            
            // In production, this would trigger the actual NFT transfer
            // For now, we'll just update the status
        } catch (error) {
            showToast(`接受出價失敗: ${error}`, 'error');
        }
    };

    const handleDeclineOffer = async (offerId: string) => {
        try {
            const updatedOffers = offers.map(offer =>
                offer.id === offerId ? { ...offer, status: 'declined' as const } : offer
            );
            
            // Convert bigint to string for storage
            const storageOffers = updatedOffers.map(offer => ({
                ...offer,
                amount: offer.amount.toString()
            }));
            
            localStorage.setItem(OFFERS_STORAGE_KEY, JSON.stringify(storageOffers));
            setOffers(updatedOffers);
            
            showToast('出價已拒絕', 'success');
        } catch (error) {
            showToast(`拒絕出價失敗: ${error}`, 'error');
        }
    };

    const handleCancelOffer = async (offerId: string) => {
        try {
            const updatedOffers = offers.filter(offer => offer.id !== offerId);
            
            // Convert bigint to string for storage
            const storageOffers = updatedOffers.map(offer => ({
                ...offer,
                amount: offer.amount.toString()
            }));
            
            localStorage.setItem(OFFERS_STORAGE_KEY, JSON.stringify(storageOffers));
            setOffers(updatedOffers);
            
            showToast('出價已取消', 'success');
        } catch (error) {
            showToast(`取消出價失敗: ${error}`, 'error');
        }
    };

    const getStatusColor = (status: Offer['status']) => {
        switch (status) {
            case 'active':
                return 'text-green-400';
            case 'accepted':
                return 'text-blue-400';  
            case 'declined':
                return 'text-red-400';
            case 'expired':
                return 'text-gray-400';
            default:
                return 'text-gray-400';
        }
    };

    const getStatusText = (status: Offer['status']) => {
        switch (status) {
            case 'active':
                return '進行中';
            case 'accepted':
                return '已接受';
            case 'declined':
                return '已拒絕';
            case 'expired':
                return '已過期';
            default:
                return '未知';
        }
    };

    if (!address) {
        return (
            <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
                <div className="text-center text-gray-400">
                    請先連接錢包以查看出價記錄
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">出價管理</h2>
                <div className="flex items-center gap-2">
                    <Icons.DollarSign className="h-5 w-5 text-[#C0A573]" />
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('sent')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === 'sent'
                            ? 'bg-[#C0A573] text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                    我的出價 ({filteredOffers.filter(o => activeTab === 'sent').length})
                </button>
                <button
                    onClick={() => setActiveTab('received')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === 'received'
                            ? 'bg-[#C0A573] text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                    收到的出價 ({filteredOffers.filter(o => activeTab === 'received').length})
                </button>
            </div>

            {/* Offers List */}
            <div className="space-y-4">
                {filteredOffers.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <Icons.DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>
                            {activeTab === 'sent' ? '您還沒有提交任何出價' : '您還沒有收到任何出價'}
                        </p>
                    </div>
                ) : (
                    filteredOffers.map((offer) => (
                        <div
                            key={offer.id}
                            className="bg-gray-700 rounded-lg p-4 border border-gray-600"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="text-2xl">
                                            {offer.nftType === 'hero' ? '⚔️' :
                                             offer.nftType === 'relic' ? '🛡️' : 
                                             offer.nftType === 'party' ? '👥' : '❓'}
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-white">
                                                {offer.nftType === 'hero' ? '英雄' :
                                                 offer.nftType === 'relic' ? '聖物' : 
                                                 offer.nftType === 'party' ? '隊伍' : 'NFT'} #{offer.tokenId || 'Unknown'}
                                            </h3>
                                            <div className="text-sm text-gray-400">
                                                {activeTab === 'sent' ? '向' : '來自'} {
                                                    activeTab === 'sent' 
                                                        ? (offer.seller ? `${offer.seller.slice(0, 6)}...${offer.seller.slice(-4)}` : 'Unknown')
                                                        : `${offer.buyer.slice(0, 6)}...${offer.buyer.slice(-4)}`
                                                }
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="text-lg font-bold text-[#C0A573]">
                                            {formatSoul(offer.amount.toString())} SOUL
                                        </div>
                                        <div className={`text-sm font-medium ${getStatusColor(offer.status)}`}>
                                            {getStatusText(offer.status)}
                                        </div>
                                    </div>
                                    
                                    {offer.message && (
                                        <div className="text-sm text-gray-300 bg-gray-800 rounded p-2 mb-2">
                                            "{offer.message}"
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span>創建: {new Date(offer.createdAt).toLocaleString()}</span>
                                        {offer.status === 'active' && (
                                            <span>
                                                到期: {new Date(offer.expiresAt).toLocaleString()}
                                                {offer.expiresAt < Date.now() && (
                                                    <span className="text-red-400 ml-1">(已過期)</span>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex flex-col gap-2 ml-4">
                                    {activeTab === 'received' && offer.status === 'active' && (
                                        <>
                                            <ActionButton
                                                onClick={() => handleAcceptOffer(offer.id)}
                                                className="px-3 py-1 text-sm bg-green-700 hover:bg-green-600"
                                            >
                                                接受
                                            </ActionButton>
                                            <ActionButton
                                                onClick={() => handleDeclineOffer(offer.id)}
                                                className="px-3 py-1 text-sm bg-red-700 hover:bg-red-600"
                                            >
                                                拒絕
                                            </ActionButton>
                                        </>
                                    )}
                                    
                                    {activeTab === 'sent' && offer.status === 'active' && (
                                        <ActionButton
                                            onClick={() => handleCancelOffer(offer.id)}
                                            className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500"
                                        >
                                            取消出價
                                        </ActionButton>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};