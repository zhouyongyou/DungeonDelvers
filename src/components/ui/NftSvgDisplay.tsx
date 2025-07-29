// src/components/ui/NftSvgDisplay.tsx - NFT SVG/PNG 顯示組件

import React, { useMemo } from 'react';
import type { AnyNft } from '../../types/nft';
import { 
    generateHeroSVG, 
    generateRelicSVG, 
    generatePartySVG, 
    generateVipSVG 
} from '../../utils/svgGenerators';
import { useNftDisplay } from '../../hooks/useNftDisplayPreference';

interface NftSvgDisplayProps {
    nft: AnyNft;
    className?: string;
    interactive?: boolean;
    showFallback?: boolean;
    isCodex?: boolean;
    forceMode?: 'svg' | 'png'; // 強制使用特定模式
}

export const NftSvgDisplay: React.FC<NftSvgDisplayProps> = ({ 
    nft, 
    className = '', 
    interactive = true,
    showFallback = true,
    isCodex = false,
    forceMode
}) => {
    const { displayMode } = useNftDisplay();
    const mode = forceMode || displayMode;
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

    // 如果選擇 PNG 模式，顯示 PNG 圖片
    if (mode === 'png' && nft.image) {
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
                <img 
                    src={nft.image}
                    alt={`${nft.type} #${nft.id}`}
                    className="w-full h-full object-contain rounded-lg"
                    onError={(e) => {
                        console.error('PNG 載入失敗:', nft.image);
                        // 如果 PNG 載入失敗，可以考慮回退到 SVG
                        if (showFallback && svgContent) {
                            const imgElement = e.target as HTMLImageElement;
                            imgElement.style.display = 'none';
                            const parent = imgElement.parentElement;
                            if (parent) {
                                const svgContainer = document.createElement('div');
                                svgContainer.style.width = '100%';
                                svgContainer.style.height = '100%';
                                svgContainer.innerHTML = svgContent;
                                parent.appendChild(svgContainer);
                            }
                        }
                    }}
                />
            </div>
        );
    }

    // SVG 模式
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
export const NftSvgThumbnail: React.FC<{ nft: AnyNft; size?: number; forceMode?: 'svg' | 'png' }> = ({ nft, size = 200, forceMode }) => {
    return (
        <div 
            style={{ width: size, height: size }} 
            className="relative overflow-hidden rounded-lg"
        >
            <NftSvgDisplay 
                nft={nft} 
                className="absolute inset-0 w-full h-full" 
                interactive={false}
                forceMode={forceMode}
            />
        </div>
    );
};