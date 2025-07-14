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
  
    const maxRetries = 2; // 增加重試次數以提高可靠性
    const baseTimeout = 5000; // 增加基礎超時時間以適應 IPFS 網關
    const timeout = baseTimeout + (retryCount * 1000); // 更長的漸進式超時
    
    // 識別 NFT 類型以提供更好的錯誤處理 - 使用實際合約地址
    const addressLower = contractAddress.toLowerCase();
    const nftType = 
        addressLower === '0x929a4187a462314fcc480ff547019fa122a283f0' ? 'hero' :     // Hero 最新版
        addressLower === '0x1067295025d21f59c8acb5e777e42f3866a6d2ff' ? 'relic' :    // Relic 最新版
        addressLower === '0xe0272e1d76de1f789ce0996f3226bcf54a8c7735' ? 'party' :    // Party 最新版
        addressLower === '0x7abea5b90528a19580a0a2a83e4cf9ad4871880f' ? 'vip' :      // VIP Staking 最新版
        addressLower === '0x648fcdf1f59a2598e9f68ab3210a25a877fad353' ? 'hero' :     // Hero v1.3.0 (舊版)
        addressLower === '0x6704d55c8736e373b001d54ba00a80dbb0ec793b' ? 'relic' :    // Relic v1.3.0 (舊版)
        addressLower === '0x66ea7c0b2baa497eaf18be9f3d4459ffc20ba491' ? 'party' :    // Party v1.3.0 (舊版)
        addressLower === '0x845de2d044323161703bb0c6ffb1f2ce287ad5bb' ? 'vip' :      // VIP Staking v1.3.2 (舊版)
        addressLower === '0x2a046140668cbb8f598ff3852b08852a8eb23b6a' ? 'hero' :     // Hero v1.2.6 (舊版)
        addressLower === '0x95f005e2e0d38381576da36c5ca4619a87da550e' ? 'relic' :    // Relic v1.2.6 (舊版)
        addressLower === '0x11fb68409222b53b04626d382d7e691e640a1dcb' ? 'party' :    // Party v1.2.6 (舊版)
        addressLower === '0xefdfff583944a2c6318d1597ad1e41159fcd8f6db' ? 'vip' :      // VIP v1.2.6 (舊版)
        'party';  // 預設為 party 而不是 unknown，避免錯誤

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

        // 🔥 成功获取后立即缓存
        await nftMetadataPersistentCache.set(cacheKey, metadata);
        
        return { ...metadata, source: 'fallback' };
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
            logger.warn(`無法獲取 ${type} #${asset.tokenId} 的 tokenURI，使用稀有度 ${assetRarity} 的 fallback`);
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
    const assetsWithIndex = assets.map((asset: unknown, index: number) => ({ asset, index }));
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

                await new Promise<void>(resolve => setTimeout(resolve, 2000)); // 等待2秒
                retryCount++;
            } catch (error) {
                logger.warn(`解析隊伍數據失敗，重試 ${retryCount + 1}/${maxRetries}:`, error);
                retryCount++;
                if (retryCount < maxRetries) {
                    await new Promise<void>(resolve => setTimeout(resolve, 2000));
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
            logger.error("GraphQL 請求超時");
        } else {
            logger.error("獲取 NFT 數據時發生錯誤: ", error);
        }
        return emptyResult;
    }
}
