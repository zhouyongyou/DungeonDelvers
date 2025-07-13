import { useWriteContract } from 'wagmi';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useAppToast } from './useAppToast';
import { logger } from '../utils/logger';
import { useGlobalLoading } from '../components/core/GlobalLoadingProvider';

export interface ContractTransactionConfig {
  contractCall: {
    address: `0x${string}`;
    abi: any;
    functionName: string;
    args?: any[];
    value?: bigint;
  };
  description: string;
  successMessage: string;
  errorMessage: string;
  loadingMessage?: string;
  onSuccess?: (hash: string) => void | Promise<void>;
  onError?: (error: Error) => void;
}

export function useContractTransaction() {
  const { writeContractAsync, isPending } = useWriteContract();
  const { addTransaction } = useTransactionStore();
  const { showToast } = useAppToast();
  const { setLoading } = useGlobalLoading();

  const executeTransaction = async (config: ContractTransactionConfig): Promise<string | null> => {
    const {
      contractCall,
      description,
      successMessage,
      errorMessage,
      loadingMessage,
      onSuccess,
      onError,
    } = config;

    try {
      // 設置加載狀態
      if (loadingMessage) {
        setLoading(true, loadingMessage);
      }

      logger.info('Executing contract transaction:', {
        address: contractCall.address,
        functionName: contractCall.functionName,
        args: contractCall.args,
      });

      // 執行合約調用
      const hash = await writeContractAsync(contractCall);

      // 添加交易到追蹤器
      addTransaction({
        hash,
        description,
      });

      // 顯示成功消息
      showToast(successMessage, 'success');

      // 執行成功回調
      try {
        await onSuccess?.(hash);
      } catch (callbackError) {
        logger.error('Transaction success callback failed:', callbackError);
      }

      logger.info('Transaction submitted successfully:', { hash, description });
      return hash;

    } catch (error: unknown) {
      const e = error as { message?: string; shortMessage?: string };
      
      logger.error('Contract transaction failed:', {
        error: e,
        contractCall,
        description,
      });

      // 只在用戶沒有拒絕交易時顯示錯誤
      if (!e.message?.includes('User rejected')) {
        showToast(e.shortMessage || errorMessage, 'error');
      }

      // 執行錯誤回調
      try {
        onError?.(e as Error);
      } catch (callbackError) {
        logger.error('Transaction error callback failed:', callbackError);
      }

      return null;
    } finally {
      // 清除加載狀態
      if (loadingMessage) {
        setLoading(false);
      }
    }
  };

  return {
    executeTransaction,
    isPending,
  };
}

// 常見合約操作的預設配置
export const ContractOperations = {
  // NFT 批准操作
  approve: (contractAddress: string, spenderAddress: string, contractAbi: any): ContractTransactionConfig => ({
    contractCall: {
      address: contractAddress as `0x${string}`,
      abi: contractAbi,
      functionName: 'setApprovalForAll',
      args: [spenderAddress, true],
    },
    description: '批准合約操作',
    successMessage: '授權成功！',
    errorMessage: '授權失敗',
    loadingMessage: '正在授權...',
  }),

  // ERC20 批准操作
  approveERC20: (contractAddress: string, spenderAddress: string, amount: bigint, contractAbi: any): ContractTransactionConfig => ({
    contractCall: {
      address: contractAddress as `0x${string}`,
      abi: contractAbi,
      functionName: 'approve',
      args: [spenderAddress, amount],
    },
    description: '批准代幣使用',
    successMessage: '代幣授權成功！',
    errorMessage: '代幣授權失敗',
    loadingMessage: '正在授權代幣...',
  }),

  // NFT 鑄造操作
  mint: (contractAddress: string, contractAbi: any, args: any[], fee?: bigint): ContractTransactionConfig => ({
    contractCall: {
      address: contractAddress as `0x${string}`,
      abi: contractAbi,
      functionName: 'mint',
      args,
      value: fee,
    },
    description: '鑄造 NFT',
    successMessage: '鑄造成功！',
    errorMessage: '鑄造失敗',
    loadingMessage: '正在鑄造...',
  }),

  // 質押操作
  stake: (contractAddress: string, contractAbi: any, amount: bigint): ContractTransactionConfig => ({
    contractCall: {
      address: contractAddress as `0x${string}`,
      abi: contractAbi,
      functionName: 'stake',
      args: [amount],
    },
    description: `質押 ${amount.toString()} 代幣`,
    successMessage: '質押成功！',
    errorMessage: '質押失敗',
    loadingMessage: '正在質押...',
  }),

  // 解除質押操作
  unstake: (contractAddress: string, contractAbi: any, amount: bigint): ContractTransactionConfig => ({
    contractCall: {
      address: contractAddress as `0x${string}`,
      abi: contractAbi,
      functionName: 'unstake',
      args: [amount],
    },
    description: `解除質押 ${amount.toString()} 代幣`,
    successMessage: '解除質押成功！',
    errorMessage: '解除質押失敗',
    loadingMessage: '正在解除質押...',
  }),

  // 創建隊伍操作
  createParty: (contractAddress: string, contractAbi: any, heroIds: bigint[], relicIds: bigint[], fee?: bigint): ContractTransactionConfig => ({
    contractCall: {
      address: contractAddress as `0x${string}`,
      abi: contractAbi,
      functionName: 'createParty',
      args: [heroIds, relicIds],
      value: fee,
    },
    description: '創建新隊伍',
    successMessage: '隊伍創建成功！',
    errorMessage: '隊伍創建失敗',
    loadingMessage: '正在創建隊伍...',
  }),
};