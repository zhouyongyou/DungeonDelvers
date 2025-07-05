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
    VipNft
} from '../types/nft';

// =================================================================
// Section: 型別守衛與輔助函式
// =================================================================

// 【新增】定義支援的鏈 ID 型別，與 contracts.ts 同步
type SupportedChainId = keyof typeof contracts;

// 【新增】建立一個型別守衛函式，用於檢查 chainId 是否為我們所支援的
function isSupportedChain(chainId: number): chainId is SupportedChainId {
    return chainId in contracts;
}

// 根據鏈 ID 獲取一個公共的 viem 客戶端
const getClient = (chainId: number) => {
    const chain = chainId === bsc.id ? bsc : bscTestnet;
    return createPublicClient({ chain, transport: http() });
};

// 從鏈上或 Base64 URI 中獲取元數據，並增加錯誤處理
async function fetchMetadata(uri: string): Promise<Omit<BaseNft, 'id' | 'contractAddress' | 'type'>> {
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

// 輔助函式，將通用的元數據轉換為我們定義的、帶有具體屬性的強型別 NFT 物件
function parseToTypedNft(
    baseMetadata: Omit<BaseNft, 'id' | 'contractAddress'>,
    id: bigint,
    type: AnyNft['type'],
    contractAddress: `0x${string}`
): AnyNft {
    const findAttr = (trait: string, defaultValue: any = 0) => 
        baseMetadata.attributes?.find(a => a.trait_type === trait)?.value ?? defaultValue;

    const baseNft: BaseNft = { ...baseMetadata, id, contractAddress };

    switch (type) {
        case 'hero':
            return { ...baseNft, type: 'hero', power: Number(findAttr('Power')), rarity: Number(findAttr('Rarity')) };
        case 'relic':
            return { ...baseNft, type: 'relic', capacity: Number(findAttr('Capacity')), rarity: Number(findAttr('Rarity')) };
        case 'party':
            return { ...baseNft, type: 'party', totalPower: Number(findAttr('Total Power')), totalCapacity: Number(findAttr('Total Capacity')), heroIds: [], relicIds: [] };
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

// 通用函式，使用掃描事件並透過 multicall 確認所有權，來獲取 NFT
async function fetchNftsForContract(
    client: ReturnType<typeof getClient>,
    owner: Address,
    contractName: ContractName,
    type: AnyNft['type'],
    chainId: number
): Promise<AnyNft[]> {
    // 【修正】在呼叫 getContract 之前，先使用型別守衛進行檢查
    if (!isSupportedChain(chainId)) return [];
    
    const contract = getContract(chainId, contractName);
    if (!contract) return [];

    try {
        // 1. 掃描所有發送給該玩家的 Transfer 事件
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
            fromBlock: 'earliest',
        });

        const potentialTokenIds = [...new Set(transferLogs.map(log => log.args.tokenId).filter(id => id !== undefined))] as bigint[];
        if (potentialTokenIds.length === 0) return [];
        
        // 2. 使用 multicall 一次性確認所有權
        const ownerOfCalls = potentialTokenIds.map(id => ({
            address: contract.address, abi: contract.abi as Abi,
            functionName: 'ownerOf', args: [id],
        }));
        const ownersResults = await client.multicall({ contracts: ownerOfCalls, allowFailure: true });

        const ownedTokenIds = potentialTokenIds.filter((_, index) => 
            ownersResults[index].status === 'success' && ownersResults[index].result === owner
        );
        if (ownedTokenIds.length === 0) return [];

        // 3. 為確認擁有的 token ID 獲取元數據 URI
        const uriCalls = ownedTokenIds.map(id => ({
            address: contract.address, abi: contract.abi as Abi,
            functionName: 'tokenURI', args: [id],
        }));
        const uriResults = await client.multicall({ contracts: uriCalls, allowFailure: true });

        // 4. 解析元數據並轉換為強型別物件
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

// 獲取玩家所有種類的 NFT
export async function fetchAllOwnedNfts(owner: Address, chainId: number): Promise<AllNftCollections> {
    // 【修正】在檔案的入口處就進行一次總的鏈 ID 檢查
    if (!isSupportedChain(chainId)) {
        console.error(`不支援的鏈 ID: ${chainId}`);
        return { heroes: [], relics: [], parties: [], vipCards: [] };
    }

    const client = getClient(chainId);

    // 平行獲取所有基礎 NFT 資料
    const [heroes, relics, parties, vipCards] = await Promise.all([
        fetchNftsForContract(client, owner, 'hero', 'hero', chainId),
        fetchNftsForContract(client, owner, 'relic', 'relic', chainId),
        fetchNftsForContract(client, owner, 'party', 'party', chainId),
        fetchNftsForContract(client, owner, 'vipStaking', 'vip', chainId),
    ]);

    // 如果獲取到了 Party NFT，則額外發起一次 multicall 來獲取它們的詳細構成
    if (parties.length > 0) {
        const partyContract = getContract(chainId, 'party');
        if (partyContract) {
            const compositionCalls = parties.map(p => ({
                address: partyContract.address,
                abi: partyABI, // 直接使用 partyABI
                functionName: 'getPartyComposition',
                args: [p.id],
            }));
            const compositions = await client.multicall({ contracts: compositionCalls, allowFailure: true });

            // 將獲取到的構成資訊更新回 Party 物件中
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
