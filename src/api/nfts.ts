// src/api/nfts.ts (TypeScript 錯誤修正版)

import { createPublicClient, http, type Address } from 'viem';
import { bsc } from 'wagmi/chains';
import { Buffer } from 'buffer';
import { getContract, contracts, type ContractName } from '../config/contracts';
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

// 改進的元數據獲取函數 - 集成IndexedDB缓存
export async function fetchMetadata(
    uri: string, 
    tokenId: string, 
    contractAddress: string, 
    retryCount = 0
): Promise<Omit<BaseNft, 'id' | 'contractAddress' | 'type'>> {
    const maxRetries = 2;
    const timeout = 5000; // 減少到5秒
    
    // Cache functionality removed for now
    
    try {
        let metadata: Omit<BaseNft, 'id' | 'contractAddress' | 'type'>;
        
        if (uri.startsWith('data:application/json;base64,')) {
            const json = Buffer.from(uri.substring('data:application/json;base64,'.length), 'base64').toString();
            metadata = JSON.parse(json);
        } else if (uri.startsWith('ipfs://')) {
            const ipfsUrl = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
            metadata = await fetchWithTimeout(ipfsUrl, timeout);
        } else {
            metadata = await fetchWithTimeout(uri, timeout);
        }
        
        // Cache functionality removed for now
        
        return metadata;
    } catch (error) {
        console.warn(`解析元數據時出錯 (嘗試 ${retryCount + 1}/${maxRetries + 1}):`, error);
        
        // 如果還有重試次數，嘗試重新獲取
        if (retryCount < maxRetries) {
            console.log(`正在重試獲取元數據...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // 遞增延遲
            return fetchMetadata(uri, tokenId, contractAddress, retryCount + 1);
        }
        
        // 提供更詳細的錯誤信息
        const errorMessage = error instanceof Error ? error.message : '未知錯誤';
        return { 
            name: '數據載入中...', 
            description: `暫時無法載入詳細資訊，請稍後重試`, 
            image: '', 
            attributes: [] 
        };
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

async function parseNfts<T extends { tokenId: any }>(
    assets: T[],
    type: NftType,
    chainId: SupportedChainId,
    client: ReturnType<typeof getClient>
): Promise<any[]> {
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

    return Promise.all(assets.map(async (asset, index) => {
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

        const findAttr = (trait: string, defaultValue: any = 0) => metadata.attributes?.find((a: NftAttribute) => a.trait_type === trait)?.value ?? defaultValue;
        
        // ★ 核心修正：將 asset 轉換為 any 型別，以解決 TypeScript 的泛型推斷問題
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
                heroIds: anyAsset.heroes ? anyAsset.heroes.map((h: any) => BigInt(h.tokenId)) : [], 
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
    }));
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
            throw new Error(`GraphQL 查詢錯誤: ${errors.map((e: any) => e.message).join(', ')}`);
        }
        
        const playerAssets = data?.player;
        if (!playerAssets) {
            console.log('未找到玩家資產數據，可能是新用戶');
            return emptyResult;
        }

        const client = getClient(chainId);

        const [heroes, relics, parties, vipCards] = await Promise.all([
            parseNfts(playerAssets.heroes || [], 'hero', chainId, client),
            parseNfts(playerAssets.relics || [], 'relic', chainId, client),
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
