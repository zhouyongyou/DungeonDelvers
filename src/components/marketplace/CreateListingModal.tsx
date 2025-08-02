// src/components/marketplace/CreateListingModal.tsx
// 創建掛單的模態框組件

import React, { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits } from 'viem';
// import { ActionButton } from '../ui/ActionButton';
import { Icons } from '../ui/icons';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Modal } from '../ui/Modal';
import type { HeroNft, RelicNft, PartyNft, NftType } from '../../types/nft';
import { formatSoul } from '../../utils/formatters';
import { useAppToast } from '../../contexts/SimpleToastContext';
import { useMarketplaceV2 } from '../../hooks/useMarketplaceV2Contract';
import { useHeroPower, usePartyPower, useHeroDetails, useRelicDetails, usePartyDetails, getElementName, getClassName, getRelicCategoryName } from '../../hooks/useNftPower';
import { StablecoinSelector } from './StablecoinSelector';
import type { StablecoinSymbol } from '../../hooks/useMarketplaceV2Contract';
import { emitListingCreated } from '../../utils/marketplaceEvents';
import { CONTRACT_ADDRESSES } from '../../config/contracts';

interface CreateListingModalProps {
    isOpen: boolean;
    onClose: () => void;
    userNfts: {
        heros?: HeroNft[];  // Note: "heros" not "heroes" to match AllNftCollections
        relics?: RelicNft[];
        parties?: PartyNft[];
    };
    onListingCreated?: () => void;
}

export const CreateListingModal: React.FC<CreateListingModalProps> = ({
    isOpen,
    onClose,
    userNfts,
    onListingCreated
}) => {
    const { address } = useAccount();
    const { showToast } = useAppToast();
    const {
        createListing,
        checkNFTApproval,
        approveNFT,
        isProcessing
    } = useMarketplaceV2();
    const [selectedNft, setSelectedNft] = useState<HeroNft | RelicNft | PartyNft | null>(null);
    const [selectedType, setSelectedType] = useState<NftType>('hero');
    const [priceInput, setPriceInput] = useState('');
    const [acceptedTokens, setAcceptedTokens] = useState<StablecoinSymbol[]>([]);
    const [needsNftApproval, setNeedsNftApproval] = useState(false);
    
    // 模擬市場地址（實際應該從配置獲取）
    // Note: Marketplace address should be fetched from config when available
    
    // 獲取當前類型的 NFT 列表
    const availableNfts = useMemo(() => {
        if (!userNfts) return [];
        
        let nfts: (HeroNft | RelicNft | PartyNft)[] = [];
        
        switch (selectedType) {
            case 'hero':
                nfts = userNfts.heros || [];  // Fixed: "heros" not "heroes"
                break;
            case 'relic':
                nfts = userNfts.relics || [];
                break;
            case 'party':
                nfts = userNfts.parties || [];
                break;
            default:
                return [];
        }
        
        // 過濾掉沒有 id 的 NFT（NFT 類型定義使用 id 而非 tokenId）
        return nfts.filter(nft => {
            if (!nft.id) {
                console.warn('Found NFT without id:', nft);
                return false;
            }
            return true;
        });
    }, [selectedType, userNfts]);
    
    const handleCreateListing = async () => {
        if (!selectedNft || !priceInput || acceptedTokens.length === 0) {
            showToast('請選擇 NFT、設定價格並選擇接受的支付幣種', 'error');
            return;
        }
        
        try {
            // 使用第一個選中的代幣精度來解析價格（V2合約使用固定精度）
            const priceInWei = parseUnits(priceInput, 18);
            const success = await createListing(selectedNft, priceInput, acceptedTokens);
            if (!success) {
                throw new Error('創建掛單失敗');
            }
            
            showToast('成功創建掛單！', 'success');
            
            // 觸發通知事件
            emitListingCreated({
                nftType: selectedType,
                tokenId: selectedNft.id?.toString() || 'Unknown',
                price: priceInput,
                seller: address
            });
            
            onClose();
            onListingCreated?.();
            
            // 重置表單
            setSelectedNft(null);
            setPriceInput('');
            setAcceptedTokens([]);
            setNeedsNftApproval(false);
        } catch (error) {
            showToast(`創建掛單失敗: ${error}`, 'error');
        }
    };
    
    // 檢查選中 NFT 的授權狀態
    const handleNftSelect = async (nft: HeroNft | RelicNft | PartyNft) => {
        setSelectedNft(nft);
        
        try {
            // Get NFT contract address based on type from unified config
            const nftContractAddresses = {
                hero: CONTRACT_ADDRESSES.HERO,
                relic: CONTRACT_ADDRESSES.RELIC,
                party: CONTRACT_ADDRESSES.PARTY
            };
            const contractAddress = nftContractAddresses[nft.type as keyof typeof nftContractAddresses];
            const approved = await checkNFTApproval(contractAddress as `0x${string}`, address as `0x${string}`);
            setNeedsNftApproval(!approved);
        } catch (error) {
            console.error('Error checking NFT approval:', error);
            setNeedsNftApproval(true); // 安全起見，假設需要授權
        }
    };
    
    // NFT 詳細資訊組件
    const NftDetailsCard = ({ nft }: { nft: HeroNft | RelicNft | PartyNft }) => {
        // 確保 id 不是 undefined（NFT 類型定義使用 id）
        const safeTokenId = nft.id ? BigInt(nft.id) : 0n;
        const heroPower = useHeroPower(nft.type === 'hero' ? safeTokenId : 0n);
        const partyPower = usePartyPower(nft.type === 'party' ? safeTokenId : 0n);
        const heroDetails = useHeroDetails(nft.type === 'hero' ? safeTokenId : 0n);
        const relicDetails = useRelicDetails(nft.type === 'relic' ? safeTokenId : 0n);
        const partyDetails = usePartyDetails(nft.type === 'party' ? safeTokenId : 0n);

        const powerValue = nft.type === 'hero' ? heroPower.power : 
                          nft.type === 'party' ? partyPower.power : null;

        return (
            <div className="p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center text-lg relative">
                        {nft.type === 'hero' ? '⚔️' :
                         nft.type === 'relic' ? '🛡️' : '👥'}
                        {powerValue && (
                            <div className="absolute -top-1 -right-1 bg-[#C0A573] text-white text-xs px-1 py-0.5 rounded-full font-bold min-w-[16px] text-center">
                                {powerValue > 999 ? `${Math.floor(powerValue/1000)}k` : powerValue}
                            </div>
                        )}
                    </div>
                    <div>
                        <h4 className="font-bold text-white">
                            {nft.type === 'hero' ? '英雄' :
                             nft.type === 'relic' ? '聖物' : '隊伍'} #{nft.id.toString()}
                        </h4>
                        {powerValue && (
                            <p className="text-sm text-[#C0A573] font-bold">
                                戰力: {powerValue.toLocaleString()}
                            </p>
                        )}
                    </div>
                </div>

                {/* 英雄詳細資訊 */}
                {nft.type === 'hero' && heroDetails.details && (
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
                )}

                {/* 聖物詳細資訊 */}
                {nft.type === 'relic' && relicDetails.details && (
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
                )}

                {/* 隊伍詳細資訊 */}
                {nft.type === 'party' && partyDetails.details && (
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
                )}
            </div>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="🏪 創建掛單"
            onConfirm={handleCreateListing}
            confirmText={isProcessing ? '處理中...' : 
                        needsNftApproval ? '授權並創建' : '確認創建'}
            maxWidth="2xl"
            disabled={!selectedNft || !priceInput || acceptedTokens.length === 0 || isProcessing}
            isLoading={isProcessing}
        >
            <div className="space-y-6">
                
                {/* NFT 類型選擇 */}
                <div className="mb-4">
                    <label className="block text-gray-400 mb-2">選擇類型</label>
                    <div className="flex gap-2">
                        {(['hero', 'relic', 'party'] as NftType[]).map(type => (
                            <button
                                key={type}
                                onClick={() => {
                                    setSelectedType(type);
                                    setSelectedNft(null);
                                }}
                                className={`px-4 py-2 rounded font-medium transition-colors ${
                                    selectedType === type
                                        ? 'bg-[#C0A573] text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                {type === 'hero' ? '英雄' :
                                 type === 'relic' ? '聖物' : '隊伍'}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* NFT 選擇 */}
                <div className="mb-4">
                    <label className="block text-gray-400 mb-2">選擇 NFT</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                        {availableNfts.map((nft) => {
                            const NftCard = () => {
                                // 確保 id 不是 undefined（NFT 類型定義使用 id）
                                const safeTokenId = nft.id ? BigInt(nft.id) : 0n;
                                const heroPower = useHeroPower(nft.type === 'hero' ? safeTokenId : 0n);
                                const partyPower = usePartyPower(nft.type === 'party' ? safeTokenId : 0n);
                                const powerValue = nft.type === 'hero' ? heroPower.power : 
                                                  nft.type === 'party' ? partyPower.power : null;
                                const isLoadingPower = heroPower.isLoading || partyPower.isLoading;

                                // 獲取詳細信息
                                const heroDetails = useHeroDetails(nft.type === 'hero' ? safeTokenId : 0n);
                                const relicDetails = useRelicDetails(nft.type === 'relic' ? safeTokenId : 0n);
                                const partyDetails = usePartyDetails(nft.type === 'party' ? safeTokenId : 0n);
                                
                                const getRarityStars = (rarity: number) => {
                                    return '★'.repeat(rarity) + '☆'.repeat(5 - rarity);
                                };

                                return (
                                    <div
                                        key={`${nft.type}-${nft.id || 'unknown'}`}
                                        onClick={() => handleNftSelect(nft)}
                                        className={`relative p-3 rounded-lg border-2 transition-all cursor-pointer ${
                                            selectedNft?.id === nft.id
                                                ? 'border-[#C0A573] bg-gray-700/50 ring-1 ring-[#C0A573]/50'
                                                : 'border-gray-600 hover:border-gray-500 bg-gray-800/30'
                                        }`}
                                    >
                                        {/* NFT 圖片或圖標 */}
                                        <div className="aspect-square bg-gray-900/50 rounded mb-2 flex items-center justify-center overflow-hidden">
                                            {nft.image ? (
                                                <img 
                                                    src={nft.image} 
                                                    alt={nft.name || `${nft.type} #${nft.id}`}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        const fallback = e.currentTarget.nextElementSibling;
                                                        if (fallback) fallback.classList.remove('hidden');
                                                    }}
                                                />
                                            ) : null}
                                            <div className={`text-4xl ${nft.image ? 'hidden' : ''}`}>
                                                {nft.type === 'hero' ? '⚔️' :
                                                 nft.type === 'relic' ? '🛡️' : '👥'}
                                            </div>
                                        </div>

                                        {/* NFT 信息 */}
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-white truncate">
                                                {nft.name || `${nft.type === 'hero' ? '英雄' : nft.type === 'relic' ? '聖物' : '隊伍'} #${nft.id}`}
                                            </p>
                                            
                                            {/* 稀有度 */}
                                            {'rarity' in nft && (
                                                <p className="text-xs text-yellow-400">
                                                    {getRarityStars(Number(nft.rarity))}
                                                </p>
                                            )}
                                            
                                            {/* 戰力/容量 */}
                                            {nft.type === 'hero' && heroDetails.element && (
                                                <p className="text-xs text-gray-400">
                                                    {getElementName(heroDetails.element)} {getClassName(heroDetails.classId)}
                                                </p>
                                            )}
                                            
                                            {nft.type === 'relic' && relicDetails.category && (
                                                <p className="text-xs text-gray-400">
                                                    {getRelicCategoryName(relicDetails.category)}
                                                </p>
                                            )}
                                            
                                            {powerValue && (
                                                <p className="text-xs font-bold text-[#C0A573]">
                                                    ⚔️ {powerValue.toLocaleString()}
                                                </p>
                                            )}
                                            
                                            {nft.type === 'relic' && 'capacity' in nft && (
                                                <p className="text-xs text-blue-400">
                                                    📦 容量 {nft.capacity}
                                                </p>
                                            )}
                                            
                                            {nft.type === 'party' && partyDetails.heroCount !== undefined && (
                                                <p className="text-xs text-gray-400">
                                                    👥 {partyDetails.heroCount} 英雄 🛡️ {partyDetails.relicCount} 聖物
                                                </p>
                                            )}
                                        </div>

                                        {/* 選中標記 */}
                                        {selectedNft?.id === nft.id && (
                                            <div className="absolute top-2 right-2 bg-[#C0A573] text-white rounded-full p-1">
                                                <Icons.Check className="w-3 h-3" />
                                            </div>
                                        )}
                                    </div>
                                );
                            };
                            
                            return <NftCard key={`${nft.type}-${nft.id || 'unknown'}`} />;
                        })}
                    </div>
                    {availableNfts.length === 0 && (
                        <p className="text-gray-500 text-center py-4">
                            沒有可出售的 {selectedType === 'hero' ? '英雄' :
                                         selectedType === 'relic' ? '聖物' : '隊伍'}
                        </p>
                    )}
                </div>
                
                {/* 價格設定 */}
                <div className="mb-4">
                    <label className="block text-gray-400 mb-2">設定價格 (USD)</label>
                    <input
                        type="number"
                        value={priceInput}
                        onChange={(e) => setPriceInput(e.target.value)}
                        placeholder="輸入價格"
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C0A573]"
                        step="0.01"
                        min="0"
                    />
                    {priceInput && (
                        <p className="text-sm text-gray-400 mt-1">
                            ${parseFloat(priceInput).toFixed(2)} USD
                        </p>
                    )}
                </div>
                
                {/* 穩定幣選擇 - 改為單選 */}
                <div className="mb-4">
                    <label className="block text-gray-400 mb-2">選擇接受的支付幣種</label>
                    <StablecoinSelector
                        selectedTokens={acceptedTokens}
                        onToggle={(token) => {
                            // 單選模式：選擇新的幣種時，清除之前的選擇
                            setAcceptedTokens([token]);
                        }}
                        mode="single"
                        address={address}
                    />
                </div>
                
                {/* 授權狀態提示 */}
                {selectedNft && needsNftApproval && (
                    <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-400 text-sm">
                            <Icons.AlertTriangle className="h-4 w-4" />
                            此 NFT 需要授權才能掛單。創建掛單時會自動處理授權。
                        </div>
                    </div>
                )}
                
                {/* 預覽 */}
                {selectedNft && (
                    <div className="mb-4">
                        <h3 className="text-white font-medium mb-2">掛單預覽</h3>
                        <NftDetailsCard nft={selectedNft} />
                        
                        {priceInput && acceptedTokens.length > 0 && (
                            <div className="mt-3 p-3 bg-gray-600 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-400">掛單價格：</span>
                                    <span className="text-[#C0A573] font-bold text-lg">${priceInput} USD</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-400">接受幣種：</span>
                                    <span className="text-white text-sm">
                                        {acceptedTokens.join(', ')}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">授權狀態：</span>
                                    <span className={needsNftApproval ? 'text-yellow-400' : 'text-green-400'}>
                                        {needsNftApproval ? '需要授權' : '已授權'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
            </div>
        </Modal>
    );
};