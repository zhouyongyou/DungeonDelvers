// 備用直接合約查詢，當子圖延遲時使用
import { useReadContracts } from 'wagmi';
import { type Address } from 'viem';
import { getContractWithABI } from '../config/contractsWithABI';
import { bsc } from 'wagmi/chains';

// 🔒 管理員專用：智能備用策略，只在子圖數據過期時使用
// ⚠️ 警告：此 Hook 僅供技術人員使用，不應暴露給一般用戶
export const useFallbackAssets = (address?: Address, shouldUseFallback = false) => {
  const heroContract = getContractWithABI('HERO');
  const relicContract = getContractWithABI('RELIC');
  const partyContract = getContractWithABI('PARTY');

  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: heroContract.address,
        abi: heroContract.abi,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        chainId: bsc.id,
      },
      {
        address: relicContract.address,
        abi: relicContract.abi,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        chainId: bsc.id,
      },
      {
        address: partyContract.address,
        abi: partyContract.abi,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        chainId: bsc.id,
      },
    ],
    query: {
      enabled: !!address && shouldUseFallback, // 🔒 只在明確需要時啟用
      staleTime: 60 * 1000, // 1分鐘緩存
      refetchInterval: false, // 🔒 禁用自動刷新
      refetchOnWindowFocus: false, // 🔒 禁用視窗焦點刷新
    },
  });

  const heroCount = data?.[0]?.result ? Number(data[0].result) : 0;
  const relicCount = data?.[1]?.result ? Number(data[1].result) : 0;
  const partyCount = data?.[2]?.result ? Number(data[2].result) : 0;

  return {
    heroCount,
    relicCount,
    partyCount,
    isLoading,
    isFallback: true,
  };
};