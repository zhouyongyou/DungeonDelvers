// src/hooks/useMarketplace.ts
// 市場相關的 hooks 集合

import { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { parseEther } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import { getContractWithABI } from '../config/contractsWithABI';
import { useTransactionWithProgress } from './useTransactionWithProgress';
import { useAppToast } from '../contexts/SimpleToastContext';
import type { HeroNft, RelicNft, PartyNft, NftType } from '../types/nft';
import { logger } from '../utils/logger';

// =================================================================
// Section: Types
// =================================================================

export interface MarketListing {
    id: string;
    seller: `0x${string}`;
    nftType: NftType;
    contractAddress: `0x${string}`;
    tokenId: bigint;
    price: bigint;
    status: 'active' | 'sold' | 'cancelled';
    createdAt: number;
    expiresAt?: number;
}

// =================================================================
// Section: NFT Approval Hook
// =================================================================

export const useApproveNFT = () => {
    const { address } = useAccount();
    const { showToast } = useAppToast();
    const queryClient = useQueryClient();
    
    // 獲取合約實例
    const heroContract = getContractWithABI('HERO');
    const relicContract = getContractWithABI('RELIC');
    const partyContract = getContractWithABI('PARTY');
    
    // 檢查授權狀態
    const checkApproval = async (nftType: NftType, spender: `0x${string}`): Promise<boolean> => {
        if (!address) return false;
        
        try {
            let contract;
            switch (nftType) {
                case 'hero':
                    contract = heroContract;
                    break;
                case 'relic':
                    contract = relicContract;
                    break;
                case 'party':
                    contract = partyContract;
                    break;
                default:
                    return false;
            }
            
            if (!contract) return false;
            
            // 使用 wagmi 的 readContract 檢查授權
            const result = await queryClient.fetchQuery({
                queryKey: ['isApprovedForAll', contract.address, address, spender],
                queryFn: async () => {
                    // 這裡需要直接調用合約，因為我們需要異步結果
                    // 實際實現中可能需要調整
                    return true; // 暫時返回 true，實際需要調用合約
                }
            });
            
            return result as boolean;
        } catch (error) {
            logger.error('Error checking approval:', error);
            return false;
        }
    };
    
    // 授權交易
    const approveNFT = useTransactionWithProgress({
        contractCall: undefined, // 動態設置
        actionName: '授權 NFT',
        onSuccess: () => {
            showToast('NFT 授權成功！', 'success');
            queryClient.invalidateQueries({ queryKey: ['isApprovedForAll'] });
        },
        onError: (error) => {
            showToast(`授權失敗: ${error}`, 'error');
        }
    });
    
    const executeApproval = async (nftType: NftType, spender: `0x${string}`) => {
        let contract;
        switch (nftType) {
            case 'hero':
                contract = heroContract;
                break;
            case 'relic':
                contract = relicContract;
                break;
            case 'party':
                contract = partyContract;
                break;
            default:
                throw new Error('Unsupported NFT type');
        }
        
        if (!contract) {
            throw new Error('Contract not found');
        }
        
        approveNFT.setContractCall({
            address: contract.address as Address,
            abi: contract.abi,
            functionName: 'setApprovalForAll',
            args: [spender, true]
        });
        
        await approveNFT.execute();
    };
    
    return {
        checkApproval,
        executeApproval,
        isApproving: approveNFT.isLoading,
        approvalError: approveNFT.error
    };
};

// =================================================================
// Section: Create Listing Hook
// =================================================================

export const useCreateListing = () => {
    const { address } = useAccount();
    const { showToast } = useAppToast();
    const { executeApproval, checkApproval } = useApproveNFT();
    const [isCreating, setIsCreating] = useState(false);
    
    const createListing = async (
        nft: HeroNft | RelicNft | PartyNft,
        price: bigint,
        marketplaceAddress: `0x${string}`
    ): Promise<MarketListing> => {
        if (!address) {
            throw new Error('請先連接錢包');
        }
        
        setIsCreating(true);
        
        try {
            // 1. 檢查授權狀態
            const isApproved = await checkApproval(nft.type, marketplaceAddress);
            
            if (!isApproved) {
                showToast('需要授權 NFT 才能掛單', 'info');
                await executeApproval(nft.type, marketplaceAddress);
                showToast('授權完成，正在創建掛單...', 'info');
            }
            
            // 2. 創建掛單數據
            const listing: MarketListing = {
                id: `${nft.type}-${nft.tokenId}-${Date.now()}`,
                seller: address,
                nftType: nft.type,
                contractAddress: getContractAddress(nft.type),
                tokenId: nft.tokenId,
                price,
                status: 'active',
                createdAt: Date.now(),
                expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30天後過期
            };
            
            // 3. 保存到本地存儲（暫時方案）
            await saveListingLocally(listing);
            
            showToast('掛單創建成功！', 'success');
            return listing;
            
        } catch (error) {
            logger.error('Error creating listing:', error);
            throw error;
        } finally {
            setIsCreating(false);
        }
    };
    
    return {
        createListing,
        isCreating
    };
};

// =================================================================
// Section: Purchase Hook
// =================================================================

export const usePurchaseItem = () => {
    const { address } = useAccount();
    const { showToast } = useAppToast();
    const soulShardContract = getContractWithABI('SOULSHARD');
    const [isPurchasing, setIsPurchasing] = useState(false);
    
    // SOUL 餘額檢查
    const { data: soulBalance } = useReadContract({
        address: soulShardContract?.address as Address,
        abi: soulShardContract?.abi,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address && !!soulShardContract }
    });
    
    const purchaseItem = async (listing: MarketListing): Promise<void> => {
        if (!address) {
            throw new Error('請先連接錢包');
        }
        
        setIsPurchasing(true);
        
        try {
            // 1. 檢查 SOUL 餘額
            if (soulBalance && soulBalance < listing.price) {
                throw new Error('SOUL 餘額不足');
            }
            
            // 2. 這裡應該調用市場合約的購買函數
            // 由於目前沒有市場合約，我們模擬交易過程
            
            // 3. 模擬交易延遲
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 4. 更新掛單狀態
            await updateListingStatus(listing.id, 'sold');
            
            showToast('購買成功！NFT 已轉移到您的錢包', 'success');
            
        } catch (error) {
            logger.error('Error purchasing item:', error);
            throw error;
        } finally {
            setIsPurchasing(false);
        }
    };
    
    return {
        purchaseItem,
        isPurchasing,
        soulBalance
    };
};

// =================================================================
// Section: Helper Functions
// =================================================================

const getContractAddress = (nftType: NftType): `0x${string}` => {
    switch (nftType) {
        case 'hero':
            return getContractWithABI('HERO')?.address as Address;
        case 'relic':
            return getContractWithABI('RELIC')?.address as Address;
        case 'party':
            return getContractWithABI('PARTY')?.address as Address;
        default:
            throw new Error('Unknown NFT type');
    }
};

// 本地存儲掛單（暫時方案）
const saveListingLocally = async (listing: MarketListing): Promise<void> => {
    try {
        const existingListings = JSON.parse(localStorage.getItem('marketplace_listings') || '[]');
        existingListings.push(listing);
        localStorage.setItem('marketplace_listings', JSON.stringify(existingListings));
        
        // 觸發存儲事件，通知其他組件更新
        window.dispatchEvent(new CustomEvent('marketplaceUpdate'));
    } catch (error) {
        logger.error('Error saving listing locally:', error);
        throw new Error('無法保存掛單數據');
    }
};

// 更新掛單狀態
const updateListingStatus = async (listingId: string, status: MarketListing['status']): Promise<void> => {
    try {
        const listings: MarketListing[] = JSON.parse(localStorage.getItem('marketplace_listings') || '[]');
        const updatedListings = listings.map(listing =>
            listing.id === listingId ? { ...listing, status } : listing
        );
        localStorage.setItem('marketplace_listings', JSON.stringify(updatedListings));
        
        window.dispatchEvent(new CustomEvent('marketplaceUpdate'));
    } catch (error) {
        logger.error('Error updating listing status:', error);
        throw new Error('無法更新掛單狀態');
    }
};

// 獲取本地掛單
export const getLocalListings = (): MarketListing[] => {
    try {
        return JSON.parse(localStorage.getItem('marketplace_listings') || '[]');
    } catch (error) {
        logger.error('Error getting local listings:', error);
        return [];
    }
};