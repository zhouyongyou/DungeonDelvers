// src/utils/vipTesting.ts - VIP功能測試工具

import { createPublicClient, http, type Address } from 'viem';
import { bsc } from 'wagmi/chains';
import { getContractWithABI } from '../config/contractsWithABI';
import { logger } from './logger';

/**
 * 直接測試VIP合約功能的工具函數
 */
export class VipTester {
    private client = createPublicClient({
        chain: bsc,
        transport: http('https://bsc-dataseed1.binance.org/')
    });

    /**
     * 測試VIP合約的所有功能
     */
    async testVipContract(address: string) {

        const vipContract = getContractWithABI('VIPSTAKING');
        if (!vipContract) {
            throw new Error('VIP合約未找到');
        }

        try {
            // 1. 測試基本合約訪問

            // 2. 測試 userStakes 函數

            const userStakes = await this.client.readContract({
                ...vipContract,
                functionName: 'userStakes',
                args: [address as Address]
            });

            // 3. 測試 getVipLevel 函數

            const vipLevel = await this.client.readContract({
                ...vipContract,
                functionName: 'getVipLevel',
                args: [address as Address]
            });

            // 4. 測試 getVipTaxReduction 函數

            const taxReduction = await this.client.readContract({
                ...vipContract,
                functionName: 'getVipTaxReduction',
                args: [address as Address]
            });

            // 5. 測試 unstakeQueue 函數

            const unstakeQueue = await this.client.readContract({
                ...vipContract,
                functionName: 'unstakeQueue',
                args: [address as Address]
            });

            const result = {
                contractAddress: vipContract.address,
                userStakes,
                vipLevel,
                taxReduction,
                unstakeQueue,
                stakedAmount: (userStakes as readonly [bigint, bigint])?.[0] ?? 0n,
                tokenId: (userStakes as readonly [bigint, bigint])?.[1] ?? 0n,
            };

            console.table({
                '合約地址': result.contractAddress,
                '質押金額': result.stakedAmount.toString(),
                'Token ID': result.tokenId.toString(),
                'VIP等級': result.vipLevel?.toString() || '0',
                '稅率減免': result.taxReduction?.toString() || '0',
            });
            
            return result;
            
        } catch (error) {
            logger.error('❌ VIP合約調用失敗:', error);
            throw error;
        }
    }
    
    /**
     * 測試SoulShard合約
     */
    async testSoulShardContract(address: string) {

        const soulShardContract = getContractWithABI('SOULSHARD');
        if (!soulShardContract) {
            throw new Error('SoulShard合約未找到');
        }

        try {
            const balance = await this.client.readContract({
                ...soulShardContract,
                functionName: 'balanceOf',
                args: [address as Address]
            });

            return balance;
            
        } catch (error) {
            logger.error('❌ SoulShard合約調用失敗:', error);
            throw error;
        }
    }
    
    /**
     * 完整的VIP狀態診斷
     */
    async diagnoseVipStatus(address: string) {

        try {
            // 測試VIP合約
            const vipResult = await this.testVipContract(address);
            
            // 測試SoulShard合約  
            const soulShardBalance = await this.testSoulShardContract(address);
            
            // 分析結果

            if (vipResult.vipLevel === 0 || vipResult.vipLevel === undefined) {

                if (vipResult.stakedAmount === 0n) {
                    // No staked amount - user needs to stake to get VIP level
                    console.log('No staked amount detected - user should stake to gain VIP level');
                } else {
                    // Has staked amount but no VIP level - potential issue
                    console.warn('User has staked amount but no VIP level - potential contract issue');
                }
            } else {
                // User has VIP level - check if it matches staked amount
                console.log(`User has VIP level ${vipResult.vipLevel}`);
            }
            
            if (vipResult.taxReduction === 0 || vipResult.taxReduction === undefined) {
                // No tax reduction - expected for non-VIP users
                console.log('No tax reduction detected');
            } else {
                // Has tax reduction - VIP benefits are working
                console.log(`Tax reduction active: ${vipResult.taxReduction}%`);
            }
            
            return {
                vip: vipResult,
                soulShardBalance,
                diagnosis: {
                    hasStake: vipResult.stakedAmount > 0n,
                    hasVipLevel: vipResult.vipLevel > 0,
                    hasTaxReduction: vipResult.taxReduction > 0,
                }
            };
            
        } catch (error) {
            logger.error('❌ VIP診斷失敗:', error);
            throw error;
        }
    }
}

// 導出測試實例
export const vipTester = new VipTester();

// 便捷的測試函數
export const testVipForAddress = (address: string) => {
    return vipTester.diagnoseVipStatus(address);
};