// src/api/metadata-okx-optimized.ts - 針對 OKX 優化的 Metadata 生成器

/**
 * OKX 和 Element 市場的特性：
 * - OKX：對 metadata 解析較嚴格，可能無法正確讀取稀有度
 * - Element：支援度較好，能正確顯示大部分屬性
 * 
 * 優化策略：
 * 1. 在圖片 URL 中直接體現稀有度
 * 2. 提供明確的占位圖片
 * 3. 屬性格式標準化
 */

interface MetadataOptions {
    baseUrl?: string;
    includeAnimation?: boolean;
    marketOptimized?: 'okx' | 'element' | 'general';
}

// 從 The Graph 獲取 NFT 數據
async function fetchNftDataFromGraph(contractAddress: string, tokenId: string): Promise<any> {
    const THE_GRAPH_API_URL = process.env.THE_GRAPH_STUDIO_API_URL || '';
    
    // 判斷 NFT 類型
    const nftType = getNftTypeFromContract(contractAddress);
    
    // GraphQL 查詢 - 獲取稀有度
    // 構建完整的 ID (contractAddress-tokenId 格式)
    const fullId = `${contractAddress.toLowerCase()}-${tokenId}`;
    
    const query = `
        query GetNFT($id: ID!) {
            ${nftType}(id: $id) {
                tokenId
                rarity
                ${nftType === 'hero' ? 'power' : ''}
                ${nftType === 'relic' ? 'capacity' : ''}
                ${nftType === 'party' ? 'totalPower totalCapacity partyRarity' : ''}
            }
        }
    `;
    
    try {
        const response = await fetch(THE_GRAPH_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                variables: { 
                    id: fullId
                }
            })
        });
        
        const { data } = await response.json();
        const result = data[nftType];
        
        if (result) {
            return { ...result, type: nftType };
        }
    } catch (error) {
        console.error('Failed to fetch from The Graph:', error);
    }
    
    // 如果無法從 The Graph 獲取，返回占位數據
    return {
        type: nftType,
        tokenId,
        rarity: 0, // 0 表示未知，將使用占位圖片
    };
}

// 生成針對市場優化的 Metadata
export async function generateOptimizedMetadata(
    contractAddress: string,
    tokenId: string,
    options: MetadataOptions = {}
): Promise<any> {
    const {
        baseUrl = 'https://www.dungeondelvers.xyz',
        includeAnimation = true,
        marketOptimized = 'general'
    } = options;
    
    // 1. 獲取 NFT 數據
    const nftData = await fetchNftDataFromGraph(contractAddress, tokenId);
    const { type, rarity = 0 } = nftData;
    
    // 2. 確定圖片 URL
    let imageUrl: string;
    if (rarity === 0) {
        // 未知稀有度 - 使用占位圖片
        imageUrl = `${baseUrl}/images/${type}/${type}-placeholder.png`;
    } else {
        // 已知稀有度 - 使用對應圖片
        imageUrl = `${baseUrl}/images/${type}/${type}-${rarity}.png`;
    }
    
    // 3. 生成基礎 metadata
    const metadata: any = {
        name: generateName(type, tokenId, rarity),
        description: generateDescription(type, rarity),
        image: imageUrl,
        attributes: [],
    };
    
    // 4. 添加屬性（簡化版 - 只提供必要資訊）
    metadata.attributes = generateSimpleAttributes(nftData);
    
    // NFT 市場不需要動畫或其他複雜功能
    // 只提供基本的 metadata 和 PNG 圖片
    
    return metadata;
}

// 生成名稱（在名稱中體現稀有度，確保 OKX 能看到）
function generateName(type: string, tokenId: string, rarity: number): string {
    const typeNames = {
        hero: 'Hero',
        relic: 'Relic',
        party: 'Party',
        vip: 'VIP'
    };
    
    const rarityNames = ['Unknown', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    const rarityName = rarityNames[rarity] || 'Unknown';
    
    if (rarity === 0) {
        return `${typeNames[type] || type} #${tokenId} (Loading...)`;
    }
    
    // 加上星級讓用戶更容易識別
    const stars = '★'.repeat(rarity) + '☆'.repeat(5 - rarity);
    return `${typeNames[type] || type} #${tokenId} ${stars} ${rarityName}`;
}

// 生成描述
function generateDescription(type: string, rarity: number): string {
    if (rarity === 0) {
        return 'NFT data is syncing. Please check back later for complete attributes.';
    }
    
    const descriptions = {
        hero: 'A brave hero ready to explore the darkest depths of the dungeons.',
        relic: 'An ancient relic containing mysterious powers.',
        party: 'A carefully assembled party of adventurers, ready for the most dangerous challenges.',
        vip: 'Exclusive VIP membership card with special privileges and benefits.'
    };
    
    return descriptions[type] || 'Dungeon Delvers NFT';
}

// 簡化屬性 - NFT 市場專用
function generateSimpleAttributes(nftData: any): any[] {
    const attributes = [];
    
    // 稀有度
    if (nftData.rarity && nftData.rarity > 0) {
        attributes.push({
            trait_type: 'Rarity',
            value: nftData.rarity,
            display_type: 'number'
        });
    }
    
    // 類型特定的核心屬性
    switch (nftData.type) {
        case 'hero':
            if (nftData.power) {
                attributes.push({
                    trait_type: 'Power',
                    value: nftData.power,
                    display_type: 'number'
                });
            }
            break;
        case 'relic':
            if (nftData.capacity) {
                attributes.push({
                    trait_type: 'Capacity',
                    value: nftData.capacity,
                    display_type: 'number'
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
            break;
    }
    
    return attributes;
}

// OKX 優化屬性（簡潔明了）
function generateOkxOptimizedAttributes(nftData: any): any[] {
    const attributes = [];
    
    // 最重要的屬性放前面
    if (nftData.rarity && nftData.rarity > 0) {
        attributes.push({
            trait_type: 'Rarity Stars',
            value: '★'.repeat(nftData.rarity) + '☆'.repeat(5 - nftData.rarity)
        });
        
        attributes.push({
            trait_type: 'Rarity Level',
            value: nftData.rarity,
            display_type: 'number'
        });
    } else {
        attributes.push({
            trait_type: 'Status',
            value: 'Syncing'
        });
    }
    
    // 類型特定屬性
    switch (nftData.type) {
        case 'hero':
            if (nftData.power) {
                attributes.push({
                    trait_type: 'Power',
                    value: nftData.power,
                    display_type: 'number'
                });
            }
            break;
        case 'relic':
            if (nftData.capacity) {
                attributes.push({
                    trait_type: 'Capacity',
                    value: nftData.capacity,
                    display_type: 'number'
                });
            }
            break;
    }
    
    return attributes;
}

// Element 詳細屬性
function generateDetailedAttributes(nftData: any): any[] {
    const attributes = generateOkxOptimizedAttributes(nftData);
    
    // 添加更多詳細信息
    if (nftData.rarity > 0) {
        const rarityNames = ['', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
        attributes.push({
            trait_type: 'Rarity Name',
            value: rarityNames[nftData.rarity] || 'Unknown'
        });
    }
    
    // 添加更新時間
    attributes.push({
        trait_type: 'Last Updated',
        value: new Date().toISOString(),
        display_type: 'date'
    });
    
    return attributes;
}

// 標準屬性
function generateStandardAttributes(nftData: any): any[] {
    return generateOkxOptimizedAttributes(nftData);
}

// 判斷 NFT 類型
function getNftTypeFromContract(contractAddress: string): string {
    const address = contractAddress.toLowerCase();
    
    const contracts = {
        '0x648fcdf1f59a2598e9f68ab3210a25a877fad353': 'hero',
        '0x6704d55c8736e373b001d54ba00a80dbb0ec793b': 'relic',
        '0x66ea7c0b2baa497eaf18be9f3d4459ffc20ba491': 'party',
        '0x845de2d044323161703bb0c6ffb1f2ce287ad5bb': 'vip',
    };
    
    return contracts[address] || 'unknown';
}

// Render.com 部署處理器
export async function handleRenderRequest(req: any, res: any) {
    const { contractAddress, tokenId } = req.params;
    const market = req.query.market || 'general'; // 可以通過查詢參數指定市場
    
    try {
        const metadata = await generateOptimizedMetadata(contractAddress, tokenId, {
            marketOptimized: market as any
        });
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=300'); // 緩存5分鐘
        res.json(metadata);
    } catch (error) {
        console.error('Error generating metadata:', error);
        res.status(500).json({ error: 'Failed to generate metadata' });
    }
}