// src/utils/provisionsDiagnostic.ts - 購買儲備診斷工具

import { getContract } from '../config/contracts';
import { bsc } from 'wagmi/chains';
import { logger } from './logger';

export interface ProvisionsDiagnosticResult {
  success: boolean;
  issues: string[];
  warnings: string[];
  contractAddresses: {
    dungeonMaster: string;
    dungeonCore: string;
    soulShard: string;
  };
  contractStates: {
    dungeonMasterPaused?: boolean;
    provisionPriceUSD?: bigint;
    requiredAmount?: bigint;
  };
  userStates: {
    walletBalance?: bigint;
    allowance?: bigint;
    needsApproval?: boolean;
  };
  recommendations: string[];
}

export class ProvisionsDiagnostic {
  private static instance: ProvisionsDiagnostic;
  
  static getInstance(): ProvisionsDiagnostic {
    if (!this.instance) {
      this.instance = new ProvisionsDiagnostic();
    }
    return this.instance;
  }

  async diagnoseProvisionsPurchase(
    userAddress: string,
    partyId: bigint,
    quantity: number,
    provider: any
  ): Promise<ProvisionsDiagnosticResult> {
    const result: ProvisionsDiagnosticResult = {
      success: false,
      issues: [],
      warnings: [],
      contractAddresses: {
        dungeonMaster: '',
        dungeonCore: '',
        soulShard: ''
      },
      contractStates: {},
      userStates: {},
      recommendations: []
    };

    try {
      // 1. 檢查合約地址
      const dungeonMasterContract = getContract(bsc.id, 'dungeonMaster');
      const dungeonCoreContract = getContract(bsc.id, 'dungeonCore');
      const soulShardContract = getContract(bsc.id, 'soulShard');

      if (!dungeonMasterContract || !dungeonCoreContract || !soulShardContract) {
        result.issues.push('合約地址配置不完整');
        return result;
      }

      result.contractAddresses = {
        dungeonMaster: dungeonMasterContract.address,
        dungeonCore: dungeonCoreContract.address,
        soulShard: soulShardContract.address
      };

      // 2. 檢查合約狀態
      try {
        // 檢查 DungeonMaster 是否暫停
        const isPaused = await provider.readContract({
          address: dungeonMasterContract.address,
          abi: dungeonMasterContract.abi,
          functionName: 'paused'
        });
        result.contractStates.dungeonMasterPaused = isPaused;
        
        if (isPaused) {
          result.issues.push('DungeonMaster 合約已暫停');
        }

        // 檢查儲備價格
        const provisionPriceUSD = await provider.readContract({
          address: dungeonMasterContract.address,
          abi: dungeonMasterContract.abi,
          functionName: 'provisionPriceUSD'
        });
        result.contractStates.provisionPriceUSD = provisionPriceUSD;

        if (provisionPriceUSD === 0n) {
          result.issues.push('儲備價格未設定或為0');
        }

        // 計算所需的 SoulShard 數量
        const totalPriceUSD = provisionPriceUSD * BigInt(quantity);
        const requiredAmount = await provider.readContract({
          address: dungeonCoreContract.address,
          abi: dungeonCoreContract.abi,
          functionName: 'getSoulShardAmountForUSD',
          args: [totalPriceUSD]
        });
        result.contractStates.requiredAmount = requiredAmount;

        if (requiredAmount === 0n) {
          result.issues.push('無法計算所需的 SoulShard 數量');
        }

        // 3. 檢查用戶狀態
        // 檢查錢包餘額
        const walletBalance = await provider.readContract({
          address: soulShardContract.address,
          abi: soulShardContract.abi,
          functionName: 'balanceOf',
          args: [userAddress]
        });
        result.userStates.walletBalance = walletBalance;

        if (walletBalance < requiredAmount) {
          result.issues.push(`SoulShard 餘額不足: 需要 ${requiredAmount.toString()}，但只有 ${walletBalance.toString()}`);
        }

        // 檢查授權額度
        const allowance = await provider.readContract({
          address: soulShardContract.address,
          abi: soulShardContract.abi,
          functionName: 'allowance',
          args: [userAddress, dungeonMasterContract.address]
        });
        result.userStates.allowance = allowance;
        result.userStates.needsApproval = allowance < requiredAmount;

        if (allowance < requiredAmount) {
          result.issues.push(`授權額度不足: 需要 ${requiredAmount.toString()}，但只有 ${allowance.toString()}`);
        }

        // 4. 檢查隊伍狀態
        try {
          const partyContract = getContract(bsc.id, 'party');
          if (partyContract) {
            const partyOwner = await provider.readContract({
              address: partyContract.address,
              abi: partyContract.abi,
              functionName: 'ownerOf',
              args: [partyId]
            });

            if (partyOwner.toLowerCase() !== userAddress.toLowerCase()) {
              result.issues.push(`隊伍 #${partyId} 不屬於當前用戶`);
            }
          }
        } catch (error) {
          result.issues.push(`隊伍 #${partyId} 不存在或無法訪問`);
        }

        // 5. 檢查 DungeonCore 連接
        try {
          const dungeonCoreFromDM = await provider.readContract({
            address: dungeonMasterContract.address,
            abi: dungeonMasterContract.abi,
            functionName: 'dungeonCore'
          });

          if (dungeonCoreFromDM.toLowerCase() !== dungeonCoreContract.address.toLowerCase()) {
            result.issues.push('DungeonMaster 中配置的 DungeonCore 地址不正確');
          }
        } catch (error) {
          result.issues.push('無法驗證 DungeonCore 連接');
        }

        // 6. 生成建議
        if (result.issues.length === 0) {
          result.success = true;
          result.recommendations.push('所有檢查都通過，應該可以成功購買儲備');
        } else {
          // 根據問題生成建議
          if (result.contractStates.dungeonMasterPaused) {
            result.recommendations.push('等待管理員恢復合約運行');
          }
          if (result.userStates.needsApproval) {
            result.recommendations.push('首先執行授權交易');
          }
          if (result.userStates.walletBalance && result.contractStates.requiredAmount && 
              result.userStates.walletBalance < result.contractStates.requiredAmount) {
            result.recommendations.push('需要獲得更多 SoulShard 代幣');
          }
        }

      } catch (error) {
        result.issues.push(`合約狀態檢查失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      }

    } catch (error) {
      result.issues.push(`診斷過程中發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }

    logger.info('購買儲備診斷結果:', result);
    return result;
  }

  // 簡化的診斷方法，用於快速檢查
  async quickDiagnose(userAddress: string, partyId: bigint, quantity: number): Promise<string[]> {
    const issues: string[] = [];
    
    // 檢查基本配置
    const dungeonMasterContract = getContract(bsc.id, 'dungeonMaster');
    const dungeonCoreContract = getContract(bsc.id, 'dungeonCore');
    const soulShardContract = getContract(bsc.id, 'soulShard');

    if (!dungeonMasterContract) issues.push('DungeonMaster 合約地址未配置');
    if (!dungeonCoreContract) issues.push('DungeonCore 合約地址未配置');
    if (!soulShardContract) issues.push('SoulShard 合約地址未配置');

    if (quantity <= 0) issues.push('購買數量必須大於0');
    if (partyId < 0n) issues.push('隊伍 ID 無效');

    return issues;
  }

  // 格式化診斷結果為易讀的文本
  formatDiagnosticResult(result: ProvisionsDiagnosticResult): string {
    let output = '=== 購買儲備診斷報告 ===\n';
    
    output += `\n📋 合約地址:\n`;
    output += `  DungeonMaster: ${result.contractAddresses.dungeonMaster}\n`;
    output += `  DungeonCore: ${result.contractAddresses.dungeonCore}\n`;
    output += `  SoulShard: ${result.contractAddresses.soulShard}\n`;

    if (result.contractStates.provisionPriceUSD) {
      output += `\n💰 合約狀態:\n`;
      output += `  儲備價格: ${result.contractStates.provisionPriceUSD.toString()} USD\n`;
      output += `  合約暫停: ${result.contractStates.dungeonMasterPaused ? '是' : '否'}\n`;
      if (result.contractStates.requiredAmount) {
        output += `  所需 SoulShard: ${result.contractStates.requiredAmount.toString()}\n`;
      }
    }

    if (result.userStates.walletBalance !== undefined) {
      output += `\n👤 用戶狀態:\n`;
      output += `  錢包餘額: ${result.userStates.walletBalance.toString()}\n`;
      output += `  授權額度: ${result.userStates.allowance?.toString() || 'N/A'}\n`;
      output += `  需要授權: ${result.userStates.needsApproval ? '是' : '否'}\n`;
    }

    if (result.issues.length > 0) {
      output += `\n❌ 發現問題:\n`;
      result.issues.forEach(issue => output += `  - ${issue}\n`);
    }

    if (result.warnings.length > 0) {
      output += `\n⚠️ 警告:\n`;
      result.warnings.forEach(warning => output += `  - ${warning}\n`);
    }

    if (result.recommendations.length > 0) {
      output += `\n💡 建議:\n`;
      result.recommendations.forEach(rec => output += `  - ${rec}\n`);
    }

    output += `\n✅ 診斷結果: ${result.success ? '通過' : '失敗'}\n`;
    
    return output;
  }
}

export const provisionsDiagnostic = ProvisionsDiagnostic.getInstance();