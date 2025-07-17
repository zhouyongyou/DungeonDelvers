// src/api/nfts.ts (TypeScript 錯誤修正版)

import { createPublicClient, http, type Address } from 'viem';
import { bsc } from 'wagmi/chains';
import { Buffer } from 'buffer';
import { getContract, contracts } from '../config/contracts.js';
import { nftMetadataCache } from '../cache/nftMetadataCache.js';
import { nftMetadataPersistentCache } from '../cache/persistentCache';
import { nftMetadataBatcher } from '../utils/requestBatcher';
import { getQueryConfig, queryKeys } from '../config/queryConfig';
import { dedupeNFTMetadata, dedupeGraphQLQuery } from '../utils/requestDeduper';
import { validateNftMetadata } from '../utils/validateMetadata';
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
import { logger } from '../utils/logger';

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
        heroIds
        createdAt
      }
      vip { 
        id 
        stakedAmount 
        stakedAt
        isUnlocking
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
  
    const maxRetries = 2; // 增加重試次數以提高可靠性
    const baseTimeout = 5000; // 增加基礎超時時間以適應 IPFS 網關
    const timeout = baseTimeout + (retryCount * 1000); // 更長的漸進式超時
    
    // 識別 NFT 類型 - 使用當前環境變數中的合約地址
    const addressLower = contractAddress.toLowerCase();
    const currentContracts = contracts[56]; // BSC mainnet
    const nftType = 
        addressLower === currentContracts.hero.address.toLowerCase() ? 'hero' :
        addressLower === currentContracts.relic.address.toLowerCase() ? 'relic' :
        addressLower === currentContracts.party.address.toLowerCase() ? 'party' :
        addressLower === currentContracts.vipStaking.address.toLowerCase() ? 'vip' :
        'unknown';

    // 🔥 1. 先检查持久化缓存
    const cacheKey = `${contractAddress}-${tokenId}`;
    const cachedMetadata = await nftMetadataPersistentCache.get(cacheKey);
    if (cachedMetadata) {
        return {
            ...cachedMetadata,
            name: cachedMetadata.name ?? '',
            description: cachedMetadata.description ?? '',
            image: cachedMetadata.image ?? '',
            attributes: cachedMetadata.attributes ?? [],
            source: 'cache',
        };
    }
    
    // 使用請求去重
    return dedupeNFTMetadata(contractAddress, tokenId, async () => {
        try {
            let metadata: Omit<BaseNft, 'id' | 'contractAddress' | 'type'>;
            const startTime = Date.now();
            
            // 🔥 2. 優先使用本地 API（最快）
            try {

                metadata = await fetchFromLocalAPI(nftType, tokenId, timeout);
                const loadTime = Date.now() - startTime;

                // 成功後立即緩存
                await nftMetadataPersistentCache.set(cacheKey, metadata);
                return { ...metadata, source: 'local-api' };
            } catch (localError) {

            }
        
        // 🔥 3. 如果本地 API 失敗，嘗試 CDN（次選）
        try {

            metadata = await fetchFromCDN(nftType, tokenId, timeout);
            const loadTime = Date.now() - startTime;

            await nftMetadataPersistentCache.set(cacheKey, metadata);
            return { ...metadata, source: 'cdn' };
        } catch (cdnError) {

        }
        
        // 🔥 4. 原始邏輯作為最後備援
        if (uri.startsWith('data:application/json;base64,')) {

            const json = Buffer.from(uri.substring('data:application/json;base64,'.length), 'base64').toString();
            metadata = JSON.parse(json);
        } else if (uri.startsWith('ipfs://')) {

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
            
            metadata = await fetchWithMultipleGateways(gateways, Math.min(timeout, 8000)); // 最多8秒，提高 IPFS 載入成功率
        } else {

            metadata = await fetchWithTimeout(uri, timeout);
        }
        
        const loadTime = Date.now() - startTime;

        // 驗證 metadata 格式
        const validationResult = validateNftMetadata(metadata, nftType as 'hero' | 'relic' | 'party' | 'vip');
        
        if (!validationResult.isValid) {
            logger.error('Metadata 格式驗證失敗', {
                tokenId,
                nftType,
                errors: validationResult.errors,
                metadata
            });
            // 使用 fallback 數據
            const fallbackData = generateFallbackMetadata(nftType, tokenId);
            await nftMetadataPersistentCache.set(cacheKey, fallbackData);
            return { ...fallbackData, source: 'fallback-validation-failed' };
        }
        
        // 使用清理後的 metadata
        const sanitizedMetadata = validationResult.sanitizedMetadata || metadata;
        
        // 🔥 成功获取后立即缓存
        await nftMetadataPersistentCache.set(cacheKey, sanitizedMetadata);
        
        return { ...sanitizedMetadata, source: 'fallback' };
    } catch (error) {
        const loadTime = Date.now() - Date.now();
        logger.warn(`${nftType} #${tokenId} 解析元數據時出錯 (嘗試 ${retryCount + 1}/${maxRetries + 1}, ${loadTime}ms):`, error);
        
        // 如果還有重試次數，使用指數回退策略重試
        if (retryCount < maxRetries) {
            const retryDelay = Math.min(500 * Math.pow(2, retryCount), 2000); // 更短的重試延遲

            await new Promise<void>(resolve => setTimeout(resolve, retryDelay));
            return fetchMetadata(uri, tokenId, contractAddress, retryCount + 1);
        }
        
        // 🔥 根據 NFT 類型提供更好的 fallback 數據
        const fallbackData = generateFallbackMetadata(nftType, tokenId);
        await nftMetadataPersistentCache.set(cacheKey, fallbackData);

            return { ...fallbackData, source: 'fallback' };
        }
    });
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
    const getImageByRarity = (type: string, rarity: number | undefined): string => {
        // 如果稀有度未知，使用占位圖片而不是默認1星
        if (!rarity || rarity === 0) {
            return `/images/${type}/${type}-placeholder.png`; // 需要創建占位圖片
        }
        const rarityIndex = Math.max(1, Math.min(5, rarity));
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
        // 🔥 優化：使用 Promise.race 並取消其他請求
        let completed = false;
        const racePromises = gateways.map((url: string) => 
            fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'DungeonDelvers/1.0',
                    'Cache-Control': 'max-age=300'
                }
            }).then(response => {
                if (completed) throw new Error('Request cancelled');
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                completed = true;
                controller.abort(); // 取消其他請求
                return response.json();
            })
        );
        
        // 使用 Promise.race 獲取第一個成功的結果
        const result = await Promise.race(racePromises);
        clearTimeout(timeoutId);
        
        const totalTime = Date.now() - startTime;
        if (totalTime > 1000) {
            logger.warn(`IPFS fetch took ${totalTime}ms`);
        }

        return result;
        
    } catch (error) {
        clearTimeout(timeoutId);
        const totalTime = Date.now() - startTime;
        
        if (error instanceof Error && error.name === 'AbortError') {
            logger.warn(`⏰ IPFS 載入超時 (${timeout}ms)`);
            throw new Error(`IPFS 網關請求超時 (${timeout}ms)`);
        }
        
        logger.warn(`🚫 IPFS 載入失敗 (${totalTime}ms):`, error);
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
        // 如果 CDN 配置載入失敗，使用相對路徑
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
        
        return await fetchWithTimeout(apiPath, Math.min(timeout, 1000));
    }
}

// 🔥 新增：CDN 載入函數
async function fetchFromCDN(nftType: string, tokenId: string, timeout: number): Promise<Omit<BaseNft, 'id' | 'contractAddress' | 'type'>> {
    // 使用相對路徑避免 CORS 問題
    const cdnUrls = [
        `/api/${nftType}/${tokenId}.json`,
        `https://dungeon-delvers-metadata-server.onrender.com/api/${nftType}/${tokenId}.json`
    ];
    
    // 對於 party 和 vip，使用固定檔案名
    if (nftType === 'party') {
        cdnUrls[0] = `/api/party/party.json`;
        cdnUrls[1] = `https://dungeon-delvers-metadata-server.onrender.com/api/party/party.json`;
    } else if (nftType === 'vip') {
        cdnUrls[0] = `/api/vip/vip.json`;
        cdnUrls[1] = `https://dungeon-delvers-metadata-server.onrender.com/api/vip/vip.json`;
    }
    
    // 嘗試所有 CDN URL
    for (const url of cdnUrls) {
        try {
            return await fetchWithTimeout(url, Math.min(timeout, 2000)); // CDN 最多2秒超時
        } catch (error) {

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
            await new Promise<void>(resolve => setTimeout(resolve, 100));
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

// 🔥 新版本：純子圖數據流，無需合約調用和 metadata 獲取
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
        logger.warn(`在 chainId: ${chainId} 上找不到 '${contractKeyMap[type]}' 的合約設定`);
        return [];
    }
    const contractAddress = contract.address;

    logger.info(`📊 使用純子圖數據流處理 ${assets.length} 個 ${type} NFT`);

    // 直接從子圖數據構建 NFT 對象，無需額外的合約調用
    const results = assets.map((asset: T) => {
        // 生成基本的 metadata 結構
        const baseMetadata = {
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} #${asset.tokenId}`,
            description: `${type.charAt(0).toUpperCase() + type.slice(1)} NFT from DungeonDelvers`,
            image: `/images/${type}/${type}.png`, // 使用默認圖片
            attributes: [] as NftAttribute[]
        };

        const baseNft = {
            ...baseMetadata,
            id: BigInt(asset.tokenId),
            contractAddress,
            source: 'subgraph'
        };

        switch (type) {
            case 'hero': {
                const heroAsset = asset as unknown as HeroAsset;
                const power = Number(heroAsset.power);
                const rarity = Number(heroAsset.rarity);
                
                logger.debug(`Hero #${asset.tokenId} 純子圖數據:`, {
                    tokenId: asset.tokenId,
                    power,
                    rarity,
                    originalPower: heroAsset.power,
                    originalRarity: heroAsset.rarity
                });
                
                return { 
                    ...baseNft, 
                    type, 
                    power, 
                    rarity,
                    attributes: [
                        { trait_type: 'Power', value: power },
                        { trait_type: 'Rarity', value: rarity }
                    ]
                };
            }
            case 'relic': {
                const relicAsset = asset as unknown as RelicAsset;
                const capacity = Number(relicAsset.capacity);
                const rarity = Number(relicAsset.rarity);
                
                logger.debug(`Relic #${asset.tokenId} 純子圖數據:`, {
                    tokenId: asset.tokenId,
                    capacity,
                    rarity,
                    originalCapacity: relicAsset.capacity,
                    originalRarity: relicAsset.rarity
                });
                
                return { 
                    ...baseNft, 
                    type, 
                    capacity, 
                    rarity,
                    attributes: [
                        { trait_type: 'Capacity', value: capacity },
                        { trait_type: 'Rarity', value: rarity }
                    ]
                };
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
                    partyRarity: Number(partyAsset.partyRarity),
                    attributes: [
                        { trait_type: 'Total Power', value: Number(partyAsset.totalPower) },
                        { trait_type: 'Total Capacity', value: Number(partyAsset.totalCapacity) },
                        { trait_type: 'Rarity', value: Number(partyAsset.partyRarity) }
                    ]
                };
            }
            case 'vip': {
                const vipAsset = asset as unknown as VipAsset;
                return { 
                    ...baseNft, 
                    type, 
                    level: Number(vipAsset.level || 0),
                    stakedAmount: BigInt(vipAsset.stakedAmount || 0),
                    stakedValueUSD: vipAsset.stakedValueUSD ? BigInt(vipAsset.stakedValueUSD) : undefined,
                    attributes: [
                        { trait_type: 'Level', value: Number(vipAsset.level || 0) },
                        { trait_type: 'Staked Amount', value: Number(vipAsset.stakedAmount || 0) }
                    ]
                };
            }
            default: return null;
        }
    });

    return results.filter(Boolean) as Array<HeroNft | RelicNft | PartyNft | VipNft>;
}

export async function fetchAllOwnedNfts(owner: Address, chainId: number): Promise<AllNftCollections> {
    const emptyResult: AllNftCollections = { heros: [], relics: [], parties: [], vipCards: [] };
    
    if (!isSupportedChain(chainId)) {
        logger.error(`不支援的鏈 ID: ${chainId}`);
        return emptyResult;
    }

    if (!THE_GRAPH_API_URL) {
        logger.error('The Graph API URL 未配置');
        return emptyResult;
    }

    try {
        // 使用請求去重
        const data = await dedupeGraphQLQuery(
            GET_PLAYER_ASSETS_QUERY,
            { owner: owner.toLowerCase() },
            async () => {
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
                    logger.error('GraphQL 錯誤:', errors);
                    throw new Error(`GraphQL 查詢錯誤: ${errors.map((e: { message: string }) => e.message).join(', ')}`);
                }
                
                return data;
            }
        );
        
        const playerAssets = data?.player;
        if (!playerAssets) {

            return emptyResult;
        }

        const client = getClient(chainId);

        // 🔥 純子圖數據流：所有數據並行處理，無需重試邏輯
        const [relics, heros, parties, vipCards] = await Promise.all([
            parseNfts(playerAssets.relics || [], 'relic', chainId, client),
            parseNfts(playerAssets.heros || [], 'hero', chainId, client),
            parseNfts(playerAssets.parties || [], 'party', chainId, client),
            playerAssets.vip ? parseNfts([playerAssets.vip], 'vip', chainId, client) : Promise.resolve([])
        ]);
        
        logger.info('📊 純子圖數據流處理完成:', {
            heros: heros.length,
            relics: relics.length,
            parties: parties.length,
            vipCards: vipCards.length
        });

        return {
            heros: heros.filter(Boolean),
            relics: relics.filter(Boolean),
            parties: parties.filter(Boolean),
            vipCards: vipCards.filter(Boolean),
        };

    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            logger.error("GraphQL 請求超時");
        } else {
            logger.error("獲取 NFT 數據時發生錯誤: ", error);
        }
        return emptyResult;
    }
}
