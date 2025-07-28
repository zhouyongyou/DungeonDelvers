// src/utils/contractChecker.ts - 直接檢查合約狀態的工具

import { createPublicClient, http, isAddress } from 'viem';
import { bsc } from 'wagmi/chains';
import { getContractWithABI } from '../config/contractsWithABI';
import dungeonMasterABI from '../abis/DungeonMaster.json';

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
    const dungeonMasterContract = getContractWithABI(bsc.id, 'dungeonMaster');
    
    if (!dungeonMasterContract) {
      throw new Error('DungeonMaster 合約配置不存在');
    }

    try {
      // 確保地址有效
      if (!isAddress(dungeonMasterContract.address)) {
        throw new Error('DungeonMaster 地址無效');
      }

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
    const dungeonMasterContract = getContractWithABI(bsc.id, 'dungeonMaster');
    
    if (!dungeonMasterContract) {
      throw new Error('DungeonMaster 合約配置不存在');
    }

    try {
      const isPaused = await this.publicClient.readContract({
        address: dungeonMasterContract.address as `0x${string}`,
        abi: dungeonMasterContract.abi,
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


  // 檢查 DungeonMaster 合約的 dungeonCore 地址
  async checkDungeonCoreAddress(): Promise<{
    dungeonCoreAddress: string;
    isSet: boolean;
    dungeonMasterAddress: string;
  }> {
    const dungeonMasterContract = getContractWithABI(bsc.id, 'dungeonMaster');
    
    if (!dungeonMasterContract) {
      throw new Error('DungeonMaster 合約配置不存在');
    }

    try {
      const dungeonCoreAddress = await this.publicClient.readContract({
        address: dungeonMasterContract.address as `0x${string}`,
        abi: dungeonMasterContract.abi,
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


  // 檢查 DungeonMaster 合約的 dungeonStorage 地址
  async checkDungeonStorageAddress(): Promise<{
    dungeonStorageAddress: string;
    isSet: boolean;
    dungeonMasterAddress: string;
  }> {
    const dungeonMasterContract = getContractWithABI(bsc.id, 'dungeonMaster');
    
    if (!dungeonMasterContract) {
      throw new Error('DungeonMaster 合約配置不存在');
    }

    try {
      const dungeonStorageAddress = await this.publicClient.readContract({
        address: dungeonMasterContract.address as `0x${string}`,
        abi: dungeonMasterContract.abi,
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

      return {
        soulShardToken: soulShardResult.soulShardToken,
        soulShardTokenSet: soulShardResult.isSet,
        dungeonCoreAddress: dungeonCoreResult.dungeonCoreAddress,
        dungeonCoreSet: dungeonCoreResult.isSet,
        dungeonStorageAddress: dungeonStorageResult.dungeonStorageAddress,
        dungeonStorageSet: dungeonStorageResult.isSet,
        isPaused: pausedResult.isPaused,
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
        dungeonMasterAddress: '',
        allChecksPass: false,
        issues
      };
    }
  }
}

export const contractChecker = new ContractChecker();