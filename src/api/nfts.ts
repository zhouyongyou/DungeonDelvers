import { createPublicClient, http, type Address, type Abi } from 'viem';
import { bsc, bscTestnet } from 'viem/chains';
import { getContract } from '../config/contracts';
import type { NftType, AnyNft, HeroNft, RelicNft, PartyNft } from '../types/nft';

const publicClients: Record<number, ReturnType<typeof createPublicClient>> = {
    [bsc.id]: createPublicClient({ chain: bsc, transport: http() }),
    [bscTestnet.id]: createPublicClient({ chain: bscTestnet, transport: http() }),
}

async function fetchNftsByType(owner: Address, chainId: number, type: NftType): Promise<AnyNft[]> {
    const publicClient = publicClients[chainId];
    const contract = getContract(chainId, type);

    if (!publicClient || !contract) return [];

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
        fromBlock: 'earliest',
    });

    const uniqueTokenIds = [...new Set(logs.map(log => log.args.tokenId!))];
    if (uniqueTokenIds.length === 0) return [];

    const ownerCalls = uniqueTokenIds.map(tokenId => ({
        ...contract,
        functionName: 'ownerOf',
        args: [tokenId],
    }));
    const ownerResults = await publicClient.multicall({ contracts: ownerCalls });

    const ownedTokenIds = uniqueTokenIds.filter(
        (_, i) => ownerResults[i].status === 'success' && (ownerResults[i].result as Address).toLowerCase() === owner.toLowerCase()
    );
    if (ownedTokenIds.length === 0) return [];
    
    // 【修正】為 multicall 的參數提供更精確的型別，以解決 'multicall' boolean 問題
    const propsCalls = ownedTokenIds.flatMap(tokenId => {
        const calls: any[] = [{ ...contract, functionName: 'tokenURI', args: [tokenId] }];
        if (type === 'hero') calls.push({ ...contract, functionName: 'getHeroProperties', args: [tokenId] });
        if (type === 'relic') calls.push({ ...contract, functionName: 'getRelicProperties', args: [tokenId] });
        if (type === 'party') calls.push({ ...contract, functionName: 'getPartyComposition', args: [tokenId] });
        return calls;
    });

    const propsResults = await publicClient.multicall({ contracts: propsCalls, allowFailure: true });

    const nfts = await Promise.all(ownedTokenIds.map(async (tokenId, i) => {
        const uriIndex = i * 2;
        const propsIndex = i * 2 + 1;

        if (propsIndex >= propsResults.length || propsResults[propsIndex].status !== 'success') return null;

        const uriResult = propsResults[uriIndex];
        const propsResult = propsResults[propsIndex];

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

export async function fetchAllOwnedNfts(owner: Address, chainId: number) {
    const [heroes, relics, parties] = await Promise.all([
        fetchNftsByType(owner, chainId, 'hero'),
        fetchNftsByType(owner, chainId, 'relic'),
        fetchNftsByType(owner, chainId, 'party'),
    ]);
    return { heroes, relics, parties };
}
