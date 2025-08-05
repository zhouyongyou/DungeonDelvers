import { useWriteContract } from 'wagmi';

/**
 * 包裝 useWriteContract，禁用自動重試
 * 解決 Rabby 錢包取消交易後重複彈窗的問題
 */
export function useWriteContractNoRetry() {
  const { writeContractAsync: originalWriteContractAsync, ...rest } = useWriteContract();

  const writeContractAsync = async (config: any) => {
    return originalWriteContractAsync({
      ...config,
      // @ts-ignore - 禁用自動重試
      retry: {
        count: 0
      }
    });
  };

  return {
    writeContractAsync,
    ...rest
  };
}