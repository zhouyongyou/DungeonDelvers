// src/utils/contractChecker.ts - 直接檢查合約狀態的工具

import { createPublicClient, http } from 'viem';
import { bsc } from 'wagmi/chains';
import { getContract } from '../config/contracts';
import { dungeonMasterABI } from '../config/abis';

export class ContractChecker {
  private publicClient;

  constructor() {
    this.publicClient = createPublicClient({
      chain: bsc,
      transport: http('https://bsc-dataseed1.binance.org/')
    });
  }

  // 直接檢查 DungeonMaster 合約的 soulShardToken 地址
  async checkDungeonMasterSoulShardToken(): Promise<{
    soulShardToken: string;
    isSet: boolean;
    dungeonMasterAddress: string;
  }> {
    const dungeonMasterContract = getContract(bsc.id, 'dungeonMaster');
    
    if (!dungeonMasterContract) {
      throw new Error('DungeonMaster 合約配置不存在');
    }

    try {
      const soulShardToken = await this.publicClient.readContract({
        address: dungeonMasterContract.address as `0x${string}`,
        abi: dungeonMasterContract.abi,
        functionName: 'soulShardToken',
      });

      return {
        soulShardToken: soulShardToken as string,
        isSet: soulShardToken !== '0x0000000000000000000000000000000000000000',
        dungeonMasterAddress: dungeonMasterContract.address
      };
    } catch (error) {
      throw new Error(`讀取 soulShardToken 失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  // 檢查 DungeonMaster 合約是否暫停
  async checkDungeonMasterPaused(): Promise<{
    isPaused: boolean;
    dungeonMasterAddress: string;
  }> {
    const dungeonMasterContract = getContract(bsc.id, 'dungeonMaster');
    
    if (!dungeonMasterContract) {
      throw new Error('DungeonMaster 合約配置不存在');
    }

    try {
      const isPaused = await this.publicClient.readContract({
        address: dungeonMasterContract.address as `0x${string}`,
        abi: dungeonMasterABI,
        functionName: 'paused',
      });

      return {
        isPaused: isPaused as boolean,
        dungeonMasterAddress: dungeonMasterContract.address
      };
    } catch (error) {
      throw new Error(`讀取 paused 狀態失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  // 檢查 DungeonMaster 合約的 provisionPriceUSD
  async checkProvisionPriceUSD(): Promise<{
    provisionPriceUSD: bigint;
    dungeonMasterAddress: string;
  }> {
    const dungeonMasterContract = getContract(bsc.id, 'dungeonMaster');
    
    if (!dungeonMasterContract) {
      throw new Error('DungeonMaster 合約配置不存在');
    }

    try {
      const provisionPriceUSD = await this.publicClient.readContract({
        address: dungeonMasterContract.address as `0x${string}`,
        abi: dungeonMasterABI,
        functionName: 'provisionPriceUSD',
      });

      return {
        provisionPriceUSD: provisionPriceUSD as bigint,
        dungeonMasterAddress: dungeonMasterContract.address
      };
    } catch (error) {
      throw new Error(`讀取 provisionPriceUSD 失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  // 檢查 DungeonMaster 合約的 dungeonCore 地址
  async checkDungeonCoreAddress(): Promise<{
    dungeonCoreAddress: string;
    isSet: boolean;
    dungeonMasterAddress: string;
  }> {
    const dungeonMasterContract = getContract(bsc.id, 'dungeonMaster');
    
    if (!dungeonMasterContract) {
      throw new Error('DungeonMaster 合約配置不存在');
    }

    try {
      const dungeonCoreAddress = await this.publicClient.readContract({
        address: dungeonMasterContract.address as `0x${string}`,
        abi: dungeonMasterABI,
        functionName: 'dungeonCore',
      });

      return {
        dungeonCoreAddress: dungeonCoreAddress as string,
        isSet: dungeonCoreAddress !== '0x0000000000000000000000000000000000000000',
        dungeonMasterAddress: dungeonMasterContract.address
      };
    } catch (error) {
      throw new Error(`讀取 dungeonCore 地址失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  // 模擬 buyProvisions 調用
  async simulateBuyProvisions(
    userAddress: string,
    partyId: bigint,
    amount: bigint
  ): Promise<{
    success: boolean;
    error?: string;
    estimatedGas?: bigint;
  }> {
    const dungeonMasterContract = getContract(bsc.id, 'dungeonMaster');
    
    if (!dungeonMasterContract) {
      throw new Error('DungeonMaster 合約配置不存在');
    }

    try {
      const result = await this.publicClient.simulateContract({
        address: dungeonMasterContract.address as `0x${string}`,
        abi: dungeonMasterABI,
        functionName: 'buyProvisions',
        args: [partyId, amount],
        account: userAddress as `0x${string}`,
      });

      return {
        success: true,
        estimatedGas: result.request.gas
      };
    } catch (error: any) {
      let errorMessage = '模擬調用失敗';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.shortMessage) {
        errorMessage = error.shortMessage;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // 檢查 DungeonMaster 合約的 dungeonStorage 地址
  async checkDungeonStorageAddress(): Promise<{
    dungeonStorageAddress: string;
    isSet: boolean;
    dungeonMasterAddress: string;
  }> {
    const dungeonMasterContract = getContract(bsc.id, 'dungeonMaster');
    
    if (!dungeonMasterContract) {
      throw new Error('DungeonMaster 合約配置不存在');
    }

    try {
      const dungeonStorageAddress = await this.publicClient.readContract({
        address: dungeonMasterContract.address as `0x${string}`,
        abi: dungeonMasterABI,
        functionName: 'dungeonStorage',
      });

      return {
        dungeonStorageAddress: dungeonStorageAddress as string,
        isSet: dungeonStorageAddress !== '0x0000000000000000000000000000000000000000',
        dungeonMasterAddress: dungeonMasterContract.address
      };
    } catch (error) {
      throw new Error(`讀取 dungeonStorage 地址失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  // 完整的合約狀態檢查
  async runFullCheck(): Promise<{
    soulShardToken: string;
    soulShardTokenSet: boolean;
    dungeonCoreAddress: string;
    dungeonCoreSet: boolean;
    dungeonStorageAddress: string;
    dungeonStorageSet: boolean;
    isPaused: boolean;
    provisionPriceUSD: string;
    dungeonMasterAddress: string;
    allChecksPass: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // 檢查 soulShardToken
      const soulShardResult = await this.checkDungeonMasterSoulShardToken();
      if (!soulShardResult.isSet) {
        issues.push('SoulShard 代幣地址未設置');
      }

      // 檢查 dungeonCore
      const dungeonCoreResult = await this.checkDungeonCoreAddress();
      if (!dungeonCoreResult.isSet) {
        issues.push('DungeonCore 地址未設置');
      }

      // 檢查 dungeonStorage
      const dungeonStorageResult = await this.checkDungeonStorageAddress();
      if (!dungeonStorageResult.isSet) {
        issues.push('DungeonStorage 地址未設置');
      }

      // 檢查暫停狀態
      const pausedResult = await this.checkDungeonMasterPaused();
      if (pausedResult.isPaused) {
        issues.push('DungeonMaster 合約已暫停');
      }

      // 檢查儲備價格
      const priceResult = await this.checkProvisionPriceUSD();
      if (priceResult.provisionPriceUSD === 0n) {
        issues.push('儲備價格未設置或為 0');
      }

      return {
        soulShardToken: soulShardResult.soulShardToken,
        soulShardTokenSet: soulShardResult.isSet,
        dungeonCoreAddress: dungeonCoreResult.dungeonCoreAddress,
        dungeonCoreSet: dungeonCoreResult.isSet,
        dungeonStorageAddress: dungeonStorageResult.dungeonStorageAddress,
        dungeonStorageSet: dungeonStorageResult.isSet,
        isPaused: pausedResult.isPaused,
        provisionPriceUSD: priceResult.provisionPriceUSD.toString(),
        dungeonMasterAddress: soulShardResult.dungeonMasterAddress,
        allChecksPass: issues.length === 0,
        issues
      };
    } catch (error) {
      issues.push(`檢查過程中發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`);
      
      return {
        soulShardToken: '',
        soulShardTokenSet: false,
        dungeonCoreAddress: '',
        dungeonCoreSet: false,
        dungeonStorageAddress: '',
        dungeonStorageSet: false,
        isPaused: false,
        provisionPriceUSD: '0',
        dungeonMasterAddress: '',
        allChecksPass: false,
        issues
      };
    }
  }
}

export const contractChecker = new ContractChecker();