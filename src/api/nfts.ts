// src/api/nfts.ts (The Graph 數據獲取穩健版 v2)

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

// 查詢玩家擁有的所有資產 ID
const GET_PLAYER_ASSETS_QUERY = `
  query GetPlayerAssets($owner: ID!) {
    player(id: $owner) {
      id
      heroes { id tokenId power rarity }
      relics { id tokenId capacity rarity }
      parties {
        id
        tokenId
        totalPower
        totalCapacity
        partyRarity
        heroes { tokenId }
        relics { tokenId }
      }
      vip { id tokenId stakedAmount }
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

export async function fetchMetadata(uri: string): Promise<Omit<BaseNft, 'id' | 'contractAddress' | 'type'>> {
    try {
        if (uri.startsWith('data:application/json;base64,')) {
            const json = Buffer.from(uri.substring('data:application/json;base64,'.length), 'base64').toString();
            return JSON.parse(json);
        } else if (uri.startsWith('ipfs://')) {
            const ipfsUrl = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
            const response = await fetch(ipfsUrl);
            if (!response.ok) throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
            return await response.json();
        } else {
            const response = await fetch(uri);
            if (!response.ok) throw new Error(`Failed to fetch from URL: ${response.statusText}`);
            return await response.json();
        }
    } catch (error) {
        console.warn("解析元數據時出錯:", error);
        return { name: '數據錯誤', description: '無法載入此 NFT 的詳細資訊', image: '', attributes: [] };
    }
}

// =================================================================
// Section 3: 核心數據獲取邏輯 (★ 全面重構與優化 ★)
// =================================================================

/**
 * @notice 一個更穩健的 NFT 解析函式
 * @param assets 從 The Graph 獲取的原始資產數據
 * @param type NFT 類型
 * @param chainId 當前鏈 ID
 * @param client viem public client
 * @returns 解析後的 NFT 物件陣列
 */
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
            metadata = await fetchMetadata(uriResult.result as string);
        } else {
            console.warn(`無法獲取 ${type} #${asset.tokenId} 的 tokenURI`);
            metadata = { name: `${type.charAt(0).toUpperCase() + type.slice(1)} #${asset.tokenId}`, description: '無法載入元數據', image: '', attributes: [] };
        }

        const findAttr = (trait: string, defaultValue: any = 0) => metadata.attributes?.find((a: NftAttribute) => a.trait_type === trait)?.value ?? defaultValue;
        const baseNft = { ...metadata, id: BigInt(asset.tokenId), contractAddress };

        switch (type) {
            case 'hero': return { ...baseNft, type, power: Number(asset.power), rarity: Number(asset.rarity) };
            case 'relic': return { ...baseNft, type, capacity: Number(asset.capacity), rarity: Number(asset.rarity) };
            case 'party': return { ...baseNft, type, totalPower: BigInt(asset.totalPower), totalCapacity: BigInt(asset.totalCapacity), heroIds: (asset as any).heroes.map((h: any) => BigInt(h.tokenId)), relicIds: (asset as any).relics.map((r: any) => BigInt(r.tokenId)), partyRarity: Number(asset.partyRarity) };
            case 'vip': return { ...baseNft, type, level: Number(findAttr('VIP Level')) };
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

    try {
        const response = await fetch(THE_GRAPH_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: GET_PLAYER_ASSETS_QUERY,
                variables: { owner: owner.toLowerCase() },
            }),
        });

        if (!response.ok) throw new Error(`GraphQL 請求失敗: ${response.statusText}`);
        const { data } = await response.json();
        const playerAssets = data?.player;
        if (!playerAssets) return emptyResult;

        const client = getClient(chainId);

        // 平行處理所有類型的 NFT
        const [heroes, relics, parties, vipCards] = await Promise.all([
            parseNfts(playerAssets.heroes, 'hero', chainId, client),
            parseNfts(playerAssets.relics, 'relic', chainId, client),
            parseNfts(playerAssets.parties, 'party', chainId, client),
            playerAssets.vip ? parseNfts([playerAssets.vip], 'vip', chainId, client) : Promise.resolve([]),
        ]);

        return {
            heroes: heroes.filter(Boolean) as HeroNft[],
            relics: relics.filter(Boolean) as RelicNft[],
            parties: parties.filter(Boolean) as PartyNft[],
            vipCards: vipCards.filter(Boolean) as VipNft[],
        };

    } catch (error) {
        console.error("獲取 NFT 數據時發生嚴重錯誤: ", error);
        return emptyResult;
    }
}
