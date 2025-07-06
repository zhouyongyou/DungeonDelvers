// src/api/nfts.ts

import { createPublicClient, http, type Address, type Abi } from 'viem';
import { bsc, bscTestnet } from 'wagmi/chains';
import { Buffer } from 'buffer';
import { getContract, type ContractName, partyABI, contracts } from '../config/contracts';
import type { 
    AllNftCollections, 
    AnyNft, 
    BaseNft, 
    HeroNft,
    RelicNft,
    PartyNft,
    VipNft,
    NftAttribute
} from '../types/nft';

// =================================================================
// Section: 精確的合約部署區塊號
// =================================================================
// 為了最大化查詢效率並避免 RPC 限制，我們為每個合約指定其部署時的區塊號。
// 這樣在查詢事件時，就無需從創世區塊開始掃描。
// TODO: 請務必前往 BscScan 查詢並填寫您合約的【真實】部署區塊號！
const DEPLOYMENT_BLOCKS: { [chainId: number]: { [key in ContractName]?: bigint } } = {
  [bscTestnet.id]: {
    hero: 57284000n,       // 請替換為 Hero 合約在測試網的【真實】部署區塊號
    relic: 57284000n,      // 請替換為 Relic 合約在測試網的【真實】部署區塊號
    party: 57284000n,      // 請替換為 Party 合約在測試網的【真實】部署區塊號
    vipStaking: 57284000n  // 請替換為 VIP 合約在測試網的【真實】部署區塊號
  },
  [bsc.id]: {
    // 未來主網上線後，在此處填寫主網的區塊號
    hero: 53071000n,
    relic: 53071000n,
    party: 53071000n,
    vipStaking: 53071000n
  }
};


// =================================================================
// Section: 型別守衛與輔助函式
// =================================================================

type SupportedChainId = keyof typeof contracts;

function isSupportedChain(chainId: number): chainId is SupportedChainId {
    return chainId in contracts;
}

const getClient = (chainId: number) => {
    const chain = chainId === bsc.id ? bsc : bscTestnet;
    // 使用您在 wagmi.ts 中設定的 Alchemy RPC URL
    const rpcUrl = chainId === bsc.id 
        ? (import.meta.env.VITE_ALCHEMY_BSC_MAINNET_RPC_URL || 'https://bnb-mainnet.g.alchemy.com/v2/3lmTWjUVbFylAurhdU-rSUefTC-P4tKf')
        : (import.meta.env.VITE_ALCHEMY_BSC_TESTNET_RPC_URL || 'https://bnb-testnet.g.alchemy.com/v2/3lmTWjUVbFylAurhdU-rSUefTC-P4tKf');
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

function parseToTypedNft(
    baseMetadata: Omit<BaseNft, 'id' | 'contractAddress'>,
    id: bigint,
    type: AnyNft['type'],
    contractAddress: `0x${string}`
): AnyNft {
    const findAttr = (trait: string, defaultValue: any = 0) => 
        baseMetadata.attributes?.find((a: NftAttribute) => a.trait_type === trait)?.value ?? defaultValue;

    const baseNft: BaseNft = { ...baseMetadata, id, contractAddress, ...baseMetadata };

    switch (type) {
        case 'hero':
            return { ...baseNft, type: 'hero', power: Number(findAttr('Power')), rarity: Number(findAttr('Rarity')) };
        case 'relic':
            return { ...baseNft, type: 'relic', capacity: Number(findAttr('Capacity')), rarity: Number(findAttr('Rarity')) };
        case 'party':
            return { ...baseNft, type: 'party', totalPower: BigInt(findAttr('Total Power')), totalCapacity: BigInt(findAttr('Total Capacity')), heroIds: [], relicIds: [], partyRarity: Number(findAttr('Party Rarity', 1)) };
        case 'vip':
            return { ...baseNft, type: 'vip', level: Number(findAttr('Level')) };
        default:
             const _exhaustiveCheck: never = type;
             throw new Error(`未知的 NFT 種類: ${_exhaustiveCheck}`);
    }
}

// =================================================================
// Section: NFT 數據獲取核心邏輯
// =================================================================

async function fetchNftsForContract(
    client: ReturnType<typeof getClient>,
    owner: Address,
    contractName: ContractName,
    type: AnyNft['type'],
    chainId: number
): Promise<AnyNft[]> {
    if (!isSupportedChain(chainId)) return [];
    
    const contract = getContract(chainId, contractName);
    if (!contract) return [];

    try {
        // ★★★ 核心修正：動態獲取起始區塊號 ★★★
        const fromBlock = DEPLOYMENT_BLOCKS[chainId]?.[contractName] || 'earliest';

        const transferLogs = await client.getLogs({
            address: contract.address,
            event: {
                type: 'event', name: 'Transfer',
                inputs: [
                    { type: 'address', name: 'from', indexed: true },
                    { type: 'address', name: 'to', indexed: true },
                    { type: 'uint256', name: 'tokenId', indexed: true },
                ],
            },
            args: { to: owner },
            fromBlock: fromBlock,
        });

        const potentialTokenIds = [...new Set(transferLogs.map(log => log.args.tokenId).filter(id => id !== undefined))] as bigint[];
        if (potentialTokenIds.length === 0) return [];
        
        const ownerOfCalls = potentialTokenIds.map(id => ({
            address: contract.address, abi: contract.abi as Abi,
            functionName: 'ownerOf', args: [id],
        }));
        const ownersResults = await client.multicall({ contracts: ownerOfCalls, allowFailure: true });

        const ownedTokenIds = potentialTokenIds.filter((_, index) => 
            ownersResults[index].status === 'success' && (ownersResults[index].result as Address).toLowerCase() === owner.toLowerCase()
        );
        if (ownedTokenIds.length === 0) return [];

        const uriCalls = ownedTokenIds.map(id => ({
            address: contract.address, abi: contract.abi as Abi,
            functionName: 'tokenURI', args: [id],
        }));
        const uriResults = await client.multicall({ contracts: uriCalls, allowFailure: true });

        const nftPromises = ownedTokenIds.map(async (id, index) => {
            if (uriResults[index].status === 'success') {
                const metadata = await fetchMetadata(uriResults[index].result as string);
                return parseToTypedNft(metadata, id, type, contract.address);
            }
            return null;
        });
        
        return (await Promise.all(nftPromises)).filter((nft): nft is AnyNft => nft !== null);

    } catch (error) {
        console.error(`獲取 ${type} NFT 時出錯: `, error);
        return [];
    }
}

export async function fetchAllOwnedNfts(owner: Address, chainId: number): Promise<AllNftCollections> {
    if (!isSupportedChain(chainId)) {
        console.error(`不支援的鏈 ID: ${chainId}`);
        return { heroes: [], relics: [], parties: [], vipCards: [] };
    }

    const client = getClient(chainId);

    const [heroes, relics, parties, vipCards] = await Promise.all([
        fetchNftsForContract(client, owner, 'hero', 'hero', chainId),
        fetchNftsForContract(client, owner, 'relic', 'relic', chainId),
        fetchNftsForContract(client, owner, 'party', 'party', chainId),
        fetchNftsForContract(client, owner, 'vipStaking', 'vip', chainId),
    ]);

    if (parties.length > 0) {
        const partyContract = getContract(chainId, 'party');
        if (partyContract) {
            const compositionCalls = parties.map(p => ({
                address: partyContract.address,
                abi: partyABI,
                functionName: 'getPartyComposition',
                args: [p.id],
            }));
            const compositions = await client.multicall({ contracts: compositionCalls, allowFailure: true });

            compositions.forEach((result, index) => {
                if (result.status === 'success' && Array.isArray(result.result)) {
                    const party = parties[index] as PartyNft;
                    party.heroIds = result.result[0] as bigint[];
                    party.relicIds = result.result[1] as bigint[];
                }
            });
        }
    }

    return { 
        heroes: heroes as HeroNft[], 
        relics: relics as RelicNft[], 
        parties: parties as PartyNft[], 
        vipCards: vipCards as VipNft[]
    };
}
