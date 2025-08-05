// src/components/marketplace/PriceHistory.tsx
// NFT 價格歷史追蹤組件

import React, { useMemo } from 'react';
import { Icons } from '../ui/icons';
import { formatSoul } from '../../utils/formatters';
import type { NftType } from '../../types/nft';

interface PricePoint {
    timestamp: number;
    price: bigint;
    seller: string;
    status: 'listed' | 'sold';
    txHash?: string;
}

interface PriceHistoryProps {
    nftType: NftType;
    tokenId: string;
    contractAddress: string;
    className?: string;
}

// Mock data generator for demonstration
const generateMockPriceHistory = (nftType: NftType, tokenId: string): PricePoint[] => {
    const basePrice = 1000 + (parseInt(tokenId) % 10000);
    const history: PricePoint[] = [];
    const now = Date.now();
    
    // Generate 10-20 historical price points over the last 30 days
    const numPoints = 10 + Math.floor(Math.random() * 10);
    
    for (let i = 0; i < numPoints; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const timestamp = now - (daysAgo * 24 * 60 * 60 * 1000);
        
        // Price volatility based on NFT type
        const volatility = nftType === 'hero' ? 0.3 : nftType === 'party' ? 0.5 : 0.2;
        const priceMultiplier = 0.7 + Math.random() * 0.6; // 0.7x to 1.3x
        const price = BigInt(Math.floor(basePrice * priceMultiplier));
        
        const isSold = Math.random() > 0.3; // 70% chance of being sold
        
        history.push({
            timestamp,
            price,
            seller: `0x${Math.random().toString(16).slice(2, 10)}...`,
            status: isSold ? 'sold' : 'listed',
            txHash: isSold ? `0x${Math.random().toString(16).slice(2, 10)}...` : undefined
        });
    }
    
    return history.sort((a, b) => a.timestamp - b.timestamp);
};

export const PriceHistory: React.FC<PriceHistoryProps> = ({
    nftType,
    tokenId,
    contractAddress,
    className = ''
}) => {
    const priceHistory = useMemo(() => {
        // In production, this would fetch from an API
        return generateMockPriceHistory(nftType, tokenId);
    }, [nftType, tokenId]);
    
    const stats = useMemo(() => {
        if (priceHistory.length === 0) return null;
        
        const soldItems = priceHistory.filter(p => p.status === 'sold');
        const prices = soldItems.map(p => Number(p.price));
        
        if (prices.length === 0) return null;
        
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const latestPrice = prices[prices.length - 1];
        
        // Calculate price trend (last 7 days vs previous 7 days)
        const now = Date.now();
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000);
        
        const recentSales = soldItems.filter(p => p.timestamp >= sevenDaysAgo);
        const previousSales = soldItems.filter(p => 
            p.timestamp >= fourteenDaysAgo && p.timestamp < sevenDaysAgo
        );
        
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (recentSales.length > 0 && previousSales.length > 0) {
            const recentAvg = recentSales.reduce((sum, p) => sum + Number(p.price), 0) / recentSales.length;
            const previousAvg = previousSales.reduce((sum, p) => sum + Number(p.price), 0) / previousSales.length;
            
            if (recentAvg > previousAvg * 1.05) trend = 'up';
            else if (recentAvg < previousAvg * 0.95) trend = 'down';
        }
        
        return {
            minPrice,
            maxPrice,
            avgPrice,
            latestPrice,
            totalSales: soldItems.length,
            trend
        };
    }, [priceHistory]);
    
    if (!stats) {
        return (
            <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
                <h3 className="text-lg font-semibold text-white mb-2">價格歷史</h3>
                <div className="text-center py-8 text-gray-400">
                    暫無交易記錄
                </div>
            </div>
        );
    }
    
    return (
        <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">價格歷史</h3>
                <div className="flex items-center gap-2 text-sm">
                    <div className={`flex items-center gap-1 ${
                        stats.trend === 'up' ? 'text-green-400' :
                        stats.trend === 'down' ? 'text-red-400' : 'text-gray-400'
                    }`}>
                        {stats.trend === 'up' ? (
                            <Icons.TrendingUp className="h-4 w-4" />
                        ) : stats.trend === 'down' ? (
                            <Icons.TrendingUp className="h-4 w-4 transform rotate-180" />
                        ) : (
                            <Icons.TrendingUp className="h-4 w-4 opacity-50" />
                        )}
                        <span>
                            {stats.trend === 'up' ? '上漲趨勢' :
                             stats.trend === 'down' ? '下跌趨勢' : '價格穩定'}
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Price Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                        {formatSoul(stats.minPrice.toString())}
                    </div>
                    <div className="text-xs text-gray-400">最低價</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">
                        {formatSoul(stats.maxPrice.toString())}
                    </div>
                    <div className="text-xs text-gray-400">最高價</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                        {formatSoul(stats.avgPrice.toString())}
                    </div>
                    <div className="text-xs text-gray-400">平均價</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                        {stats.totalSales}
                    </div>
                    <div className="text-xs text-gray-400">總交易次數</div>
                </div>
            </div>
            
            {/* Simple Price Chart (Text-based) */}
            <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">價格走勢</h4>
                <div className="bg-gray-900 rounded p-3">
                    <div className="space-y-1">
                        {priceHistory.slice(-10).map((point, index) => {
                            const isRecent = Date.now() - point.timestamp < 7 * 24 * 60 * 60 * 1000;
                            const relativePrice = Number(point.price) / stats.avgPrice;
                            const barWidth = Math.max(10, Math.min(100, relativePrice * 50));
                            
                            return (
                                <div key={index} className="flex items-center gap-2 text-xs">
                                    <div className="w-20 text-gray-400">
                                        {new Date(point.timestamp).toLocaleDateString()}
                                    </div>
                                    <div className="flex-1 flex items-center gap-2">
                                        <div 
                                            className={`h-2 rounded transition-all ${
                                                point.status === 'sold' 
                                                    ? (isRecent ? 'bg-green-500' : 'bg-green-600') 
                                                    : 'bg-gray-600'
                                            }`}
                                            style={{ width: `${barWidth}%` }}
                                        />
                                        <div className={`font-medium ${
                                            point.status === 'sold' ? 'text-white' : 'text-gray-400'
                                        }`}>
                                            {formatSoul(point.price.toString())}
                                        </div>
                                        <div className="text-gray-500">
                                            {point.status === 'sold' ? '已售出' : '掛單中'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            
            {/* Market Insights */}
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                <div className="flex items-start gap-2">
                    <Icons.Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="text-blue-400 font-medium text-sm mb-1">市場洞察</h4>
                        <div className="text-xs text-blue-300 space-y-1">
                            <p>• 此 NFT 共有 {stats.totalSales} 次交易記錄</p>
                            <p>• 平均價格為 {formatSoul(stats.avgPrice.toString())} SOUL</p>
                            <p>• 價格區間：{formatSoul(stats.minPrice.toString())} - {formatSoul(stats.maxPrice.toString())} SOUL</p>
                            {stats.trend === 'up' && <p>• 📈 近期價格呈上漲趨勢，建議關注市場動向</p>}
                            {stats.trend === 'down' && <p>• 📉 近期價格有所下跌，可能是入手好時機</p>}
                            {stats.trend === 'stable' && <p>• 📊 價格相對穩定，適合長期持有</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};