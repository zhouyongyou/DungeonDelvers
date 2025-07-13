// src/api/metadata-generator.ts - 後端 Metadata 生成器（可部署到 Edge Function）

import { 
    generateHeroSVG, 
    generateRelicSVG, 
    generatePartySVG, 
    generateVipSVG,
    svgToDataURL 
} from '../utils/svgGenerators';
import type { HeroNft, RelicNft, PartyNft, VipNft } from '../types/nft';

// 模擬從 The Graph 或合約獲取 NFT 數據
async function fetchNftData(contractAddress: string, tokenId: string): Promise<any> {
    // 實際實現時，這裡會：
    // 1. 查詢 The Graph 獲取 NFT 基本數據
    // 2. 或直接調用合約讀取鏈上數據
    
    // 示例數據
    const contractType = contractAddress.toLowerCase();
    if (contractType.includes('hero')) {
        return {
            type: 'hero',
            id: BigInt(tokenId),
            contractAddress,
            power: 100 + Math.floor(Math.random() * 155),
            rarity: Math.ceil(Math.random() * 5),
            name: `Hero #${tokenId}`,
            attributes: []
        };
    }
    // ... 其他類型
}

// 生成動態 Metadata
export async function generateDynamicMetadata(
    contractAddress: string, 
    tokenId: string,
    options: {
        includeSvg?: boolean;
        format?: 'dataUrl' | 'url';
        baseUrl?: string;
    } = {}
) {
    const { 
        includeSvg = true, 
        format = 'url',
        baseUrl = 'https://www.dungeondelvers.xyz'
    } = options;

    // 1. 獲取 NFT 鏈上數據
    const nftData = await fetchNftData(contractAddress, tokenId);
    
    // 2. 確定 NFT 類型和基本信息
    const nftType = nftData.type;
    const rarity = nftData.rarity || 1;
    
    // 3. 生成基本 metadata
    const metadata: any = {
        name: nftData.name || `${nftType.toUpperCase()} #${tokenId}`,
        description: getDescription(nftType, rarity),
        // 主圖片使用穩定的 PNG
        image: `${baseUrl}/images/${nftType}/${nftType}-${rarity}.png`,
        attributes: generateAttributes(nftData),
        // 添加額外的元數據
        external_url: `${baseUrl}/nft/${contractAddress}/${tokenId}`,
    };

    // 4. 如果需要，添加 SVG
    if (includeSvg) {
        let svg: string;
        
        switch (nftType) {
            case 'hero':
                svg = generateHeroSVG(nftData as HeroNft);
                break;
            case 'relic':
                svg = generateRelicSVG(nftData as RelicNft);
                break;
            case 'party':
                svg = generatePartySVG(nftData as PartyNft);
                break;
            case 'vip':
                svg = generateVipSVG(nftData as VipNft);
                break;
            default:
                throw new Error(`Unknown NFT type: ${nftType}`);
        }

        if (format === 'dataUrl') {
            // 直接嵌入 SVG data URL
            metadata.animation_url = svgToDataURL(svg);
        } else {
            // 提供 SVG 的獨立 URL
            metadata.animation_url = `${baseUrl}/api/nft/${contractAddress}/${tokenId}/svg`;
            // 可選：也提供原始 SVG data
            metadata.image_data = svgToDataURL(svg);
        }
    }

    return metadata;
}

// 輔助函數：生成描述
function getDescription(type: string, rarity: number): string {
    const rarityNames = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    const descriptions = {
        hero: `A ${rarityNames[rarity - 1]} hero of Dungeon Delvers, ready to explore the darkest depths.`,
        relic: `An ancient ${rarityNames[rarity - 1]} relic, imbued with mysterious powers.`,
        party: `A brave party of adventurers, assembled for the most dangerous expeditions.`,
        vip: `An exclusive VIP membership card, granting special privileges in the Dungeon Delvers ecosystem.`
    };
    return descriptions[type] || 'A unique NFT from Dungeon Delvers.';
}

// 輔助函數：生成屬性
function generateAttributes(nftData: any): any[] {
    const attributes = [];
    
    // 通用屬性
    if (nftData.rarity) {
        attributes.push({
            trait_type: 'Rarity',
            value: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'][nftData.rarity - 1] || 'Common'
        });
    }
    
    // 類型特定屬性
    switch (nftData.type) {
        case 'hero':
            if (nftData.power) {
                attributes.push({
                    trait_type: 'Power',
                    value: nftData.power,
                    display_type: 'number',
                    max_value: 255
                });
            }
            break;
        case 'relic':
            if (nftData.capacity) {
                attributes.push({
                    trait_type: 'Capacity',
                    value: nftData.capacity,
                    display_type: 'number',
                    max_value: 5
                });
            }
            break;
        case 'party':
            if (nftData.totalPower) {
                attributes.push({
                    trait_type: 'Total Power',
                    value: Number(nftData.totalPower),
                    display_type: 'number'
                });
            }
            if (nftData.heroCount) {
                attributes.push({
                    trait_type: 'Heroes',
                    value: nftData.heroCount
                });
            }
            break;
        case 'vip':
            if (nftData.level) {
                attributes.push({
                    trait_type: 'VIP Level',
                    value: nftData.level,
                    display_type: 'number'
                });
            }
            if (nftData.stakedAmount) {
                attributes.push({
                    trait_type: 'Staked Amount',
                    value: (Number(nftData.stakedAmount) / 1e18).toFixed(2),
                    display_type: 'number'
                });
            }
            break;
    }
    
    return attributes;
}

// Edge Function Handler (Vercel/Cloudflare Workers)
export async function handleMetadataRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    
    // 預期路徑: /api/metadata/{contractAddress}/{tokenId}
    const contractAddress = pathParts[pathParts.length - 2];
    const tokenId = pathParts[pathParts.length - 1];
    
    // 檢查是否請求 SVG
    const wantsSvg = url.pathname.endsWith('/svg');
    const actualTokenId = wantsSvg ? pathParts[pathParts.length - 2] : tokenId;
    
    try {
        if (wantsSvg) {
            // 直接返回 SVG
            const nftData = await fetchNftData(contractAddress, actualTokenId);
            let svg: string;
            
            switch (nftData.type) {
                case 'hero':
                    svg = generateHeroSVG(nftData);
                    break;
                case 'relic':
                    svg = generateRelicSVG(nftData);
                    break;
                case 'party':
                    svg = generatePartySVG(nftData);
                    break;
                case 'vip':
                    svg = generateVipSVG(nftData);
                    break;
                default:
                    throw new Error('Unknown NFT type');
            }
            
            return new Response(svg, {
                headers: {
                    'Content-Type': 'image/svg+xml',
                    'Cache-Control': 'public, max-age=3600', // 緩存 1 小時
                }
            });
        } else {
            // 返回 JSON metadata
            const metadata = await generateDynamicMetadata(contractAddress, actualTokenId, {
                includeSvg: true,
                format: 'url'
            });
            
            return new Response(JSON.stringify(metadata, null, 2), {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=3600',
                }
            });
        }
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to generate metadata' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}