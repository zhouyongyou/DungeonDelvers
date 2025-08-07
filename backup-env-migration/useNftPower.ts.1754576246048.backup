// src/hooks/useNftPower.ts
// 獲取 NFT 戰力數據的 hooks

import { useReadContract, useReadContracts } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { getContractWithABI } from '../config/contractsWithABI';
import { bsc } from 'wagmi/chains';
import type { HeroNft, RelicNft, PartyNft, NftType } from '../types/nft';

// =================================================================
// Section: NFT Power Hooks
// =================================================================

// 獲取英雄戰力
export const useHeroPower = (tokenId: bigint) => {
    const heroContract = getContractWithABI('HERO');
    
    const { data, isLoading, isError } = useReadContract({
        address: heroContract?.address as `0x${string}`,
        abi: heroContract?.abi,
        functionName: 'getHeroPower',
        args: [tokenId],
        chainId: bsc.id,
        query: { 
            enabled: !!heroContract && tokenId > 0n,
            staleTime: 5 * 60 * 1000, // 5分鐘緩存
        }
    });
    
    return {
        power: data ? Number(data) : null,
        isLoading,
        isError
    };
};

// 獲取隊伍戰力
export const usePartyPower = (tokenId: bigint) => {
    const partyContract = getContractWithABI('PARTY');
    
    const { data, isLoading, isError } = useReadContract({
        address: partyContract?.address as `0x${string}`,
        abi: partyContract?.abi,
        functionName: 'getPartyPower',
        args: [tokenId],
        chainId: bsc.id,
        query: { 
            enabled: !!partyContract && tokenId > 0n,
            staleTime: 5 * 60 * 1000,
        }
    });
    
    return {
        power: data ? Number(data) : null,
        isLoading,
        isError
    };
};

// 獲取英雄詳細資訊
export const useHeroDetails = (tokenId: bigint) => {
    const heroContract = getContractWithABI('HERO');
    
    const { data, isLoading, isError } = useReadContracts({
        contracts: [
            {
                address: heroContract?.address as `0x${string}`,
                abi: heroContract?.abi,
                functionName: 'getHeroPower',
                args: [tokenId],
                chainId: bsc.id,
            },
            {
                address: heroContract?.address as `0x${string}`,
                abi: heroContract?.abi,
                functionName: 'getTier',
                args: [tokenId],
                chainId: bsc.id,
            },
            {
                address: heroContract?.address as `0x${string}`,
                abi: heroContract?.abi,
                functionName: 'getLevel',
                args: [tokenId],
                chainId: bsc.id,
            },
            {
                address: heroContract?.address as `0x${string}`,
                abi: heroContract?.abi,
                functionName: 'getElement',
                args: [tokenId],
                chainId: bsc.id,
            },
            {
                address: heroContract?.address as `0x${string}`,
                abi: heroContract?.abi,
                functionName: 'getClass',
                args: [tokenId],
                chainId: bsc.id,
            }
        ],
        query: {
            enabled: !!heroContract && tokenId > 0n,
            staleTime: 5 * 60 * 1000,
        }
    });
    
    return {
        details: data ? {
            power: data[0]?.result ? Number(data[0].result) : 0,
            tier: data[1]?.result ? Number(data[1].result) : 0,
            level: data[2]?.result ? Number(data[2].result) : 0,
            element: data[3]?.result ? Number(data[3].result) : 0,
            heroClass: data[4]?.result ? Number(data[4].result) : 0,
        } : null,
        isLoading,
        isError
    };
};

// 獲取聖物詳細資訊
export const useRelicDetails = (tokenId: bigint) => {
    const relicContract = getContractWithABI('RELIC');
    
    const { data, isLoading, isError } = useReadContracts({
        contracts: [
            {
                address: relicContract?.address as Address,
                abi: relicContract?.abi,
                functionName: 'getTier',
                args: [tokenId],
                chainId: bsc.id,
            },
            {
                address: relicContract?.address as Address,
                abi: relicContract?.abi,
                functionName: 'getCategory',
                args: [tokenId],
                chainId: bsc.id,
            },
            {
                address: relicContract?.address as Address,
                abi: relicContract?.abi,
                functionName: 'getCapacity',
                args: [tokenId],
                chainId: bsc.id,
            }
        ],
        query: {
            enabled: !!relicContract && tokenId > 0n,
            staleTime: 5 * 60 * 1000,
        }
    });
    
    return {
        details: data ? {
            tier: data[0]?.result ? Number(data[0].result) : 0,
            category: data[1]?.result ? Number(data[1].result) : 0,
            capacity: data[2]?.result ? Number(data[2].result) : 0,
        } : null,
        isLoading,
        isError
    };
};

// 獲取隊伍詳細資訊
export const usePartyDetails = (tokenId: bigint) => {
    const partyContract = getContractWithABI('PARTY');
    
    const { data, isLoading, isError } = useReadContracts({
        contracts: [
            {
                address: partyContract?.address as `0x${string}`,
                abi: partyContract?.abi,
                functionName: 'getPartyPower',
                args: [tokenId],
                chainId: bsc.id,
            },
            {
                address: partyContract?.address as `0x${string}`,
                abi: partyContract?.abi,
                functionName: 'getPartyHeroes',
                args: [tokenId],
                chainId: bsc.id,
            },
            {
                address: partyContract?.address as `0x${string}`,
                abi: partyContract?.abi,
                functionName: 'getPartyRelics',
                args: [tokenId],
                chainId: bsc.id,
            }
        ],
        query: {
            enabled: !!partyContract && tokenId > 0n,
            staleTime: 5 * 60 * 1000,
        }
    });
    
    return {
        details: data ? {
            totalPower: data[0]?.result ? Number(data[0].result) : 0,
            heroes: data[1]?.result as bigint[] || [],
            relics: data[2]?.result as bigint[] || [],
        } : null,
        isLoading,
        isError
    };
};

// 統一的 NFT 詳情 hook
export const useNftDetails = (nftType: NftType, tokenId: bigint) => {
    const heroDetails = useHeroDetails(tokenId);
    const relicDetails = useRelicDetails(tokenId);
    const partyDetails = usePartyDetails(tokenId);
    
    switch (nftType) {
        case 'hero':
            return {
                details: heroDetails.details,
                isLoading: heroDetails.isLoading,
                isError: heroDetails.isError
            };
        case 'relic':
            return {
                details: relicDetails.details,
                isLoading: relicDetails.isLoading,
                isError: relicDetails.isError
            };
        case 'party':
            return {
                details: partyDetails.details,
                isLoading: partyDetails.isLoading,
                isError: partyDetails.isError
            };
        default:
            return {
                details: null,
                isLoading: false,
                isError: false
            };
    }
};

// =================================================================
// Section: Helper Functions
// =================================================================

// 元素名稱映射
export const getElementName = (elementId: number): string => {
    const elements = ['無', '火', '水', '土', '風', '光', '暗'];
    return elements[elementId] || '未知';
};

// 職業名稱映射
export const getClassName = (classId: number): string => {
    const classes = ['戰士', '法師', '盜賊', '牧師', '獵人'];
    return classes[classId] || '未知';
};

// 聖物類別映射
export const getRelicCategoryName = (categoryId: number): string => {
    const categories = ['武器', '防具', '飾品', '消耗品'];
    return categories[categoryId] || '未知';
};