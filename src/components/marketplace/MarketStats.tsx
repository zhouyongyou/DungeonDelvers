// src/components/marketplace/MarketStats.tsx
// 市場統計儀表板組件

import React, { useMemo } from 'react';
import { Icons } from '../ui/icons';
import { formatSoul } from '../../utils/formatters';
import { useActiveListings, useMarketStats } from '../../hooks/useMarketplaceApi';
import type { NftType } from '../../types/nft';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface MarketStatsProps {
    className?: string;
}

interface StatCard {
    title: string;
    value: string;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon: React.ReactNode;
    description?: string;
}

export const MarketStats: React.FC<MarketStatsProps> = ({ className = '' }) => {
    const { data: listings, isLoading: isLoadingListings, isError: isListingsError } = useActiveListings();
    const { data: marketStats, isLoading: isLoadingStats, isError: isStatsError } = useMarketStats();
    
    const stats = useMemo(() => {
        if (!listings || listings.length === 0) return null;
        
        // 基本統計
        const totalListings = listings.length;
        const prices = listings.map(l => Number(l.price));
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        
        // 按類型統計
        const typeStats = listings.reduce((acc, listing) => {
            acc[listing.nftType] = (acc[listing.nftType] || 0) + 1;
            return acc;
        }, {} as Record<NftType, number>);
        
        // 按價格區間統計
        const priceRanges = {
            budget: prices.filter(p => p < 1000).length,
            mid: prices.filter(p => p >= 1000 && p < 10000).length,
            premium: prices.filter(p => p >= 10000).length
        };
        
        // 最近24小時活動
        const recentListings = listings.filter(listing => {
            const listingTime = listing.createdAt;
            const now = Date.now();
            return (now - listingTime) < 24 * 60 * 60 * 1000;
        }).length;
        
        return {
            totalListings,
            avgPrice,
            minPrice,
            maxPrice,
            typeStats,
            priceRanges,
            recentListings
        };
    }, [listings]);
    
    // Loading state
    if (isLoadingListings || isLoadingStats) {
        return (
            <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
                <h2 className="text-xl font-bold text-white mb-4">市場統計</h2>
                <div className="flex justify-center py-8">
                    <LoadingSpinner />
                </div>
            </div>
        );
    }
    
    // Error state
    if (isListingsError || isStatsError) {
        return (
            <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
                <h2 className="text-xl font-bold text-white mb-4">市場統計</h2>
                <div className="text-center py-8 text-red-400">
                    載入統計數據時發生錯誤
                </div>
            </div>
        );
    }
    
    if (!stats) {
        return (
            <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
                <h2 className="text-xl font-bold text-white mb-4">市場統計</h2>
                <div className="text-center py-8 text-gray-400">
                    暫無足夠數據進行統計分析
                </div>
            </div>
        );
    }
    
    const statCards: StatCard[] = [
        {
            title: '掛單總數',
            value: stats.totalListings.toString(),
            change: `+${stats.recentListings}`,
            changeType: 'positive',
            icon: <Icons.Package className="h-5 w-5" />,
            description: '24小時內新增'
        },
        {
            title: '平均價格',
            value: `${formatSoul(stats.avgPrice.toString())} SOUL`,
            icon: <Icons.TrendingUp className="h-5 w-5" />,
            description: '所有掛單平均價格'
        },
        {
            title: '最低價格',
            value: `${formatSoul(stats.minPrice.toString())} SOUL`,
            icon: <Icons.DollarSign className="h-5 w-5" />,
            description: '最便宜的掛單'
        },
        {
            title: '最高價格',
            value: `${formatSoul(stats.maxPrice.toString())} SOUL`,
            icon: <Icons.Crown className="h-5 w-5" />,
            description: '最昂貴的掛單'
        }
    ];
    
    return (
        <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">市場統計</h2>
                <div className="text-xs text-gray-400">
                    最後更新：{new Date().toLocaleTimeString()}
                </div>
            </div>
            
            {/* 統計卡片 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {statCards.map((stat, index) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-gray-400 flex items-center gap-2">
                                {stat.icon}
                                <span className="text-sm">{stat.title}</span>
                            </div>
                        </div>
                        <div className="mb-1">
                            <span className="text-xl font-bold text-white">{stat.value}</span>
                            {stat.change && (
                                <span className={`ml-2 text-sm ${
                                    stat.changeType === 'positive' ? 'text-green-400' :
                                    stat.changeType === 'negative' ? 'text-red-400' : 'text-gray-400'
                                }`}>
                                    {stat.change}
                                </span>
                            )}
                        </div>
                        {stat.description && (
                            <p className="text-xs text-gray-500">{stat.description}</p>
                        )}
                    </div>
                ))}
            </div>
            
            {/* NFT 類型分布 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">NFT 類型分布</h3>
                    <div className="space-y-3">
                        {Object.entries(stats.typeStats).map(([type, count]) => {
                            const percentage = ((count / stats.totalListings) * 100).toFixed(1);
                            const typeLabel = type === 'hero' ? '英雄' : 
                                            type === 'relic' ? '聖物' : '隊伍';
                            return (
                                <div key={type} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">
                                            {type === 'hero' ? '⚔️' : 
                                             type === 'relic' ? '🛡️' : '👥'}
                                        </span>
                                        <span className="text-white">{typeLabel}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-20 bg-gray-600 rounded-full h-2">
                                            <div 
                                                className="bg-[#C0A573] h-2 rounded-full transition-all"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <span className="text-sm text-gray-300 min-w-[3rem]">
                                            {count} ({percentage}%)
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                {/* 價格區間分布 */}
                <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">價格區間分布</h3>
                    <div className="space-y-3">
                        {[
                            { label: '入門級 (< 1K SOUL)', count: stats.priceRanges.budget, color: 'bg-green-500' },
                            { label: '中階級 (1K-10K SOUL)', count: stats.priceRanges.mid, color: 'bg-blue-500' },
                            { label: '高階級 (> 10K SOUL)', count: stats.priceRanges.premium, color: 'bg-purple-500' }
                        ].map((range, index) => {
                            const percentage = ((range.count / stats.totalListings) * 100).toFixed(1);
                            return (
                                <div key={index} className="flex items-center justify-between">
                                    <span className="text-white text-sm">{range.label}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-20 bg-gray-600 rounded-full h-2">
                                            <div 
                                                className={`${range.color} h-2 rounded-full transition-all`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <span className="text-sm text-gray-300 min-w-[3rem]">
                                            {range.count} ({percentage}%)
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            
            {/* 市場洞察 */}
            <div className="mt-6 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <div className="flex items-start gap-2">
                    <Icons.Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="text-blue-400 font-medium mb-2">市場洞察</h4>
                        <div className="text-sm text-blue-300 space-y-1">
                            <p>• 目前市場共有 {stats.totalListings} 個活躍掛單</p>
                            <p>• 平均價格為 {formatSoul(stats.avgPrice.toString())} SOUL</p>
                            <p>• {Math.round((stats.priceRanges.budget / stats.totalListings) * 100)}% 的掛單價格低於 1,000 SOUL，適合新手入場</p>
                            {stats.recentListings > 0 && (
                                <p>• 過去24小時內有 {stats.recentListings} 個新掛單，市場活躍度良好</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketStats;