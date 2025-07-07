// src/api/nfts.ts (The Graph 改造版)

import { createPublicClient, http, type Address } from 'viem';
import { bsc } from 'wagmi/chains';
import { Buffer } from 'buffer';
import { getContract, contracts } from '../config/contracts';
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
// Section 1: The Graph API 設定
// =================================================================

// ★ 核心改造：從環境變數讀取 The Graph API URL，避免硬編碼
const THE_GRAPH_API_URL = import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL;

// 定義一個 GraphQL 查詢語句。
// 這個查詢會一次性獲取一個玩家地址所擁有的所有資產的核心資訊。
const GET_PLAYER_ASSETS_QUERY = `
  query GetPlayerAssets($owner: ID!) {
    player(id: $owner) {
      id
      heroes {
        id
        tokenId
        power
        rarity
      }
      relics {
        id
        tokenId
        capacity
        rarity
      }
      parties {
        id
        tokenId
        totalPower
        totalCapacity
        partyRarity
        heroes {
          id
          tokenId
        }
        relics {
          id
          tokenId
        }
      }
      vip {
        id
        tokenId
        stakedAmount
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

// 解析元數據的函式保持不變，因為我們仍然需要處理 tokenURI
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
// Section 3: 核心數據獲取邏輯 (全新 GraphQL 版本)
// =================================================================

/**
 * @notice 使用 The Graph 獲取一個玩家擁有的所有 NFT 數據。
 * @dev 這取代了舊的、基於 getLogs 的掃描方法，速度和效率都大幅提升。
 * @param owner 玩家的錢包地址。
 * @param chainId 當前的鏈 ID。
 * @returns 一個包含所有已分類 NFT 的物件。
 */
export async function fetchAllOwnedNfts(owner: Address, chainId: number): Promise<AllNftCollections> {
    const emptyResult: AllNftCollections = { heroes: [], relics: [], parties: [], vipCards: [] };
    if (!isSupportedChain(chainId)) {
        console.error(`不支援的鏈 ID: ${chainId}`);
        return emptyResult;
    }

    try {
        // --- 步驟 1: 從 The Graph 獲取基礎數據 ---
        const response = await fetch(THE_GRAPH_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: GET_PLAYER_ASSETS_QUERY,
                variables: { owner: owner.toLowerCase() },
            }),
        });

        if (!response.ok) {
            throw new Error(`GraphQL 請求失敗: ${response.statusText}`);
        }

        const { data } = await response.json();
        const playerAssets = data?.player;

        if (!playerAssets) {
            // 如果 The Graph 中沒有這個玩家的數據，代表他沒有任何資產
            return emptyResult;
        }

        // --- 步驟 2: 批量獲取動態元數據 (tokenURI) ---
        const client = getClient(chainId);
        const contractsMap = {
            heroes: getContract(chainId, 'hero'),
            relics: getContract(chainId, 'relic'),
            parties: getContract(chainId, 'party'),
            vipCards: getContract(chainId, 'vipStaking'),
        };

        const uriCalls: any[] = [];
        if (playerAssets.heroes?.length) uriCalls.push(...playerAssets.heroes.map((h: any) => ({ ...contractsMap.heroes, functionName: 'tokenURI', args: [BigInt(h.tokenId)] })));
        if (playerAssets.relics?.length) uriCalls.push(...playerAssets.relics.map((r: any) => ({ ...contractsMap.relics, functionName: 'tokenURI', args: [BigInt(r.tokenId)] })));
        if (playerAssets.parties?.length) uriCalls.push(...playerAssets.parties.map((p: any) => ({ ...contractsMap.parties, functionName: 'tokenURI', args: [BigInt(p.tokenId)] })));
        if (playerAssets.vip) uriCalls.push({ ...contractsMap.vipCards, functionName: 'tokenURI', args: [BigInt(playerAssets.vip.tokenId)] });

        const uriResults = uriCalls.length > 0 ? await client.multicall({ contracts: uriCalls, allowFailure: true }) : [];

        // --- 步驟 3: 解析元數據並組合最終結果 ---
        let uriIndex = 0;
        const parseNfts = async (assets: any[], type: NftType): Promise<any[]> => {
            if (!assets || assets.length === 0) return [];
            return Promise.all(assets.map(async (asset) => {
                const uriResult = uriResults[uriIndex++];
                if (uriResult.status !== 'success') return null;

                const metadata = await fetchMetadata(uriResult.result as string);
                const findAttr = (trait: string, defaultValue: any = 0) => metadata.attributes?.find((a: NftAttribute) => a.trait_type === trait)?.value ?? defaultValue;

                const baseNft: BaseNft = { 
                    ...metadata, 
                    id: BigInt(asset.tokenId), 
                    contractAddress: contractsMap[type === 'vip' ? 'vipCards' : `${type}s` as keyof typeof contractsMap]!.address
                };

                switch (type) {
                    case 'hero': return { ...baseNft, type, power: Number(asset.power), rarity: Number(asset.rarity) };
                    case 'relic': return { ...baseNft, type, capacity: Number(asset.capacity), rarity: Number(asset.rarity) };
                    case 'party': return { ...baseNft, type, totalPower: BigInt(asset.totalPower), totalCapacity: BigInt(asset.totalCapacity), heroIds: asset.heroes.map((h:any) => BigInt(h.tokenId)), relicIds: asset.relics.map((r:any) => BigInt(r.tokenId)), partyRarity: Number(asset.partyRarity) };
                    case 'vip': return { ...baseNft, type, level: Number(findAttr('VIP Level')) };
                    default: return null;
                }
            }));
        };

        const [heroes, relics, parties, vipCards] = await Promise.all([
            parseNfts(playerAssets.heroes, 'hero'),
            parseNfts(playerAssets.relics, 'relic'),
            parseNfts(playerAssets.parties, 'party'),
            playerAssets.vip ? parseNfts([playerAssets.vip], 'vip') : Promise.resolve([]),
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
