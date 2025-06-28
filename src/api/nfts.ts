import { createPublicClient, http, type Address, type Abi } from 'viem';
import { bsc, bscTestnet } from 'wagmi/chains';
import { getContract, type ContractName } from '../config/contracts';
import type { 
    AllNftCollections, 
    AnyNft, 
    BaseNft, 
    HeroNft,
    RelicNft,
    PartyNft,
    VipNft
} from '../types/nft';
import { Buffer } from 'buffer';

const getClient = (chainId: number) => {
    const chain = chainId === bsc.id ? bsc : bscTestnet;
    return createPublicClient({ chain, transport: http() });
};

// 從鏈上或 Base64 URI 中獲取元數據
async function fetchMetadata(uri: string): Promise<Omit<BaseNft, 'id' | 'contractAddress'>> {
    try {
        if (uri.startsWith('data:application/json;base64,')) {
            const json = Buffer.from(uri.substring('data:application/json;base64,'.length), 'base64').toString();
            return JSON.parse(json);
        } else {
            const response = await fetch(uri);
            if (!response.ok) {
                console.error(`Failed to fetch metadata from ${uri}`);
                return { name: 'Unknown', description: '', image: '', attributes: [] };
            }
            return await response.json();
        }
    } catch (error) {
        console.error("Error fetching or parsing metadata:", error);
        return { name: 'Error', description: '', image: '', attributes: [] };
    }
}

// 輔助函式，用於將通用的元數據轉換為我們定義的、帶有具體屬性的強型別 NFT 物件
function parseToTypedNft(
    baseMetadata: Omit<BaseNft, 'id' | 'contractAddress'>,
    id: bigint,
    type: AnyNft['type'],
    contractAddress: `0x${string}`
): AnyNft {
    const findAttr = (trait: string) => baseMetadata.attributes.find(a => a.trait_type === trait)?.value;
    const baseNft: BaseNft = { ...baseMetadata, id, contractAddress };

    switch (type) {
        case 'hero':
            return {
                ...baseNft,
                type: 'hero',
                power: Number(findAttr('Power') || 0),
                rarity: Number(findAttr('Rarity') || 0)
            };
        case 'relic':
            return {
                ...baseNft,
                type: 'relic',
                capacity: Number(findAttr('Capacity') || 0),
                rarity: Number(findAttr('Rarity') || 0)
            };
        case 'party':
            return {
                ...baseNft,
                type: 'party',
                totalPower: Number(findAttr('Total Power') || 0),
                totalCapacity: Number(findAttr('Total Capacity') || 0),
                heroIds: [], 
                relicIds: [],
            };
        case 'vip':
            return {
                ...baseNft,
                type: 'vip',
                level: Number(findAttr('Level') || 0)
            };
        default:
             const _exhaustiveCheck: never = type;
             throw new Error(`Unknown NFT type: ${_exhaustiveCheck}`);
    }
}

// 【修改後】通用函式，使用掃描事件並透過 multicall 確認所有權，來獲取 NFT
async function fetchNftsForContract(
    client: ReturnType<typeof getClient>,
    owner: Address,
    contract: ReturnType<typeof getContract>,
    type: AnyNft['type']
): Promise<AnyNft[]> {
    if (!contract) return [];
    try {
        // 1. 掃描所有發送給該玩家的 Transfer 事件
        const transferLogs = await client.getLogs({
            address: contract.address,
            event: {
                type: 'event',
                name: 'Transfer',
                inputs: [
                    { type: 'address', name: 'from', indexed: true },
                    { type: 'address', name: 'to', indexed: true },
                    { type: 'uint256', name: 'tokenId', indexed: true },
                ],
            },
            args: { to: owner },
            fromBlock: 'earliest',
            toBlock: 'latest',
        });

        // 2. 從日誌中提取所有潛在的 token ID，並去重
        const potentialTokenIds = [...new Set(transferLogs.map(log => log.args.tokenId).filter(id => id !== undefined))] as bigint[];

        if (potentialTokenIds.length === 0) return [];
        
        // 3. 【修正】為了讓 TypeScript 正確推斷型別，不使用 spread (...)，而是明確建構呼叫物件，並將 ABI 進行型別轉換
        const ownerOfCalls = potentialTokenIds.map(id => ({
            address: contract.address,
            abi: contract.abi as Abi,
            functionName: 'ownerOf',
            args: [id],
        }));

        const ownersResults = await client.multicall({ contracts: ownerOfCalls, allowFailure: true });

        // 4. 過濾出當前玩家確實仍然擁有的 token ID
        //    【修正】將未使用的變數 id 改為 _id，避免 linting 警告
        const ownedTokenIds = potentialTokenIds.filter((_id, index) => 
            ownersResults[index].status === 'success' && ownersResults[index].result === owner
        );
        
        if (ownedTokenIds.length === 0) return [];

        // 5. 為確認擁有的 token ID 獲取元數據
        const nftPromises = ownedTokenIds.map(async (id) => {
            const tokenURIResult = await client.readContract({ ...contract, functionName: 'tokenURI', args: [id] });
            const metadata = await fetchMetadata(tokenURIResult as string);
            return parseToTypedNft(metadata, id, type, contract.address);
        });
        
        return Promise.all(nftPromises);

    } catch (error) {
        console.warn(`Could not fetch NFTs for ${type} contract via event scanning. Error: `, error);
        return [];
    }
}

// 【修改後】獲取玩家所有種類的 NFT
export async function fetchAllOwnedNfts(owner: Address, chainId: number): Promise<AllNftCollections> {
    const client = getClient(chainId);

    const contractsToFetch: { name: ContractName, type: AnyNft['type'] }[] = [
        { name: 'hero', type: 'hero' },
        { name: 'relic', type: 'relic' },
        { name: 'party', type: 'party' },
        { name: 'vipStaking', type: 'vip' },
    ];
    
    const results = await Promise.all(
        contractsToFetch.map(c => fetchNftsForContract(client, owner, getContract(chainId, c.name), c.type))
    );

    // 將結果分類並進行型別斷言，使其符合 AllNftCollections 的定義
    return { 
        heroes: results[0] as HeroNft[], 
        relics: results[1] as RelicNft[], 
        parties: results[2] as PartyNft[], 
        vipCards: results[3] as VipNft[]
    };
}
