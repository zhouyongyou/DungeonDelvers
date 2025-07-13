// src/api/nfts.ts (TypeScript 錯誤修正版)

import { createPublicClient, http, type Address } from 'viem';
import { bsc } from 'wagmi/chains';
import { Buffer } from 'buffer';
import { getContract, contracts } from '../config/contracts.js';
import { nftMetadataCache } from '../cache/nftMetadataCache.js';
import type { 
    AllNftCollections, 
    BaseNft, 
    HeroNft,
    RelicNft,
    PartyNft,
    VipNft,
    NftAttribute,
    NftType
} from '../types/nft';

// =================================================================
// Section 1: The Graph API 設定 (保持不變)
// =================================================================

const THE_GRAPH_API_URL = import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL;

const GET_PLAYER_ASSETS_QUERY = `
  query GetPlayerAssets($owner: ID!) {
    player(id: $owner) {
      id
      heros { 
        id 
        tokenId 
        power 
        rarity 
        contractAddress
        createdAt
      }
      relics { 
        id 
        tokenId 
        capacity 
        rarity 
        contractAddress
        createdAt
      }
      parties {
        id
        tokenId
        totalPower
        totalCapacity
        partyRarity
        contractAddress
        heros { tokenId }
        relics { tokenId }
        fatigueLevel
        provisionsRemaining
        cooldownEndsAt
        unclaimedRewards
        createdAt
      }
      vip { 
        id 
        tokenId 
        stakedAmount 
        level 
      }
    }
  }
`;

// =================================================================
// Section 2: 輔助函式 (保持不變)
// =================================================================

type SupportedChainId = keyof typeof contracts;

function isSupportedChain(chainId: number): chainId is SupportedChainId {
    return chainId in contracts;
}

const getClient = (chainId: number) => {
    const chain = chainId === bsc.id ? bsc : null;
    if (!chain) throw new Error("Unsupported chain for client creation");
    
    const rpcUrl = 'https://bsc-dataseed1.binance.org/';
    return createPublicClient({ chain, transport: http(rpcUrl) });
};

// 增強版本：元數據獲取函數 - 集成IndexedDB缓存和智能重試
export async function fetchMetadata(
    uri: string, 
    tokenId: string, 
    contractAddress: string, 
    retryCount = 0
): Promise<Omit<BaseNft, 'id' | 'contractAddress' | 'type'>> {
  
    const maxRetries = 1; // 減少重試次數，因為有多個數據源
    const baseTimeout = 2000; // 減少基礎超時時間
    const timeout = baseTimeout + (retryCount * 500); // 更短的漸進式超時
    
    // 識別 NFT 類型以提供更好的錯誤處理 - 使用實際合約地址
    const addressLower = contractAddress.toLowerCase();
    const nftType = 
        addressLower === '0x648fcdf1f59a2598e9f68ab3210a25a877fad353' ? 'hero' :     // Hero v1.3.0
        addressLower === '0x6704d55c8736e373b001d54ba00a80dbb0ec793b' ? 'relic' :    // Relic v1.3.0  
        addressLower === '0x66ea7c0b2baa497eaf18be9f3d4459ffc20ba491' ? 'party' :    // Party v1.3.0
        addressLower === '0x845de2d044323161703bb0c6ffb1f2ce287ad5bb' ? 'vip' :      // VIP Staking v1.3.2
        addressLower === '0x2a046140668cbb8f598ff3852b08852a8eb23b6a' ? 'hero' :     // Hero v1.2.6 (舊版)
        addressLower === '0x95f005e2e0d38381576da36c5ca4619a87da550e' ? 'relic' :    // Relic v1.2.6 (舊版)
        addressLower === '0x11fb68409222b53b04626d382d7e691e640a1dcb' ? 'party' :    // Party v1.2.6 (舊版)
        addressLower === '0xefdfff583944a2c6318d1597ad1e41159fcd8f6db' ? 'vip' :      // VIP v1.2.6 (舊版)
        'unknown';
    
    console.log(`獲取 ${nftType} #${tokenId} 元數據 (嘗試 ${retryCount + 1}/${maxRetries + 1})`);
    
    // 🔥 1. 先检查IndexedDB缓存
    const cachedMetadata = await nftMetadataCache.getMetadata(tokenId, contractAddress);
    if (cachedMetadata) {
        console.log(`${nftType} #${tokenId} 使用緩存數據`);
        return {
            ...cachedMetadata,
            name: cachedMetadata.name ?? '',
            description: cachedMetadata.description ?? '',
            image: cachedMetadata.image ?? '',
            attributes: cachedMetadata.attributes ?? [],
            source: 'cache',
        };
    }
    
    try {
        let metadata: Omit<BaseNft, 'id' | 'contractAddress' | 'type'>;
        const startTime = Date.now();
        
        // 🔥 2. 優先使用本地 API（最快）
        try {
            console.log(`${nftType} #${tokenId} 嘗試本地 API`);
            metadata = await fetchFromLocalAPI(nftType, tokenId, timeout);
            const loadTime = Date.now() - startTime;
            console.log(`${nftType} #${tokenId} 本地 API 載入成功 (${loadTime}ms)`);
            
            // 成功後立即緩存
            await nftMetadataCache.cacheMetadata(tokenId, contractAddress, metadata);
            return { ...metadata, source: 'local-api' };
        } catch (localError) {
            console.log(`${nftType} #${tokenId} 本地 API 失敗，嘗試其他方案:`, localError);
        }
        
        // 🔥 3. 如果本地 API 失敗，嘗試 CDN（次選）
        try {
            console.log(`${nftType} #${tokenId} 嘗試 CDN`);
            metadata = await fetchFromCDN(nftType, tokenId, timeout);
            const loadTime = Date.now() - startTime;
            console.log(`${nftType} #${tokenId} CDN 載入成功 (${loadTime}ms)`);
            
            await nftMetadataCache.cacheMetadata(tokenId, contractAddress, metadata);
            return { ...metadata, source: 'cdn' };
        } catch (cdnError) {
            console.log(`${nftType} #${tokenId} CDN 失敗，嘗試原始方案:`, cdnError);
        }
        
        // 🔥 4. 原始邏輯作為最後備援
        if (uri.startsWith('data:application/json;base64,')) {
            console.log(`${nftType} #${tokenId} 解析 base64 編碼的元數據`);
            const json = Buffer.from(uri.substring('data:application/json;base64,'.length), 'base64').toString();
            metadata = JSON.parse(json);
        } else if (uri.startsWith('ipfs://')) {
            console.log(`${nftType} #${tokenId} 從 IPFS 載入元數據（備援）`);
            // 🔥 優化IPFS載入 - 使用更少的網關和更短的超時
            const ipfsHash = uri.replace('ipfs://', '');
            
            // 只使用最可靠的 IPFS 網關
            const gateways = [
                `https://ipfs.io/ipfs/${ipfsHash}`,
                `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
                `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
                `https://ipfs.infura.io/ipfs/${ipfsHash}`,
                `https://gateway.ipfs.io/ipfs/${ipfsHash}`
            ];
            
            metadata = await fetchWithMultipleGateways(gateways, Math.min(timeout, 3000)); // 最多3秒
        } else {
            console.log(`${nftType} #${tokenId} 從 HTTP 載入元數據: ${uri}`);
            metadata = await fetchWithTimeout(uri, timeout);
        }
        
        const loadTime = Date.now() - startTime;
        console.log(`${nftType} #${tokenId} 元數據載入成功 (${loadTime}ms)`);
        
        // 🔥 成功获取后立即缓存
        await nftMetadataCache.cacheMetadata(tokenId, contractAddress, metadata);
        
        return { ...metadata, source: 'fallback' };
    } catch (error) {
        const loadTime = Date.now() - Date.now();
        console.warn(`${nftType} #${tokenId} 解析元數據時出錯 (嘗試 ${retryCount + 1}/${maxRetries + 1}, ${loadTime}ms):`, error);
        
        // 如果還有重試次數，使用指數回退策略重試
        if (retryCount < maxRetries) {
            const retryDelay = Math.min(500 * Math.pow(2, retryCount), 2000); // 更短的重試延遲
            console.log(`${nftType} #${tokenId} 將在 ${retryDelay}ms 後重試...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return fetchMetadata(uri, tokenId, contractAddress, retryCount + 1);
        }
        
        // 🔥 根據 NFT 類型提供更好的 fallback 數據
        const fallbackData = generateFallbackMetadata(nftType, tokenId);
        await nftMetadataCache.cacheMetadata(tokenId, contractAddress, fallbackData);
        console.log(`${nftType} #${tokenId} 使用 fallback 數據`);
        
        return { ...fallbackData, source: 'fallback' };
    }
}

// 新增：根據 NFT 類型和稀有度生成 fallback 元數據
function generateFallbackMetadata(nftType: string, tokenId: string, rarity?: number): Omit<BaseNft, 'id' | 'contractAddress' | 'type'> {
    const baseData = {
        name: `${nftType.charAt(0).toUpperCase() + nftType.slice(1)} #${tokenId}`,
        description: '正在載入詳細資訊...',
        image: '',
        attributes: []
    };
    
    // 根據稀有度選擇圖片 (1-5星)
    const getImageByRarity = (type: string, rarity: number = 1): string => {
        const rarityIndex = Math.max(1, Math.min(5, rarity)); // 確保在1-5範圍內
        return `/images/${type}/${type}-${rarityIndex}.png`;
    };
    
    switch (nftType) {
        case 'relic':
            return {
                ...baseData,
                name: `聖物 #${tokenId}`,
                image: getImageByRarity('relic', rarity),
                attributes: [
                    { trait_type: 'Capacity', value: '載入中...' },
                    { trait_type: 'Rarity', value: rarity || '載入中...' }
                ]
            };
        case 'hero':
            return {
                ...baseData,
                name: `英雄 #${tokenId}`,
                image: getImageByRarity('hero', rarity),
                attributes: [
                    { trait_type: 'Power', value: '載入中...' },
                    { trait_type: 'Rarity', value: rarity || '載入中...' }
                ]
            };
        case 'party':
            return {
                ...baseData,
                name: `隊伍 #${tokenId}`,
                image: '/images/party/party.png',
                attributes: [
                    { trait_type: 'Total Power', value: '載入中...' },
                    { trait_type: 'Heroes Count', value: '載入中...' },
                    { trait_type: 'Rarity', value: rarity || '載入中...' }
                ]
            };
        case 'vip':
            return {
                ...baseData,
                name: `VIP 卡 #${tokenId}`,
                image: '/images/vip/vip.png',
                attributes: [
                    { trait_type: 'Level', value: '載入中...' },
                    { trait_type: 'Staked Value', value: '載入中...' }
                ]
            };
        default:
            return baseData;
    }
}

// 🔥 優化版本：更快的 IPFS 網關處理
async function fetchWithMultipleGateways(gateways: string[], timeout: number): Promise<Omit<BaseNft, 'id' | 'contractAddress' | 'type'>> {
    const controller = new AbortController();
    const startTime = Date.now();
    
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeout);
    
    try {
        console.log(`🔄 IPFS 備援載入: 嘗試 ${gateways.length} 個網關 (${timeout}ms 超時)`);
        
        // 🔥 優化：使用 Promise.race 而不是 allSettled，第一個成功就返回
        const racePromises = gateways.map((url, index) => 
            fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'DungeonDelvers/1.0',
                    'Cache-Control': 'max-age=300'
                }
            }).then(response => {
                const loadTime = Date.now() - startTime;
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                console.log(`✅ IPFS 網關 ${index + 1} 成功 (${loadTime}ms)`);
                return response.json();
            }).catch(error => {
                const loadTime = Date.now() - startTime;
                console.log(`❌ IPFS 網關 ${index + 1} 失敗 (${loadTime}ms):`, error.message);
                throw error;
            })
        );
        
        // 使用 Promise.race 獲取第一個成功的結果
        const result = await Promise.race(racePromises);
        clearTimeout(timeoutId);
        
        const totalTime = Date.now() - startTime;
        console.log(`🎉 IPFS 載入成功 (${totalTime}ms)`);
        return result;
        
    } catch (error) {
        clearTimeout(timeoutId);
        const totalTime = Date.now() - startTime;
        
        if (error instanceof Error && error.name === 'AbortError') {
            console.warn(`⏰ IPFS 載入超時 (${timeout}ms)`);
            throw new Error(`IPFS 網關請求超時 (${timeout}ms)`);
        }
        
        console.warn(`🚫 IPFS 載入失敗 (${totalTime}ms):`, error);
        throw new Error(`IPFS 網關無法訪問: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
}

// 新增的輔助函數 - 帶有超時的fetch
async function fetchWithTimeout(url: string, timeout: number): Promise<Omit<BaseNft, 'id' | 'contractAddress' | 'type'>> {
    const controller = new AbortController();
    
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeout);
    
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'DungeonDelvers/1.0'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`請求超時 (${timeout}ms)`);
        }
        throw error;
    }
}

// 🔥 新增：本地 API 載入函數
async function fetchFromLocalAPI(nftType: string, tokenId: string, timeout: number): Promise<Omit<BaseNft, 'id' | 'contractAddress' | 'type'>> {
    // 使用 CDN 配置來獲取資源
    const { getMetadataUrl, loadResourceWithFallback } = await import('../config/cdn');
    
    try {
        // 構建資源路徑
        let resourcePath = '';
        switch (nftType) {
            case 'hero':
            case 'relic':
                resourcePath = `${nftType}/${tokenId}.json`;
                break;
            case 'party':
                resourcePath = `party/party.json`;
                break;
            case 'vip':
                resourcePath = `vip/vip.json`;
                break;
            default:
                throw new Error(`不支援的 NFT 類型: ${nftType}`);
        }
        
        return await loadResourceWithFallback(
            resourcePath,
            'api',
            (response) => response.json()
        );
    } catch (error) {
        // 如果 CDN 配置載入失敗，回退到原始方法
        const baseUrl = window.location.origin;
        let apiPath = '';
        
        switch (nftType) {
            case 'hero':
                apiPath = `/api/hero/${tokenId}.json`;
                break;
            case 'relic':
                apiPath = `/api/relic/${tokenId}.json`;
                break;
            case 'party':
                apiPath = `/api/party/party.json`;
                break;
            case 'vip':
                apiPath = `/api/vip/vip.json`;
                break;
            default:
                throw new Error(`不支援的 NFT 類型: ${nftType}`);
        }
        
        const url = `${baseUrl}${apiPath}`;
        return await fetchWithTimeout(url, Math.min(timeout, 1000));
    }
}

// 🔥 新增：CDN 載入函數
async function fetchFromCDN(nftType: string, tokenId: string, timeout: number): Promise<Omit<BaseNft, 'id' | 'contractAddress' | 'type'>> {
    // 使用當前域名避免 CORS 問題
    const currentDomain = window.location.origin;
    const cdnUrls = [
        `${currentDomain}/api/${nftType}/${tokenId}.json`,
        `https://dungeon-delvers-metadata-server.onrender.com/api/${nftType}/${tokenId}.json`
    ];
    
    // 對於 party 和 vip，使用固定檔案名
    if (nftType === 'party') {
        cdnUrls[0] = `${currentDomain}/api/party/party.json`;
        cdnUrls[1] = `https://dungeon-delvers-metadata-server.onrender.com/api/party/party.json`;
    } else if (nftType === 'vip') {
        cdnUrls[0] = `${currentDomain}/api/vip/vip.json`;
        cdnUrls[1] = `https://dungeon-delvers-metadata-server.onrender.com/api/vip/vip.json`;
    }
    
    // 嘗試所有 CDN URL
    for (const url of cdnUrls) {
        try {
            return await fetchWithTimeout(url, Math.min(timeout, 2000)); // CDN 最多2秒超時
        } catch (error) {
            console.log(`CDN ${url} 失敗:`, error);
            continue;
        }
    }
    
    throw new Error('所有 CDN 都失敗');
}

// =================================================================
// Section 3: 核心數據獲取邏輯 (已修正 TypeScript 錯誤)
// =================================================================

// 批量處理工具函數 - 限制並發請求數量
async function batchProcess<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 5
): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processor));
        results.push(...batchResults);
        
        // 在批次之間添加小延遲以避免過載
        if (i + batchSize < items.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    return results;
}

// 定義資產類型
interface AssetWithTokenId {
    tokenId: string | number | bigint;
    [key: string]: unknown;
}

interface HeroAsset extends AssetWithTokenId {
    power: string | number | bigint;
    rarity: string | number | bigint;
}

interface RelicAsset extends AssetWithTokenId {
    capacity: string | number | bigint;
    rarity: string | number | bigint;
}

interface PartyAsset extends AssetWithTokenId {
    totalPower: string | number | bigint;
    totalCapacity: string | number | bigint;
    partyRarity: string | number | bigint;
          heros?: Array<{ tokenId: string | number | bigint }>;
    relics?: Array<{ tokenId: string | number | bigint }>;
}

interface VipAsset extends AssetWithTokenId {
    level?: string | number | bigint;
    stakedAmount?: string | number | bigint;
    stakedValueUSD?: string | number | bigint;
}

async function parseNfts<T extends AssetWithTokenId>(
    assets: T[],
    type: NftType,
    chainId: SupportedChainId,
    client: ReturnType<typeof getClient>
): Promise<Array<HeroNft | RelicNft | PartyNft | VipNft>> {
    if (!assets || assets.length === 0) return [];

    const contractKeyMap: Record<NftType, keyof typeof contracts[typeof bsc.id]> = {
        hero: 'hero',
        relic: 'relic',
        party: 'party',
        vip: 'vipStaking',
    };

    const contract = getContract(chainId, contractKeyMap[type]);
    if (!contract) {
        console.warn(`在 chainId: ${chainId} 上找不到 '${contractKeyMap[type]}' 的合約設定`);
        return [];
    }
    const contractAddress = contract.address;

    const uriCalls = assets.map(asset => ({
        ...contract,
        functionName: 'tokenURI',
        args: [BigInt(asset.tokenId)],
    }));

    const uriResults = await client.multicall({ contracts: uriCalls, allowFailure: true });

    // 使用批量處理來限制並發元數據請求
    const processAsset = async (asset: T, index: number) => {
        const uriResult = uriResults[index];
        let metadata: Omit<BaseNft, 'id' | 'contractAddress' | 'type'>;

        // 先從子圖獲取稀有度信息（如果可用）
        let assetRarity: number | undefined;
        if ('rarity' in asset && typeof asset.rarity === 'number') {
            assetRarity = asset.rarity;
        } else if ('rarity' in asset && typeof asset.rarity === 'string') {
            assetRarity = parseInt(asset.rarity);
        } else if ('rarity' in asset && typeof asset.rarity === 'bigint') {
            assetRarity = Number(asset.rarity);
        } else if (type === 'party' && 'partyRarity' in asset) {
            assetRarity = Number(asset.partyRarity);
        }

        if (uriResult && uriResult.status === 'success') {
            metadata = await fetchMetadata(
                uriResult.result as string, 
                asset.tokenId.toString(), 
                contractAddress
            );
        } else {
            console.warn(`無法獲取 ${type} #${asset.tokenId} 的 tokenURI，使用稀有度 ${assetRarity} 的 fallback`);
            // 使用增強的 fallback，包含稀有度信息
            metadata = generateFallbackMetadata(type, asset.tokenId.toString(), assetRarity);
        }

        const findAttr = (trait: string, defaultValue: string | number = 0) => metadata.attributes?.find((a: NftAttribute) => a.trait_type === trait)?.value ?? defaultValue;
        
        // 處理稀有度轉換 - 從 metadata 或子圖數據獲取
        const getRarityFromMetadata = () => {
          const rarityAttr = metadata.attributes?.find((a: NftAttribute) => a.trait_type === 'Rarity');
          if (rarityAttr) {
            return rarityAttr.value;
          }
          return assetRarity || 1;
        };
        
        const baseNft = { ...metadata, id: BigInt(asset.tokenId), contractAddress, source: metadata.source || 'metadata' };

        switch (type) {
            case 'hero': {
                const heroAsset = asset as unknown as HeroAsset;
                return { ...baseNft, type, power: Number(heroAsset.power), rarity: getRarityFromMetadata() };
            }
            case 'relic': {
                const relicAsset = asset as unknown as RelicAsset;
                return { ...baseNft, type, capacity: Number(relicAsset.capacity), rarity: getRarityFromMetadata() };
            }
            case 'party': {
                const partyAsset = asset as unknown as PartyAsset;
                return { 
                    ...baseNft, 
                    type, 
                    totalPower: BigInt(partyAsset.totalPower), 
                    totalCapacity: BigInt(partyAsset.totalCapacity), 
                    heroIds: partyAsset.heros ? partyAsset.heros.map((h) => BigInt(h.tokenId)) : [], 
                    relicIds: partyAsset.relics ? partyAsset.relics.map((r) => BigInt(r.tokenId)) : [], 
                    partyRarity: Number(partyAsset.partyRarity) 
                };
            }
            case 'vip': {
                const vipAsset = asset as unknown as VipAsset;
                return { 
                    ...baseNft, 
                    type, 
                    level: Number(vipAsset.level || findAttr('VIP Level', 0)),
                    stakedAmount: BigInt(vipAsset.stakedAmount || 0),
                    stakedValueUSD: vipAsset.stakedValueUSD ? BigInt(vipAsset.stakedValueUSD) : undefined
                };
            }
            default: return null;
        }
    };

    // 使用批量處理來處理資產，限制並發數量
    const assetsWithIndex = assets.map((asset, index) => ({ asset, index }));
    const results = await batchProcess(
        assetsWithIndex,
        ({ asset, index }) => processAsset(asset, index),
        3 // 限制並發數量為3
    );

    return results.filter(Boolean) as Array<HeroNft | RelicNft | PartyNft | VipNft>;
}

export async function fetchAllOwnedNfts(owner: Address, chainId: number): Promise<AllNftCollections> {
    const emptyResult: AllNftCollections = { heros: [], relics: [], parties: [], vipCards: [] };
    
    if (!isSupportedChain(chainId)) {
        console.error(`不支援的鏈 ID: ${chainId}`);
        return emptyResult;
    }

    if (!THE_GRAPH_API_URL) {
        console.error('The Graph API URL 未配置');
        return emptyResult;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(THE_GRAPH_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: GET_PLAYER_ASSETS_QUERY,
                variables: { owner: owner.toLowerCase() },
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`GraphQL 請求失敗: ${response.status} ${response.statusText}`);
        }
        
        const { data, errors } = await response.json();
        
        if (errors) {
            console.error('GraphQL 錯誤:', errors);
            throw new Error(`GraphQL 查詢錯誤: ${errors.map((e: { message: string }) => e.message).join(', ')}`);
        }
        
        const playerAssets = data?.player;
        if (!playerAssets) {
            console.log('未找到玩家資產數據，可能是新用戶');
            return emptyResult;
        }

        const client = getClient(chainId);

        // 🔥 優化載入順序：優先載入聖物和英雄（組隊需要），然後是其他
        const [relics, heroes] = await Promise.all([
            parseNfts(playerAssets.relics || [], 'relic', chainId, client),
            parseNfts(playerAssets.heros || [], 'hero', chainId, client),
        ]);
        
        // 其他資產並行載入
        // 隊伍數據可能需要更長時間同步，添加重試邏輯
        let parties: Array<HeroNft | RelicNft | PartyNft | VipNft> = [];
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                parties = await parseNfts(playerAssets.parties || [], 'party', chainId, client);
                // 檢查隊伍數據是否完整
                const partyNfts = parties.filter((nft): nft is PartyNft => nft.type === 'party');
                const hasValidParties = partyNfts.every(party => 
                    party.partyRarity > 0 && 
                    party.totalPower > 0n && 
                    party.totalCapacity > 0n
                );
                if (hasValidParties || retryCount === maxRetries - 1) break;
                
                console.log(`隊伍數據不完整，重試 ${retryCount + 1}/${maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
                retryCount++;
            } catch (error) {
                console.warn(`解析隊伍數據失敗，重試 ${retryCount + 1}/${maxRetries}:`, error);
                retryCount++;
                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        
        const vipCards = playerAssets.vip ? await parseNfts([playerAssets.vip], 'vip', chainId, client) : [];

        return {
            heros: heroes.filter(Boolean).map(nft => ({ ...nft, source: nft.source || 'subgraph' })),
            relics: relics.filter(Boolean).map(nft => ({ ...nft, source: nft.source || 'subgraph' })),
            parties: parties.filter(Boolean).map(nft => ({ ...nft, source: nft.source || 'subgraph' })),
            vipCards: vipCards.filter(Boolean).map(nft => ({ ...nft, source: nft.source || 'subgraph' })),
        };

    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.error("GraphQL 請求超時");
        } else {
            console.error("獲取 NFT 數據時發生錯誤: ", error);
        }
        return emptyResult;
    }
}
