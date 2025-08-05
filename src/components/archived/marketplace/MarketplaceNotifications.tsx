// src/components/marketplace/MarketplaceNotifications.tsx
// 市場交易通知系統

import React, { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { Icons } from '../ui/icons';
import { ActionButton } from '../ui/ActionButton';
import { formatSoul } from '../../utils/formatters';
import type { NftType } from '../../types/nft';

interface MarketNotification {
    id: string;
    type: 'listing_created' | 'listing_sold' | 'listing_cancelled' | 'new_listing_similar' | 'price_alert';
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    data?: {
        nftType?: NftType;
        tokenId?: string;
        price?: string;
        seller?: string;
        buyer?: string;
    };
}

interface MarketplaceNotificationsProps {
    className?: string;
}

const NOTIFICATION_STORAGE_KEY = 'marketplace_notifications';

// 真實的通知系統 - 僅在有實際事件時創建通知
const createNotificationFromEvent = (
    type: MarketNotification['type'],
    eventData: {
        nftType: NftType;
        tokenId: string;
        price?: string;
        seller?: string;
        buyer?: string;
    }
): MarketNotification => {
    const now = Date.now();
    let title = '';
    let message = '';
    
    switch (type) {
        case 'listing_created':
            title = '掛單創建成功';
            message = `您的 ${eventData.nftType === 'hero' ? '英雄' : eventData.nftType === 'relic' ? '聖物' : '隊伍'} #${eventData.tokenId} 已成功掛單${eventData.price ? `，價格 ${formatSoul(eventData.price)} SOUL` : ''}`;
            break;
        case 'listing_sold':
            title = '恭喜！您的 NFT 已售出';
            message = `${eventData.nftType === 'hero' ? '英雄' : eventData.nftType === 'relic' ? '聖物' : '隊伍'} #${eventData.tokenId}${eventData.price ? ` 以 ${formatSoul(eventData.price)} SOUL 的價格` : ''}成功售出`;
            break;
        case 'listing_cancelled':
            title = '掛單已取消';
            message = `您的 ${eventData.nftType === 'hero' ? '英雄' : eventData.nftType === 'relic' ? '聖物' : '隊伍'} #${eventData.tokenId} 掛單已取消`;
            break;
        case 'new_listing_similar':
            title = '發現相似 NFT';
            message = `有新的 ${eventData.nftType === 'hero' ? '英雄' : eventData.nftType === 'relic' ? '聖物' : '隊伍'} 掛單${eventData.price ? `，價格 ${formatSoul(eventData.price)} SOUL` : ''}，可能符合您的需求`;
            break;
        case 'price_alert':
            title = '價格提醒';
            message = `${eventData.nftType === 'hero' ? '英雄' : eventData.nftType === 'relic' ? '聖物' : '隊伍'} #${eventData.tokenId}${eventData.price ? ` 價格降至 ${formatSoul(eventData.price)} SOUL，低於您的期望價格` : ' 價格已變動'}`;
            break;
    }
    
    return {
        id: `real-notif-${type}-${eventData.tokenId}-${now}`,
        type,
        title,
        message,
        timestamp: now,
        read: false,
        data: eventData
    };
};

export const MarketplaceNotifications: React.FC<MarketplaceNotificationsProps> = ({ 
    className = '' 
}) => {
    const { address } = useAccount();
    const [notifications, setNotifications] = useState<MarketNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    
    // Load notifications on mount
    useEffect(() => {
        if (!address) return;
        
        const stored = localStorage.getItem(`${NOTIFICATION_STORAGE_KEY}_${address}`);
        if (stored) {
            try {
                const parsedNotifications = JSON.parse(stored);
                // 只載入真實的通知，過濾掉舊的模擬通知
                const realNotifications = parsedNotifications.filter((n: MarketNotification) => 
                    n.id.startsWith('real-notif-') || n.id.startsWith('event-')
                );
                setNotifications(realNotifications);
            } catch (error) {
                console.error('Failed to parse notifications:', error);
                // 如果解析失敗，從空數組開始
                setNotifications([]);
            }
        } else {
            // 新用戶從空通知開始
            setNotifications([]);
        }
    }, [address]);
    
    // Listen for marketplace events
    useEffect(() => {
        const handleMarketplaceEvent = (event: CustomEvent) => {
            if (!address) return;
            
            const { type, data } = event.detail;
            
            // 創建真實通知
            const notification = createNotificationFromEvent(type, data);
            
            setNotifications(prev => {
                const updated = [notification, ...prev].slice(0, 50); // 限制最多50個通知
                
                // 保存到 localStorage
                localStorage.setItem(
                    `${NOTIFICATION_STORAGE_KEY}_${address}`, 
                    JSON.stringify(updated)
                );
                
                return updated;
            });
        };
        
        // 監聽各種市場事件
        window.addEventListener('marketplaceListingCreated', handleMarketplaceEvent);
        window.addEventListener('marketplaceListingSold', handleMarketplaceEvent);
        window.addEventListener('marketplaceListingCancelled', handleMarketplaceEvent);
        
        return () => {
            window.removeEventListener('marketplaceListingCreated', handleMarketplaceEvent);
            window.removeEventListener('marketplaceListingSold', handleMarketplaceEvent);
            window.removeEventListener('marketplaceListingCancelled', handleMarketplaceEvent);
        };
    }, [address]);
    
    const unreadCount = useMemo(() => {
        return notifications.filter(n => !n.read).length;
    }, [notifications]);
    
    const markAsRead = (notificationId: string) => {
        const updated = notifications.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
        );
        setNotifications(updated);
        
        if (address) {
            localStorage.setItem(
                `${NOTIFICATION_STORAGE_KEY}_${address}`, 
                JSON.stringify(updated)
            );
        }
    };
    
    const markAllAsRead = () => {
        const updated = notifications.map(n => ({ ...n, read: true }));
        setNotifications(updated);
        
        if (address) {
            localStorage.setItem(
                `${NOTIFICATION_STORAGE_KEY}_${address}`, 
                JSON.stringify(updated)
            );
        }
    };
    
    const clearNotifications = () => {
        setNotifications([]);
        if (address) {
            localStorage.removeItem(`${NOTIFICATION_STORAGE_KEY}_${address}`);
        }
    };
    
    const getNotificationIcon = (type: MarketNotification['type']) => {
        switch (type) {
            case 'listing_created':
                return <Icons.Plus className="h-4 w-4 text-blue-400" />;
            case 'listing_sold':
                return <Icons.DollarSign className="h-4 w-4 text-green-400" />;
            case 'listing_cancelled':
                return <Icons.X className="h-4 w-4 text-red-400" />;
            case 'new_listing_similar':
                return <Icons.Search className="h-4 w-4 text-purple-400" />;
            case 'price_alert':
                return <Icons.TrendingUp className="h-4 w-4 text-orange-400" />;
            default:
                return <Icons.Info className="h-4 w-4 text-gray-400" />;
        }
    };
    
    if (!address) return null;
    
    return (
        <div className={`relative ${className}`}>
            {/* Notification Bell */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-400 hover:text-white transition-colors"
            >
                <Icons.Package className="h-6 w-6" />
                {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                )}
            </button>
            
            {/* Notification Panel */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-700">
                        <h3 className="text-lg font-semibold text-white">市場通知</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-blue-400 hover:text-blue-300"
                                >
                                    全部已讀
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <Icons.X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <Icons.Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>暫無通知</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-3 border-b border-gray-700 last:border-b-0 cursor-pointer hover:bg-gray-700 transition-colors ${
                                            !notification.read ? 'bg-gray-750' : ''
                                        }`}
                                        onClick={() => markAsRead(notification.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 mt-0.5">
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className={`text-sm font-medium ${
                                                        notification.read ? 'text-gray-300' : 'text-white'
                                                    }`}>
                                                        {notification.title}
                                                    </h4>
                                                    {!notification.read && (
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                                    )}
                                                </div>
                                                <p className={`text-xs mt-1 ${
                                                    notification.read ? 'text-gray-500' : 'text-gray-400'
                                                }`}>
                                                    {notification.message}
                                                </p>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {new Date(notification.timestamp).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 border-t border-gray-700">
                            <ActionButton
                                onClick={clearNotifications}
                                className="w-full py-2 text-sm bg-gray-700 hover:bg-gray-600"
                            >
                                清除所有通知
                            </ActionButton>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MarketplaceNotifications;