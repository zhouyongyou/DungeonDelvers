// src/components/ui/NftSvgDisplay.tsx - NFT SVG 顯示組件

import React, { useMemo } from 'react';
import type { AnyNft } from '../../types/nft';
import { 
    generateHeroSVG, 
    generateRelicSVG, 
    generatePartySVG, 
    generateVipSVG 
} from '../../utils/svgGenerators';

interface NftSvgDisplayProps {
    nft: AnyNft;
    className?: string;
    interactive?: boolean;
    showFallback?: boolean;
}

export const NftSvgDisplay: React.FC<NftSvgDisplayProps> = ({ 
    nft, 
    className = '', 
    interactive = true,
    showFallback = true 
}) => {
    const svgContent = useMemo(() => {
        try {
            switch (nft.type) {
                case 'hero':
                    return generateHeroSVG(nft);
                case 'relic':
                    return generateRelicSVG(nft);
                case 'party':
                    return generatePartySVG(nft);
                case 'vip':
                    return generateVipSVG(nft);
                default:
                    return null;
            }
        } catch (error) {
            console.error('Failed to generate SVG:', error);
            return null;
        }
    }, [nft]);

    if (!svgContent && showFallback) {
        // 如果 SVG 生成失敗，顯示備用內容
        return (
            <div className={`bg-gray-800 rounded-lg flex items-center justify-center ${className}`}>
                <div className="text-center p-4">
                    <div className="text-4xl mb-2">
                        {nft.type === 'hero' ? '⚔️' : 
                         nft.type === 'relic' ? '💎' : 
                         nft.type === 'party' ? '👥' : 
                         nft.type === 'vip' ? '👑' : '❓'}
                    </div>
                    <div className="text-sm text-gray-400">
                        {nft.type.toUpperCase()} #{nft.id.toString()}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div 
            className={`
                ${interactive ? 'hover:scale-105 transition-transform duration-300' : ''} 
                ${className}
            `}
            dangerouslySetInnerHTML={{ __html: svgContent }}
        />
    );
};

// 導出一個優化版本，用於列表顯示
export const NftSvgThumbnail: React.FC<{ nft: AnyNft; size?: number }> = ({ nft, size = 200 }) => {
    return (
        <div 
            style={{ width: size, height: size * 1.5 }} 
            className="relative overflow-hidden rounded-lg"
        >
            <NftSvgDisplay 
                nft={nft} 
                className="absolute inset-0 w-full h-full" 
                interactive={false}
            />
        </div>
    );
};