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
    isCodex?: boolean;
}

export const NftSvgDisplay: React.FC<NftSvgDisplayProps> = ({ 
    nft, 
    className = '', 
    interactive = true,
    showFallback = true,
    isCodex = false 
}) => {
    const svgContent = useMemo(() => {
        try {
            
            let result: string | null = null;
            switch (nft.type) {
                case 'hero':
                    result = generateHeroSVG(nft, isCodex);
                    break;
                case 'relic':
                    result = generateRelicSVG(nft, isCodex);
                    break;
                case 'party':
                    result = generatePartySVG(nft);
                    break;
                case 'vip':
                    result = generateVipSVG(nft);
                    break;
                default:
                    console.warn('Unknown NFT type:', nft.type);
                    return null;
            }
            
            if (!result) {
                console.error('SVG generation returned null for NFT:', nft.type);
                return null;
            }
            
            return result;
        } catch (error) {
            console.error('Failed to generate SVG for NFT:', { 
                type: nft.type, 
                id: nft.id.toString(), 
                error: error.message,
                stack: error.stack 
            });
            return null;
        }
    }, [nft, isCodex]);

    if (!svgContent && showFallback) {
        // 如果 SVG 生成失敗，顯示備用內容
        return (
            <div className={`bg-red-900/20 border border-red-500/50 rounded-lg flex items-center justify-center ${className}`}>
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
                    <div className="text-xs text-red-400 mt-1">
                        SVG 載入失敗
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
            style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <div 
                style={{ 
                    width: '100%',
                    height: '100%',
                    maxWidth: '100%',
                    maxHeight: '100%'
                }}
                className="[&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: svgContent }}
            />
        </div>
    );
};

// 導出一個優化版本，用於列表顯示
export const NftSvgThumbnail: React.FC<{ nft: AnyNft; size?: number }> = ({ nft, size = 200 }) => {
    return (
        <div 
            style={{ width: size, height: size }} 
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