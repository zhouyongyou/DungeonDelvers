// src/utils/vipTesting.ts - VIP功能測試工具

import { createPublicClient, http, type Address } from 'viem';
import { bsc } from 'wagmi/chains';
import { getContract } from '../config/contracts';

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
        console.log('🧪 開始VIP合約測試...');
        console.log('測試地址:', address);
        
        const vipContract = getContract(bsc.id, 'vipStaking');
        if (!vipContract) {
            throw new Error('VIP合約未找到');
        }
        
        console.log('VIP合約地址:', vipContract.address);
        
        try {
            // 1. 測試基本合約訪問
            console.log('\n1. 測試合約可訪問性...');
            
            // 2. 測試 userStakes 函數
            console.log('\n2. 測試 userStakes 函數...');
            const userStakes = await this.client.readContract({
                ...vipContract,
                functionName: 'userStakes',
                args: [address as Address]
            });
            console.log('userStakes 結果:', userStakes);
            
            // 3. 測試 getVipLevel 函數
            console.log('\n3. 測試 getVipLevel 函數...');
            const vipLevel = await this.client.readContract({
                ...vipContract,
                functionName: 'getVipLevel',
                args: [address as Address]
            });
            console.log('getVipLevel 結果:', vipLevel);
            
            // 4. 測試 getVipTaxReduction 函數
            console.log('\n4. 測試 getVipTaxReduction 函數...');
            const taxReduction = await this.client.readContract({
                ...vipContract,
                functionName: 'getVipTaxReduction',
                args: [address as Address]
            });
            console.log('getVipTaxReduction 結果:', taxReduction);
            
            // 5. 測試 unstakeQueue 函數
            console.log('\n5. 測試 unstakeQueue 函數...');
            const unstakeQueue = await this.client.readContract({
                ...vipContract,
                functionName: 'unstakeQueue',
                args: [address as Address]
            });
            console.log('unstakeQueue 結果:', unstakeQueue);
            
            const result = {
                contractAddress: vipContract.address,
                userStakes,
                vipLevel,
                taxReduction,
                unstakeQueue,
                stakedAmount: (userStakes as readonly [bigint, bigint])?.[0] ?? 0n,
                tokenId: (userStakes as readonly [bigint, bigint])?.[1] ?? 0n,
            };
            
            console.log('\n✅ VIP測試完成，結果:');
            console.table({
                '合約地址': result.contractAddress,
                '質押金額': result.stakedAmount.toString(),
                'Token ID': result.tokenId.toString(),
                'VIP等級': result.vipLevel?.toString() || '0',
                '稅率減免': result.taxReduction?.toString() || '0',
            });
            
            return result;
            
        } catch (error) {
            console.error('❌ VIP合約調用失敗:', error);
            throw error;
        }
    }
    
    /**
     * 測試SoulShard合約
     */
    async testSoulShardContract(address: string) {
        console.log('\n🪙 測試 SoulShard 合約...');
        
        const soulShardContract = getContract(bsc.id, 'soulShard');
        if (!soulShardContract) {
            throw new Error('SoulShard合約未找到');
        }
        
        console.log('SoulShard合約地址:', soulShardContract.address);
        
        try {
            const balance = await this.client.readContract({
                ...soulShardContract,
                functionName: 'balanceOf',
                args: [address as Address]
            });
            
            console.log('SoulShard 餘額:', balance);
            return balance;
            
        } catch (error) {
            console.error('❌ SoulShard合約調用失敗:', error);
            throw error;
        }
    }
    
    /**
     * 完整的VIP狀態診斷
     */
    async diagnoseVipStatus(address: string) {
        console.log('🩺 開始VIP狀態診斷...');
        console.log('='.repeat(50));
        
        try {
            // 測試VIP合約
            const vipResult = await this.testVipContract(address);
            
            // 測試SoulShard合約  
            const soulShardBalance = await this.testSoulShardContract(address);
            
            // 分析結果
            console.log('\n📊 診斷分析:');
            
            if (vipResult.vipLevel === 0 || vipResult.vipLevel === undefined) {
                console.log('❌ 問題: VIP等級為0或未定義');
                if (vipResult.stakedAmount === 0n) {
                    console.log('💡 原因: 用戶未質押任何SoulShard代幣');
                } else {
                    console.log('⚠️  原因: 有質押但VIP等級計算有問題');
                }
            } else {
                console.log('✅ VIP等級正常:', vipResult.vipLevel);
            }
            
            if (vipResult.taxReduction === 0 || vipResult.taxReduction === undefined) {
                console.log('❌ 問題: 稅率減免為0或未定義');
            } else {
                console.log('✅ 稅率減免正常:', `${Number(vipResult.taxReduction) / 100}%`);
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
            console.error('❌ VIP診斷失敗:', error);
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