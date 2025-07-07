// src/api/nfts.ts

import { createPublicClient, http, type Address, type Abi } from 'viem';
import { bsc } from 'wagmi/chains';
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
// Section: 型別守衛與輔助函式
// =================================================================

type SupportedChainId = keyof typeof contracts;

function isSupportedChain(chainId: number): chainId is SupportedChainId {
    return chainId in contracts;
}

const getClient = (chainId: number) => {
    const chain = chainId === bsc.id ? bsc : null;
    if (!chain) throw new Error("Unsupported chain for client creation");
    
    // 從環境變數讀取 RPC URL，如果沒有則使用公開節點
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
// Section: NFT 數據獲取核心邏輯 (RPC 優化版)
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
        // ★★★ RPC 優化核心：分塊反向查詢 (Chunked Reverse Query) ★★★
        // 傳統方法是從創世區塊掃描到最新區塊，這非常慢且消耗 RPC 資源。
        // 優化後的方法是從最新區塊開始，一塊一塊地往舊的歷史紀錄查詢。
        // 這樣可以更快地找到用戶最近獲得的 NFT，並設定一個合理的查詢深度，避免掃描整個鏈。
        const toBlock = await client.getBlockNumber();
        const CHUNK_SIZE = 1999n; // 每次查詢的區塊範圍，BSC 節點通常限制為 5000
        const MAX_SEARCH_BLOCKS = 57600n; // 最大查詢深度，約等於 2 天的區塊量 (28800 blocks/day)
        const searchLimitBlock = toBlock > MAX_SEARCH_BLOCKS ? toBlock - MAX_SEARCH_BLOCKS : 0n;
        
        let allLogs = [];
        for (let endBlock = toBlock; endBlock > searchLimitBlock; endBlock -= CHUNK_SIZE + 1n) {
            const startBlock = endBlock - CHUNK_SIZE > searchLimitBlock ? endBlock - CHUNK_SIZE : searchLimitBlock;
            
            const chunkLogs = await client.getLogs({
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
                fromBlock: startBlock,
                toBlock: endBlock,
            });
            allLogs.push(...chunkLogs);
            if (startBlock === 0n) break; // 如果已掃描到創世區塊，則停止
        }

        // 從日誌中獲取潛在的 Token ID 列表
        const potentialTokenIds = [...new Set(allLogs.map(log => log.args.tokenId).filter(id => id !== undefined))] as bigint[];
        if (potentialTokenIds.length === 0) return [];
        
        // 使用 multicall 一次性驗證這些 NFT 的當前擁有者
        const ownerOfCalls = potentialTokenIds.map(id => ({
            address: contract.address, abi: contract.abi as Abi,
            functionName: 'ownerOf', args: [id],
        }));
        const ownersResults = await client.multicall({ contracts: ownerOfCalls, allowFailure: true });

        // 過濾出真正屬於該用戶的 NFT
        const ownedTokenIds = potentialTokenIds.filter((_, index) => 
            ownersResults[index].status === 'success' && (ownersResults[index].result as Address).toLowerCase() === owner.toLowerCase()
        );
        if (ownedTokenIds.length === 0) return [];

        // 使用 multicall 一次性獲取所有 NFT 的元數據 URI
        const uriCalls = ownedTokenIds.map(id => ({
            address: contract.address, abi: contract.abi as Abi,
            functionName: 'tokenURI', args: [id],
        }));
        const uriResults = await client.multicall({ contracts: uriCalls, allowFailure: true });

        // 並行處理所有元數據的獲取和解析
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

    // 並行獲取所有類型的 NFT
    const [heroes, relics, parties, vipCards] = await Promise.all([
        fetchNftsForContract(client, owner, 'hero', 'hero', chainId),
        fetchNftsForContract(client, owner, 'relic', 'relic', chainId),
        fetchNftsForContract(client, owner, 'party', 'party', chainId),
        fetchNftsForContract(client, owner, 'vipStaking', 'vip', chainId),
    ]);

    // 如果有隊伍 NFT，則額外獲取其詳細構成
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
