// src/config/contracts.ts (支援多網路最終版)

import type { Address } from 'viem';
import { bsc, bscTestnet } from 'wagmi/chains';

// 合約地址配置
export const CONTRACT_ADDRESSES = {
  [bsc.id]: {
    dungeonMaster: '0xd14A5eFFc45D0131af3eb876992fC6eD9683f5B0' as Address,
    dungeonCore: '0x4CbAC0E4AEC9Ef3B11C93805483c23224ed1f118' as Address,
    hero: '0x2a046140668cBb8F598ff3852B08852A8EB23b6a' as Address,
    relic: '0x95F005e2e0d38381576DA36c5CA4619a87da550E' as Address,
    party: '0x11FB68409222B53b04626d382d7e691e640A1DcD' as Address,
    playerProfile: '0x43a9BE911f1074788A00cE8e6E00732c7364c1F4' as Address,
    vipStaking: '0xefdfF583944A2c6318d1597AD1E41159fCd8F6dB' as Address,
    altarOfAscension: '0x83a7fB85E0892A67041FcFc4c1F0F1111e5aB3DA' as Address,
    oracle: '0xc5bBFfFf552167D1328432AA856B752e9c4b4838' as Address,
    playerVault: '0x6187DBCcb58088E414437A6b8d58a42cD2BD1ec4' as Address,
  },
  [bscTestnet.id]: {
    dungeonMaster: '0x1234567890123456789012345678901234567890' as Address,
    dungeonCore: '0x1234567890123456789012345678901234567890' as Address,
    hero: '0x1234567890123456789012345678901234567890' as Address,
    relic: '0x1234567890123456789012345678901234567890' as Address,
    party: '0x1234567890123456789012345678901234567890' as Address,
    playerProfile: '0x1234567890123456789012345678901234567890' as Address,
    vipStaking: '0x1234567890123456789012345678901234567890' as Address,
    soulShard: '0x1234567890123456789012345678901234567890' as Address,
    altarOfAscension: '0x1234567890123456789012345678901234567890' as Address,
    oracle: '0x1234567890123456789012345678901234567890' as Address,
    playerVault: '0x1234567890123456789012345678901234567890' as Address,
  },
} as const;

// 簡化的 ABI - 只包含常用函數
export const SIMPLE_ABI = [
  {
    inputs: [{ name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// 獲取合約配置
export const getContractConfig = (chainId: number, contractName: keyof typeof CONTRACT_ADDRESSES[56]) => {
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  if (!addresses) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  
  return {
    address: addresses[contractName],
    abi: SIMPLE_ABI,
  };
};
