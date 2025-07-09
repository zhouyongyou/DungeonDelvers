// src/api/nfts.ts (The Graph 數據獲取穩健版)

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
// Section 3: 核心數據獲取邏輯 (★ 核心修正 ★)
// =================================================================

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
        const contractsMap = {
            heroes: getContract(chainId, 'hero'),
            relics: getContract(chainId, 'relic'),
            parties: getContract(chainId, 'party'),
            vipCards: getContract(chainId, 'vipStaking'),
        };

        const uriCalls: any[] = [];
        if (playerAssets.heroes?.length && contractsMap.heroes) uriCalls.push(...playerAssets.heroes.map((h: any) => ({ ...contractsMap.heroes, functionName: 'tokenURI', args: [BigInt(h.tokenId)] })));
        if (playerAssets.relics?.length && contractsMap.relics) uriCalls.push(...playerAssets.relics.map((r: any) => ({ ...contractsMap.relics, functionName: 'tokenURI', args: [BigInt(r.tokenId)] })));
        if (playerAssets.parties?.length && contractsMap.parties) uriCalls.push(...playerAssets.parties.map((p: any) => ({ ...contractsMap.parties, functionName: 'tokenURI', args: [BigInt(p.tokenId)] })));
        if (playerAssets.vip && contractsMap.vipCards) uriCalls.push({ ...contractsMap.vipCards, functionName: 'tokenURI', args: [BigInt(playerAssets.vip.tokenId)] });

        const uriResults = uriCalls.length > 0 ? await client.multicall({ contracts: uriCalls, allowFailure: true }) : [];

        let uriIndex = 0;
        
        // ★★★ 核心修正：使用更穩健的 key mapping 來查找合約地址 ★★★
        const parseNfts = async (assets: any[], type: NftType): Promise<any[]> => {
            if (!assets || assets.length === 0) return [];
            
            // 建立一個從 NftType (單數) 到 contractsMap key (複數) 的映射
            const keyMap: Record<NftType, keyof typeof contractsMap> = {
                hero: 'heroes',
                relic: 'relics',
                party: 'parties',
                vip: 'vipCards',
            };
            const contractKey = keyMap[type];
            const contractConfig = contractsMap[contractKey];

            // 如果找不到對應的合約設定，直接返回空陣列並印出警告
            if (!contractConfig) {
                console.warn(`在 contractsMap 中找不到 '${contractKey}' 的設定`);
                return [];
            }
            const contractAddress = contractConfig.address;

            return Promise.all(assets.map(async (asset) => {
                const uriResult = uriResults[uriIndex++];
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
                    case 'hero': return { ...baseNft, type: 'hero', power: Number(asset.power), rarity: Number(asset.rarity) };
                    case 'relic': return { ...baseNft, type: 'relic', capacity: Number(asset.capacity), rarity: Number(asset.rarity) };
                    case 'party': return { ...baseNft, type: 'party', totalPower: BigInt(asset.totalPower), totalCapacity: BigInt(asset.totalCapacity), heroIds: asset.heroes.map((h:any) => BigInt(h.tokenId)), relicIds: asset.relics.map((r:any) => BigInt(r.tokenId)), partyRarity: Number(asset.partyRarity) };
                    case 'vip': return { ...baseNft, type: 'vip', level: Number(findAttr('VIP Level')) };
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
