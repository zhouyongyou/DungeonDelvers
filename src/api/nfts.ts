// src/api/nfts.ts (TypeScript 錯誤修正版)

import { createPublicClient, http, type Address } from 'viem';
import { bsc } from 'wagmi/chains';
import { Buffer } from 'buffer';
import { getContract, contracts, type ContractName } from '../config/contracts.js';
import { nftMetadataCache } from '../cache/nftMetadataCache.js';
import { CacheMetrics } from '../cache/cacheStrategies.js';
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
      heroes { 
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
        heroes { tokenId }
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
    
    const rpcUrl = import.meta.env.VITE_ALCHEMY_BSC_MAINNET_RPC_URL || 'https://bsc-dataseed1.binance.org/';
    return createPublicClient({ chain, transport: http(rpcUrl) });
};

// 增強版本：元數據獲取函數 - 集成IndexedDB缓存和智能重試
export async function fetchMetadata(
    uri: string, 
    tokenId: string, 
    contractAddress: string, 
    retryCount = 0
): Promise<Omit<BaseNft, 'id' | 'contractAddress' | 'type'>> {
  
    const maxRetries = 2; // 增加重試次數但使用漸進延遲
    const baseTimeout = 3000; // 基礎超時時間
    const timeout = baseTimeout + (retryCount * 1000); // 漸進式增加超時時間
    
    // 識別 NFT 類型以提供更好的錯誤處理
    const nftType = contractAddress.toLowerCase().includes('relic') ? 'relic' : 
                   contractAddress.toLowerCase().includes('hero') ? 'hero' :
                   contractAddress.toLowerCase().includes('party') ? 'party' :
                   contractAddress.toLowerCase().includes('vip') ? 'vip' : 'unknown';
    
    console.log(`獲取 ${nftType} #${tokenId} 元數據 (嘗試 ${retryCount + 1}/${maxRetries + 1})`);
    
    // 🔥 1. 先检查IndexedDB缓存
    const cachedMetadata = await nftMetadataCache.getMetadata(tokenId, contractAddress);
    if (cachedMetadata) {
        CacheMetrics.recordHit(); // 记录缓存命中
        console.log(`${nftType} #${tokenId} 使用緩存數據`);
        return cachedMetadata;
    }
    
    CacheMetrics.recordMiss(); // 记录缓存未命中
    
    try {
        let metadata: Omit<BaseNft, 'id' | 'contractAddress' | 'type'>;
        const startTime = Date.now();
        
        if (uri.startsWith('data:application/json;base64,')) {
            console.log(`${nftType} #${tokenId} 解析 base64 編碼的元數據`);
            const json = Buffer.from(uri.substring('data:application/json;base64,'.length), 'base64').toString();
            metadata = JSON.parse(json);
        } else if (uri.startsWith('ipfs://')) {
            console.log(`${nftType} #${tokenId} 從 IPFS 載入元數據`);
            // 🔥 優化IPFS載入 - 使用多個網關並行請求
            const ipfsHash = uri.replace('ipfs://', '');
            const gateways = [
                `https://ipfs.io/ipfs/${ipfsHash}`,
                `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
                `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
                `https://dweb.link/ipfs/${ipfsHash}` // 新增額外的網關
            ];
            metadata = await fetchWithMultipleGateways(gateways, timeout);
        } else {
            console.log(`${nftType} #${tokenId} 從 HTTP 載入元數據: ${uri}`);
            metadata = await fetchWithTimeout(uri, timeout);
        }
        
        const loadTime = Date.now() - startTime;
        console.log(`${nftType} #${tokenId} 元數據載入成功 (${loadTime}ms)`);
        
        // 🔥 2. 成功获取后立即缓存
        await nftMetadataCache.cacheMetadata(tokenId, contractAddress, metadata);
        
        return metadata;
    } catch (error) {
        const loadTime = Date.now() - Date.now();
        console.warn(`${nftType} #${tokenId} 解析元數據時出錯 (嘗試 ${retryCount + 1}/${maxRetries + 1}, ${loadTime}ms):`, error);
        
        // 如果還有重試次數，使用指數回退策略重試
        if (retryCount < maxRetries) {
          
            const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000); // 指數回退，最大5秒
            console.log(`${nftType} #${tokenId} 將在 ${retryDelay}ms 後重試...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return fetchMetadata(uri, tokenId, contractAddress, retryCount + 1);
        }
        
        // 🔥 根據 NFT 類型提供更好的 fallback 數據
        const fallbackData = generateFallbackMetadata(nftType, tokenId);
        console.log(`${nftType} #${tokenId} 使用 fallback 數據`);
        
        // 將 fallback 數據也緩存起來
        await nftMetadataCache.cacheMetadata(tokenId, contractAddress, fallbackData);
        
        return fallbackData;
    }
}

// 新增：根據 NFT 類型生成 fallback 元數據
function generateFallbackMetadata(nftType: string, tokenId: string): Omit<BaseNft, 'id' | 'contractAddress' | 'type'> {
    const baseData = {
        name: `${nftType.charAt(0).toUpperCase() + nftType.slice(1)} #${tokenId}`,
        description: '正在載入詳細資訊...',
        image: '',
        attributes: []
    };
    
    switch (nftType) {
        case 'relic':
            return {
                ...baseData,
                name: `聖物 #${tokenId}`,
                image: '/images/relic-placeholder.svg',
                attributes: [
                    { trait_type: 'Capacity', value: '載入中...' },
                    { trait_type: 'Rarity', value: '載入中...' }
                ]
            };
        case 'hero':
            return {
                ...baseData,
                name: `英雄 #${tokenId}`,
                image: '/images/hero-placeholder.svg',
                attributes: [
                    { trait_type: 'Power', value: '載入中...' },
                    { trait_type: 'Rarity', value: '載入中...' }
                ]
            };
        case 'party':
            return {
                ...baseData,
                name: `隊伍 #${tokenId}`,
                image: '/images/party-placeholder.svg',
                attributes: [
                    { trait_type: 'Total Power', value: '載入中...' },
                    { trait_type: 'Heroes Count', value: '載入中...' }
                ]
            };
        case 'vip':
            return {
                ...baseData,
                name: `VIP 卡 #${tokenId}`,
                image: '/images/vip-placeholder.svg',
                attributes: [
                    { trait_type: 'Level', value: '載入中...' },
                    { trait_type: 'Staked Value', value: '載入中...' }
                ]
            };
        default:
            return baseData;
    }
}

// 增強版本：多個IPFS網關並行請求函數
async function fetchWithMultipleGateways(gateways: string[], timeout: number): Promise<Omit<BaseNft, 'id' | 'contractAddress' | 'type'>> {
    const controller = new AbortController();
    const startTime = Date.now();
    
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeout);
    
    try {
        // 記錄嘗試的網關
        console.log(`開始嘗試 ${gateways.length} 個 IPFS 網關...`);
        
        // 並行請求所有網關，使用 Promise.allSettled 來收集所有結果
        const requests = gateways.map((url, index) => 
            fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'DungeonDelvers/1.0',
                    'Cache-Control': 'max-age=300' // 5分鐘緩存
                }
            }).then(response => {
                const loadTime = Date.now() - startTime;
                console.log(`IPFS網關 ${index + 1} (${url}) 響應時間: ${loadTime}ms`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            }).catch(error => {
                const loadTime = Date.now() - startTime;
                console.warn(`IPFS網關 ${index + 1} (${url}) 請求失敗 (${loadTime}ms):`, error.message);
                throw error;
            })
        );
        
        // 使用 Promise.allSettled 來處理所有請求
        const results = await Promise.allSettled(requests);
        clearTimeout(timeoutId);
        
        // 尋找第一個成功的結果
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (result.status === 'fulfilled') {
                const totalTime = Date.now() - startTime;
                console.log(`IPFS 載入成功，使用網關 ${i + 1}，總時間: ${totalTime}ms`);
                return result.value;
            }
        }
        
        // 如果所有請求都失敗，收集錯誤信息
        const errors = results
            .filter(r => r.status === 'rejected')
            .map((r, index) => `網關${index + 1}: ${r.reason?.message || '未知錯誤'}`)
            .join('; ');
        
        const totalTime = Date.now() - startTime;
        console.error(`所有 IPFS 網關都失敗 (${totalTime}ms): ${errors}`);
        throw new Error(`所有IPFS網關都失敗: ${errors}`);
        
    } catch (error) {
        clearTimeout(timeoutId);
        const totalTime = Date.now() - startTime;
        
        if (error instanceof Error && error.name === 'AbortError') {
            console.error(`IPFS載入超時 (${timeout}ms)`);
            throw new Error(`所有IPFS網關請求超時 (${timeout}ms)`);
        }
        
        console.error(`IPFS載入失敗 (${totalTime}ms):`, error);
        throw new Error(`IPFS網關無法訪問: ${error instanceof Error ? error.message : '未知錯誤'}`);
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

async function parseNfts<T extends { tokenId: string | number | bigint }>(
    assets: T[],
    type: NftType,
    chainId: SupportedChainId,
    client: ReturnType<typeof getClient>
): Promise<(HeroNft | RelicNft | PartyNft | VipNft)[]> {
    if (!assets || assets.length === 0) return [];

    const contractKeyMap: Record<NftType, ContractName> = {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processAsset = async (asset: any, index: number) => {
        const uriResult = uriResults[index];
        let metadata: Omit<BaseNft, 'id' | 'contractAddress' | 'type'>;

        if (uriResult && uriResult.status === 'success') {
            metadata = await fetchMetadata(
                uriResult.result as string, 
                asset.tokenId.toString(), 
                contractAddress
            );
        } else {
            console.warn(`無法獲取 ${type} #${asset.tokenId} 的 tokenURI`);
            metadata = { 
                name: `${type.charAt(0).toUpperCase() + type.slice(1)} #${asset.tokenId}`, 
                description: '載入中，請稍後重試', 
                image: '', 
                attributes: [] 
            };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const findAttr = (trait: string, defaultValue: any = 0) => metadata.attributes?.find((a: NftAttribute) => a.trait_type === trait)?.value ?? defaultValue;
        
        // ★ 核心修正：將 asset 轉換為 any 型別，以解決 TypeScript 的泛型推斷問題
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyAsset = asset as any;
        const baseNft = { ...metadata, id: BigInt(anyAsset.tokenId), contractAddress };

        switch (type) {
            case 'hero': return { ...baseNft, type, power: Number(anyAsset.power), rarity: Number(anyAsset.rarity) };
            case 'relic': return { ...baseNft, type, capacity: Number(anyAsset.capacity), rarity: Number(anyAsset.rarity) };
            case 'party': return { 
                ...baseNft, 
                type, 
                totalPower: BigInt(anyAsset.totalPower), 
                totalCapacity: BigInt(anyAsset.totalCapacity), 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                heroIds: anyAsset.heroes ? anyAsset.heroes.map((h: any) => BigInt(h.tokenId)) : [], 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                relicIds: anyAsset.relics ? anyAsset.relics.map((r: any) => BigInt(r.tokenId)) : [], 
                partyRarity: Number(anyAsset.partyRarity) 
            };
            case 'vip': return { 
                ...baseNft, 
                type, 
                level: Number(anyAsset.level || findAttr('VIP Level', 0)),
                stakedAmount: BigInt(anyAsset.stakedAmount || 0),
                stakedValueUSD: anyAsset.stakedValueUSD ? BigInt(anyAsset.stakedValueUSD) : undefined
            };
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

    return results.filter(Boolean);
}


export async function fetchAllOwnedNfts(owner: Address, chainId: number): Promise<AllNftCollections> {
    const emptyResult: AllNftCollections = { heroes: [], relics: [], parties: [], vipCards: [] };
    
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
            parseNfts(playerAssets.heroes || [], 'hero', chainId, client),
        ]);
        
        // 其他資產並行載入
        const [parties, vipCards] = await Promise.all([
            parseNfts(playerAssets.parties || [], 'party', chainId, client),
            playerAssets.vip ? parseNfts([playerAssets.vip], 'vip', chainId, client) : Promise.resolve([]),
        ]);

        return {
            heroes: heroes.filter(Boolean) as HeroNft[],
            relics: relics.filter(Boolean) as RelicNft[],
            parties: parties.filter(Boolean) as PartyNft[],
            vipCards: vipCards.filter(Boolean) as VipNft[],
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
