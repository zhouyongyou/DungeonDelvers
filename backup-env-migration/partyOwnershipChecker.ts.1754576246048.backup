// src/utils/partyOwnershipChecker.ts - 檢查用戶隊伍擁有權的工具

import { createPublicClient, http } from 'viem';
import { bsc } from 'wagmi/chains';
import { getContractWithABI } from '../config/contractsWithABI';
import { logger } from './logger';

export class PartyOwnershipChecker {
  private publicClient;

  constructor() {
    this.publicClient = createPublicClient({
      chain: bsc,
      transport: http('https://bsc-dataseed1.binance.org/')
    });
  }

  // 檢查用戶是否擁有指定隊伍
  async checkPartyOwnership(userAddress: string, partyId: bigint): Promise<{
    isOwner: boolean;
    actualOwner?: string;
    error?: string;
  }> {
    try {
      const partyContract = getContractWithABI('PARTY');
      
      if (!partyContract) {
        throw new Error('Party 合約配置不存在');
      }

      const actualOwner = await this.publicClient.readContract({
        address: partyContract.address as `0x${string}`,
        abi: partyContract.abi,
        functionName: 'ownerOf',
        args: [partyId],
      });

      return {
        isOwner: actualOwner === userAddress,
        actualOwner: actualOwner as string,
      };
    } catch (error: any) {
      return {
        isOwner: false,
        error: error.message || '查詢失敗'
      };
    }
  }

  // 檢查用戶擁有的所有隊伍
  async getUserParties(userAddress: string): Promise<{
    partyIds: bigint[];
    error?: string;
  }> {
    try {
      const partyContract = getContractWithABI('PARTY');
      
      if (!partyContract) {
        throw new Error('Party 合約配置不存在');
      }

      // 獲取用戶的隊伍餘額
      const balance = await this.publicClient.readContract({
        address: partyContract.address as `0x${string}`,
        abi: partyContract.abi,
        functionName: 'balanceOf',
        args: [userAddress],
      });

      // 如果沒有隊伍，直接返回
      if (balance === 0n) {
        return { partyIds: [] };
      }

      // 由於合約可能沒有 tokenOfOwnerByIndex，我們使用簡單的方法
      // 返回用戶擁有的隊伍數量，但不獲取具體的 tokenId
      logger.info(`用戶 ${userAddress} 擁有 ${balance} 個隊伍`);
      
      // 如果需要具體的隊伍 ID，可以通過 The Graph 查詢
      // 這裡先返回數量信息
      return { 
        partyIds: [], 
        error: `用戶擁有 ${balance} 個隊伍（請通過 The Graph 查詢具體 ID）` 
      };
    } catch (error: any) {
      return {
        partyIds: [],
        error: error.message || '查詢失敗'
      };
    }
  }

  // 檢查 DungeonCore 的 partyContract 設置
  async checkDungeonCorePartyContract(): Promise<{
    partyContractAddress: string;
    isSet: boolean;
    error?: string;
  }> {
    try {
      const dungeonCoreContract = getContractWithABI('DUNGEONCORE');
      
      if (!dungeonCoreContract) {
        throw new Error('DungeonCore 合約配置不存在');
      }

      const partyContractAddress = await this.publicClient.readContract({
        address: dungeonCoreContract.address as `0x${string}`,
        abi: dungeonCoreContract.abi,
        functionName: 'partyContractAddress',
      });

      return {
        partyContractAddress: partyContractAddress as string,
        isSet: partyContractAddress !== '0x0000000000000000000000000000000000000000',
      };
    } catch (error: any) {
      return {
        partyContractAddress: '',
        isSet: false,
        error: error.message || '查詢失敗'
      };
    }
  }

  // 完整的診斷報告
  async generateDiagnosticReport(userAddress: string, partyId: bigint): Promise<{
    summary: string;
    details: {
      partyOwnership: any;
      userParties: any;
      dungeonCorePartyContract: any;
    };
    recommendations: string[];
  }> {
    const partyOwnership = await this.checkPartyOwnership(userAddress, partyId);
    const userParties = await this.getUserParties(userAddress);
    const dungeonCorePartyContract = await this.checkDungeonCorePartyContract();

    const recommendations: string[] = [];

    if (!partyOwnership.isOwner) {
      if (partyOwnership.error) {
        recommendations.push(`隊伍 ${partyId} 查詢失敗: ${partyOwnership.error}`);
      } else {
        recommendations.push(`用戶 ${userAddress} 不擁有隊伍 ${partyId}`);
        recommendations.push(`實際擁有者: ${partyOwnership.actualOwner}`);
      }
    }

    if (userParties.partyIds.length === 0) {
      recommendations.push('用戶沒有任何隊伍，請先創建隊伍');
    } else {
      recommendations.push(`用戶擁有的隊伍: ${userParties.partyIds.map(id => `#${id}`).join(', ')}`);
    }

    if (!dungeonCorePartyContract.isSet) {
      recommendations.push('DungeonCore 的 partyContract 未設置');
    }

    const summary = partyOwnership.isOwner 
      ? `✅ 用戶擁有隊伍 ${partyId}，可以購買儲備`
      : `❌ 用戶不擁有隊伍 ${partyId}，無法購買儲備`;

    return {
      summary,
      details: {
        partyOwnership,
        userParties,
        dungeonCorePartyContract
      },
      recommendations
    };
  }
}

export const partyOwnershipChecker = new PartyOwnershipChecker();