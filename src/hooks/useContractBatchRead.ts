import { useReadContracts } from 'wagmi';
import { useMemo } from 'react';
import type { Abi } from 'viem';
import { getContractWithABI } from '../config/contractsWithABI';
import type { ContractName } from '../config/contracts';
import type { SupportedChainId } from '../types';

interface ContractRead {
  contractName: ContractName;
  functionName: string;
  args?: readonly unknown[];
}

interface BatchReadConfig {
  chainId: SupportedChainId;
  reads: ContractRead[];
}

interface BatchReadResult<T = unknown> {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  error?: Error;
}

export function useContractBatchRead<T extends readonly unknown[]>({
  chainId,
  reads,
}: BatchReadConfig): {
  results: BatchReadResult<T[number]>[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  // 構建合約調用配置
  const contracts = useMemo(() => {
    return reads.map(read => {
      const contract = getContractWithABI(chainId, read.contractName);
      if (!contract) {
        console.error(`Contract ${read.contractName} not found for chain ${chainId}`);
        return null;
      }
      
      return {
        address: contract.address as `0x${string}`,
        abi: contract.abi as Abi,
        functionName: read.functionName,
        args: read.args,
      };
    }).filter(Boolean);
  }, [chainId, reads]);

  // 使用 wagmi 的 useReadContracts hook
  const { data, isLoading, isError, error, refetch } = useReadContracts({
    contracts: contracts as any[],
    query: {
      enabled: contracts.length > 0,
    },
  });

  // 格式化結果
  const results = useMemo(() => {
    if (!data) {
      return reads.map(() => ({
        isLoading: true,
        isError: false,
      }));
    }

    return data.map((result, index) => {
      if (result.status === 'failure') {
        return {
          isLoading: false,
          isError: true,
          error: result.error as Error,
        };
      }

      return {
        data: result.result as T[number],
        isLoading: false,
        isError: false,
      };
    });
  }, [data, reads]);

  return {
    results,
    isLoading,
    isError,
    refetch,
  };
}

// 特定用途的批量讀取 hooks

// 批量讀取 ERC20 代幣信息
export function useERC20BatchRead(
  chainId: SupportedChainId,
  tokenName: ContractName,
  addresses: readonly `0x${string}`[]
) {
  const reads = useMemo(() => {
    const baseReads: ContractRead[] = [
      { contractName: tokenName, functionName: 'name' },
      { contractName: tokenName, functionName: 'symbol' },
      { contractName: tokenName, functionName: 'decimals' },
      { contractName: tokenName, functionName: 'totalSupply' },
    ];

    // 為每個地址添加 balance 查詢
    const balanceReads = addresses.map(address => ({
      contractName: tokenName,
      functionName: 'balanceOf',
      args: [address] as const,
    }));

    return [...baseReads, ...balanceReads];
  }, [tokenName, addresses]);

  const { results, isLoading, isError, refetch } = useContractBatchRead({
    chainId,
    reads,
  });

  // 解構結果
  const [name, symbol, decimals, totalSupply, ...balances] = results;

  return {
    name: name.data as string | undefined,
    symbol: symbol.data as string | undefined,
    decimals: decimals.data as number | undefined,
    totalSupply: totalSupply.data as bigint | undefined,
    balances: balances.map(b => b.data as bigint | undefined),
    isLoading,
    isError,
    refetch,
  };
}

// 批量讀取遊戲狀態
export function useGameStateBatchRead(chainId: SupportedChainId) {
  const reads: ContractRead[] = [
    { contractName: 'DungeonGold', functionName: 'totalSupply' },
    { contractName: 'DungeonGold', functionName: 'symbol' },
    { contractName: 'DungeonDelversCharacter', functionName: 'nextTokenId' },
    { contractName: 'DungeonDelversCharacter', functionName: 'mintPrice' },
    { contractName: 'DungeonDelversCharacter', functionName: 'paused' },
    { contractName: 'Dungeon', functionName: 'currentRoomId' },
    { contractName: 'Dungeon', functionName: 'explorePrice' },
    { contractName: 'Altar', functionName: 'sacrificePrice' },
    { contractName: 'Altar', functionName: 'revivePrice' },
  ];

  const { results, isLoading, isError, refetch } = useContractBatchRead({
    chainId,
    reads,
  });

  // 解構並命名結果
  const [
    goldTotalSupply,
    goldSymbol,
    nextTokenId,
    mintPrice,
    paused,
    currentRoomId,
    explorePrice,
    sacrificePrice,
    revivePrice,
  ] = results;

  return {
    gold: {
      totalSupply: goldTotalSupply.data as bigint | undefined,
      symbol: goldSymbol.data as string | undefined,
    },
    character: {
      nextTokenId: nextTokenId.data as bigint | undefined,
      mintPrice: mintPrice.data as bigint | undefined,
      paused: paused.data as boolean | undefined,
    },
    dungeon: {
      currentRoomId: currentRoomId.data as bigint | undefined,
      explorePrice: explorePrice.data as bigint | undefined,
    },
    altar: {
      sacrificePrice: sacrificePrice.data as bigint | undefined,
      revivePrice: revivePrice.data as bigint | undefined,
    },
    isLoading,
    isError,
    refetch,
  };
}

// 批量讀取角色信息
export function useCharacterBatchRead(
  chainId: SupportedChainId,
  tokenIds: readonly bigint[]
) {
  const reads = useMemo(() => {
    const allReads: ContractRead[] = [];
    
    // 為每個 tokenId 添加查詢
    tokenIds.forEach(tokenId => {
      allReads.push(
        {
          contractName: 'DungeonDelversCharacter',
          functionName: 'ownerOf',
          args: [tokenId] as const,
        },
        {
          contractName: 'DungeonDelversCharacter',
          functionName: 'getCharacter',
          args: [tokenId] as const,
        },
        {
          contractName: 'DungeonDelversCharacter',
          functionName: 'getStatus',
          args: [tokenId] as const,
        },
        {
          contractName: 'DungeonDelversCharacter',
          functionName: 'tokenURI',
          args: [tokenId] as const,
        }
      );
    });
    
    return allReads;
  }, [tokenIds]);

  const { results, isLoading, isError, refetch } = useContractBatchRead({
    chainId,
    reads,
  });

  // 組織結果
  const characters = useMemo(() => {
    const chars: any[] = [];
    for (let i = 0; i < tokenIds.length; i++) {
      const baseIndex = i * 4;
      chars.push({
        tokenId: tokenIds[i],
        owner: results[baseIndex]?.data as Address | undefined,
        character: results[baseIndex + 1]?.data,
        status: results[baseIndex + 2]?.data,
        tokenURI: results[baseIndex + 3]?.data as string | undefined,
      });
    }
    return chars;
  }, [results, tokenIds]);

  return {
    characters,
    isLoading,
    isError,
    refetch,
  };
}

// 批量讀取價格設定
export function usePriceSettingsBatchRead(chainId: SupportedChainId) {
  const reads: ContractRead[] = [
    { contractName: 'DungeonDelversCharacter', functionName: 'mintPrice' },
    { contractName: 'Dungeon', functionName: 'explorePrice' },
    { contractName: 'Altar', functionName: 'sacrificePrice' },
    { contractName: 'Altar', functionName: 'revivePrice' },
    { contractName: 'DungeonGold', functionName: 'dungeonRewardAmount' },
    { contractName: 'DungeonGold', functionName: 'altarRewardAmount' },
  ];

  const { results, isLoading, isError, refetch } = useContractBatchRead({
    chainId,
    reads,
  });

  const [
    mintPrice,
    explorePrice,
    sacrificePrice,
    revivePrice,
    dungeonReward,
    altarReward,
  ] = results;

  return {
    prices: {
      mint: mintPrice.data as bigint | undefined,
      explore: explorePrice.data as bigint | undefined,
      sacrifice: sacrificePrice.data as bigint | undefined,
      revive: revivePrice.data as bigint | undefined,
    },
    rewards: {
      dungeon: dungeonReward.data as bigint | undefined,
      altar: altarReward.data as bigint | undefined,
    },
    isLoading,
    isError,
    refetch,
  };
}