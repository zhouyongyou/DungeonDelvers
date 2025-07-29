// src/components/marketplace/PurchaseModalV2.tsx
// V2 購買確認模態框組件 - 支持多幣種付款

import React, { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { ActionButton } from '../ui/ActionButton';
import { Icons } from '../ui/icons';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useAppToast } from '../../contexts/SimpleToastContext';
import { 
    useMarketplaceV2,
    SUPPORTED_STABLECOINS,
    type StablecoinSymbol 
} from '../../hooks/useMarketplaceV2Contract';
import { useHeroPower, usePartyPower, useHeroDetails, useRelicDetails, usePartyDetails, getElementName, getClassName, getRelicCategoryName } from '../../hooks/useNftPower';
import { StablecoinSelector } from './StablecoinSelector';
import type { HeroNft, RelicNft, PartyNft, NftType } from '../../types/nft';

// Define MarketListingV2 type
export interface MarketListingV2 {
    id: string;
    seller: string;
    nftType: NftType;
    tokenId: string;
    price: string;
    acceptedTokens: string[]; // Array of token addresses
    status: 'active' | 'sold' | 'cancelled';
    createdAt: string;
    nft: HeroNft | RelicNft | PartyNft;
}

interface PurchaseModalV2Props {
    isOpen: boolean;
    onClose: () => void;
    listing: MarketListingV2 | null;
    onPurchaseComplete?: () => void;
}

export const PurchaseModalV2: React.FC<PurchaseModalV2Props> = ({
    isOpen,
    onClose,
    listing,
    onPurchaseComplete
}) => {
    const { address } = useAccount();
    const { showToast } = useAppToast();
    const {
        purchaseNFT,
        approveToken,
        checkTokenAllowance,
        isProcessing
    } = useMarketplaceV2();
    
    const [selectedPaymentToken, setSelectedPaymentToken] = useState<StablecoinSymbol>('USDT');
    const [confirmPurchase, setConfirmPurchase] = useState(false);
    const [needsApproval, setNeedsApproval] = useState(false);
    
    // 獲取 NFT 戰力和詳細資訊
    const heroPower = useHeroPower(listing?.nftType === 'hero' ? BigInt(listing.tokenId) : 0n);
    const partyPower = usePartyPower(listing?.nftType === 'party' ? BigInt(listing.tokenId) : 0n);
    const heroDetails = useHeroDetails(listing?.nftType === 'hero' ? BigInt(listing.tokenId) : 0n);
    const relicDetails = useRelicDetails(listing?.nftType === 'relic' ? BigInt(listing.tokenId) : 0n);
    const partyDetails = usePartyDetails(listing?.nftType === 'party' ? BigInt(listing.tokenId) : 0n);
    
    // 獲取可用的付款代幣（僅顯示賣家接受的代幣）
    const availablePaymentTokens = useMemo(() => {
        if (!listing) return [];
        // Convert token addresses to symbols
        return Object.entries(SUPPORTED_STABLECOINS)
            .filter(([_, tokenInfo]) => listing.acceptedTokens.includes(tokenInfo.address))
            .map(([symbol, _]) => symbol as StablecoinSymbol);
    }, [listing]);
    
    // 檢查選中付款代幣的授權狀態
    const checkApprovalStatus = async (token: StablecoinSymbol) => {
        if (!listing || !address) return;
        
        try {
            const tokenInfo = SUPPORTED_STABLECOINS[token];
            const allowance = await checkTokenAllowance(
                tokenInfo.address as `0x${string}`, 
                address as `0x${string}`,
                '0xCd2Dc43ddB5f628f98CDAA273bd74605cBDF21F8' // DUNGEONMARKETPLACE_V2 address
            );
            const requiredAmount = parseUnits(listing.price.toString(), 18);
            setNeedsApproval(allowance < requiredAmount);
        } catch (error) {
            console.error('Error checking approval:', error);
            setNeedsApproval(true);
        }
    };
    
    // 當選擇付款代幣時檢查授權
    const handleTokenSelect = (token: StablecoinSymbol) => {
        setSelectedPaymentToken(token);
        checkApprovalStatus(token);
    };
    
    // 初始化時設置默認付款代幣
    React.useEffect(() => {
        if (availablePaymentTokens.length > 0 && !availablePaymentTokens.includes(selectedPaymentToken)) {
            const defaultToken = availablePaymentTokens[0];
            setSelectedPaymentToken(defaultToken);
            checkApprovalStatus(defaultToken);
        }
    }, [availablePaymentTokens, selectedPaymentToken]);
    
    const handlePurchase = async () => {
        if (!listing) return;
        
        try {
            // 如果需要授權，先進行授權
            if (needsApproval) {
                const tokenInfo = SUPPORTED_STABLECOINS[selectedPaymentToken];
                const requiredAmount = parseUnits(listing.price.toString(), 18);
                
                showToast('正在授權代幣...', 'info');
                const approved = await approveToken(tokenInfo.address as `0x${string}`, requiredAmount);
                if (!approved) {
                    throw new Error('代幣授權失敗');
                }
                setNeedsApproval(false);
            }
            
            const success = await purchaseNFT(
                listing.id,
                listing.price,
                selectedPaymentToken
            );
            
            if (!success) {
                throw new Error('購買交易失敗');
            }
            showToast('購買成功！NFT 已轉移到您的錢包', 'success');
            onClose();
            onPurchaseComplete?.();
            setConfirmPurchase(false);
        } catch (error) {
            showToast(`購買失敗: ${error}`, 'error');
        }
    };
    
    if (!isOpen || !listing) return null;
    
    const nftTypeLabel = listing.nftType === 'hero' ? '英雄' :
                        listing.nftType === 'relic' ? '聖物' : '隊伍';
                        
    // 獲取戰力值
    const getPowerValue = () => {
        if (listing.nftType === 'hero' && heroPower.power) return heroPower.power;
        if (listing.nftType === 'party' && partyPower.power) return partyPower.power;
        return null;
    };
    
    const powerValue = getPowerValue();
    const selectedTokenInfo = SUPPORTED_STABLECOINS[selectedPaymentToken];
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">確認購買</h2>
                    <button
                        onClick={onClose}
                        disabled={isPurchasing || isApproving}
                        className="text-gray-400 hover:text-white"
                    >
                        <Icons.X className="h-6 w-6" />
                    </button>
                </div>
                
                {/* NFT 預覽 */}
                <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center text-2xl relative">
                            {listing.nftType === 'hero' ? '⚔️' :
                             listing.nftType === 'relic' ? '🛡️' : '👥'}
                            {/* 戰力角標 */}
                            {powerValue && (
                                <div className="absolute -top-1 -right-1 bg-[#C0A573] text-white text-xs px-1 py-0.5 rounded-full font-bold min-w-[20px] text-center">
                                    {powerValue > 999 ? `${Math.floor(powerValue/1000)}k` : powerValue}
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-white">
                                {nftTypeLabel} #{listing.tokenId.toString()}
                            </h3>
                            {powerValue && (
                                <p className="text-sm text-[#C0A573] font-bold">
                                    戰力: {powerValue.toLocaleString()}
                                </p>
                            )}
                            <p className="text-sm text-gray-400">
                                合約: {listing.contractAddress.slice(0, 8)}...{listing.contractAddress.slice(-6)}
                            </p>
                            <p className="text-sm text-gray-400">
                                賣家: {listing.seller.slice(0, 8)}...{listing.seller.slice(-6)}
                            </p>
                        </div>
                    </div>
                    
                    {/* NFT 詳細資訊 */}
                    {listing.nftType === 'hero' && heroDetails.details && (
                        <div className="mt-3 pt-3 border-t border-gray-600">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">等級:</span>
                                    <span className="text-white">Lv.{heroDetails.details.level}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">品階:</span>
                                    <span className="text-white">T{heroDetails.details.tier}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">職業:</span>
                                    <span className="text-white">{getClassName(heroDetails.details.heroClass)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">元素:</span>
                                    <span className="text-white">{getElementName(heroDetails.details.element)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {listing.nftType === 'relic' && relicDetails.details && (
                        <div className="mt-3 pt-3 border-t border-gray-600">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">類別:</span>
                                    <span className="text-white">{getRelicCategoryName(relicDetails.details.category)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">品階:</span>
                                    <span className="text-white">T{relicDetails.details.tier}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">容量:</span>
                                    <span className="text-white">{relicDetails.details.capacity}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {listing.nftType === 'party' && partyDetails.details && (
                        <div className="mt-3 pt-3 border-t border-gray-600">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">英雄數量:</span>
                                    <span className="text-white">{partyDetails.details.heroes.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">聖物數量:</span>
                                    <span className="text-white">{partyDetails.details.relics.length}</span>
                                </div>
                                <div className="flex justify-between col-span-2">
                                    <span className="text-gray-400">總戰力:</span>
                                    <span className="text-[#C0A573] font-bold">{partyDetails.details.totalPower.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* 價格信息 */}
                <div className="mb-4 p-3 bg-gray-700 rounded">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">購買價格</span>
                        <span className="text-[#C0A573] font-bold text-lg">
                            ${listing.price.toFixed(2)} USD
                        </span>
                    </div>
                </div>
                
                {/* 付款代幣選擇 */}
                <div className="mb-4">
                    <label className="block text-gray-400 mb-2">選擇付款代幣</label>
                    <StablecoinSelector
                        selectedTokens={[selectedPaymentToken]}
                        onToggle={handleTokenSelect}
                        mode="single"
                        address={address}
                    />
                </div>
                
                {/* 授權狀態提示 */}
                {needsApproval && (
                    <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-400 text-sm">
                            <Icons.AlertTriangle className="h-4 w-4" />
                            需要授權 {selectedTokenInfo.symbol} 代幣才能完成購買
                        </div>
                    </div>
                )}
                
                {/* 交易摘要 */}
                <div className="mb-4 p-3 bg-gray-700 rounded space-y-2">
                    <h3 className="text-white font-medium mb-2">交易摘要</h3>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">NFT 價格:</span>
                        <span className="text-white">${listing.price.toFixed(2)} USD</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">付款代幣:</span>
                        <span className="text-white flex items-center gap-1">
                            <span>{selectedTokenInfo.icon}</span>
                            {selectedTokenInfo.symbol}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">需要支付:</span>
                        <span className="text-[#C0A573] font-bold">
                            {listing.price.toFixed(2)} {selectedTokenInfo.symbol}
                        </span>
                    </div>
                </div>
                
                {/* 確認勾選 */}
                <div className="mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={confirmPurchase}
                            onChange={(e) => setConfirmPurchase(e.target.checked)}
                            className="w-4 h-4 text-[#C0A573] bg-gray-700 border-gray-600 rounded focus:ring-[#C0A573]"
                            disabled={isPurchasing || isApproving}
                        />
                        <span className="text-sm text-gray-300">
                            我確認要購買此 NFT，並了解交易完成後不可撤銷
                        </span>
                    </label>
                </div>
                
                {/* 操作按鈕 */}
                <div className="flex gap-2">
                    <ActionButton
                        onClick={handlePurchase}
                        disabled={!confirmPurchase || isPurchasing || isApproving}
                        isLoading={isPurchasing || isApproving}
                        className="flex-1 py-2"
                    >
                        {isApproving ? '授權中...' :
                         isPurchasing ? '購買中...' :
                         needsApproval ? `授權並購買 $${listing.price.toFixed(2)}` :
                         `確認購買 $${listing.price.toFixed(2)}`}
                    </ActionButton>
                    <ActionButton
                        onClick={onClose}
                        disabled={isPurchasing || isApproving}
                        className="px-6 py-2 bg-gray-700 hover:bg-gray-600"
                    >
                        取消
                    </ActionButton>
                </div>
                
                {/* 安全提示 */}
                <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                    <div className="flex items-start gap-2 text-blue-400 text-xs">
                        <Icons.Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium mb-1">安全提示：</p>
                            <ul className="space-y-1 text-blue-300">
                                <li>• 請確認 NFT 信息和付款代幣正確無誤</li>
                                <li>• 交易完成後 NFT 將立即轉移到您的錢包</li>
                                <li>• 手續費將自動扣除並轉入平台錢包</li>
                                <li>• 請確保網絡穩定，避免交易失敗</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};