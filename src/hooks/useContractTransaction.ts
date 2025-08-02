import { useWriteContract } from 'wagmi';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useAppToast } from './useAppToast';
import { logger } from '../utils/logger';
// import { useGlobalLoading } from '../components/core/GlobalLoadingProvider'; // 移除未使用的 Provider

// SBT 錯誤檢查函數
function checkSbtError(errorMessage: string): { isSbtError: boolean; friendlyMessage: string } {
  const normalizedError = errorMessage.toLowerCase();
  
  // SBT 相關錯誤模式
  const sbtErrorPatterns = [
    {
      pattern: /sbt.*cannot.*transfer/i,
      message: '🔒 SBT (靈魂綁定代幣) 不可轉移，它與您的錢包地址永久綁定'
    },
    {
      pattern: /cannot.*transfer.*sbt/i,
      message: '🔒 SBT (靈魂綁定代幣) 不可轉移，它與您的錢包地址永久綁定'
    },
    {
      pattern: /sbt.*cannot.*approv/i,
      message: '🔒 SBT (靈魂綁定代幣) 不可授權，無法委託給其他地址'
    },
    {
      pattern: /cannot.*approv.*sbt/i,
      message: '🔒 SBT (靈魂綁定代幣) 不可授權，無法委託給其他地址'
    },
    {
      pattern: /playerprofile.*cannot.*transfer/i,
      message: '🔒 玩家檔案是 SBT，不可轉移，它記錄您在遊戲中的身份和成就'
    },
    {
      pattern: /playerprofile.*cannot.*approv/i,
      message: '🔒 玩家檔案是 SBT，不可授權，無法委託給其他地址'
    },
    {
      pattern: /vipstaking.*cannot.*transfer/i,
      message: '🔒 VIP 卡是 SBT，不可轉移，它與您的錢包地址永久綁定'
    },
    {
      pattern: /vipstaking.*cannot.*approv/i,
      message: '🔒 VIP 卡是 SBT，不可授權，無法委託給其他地址'
    },
    {
      pattern: /soul.*bound.*token/i,
      message: '🔒 這是靈魂綁定代幣 (SBT)，與您的身份永久綁定，不可轉移或授權'
    }
  ];
  
  // 檢查是否匹配任何 SBT 錯誤模式
  for (const { pattern, message } of sbtErrorPatterns) {
    if (pattern.test(errorMessage)) {
      return { isSbtError: true, friendlyMessage: message };
    }
  }
  
  return { isSbtError: false, friendlyMessage: errorMessage };
}

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
  // const { setLoading } = useGlobalLoading(); // 移除未使用的 hook

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
        // setLoading(true, loadingMessage); // 移除未使用的 loading
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

      // 開發環境下記錄完整錯誤訊息
      if (import.meta.env.DEV) {
        console.log('🔴 合約交易錯誤詳情:', {
          errorMessage: e.message || e.shortMessage,
          shortMessage: e.shortMessage,
          message: e.message,
          code: e.code,
          cause: e.cause,
          fullError: e
        });
      }

      // 檢查是否為用戶取消 - 優化版本
      const errorMessage = e.message || e.shortMessage || '';
      let isUserRejection = false;
      
      // 1. 先檢查標準錯誤碼（最可靠且最快的方式）
      if (e.code === 4001 || 
          e.code === 'ACTION_REJECTED' ||
          e.cause?.code === 4001 ||
          errorMessage.includes('4001')) {
        isUserRejection = true;
      } else {
        // 2. 使用正則表達式進行高效匹配
        const errorMessageLower = errorMessage.toLowerCase();
        
        // 用戶取消的關鍵詞模式
        const rejectionPatterns = [
          /user\s*(rejected|denied|cancel|canceled|cancelled|refused|disapproved)/i,
          /transaction\s*(rejected|declined|cancelled|denied)/i,
          /(reject|cancel|decline|deny|refuse|abort|disapprov).*(?:by\s*)?(?:the\s*)?user/i,
          /用[户戶]\s*取消/,  // 中文：用户取消 / 用戶取消
          /拒[绝絕]/,         // 中文：拒绝 / 拒絕
          /取消/              // 中文：取消
        ];
        
        // 3. 檢查是否匹配任一模式
        const hasRejectionMessage = rejectionPatterns.some(pattern => pattern.test(errorMessage));
        
        // 4. 額外檢查一些不適合正則的特殊情況
        const hasSpecialCase = 
          errorMessage === 'cancel' || // 某些錢包只返回 "cancel"
          errorMessage === 'User cancel' ||
          errorMessageLower === 'cancelled' ||
          errorMessageLower === 'user denied';
        
        isUserRejection = hasRejectionMessage || hasSpecialCase;
      }
      
      if (isUserRejection) {
        // 用戶取消交易 - 顯示友好提示
        logger.info('用戶取消了交易');
        showToast('交易已取消', 'info');
        
        // 不執行錯誤回調，避免觸發重試邏輯
        return null;
      } else {
        // 檢查是否為 SBT 相關錯誤
        const isSbtError = checkSbtError(errorMessage);
        
        if (isSbtError.isSbtError) {
          // SBT 錯誤 - 顯示特殊說明
          showToast(isSbtError.friendlyMessage, 'warning');
        } else {
          // 其他真正的錯誤 - 顯示錯誤消息
          showToast(e.shortMessage || errorMessage, 'error');
        }
        
        // 執行錯誤回調
        try {
          onError?.(e as Error);
        } catch (callbackError) {
          logger.error('Transaction error callback failed:', callbackError);
        }
      }

      return null;
    } finally {
      // 清除加載狀態
      if (loadingMessage) {
        // setLoading(false); // 移除未使用的 loading
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