import { createPublicClient, http, type Address } from 'viem';
import { bsc, bscTestnet } from 'viem/chains';
import { getContract } from '../config/contracts';
import type { NftType, AnyNft, HeroNft, RelicNft, PartyNft } from '../types/nft';

// 建立一個 Public Client 來直接與區塊鏈溝通，用於 getLogs
const publicClients = {
    [bsc.id]: createPublicClient({ chain: bsc, transport: http() }),
    [bscTestnet.id]: createPublicClient({ chain: bscTestnet, transport: http() }),
}

// 獲取一個地址擁有的所有特定類型的 NFT
async function fetchNftsByType(owner: Address, chainId: number, type: NftType): Promise<AnyNft[]> {
    const publicClient = publicClients[chainId];
    const contract = getContract(chainId, type);

    if (!publicClient || !contract) return [];

    // 1. 透過 Transfer 事件獲取該地址曾經接收過的所有 tokenId
    const logs = await publicClient.getLogs({
        address: contract.address,
        event: {
            type: 'event',
            name: 'Transfer',
            inputs: [
                { type: 'address', indexed: true, name: 'from' },
                { type: 'address', indexed: true, name: 'to' },
                { type: 'uint256', indexed: true, name: 'tokenId' },
            ],
        },
        args: { to: owner },
        fromBlock: 'earliest', // 從最早的區塊開始掃描
    });

    const uniqueTokenIds = [...new Set(logs.map(log => log.args.tokenId!))];
    if (uniqueTokenIds.length === 0) return [];

    // 2. 使用 multicall 一次性檢查這些 token 的當前 owner
    const ownerCalls = uniqueTokenIds.map(tokenId => ({
        ...contract,
        functionName: 'ownerOf',
        args: [tokenId],
    }));
    const ownerResults = await publicClient.multicall({ contracts: ownerCalls });

    // 3. 過濾出當前仍然屬於該地址的 token
    const ownedTokenIds = uniqueTokenIds.filter(
        (_, i) => ownerResults[i].status === 'success' && (ownerResults[i].result as Address).toLowerCase() === owner.toLowerCase()
    );
    if (ownedTokenIds.length === 0) return [];
    
    // 4. 為真正擁有的 token，再次使用 multicall 獲取其屬性和 tokenURI
    const propsCalls = ownedTokenIds.flatMap(tokenId => {
        const calls: any[] = [{ ...contract, functionName: 'tokenURI', args: [tokenId] }];
        if (type === 'hero') calls.push({ ...contract, functionName: 'getHeroProperties', args: [tokenId] });
        if (type === 'relic') calls.push({ ...contract, functionName: 'getRelicProperties', args: [tokenId] });
        if (type === 'party') calls.push({ ...contract, functionName: 'getPartyComposition', args: [tokenId] });
        return calls;
    });

    const propsResults = await publicClient.multicall({ contracts: propsCalls });

    // 5. 獲取 metadata 並組合最終數據
    const nfts = await Promise.all(ownedTokenIds.map(async (tokenId, i) => {
        const uriResult = propsResults[i * 2];
        const propsResult = propsResults[i * 2 + 1];

        if (propsResult.status !== 'success') return null;

        const tokenURI = uriResult.status === 'success' ? uriResult.result as string : '';
        const metadata = tokenURI ? await fetch(tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/')).then(res => res.json()).catch(() => ({})) : {};
        
        const baseNft = { id: tokenId, ...metadata };

        switch (type) {
            case 'hero': return { ...baseNft, type, ...(propsResult.result as any) } as HeroNft;
            case 'relic': return { ...baseNft, type, ...(propsResult.result as any) } as RelicNft;
            case 'party': return { ...baseNft, type, ...(propsResult.result as any) } as PartyNft;
            default: return null;
        }
    }));
    
    return nfts.filter(Boolean) as AnyNft[];
}

// 導出主函數，一次性獲取所有類型的 NFT
export async function fetchAllOwnedNfts(owner: Address, chainId: number) {
    const [heroes, relics, parties] = await Promise.all([
        fetchNftsByType(owner, chainId, 'hero'),
        fetchNftsByType(owner, chainId, 'relic'),
        fetchNftsByType(owner, chainId, 'party'),
    ]);
    return { heroes, relics, parties };
}