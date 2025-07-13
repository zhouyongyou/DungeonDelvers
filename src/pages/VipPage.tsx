// src/pages/VipPage.tsx (移除 SVG 讀取功能版)

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatEther, maxUint256, parseEther } from 'viem';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { bsc } from 'wagmi/chains';
import { useVipStatus } from '../hooks/useVipStatus';
import { logger } from '../utils/logger';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { useContractTransaction, ContractOperations } from '../hooks/useContractTransaction';
import { APP_CONSTANTS, getVipTier } from '../config/constants';

const VipCardDisplay: React.FC<{ tokenId: bigint | null, chainId: number | undefined, vipLevel: number, contractAddress?: string }> = ({ tokenId, chainId, vipLevel, contractAddress }) => {
    const [nftImage, setNftImage] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);

    // ✅ 條件渲染移到Hook之後
    if (!chainId || (chainId !== bsc.id)) {
        return <div className="w-full aspect-square bg-gray-900/50 rounded-xl flex items-center justify-center text-gray-500">網路不支援</div>;
    }

    if (!tokenId || tokenId === 0n) {
        return <div className="w-full aspect-square bg-gray-900/50 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500">無 VIP 卡</div>;
    }
    
    // VIP 等級顏色和圖標
    const getVipTierWithColor = (level: number) => {
        const tier = getVipTier(level);
        const colorMap = {
            DIAMOND: "from-cyan-400 to-blue-600",
            PLATINUM: "from-gray-300 to-gray-500", 
            GOLD: "from-yellow-400 to-yellow-600",
            SILVER: "from-gray-400 to-gray-600",
            BRONZE: "from-orange-400 to-orange-600",
            STANDARD: "from-gray-600 to-gray-800"
        };
        return {
            ...tier,
            color: colorMap[tier.name as keyof typeof colorMap] || colorMap.STANDARD
        };
    };
    
    const tier = getVipTierWithColor(vipLevel);
    const bscScanUrl = `${APP_CONSTANTS.EXTERNAL_LINKS.BSC_SCAN}/token/${contractAddress}?a=${tokenId}`;

    // 嘗試載入實際的 NFT 圖片
    useEffect(() => {
        const loadNftImage = async () => {
            if (!contractAddress || !tokenId) return;
            
            try {
                // 嘗試多個 metadata 來源
                const metadataUrls = [
                    `https://www.dungeondelvers.xyz/api/vip/${tokenId}.json`,
                    `https://dungeon-delvers-metadata-server.onrender.com/api/vip/${tokenId}.json`,
                    `/api/vip/vip.json` // 備用靜態文件
                ];

                for (const url of metadataUrls) {
                    try {
                        const response = await fetch(url);
                        if (response.ok) {
                            const metadata = await response.json();
                            if (metadata.image) {
                                setNftImage(metadata.image);
                                return;
                            }
                        }
                    } catch (e) {
                        continue;
                    }
                }
            } catch (error) {
                logger.error('Failed to load VIP NFT image:', error);
                setImageError(true);
            }
        };

        loadNftImage();
    }, [contractAddress, tokenId]);
    
    return (
        <div className="w-full space-y-4">
            <div className="w-full aspect-square rounded-xl overflow-hidden shadow-lg border border-white/20 bg-gray-900">
                {!imageError && nftImage ? (
                    <img
                        src={nftImage}
                        alt={`VIP Card #${tokenId.toString()}`}
                        className="w-full h-full object-cover"
                        onError={() => {
                            setImageError(true);
                            setNftImage(null);
                        }}
                        loading="lazy"
                    />
                ) : (
                    // 降級到自定義設計
                    <div className={`w-full h-full bg-gradient-to-br ${tier.color} flex flex-col items-center justify-center p-6`}>
                        <div className="text-center text-white">
                            <div className="text-5xl mb-3">{tier.icon}</div>
                            <div className="text-xl font-bold mb-1">VIP #{tokenId.toString()}</div>
                            <div className="text-sm opacity-90 mb-2">{tier.name}</div>
                            <div className="text-lg font-semibold">LEVEL {vipLevel}</div>
                        </div>
                        {/* VIP 等級進度條 */}
                        <div className="w-full mt-4 bg-black/20 rounded-full h-2">
                            <div 
                                className="bg-white/80 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min((vipLevel / 20) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
            
            {/* BSC Scan 鏈接 */}
            {contractAddress && (
                <div className="flex justify-center">
                    <a 
                        href={bscScanUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg transition-colors"
                    >
                        <span>🔍</span>
                        在 BSC Scan 查看
                    </a>
                </div>
            )}
        </div>
    );
};

const VipPageContent: React.FC = () => {
    const { chainId } = useAccount();
    const publicClient = usePublicClient();

    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState<'stake' | 'unstake'>('stake');
    const [isAwaitingStakeAfterApproval, setIsAwaitingStakeAfterApproval] = useState(false);
    
    const {
        isLoading, vipStakingContract, soulShardContract,
        soulShardBalance, stakedAmount, stakedValueUSD,
        tokenId, vipLevel, taxReduction,
        pendingUnstakeAmount, isCooldownOver, countdown, allowance, refetchAll
    } = useVipStatus();

    const { executeTransaction, isPending: isTxPending } = useContractTransaction();
    
    const needsApproval = useMemo(() => {
        if (mode !== 'stake' || !amount) return false;
        try { return typeof allowance === 'bigint' && allowance < parseEther(amount); } catch { return false; }
    }, [allowance, amount, mode]);

    const handleApprove = useCallback(async () => {
        if (!soulShardContract || !vipStakingContract) return;
        
        const hash = await executeTransaction({
            contractCall: {
                address: soulShardContract.address as `0x${string}`,
                abi: soulShardContract.abi,
                functionName: 'approve',
                args: [vipStakingContract.address, maxUint256]
            },
            description: '批准 VIP 合約',
            successMessage: '授權成功！將自動為您質押...',
            errorMessage: '授權失敗',
            loadingMessage: '正在授權...',
            onSuccess: () => {
                setIsAwaitingStakeAfterApproval(true);
                refetchAll();
            }
        });
    }, [soulShardContract, vipStakingContract, executeTransaction, refetchAll]);

    const handleStake = useCallback(async () => {
        if (!vipStakingContract || !amount) return;
        
        const hash = await executeTransaction({
            contractCall: {
                address: vipStakingContract.address as `0x${string}`,
                abi: vipStakingContract.abi,
                functionName: 'stake',
                args: [parseEther(amount)]
            },
            description: `質押 ${amount} $SoulShard`,
            successMessage: '質押成功！',
            errorMessage: '質押失敗',
            loadingMessage: '正在質押...',
            onSuccess: () => {
                setAmount('');
                refetchAll();
            }
        });
    }, [vipStakingContract, executeTransaction, amount, refetchAll]);

    const handleRequestUnstake = useCallback(async () => {
        if (!vipStakingContract || !amount) return;
        
        const hash = await executeTransaction({
            contractCall: {
                address: vipStakingContract.address as `0x${string}`,
                abi: vipStakingContract.abi,
                functionName: 'requestUnstake',
                args: [parseEther(amount)]
            },
            description: `請求贖回 ${amount} $SoulShard`,
            successMessage: '贖回請求已提交！',
            errorMessage: '贖回請求失敗',
            loadingMessage: '正在請求贖回...',
            onSuccess: () => {
                setAmount('');
                refetchAll();
            }
        });
    }, [vipStakingContract, executeTransaction, amount, refetchAll]);

    const handleClaim = useCallback(async () => {
        if (!vipStakingContract) return;
        
        const hash = await executeTransaction({
            contractCall: {
                address: vipStakingContract.address as `0x${string}`,
                abi: vipStakingContract.abi,
                functionName: 'claimUnstaked'
            },
            description: '領取已贖回的代幣',
            successMessage: '領取成功！',
            errorMessage: '領取失敗',
            loadingMessage: '正在領取...',
            onSuccess: () => {
                refetchAll();
            }
        });
    }, [vipStakingContract, executeTransaction, refetchAll]);
    const handleMainAction = useCallback(() => { if (mode === 'stake') { if (needsApproval) handleApprove(); else handleStake(); } else { handleRequestUnstake(); } }, [mode, needsApproval, handleApprove, handleStake, handleRequestUnstake]);
    const handlePercentageClick = useCallback((percentage: number) => {
        const balance = mode === 'stake' ? soulShardBalance : stakedAmount;
        if (balance > 0n) setAmount(formatEther((balance * BigInt(percentage)) / 100n));
    }, [mode, soulShardBalance, stakedAmount, setAmount]);

    useEffect(() => {
        async function handlePostApproval() {
            if (isAwaitingStakeAfterApproval && !isTxPending) {
                // 等待足夠時間確保區塊鏈狀態更新
                await new Promise<void>(resolve => setTimeout(resolve, 3000));
                await refetchAll();
                setIsAwaitingStakeAfterApproval(false);
                if (mode === 'stake' && amount) {
                    // 再次檢查授權狀態
                    try {
                        const parsedAmount = parseEther(amount);
                        if (typeof allowance === 'bigint' && allowance >= parsedAmount) {
                            handleStake();
                        } else {
                            showToast('授權尚未完成，請稍後重試', 'info');
                        }
                    } catch (error) {
                        logger.error('解析質押金額失敗:', error);
                    }
                }
            }
        }
        handlePostApproval();
    }, [isAwaitingStakeAfterApproval, isTxPending, allowance, mode, amount, handleStake, refetchAll, showToast]);

    const renderActionPanel = () => (
        <div className="space-y-4">
            <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-lg">
                <button 
                    onClick={() => { setMode('stake'); setAmount(''); }} 
                    className={`w-full py-2 text-sm font-medium rounded-md transition ${mode === 'stake' ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}
                >
                    質押
                </button>
                <button 
                    onClick={() => { setMode('unstake'); setAmount(''); }} 
                    className={`w-full py-2 text-sm font-medium rounded-md transition ${mode === 'unstake' ? 'bg-red-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`} 
                    disabled={stakedAmount === 0n}
                >
                    贖回
                </button>
            </div>
            <div>
                <label htmlFor="vip-amount-input" className="block text-sm font-medium text-gray-300 mb-1">
                    {mode === 'stake' ? '質押數量' : '贖回數量'}
                </label>
                <input 
                    id="vip-amount-input"
                    name="vip-amount"
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    placeholder={`輸入要${mode === 'stake' ? '質押' : '贖回'}的數量`} 
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none h-12 bg-gray-800 border-gray-700" 
                />
            </div>
            <div className="flex justify-between gap-2 text-xs">
                {[25, 50, 75, 100].map(p => (
                    <button 
                        key={p} 
                        onClick={() => handlePercentageClick(p)} 
                        className="flex-1 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-md transition"
                    >
                        {p}%
                    </button>
                ))}
            </div>
            <p className="text-xs text-right text-gray-500 -mt-2">
                {mode === 'stake' ? `錢包餘額: ${formatEther(soulShardBalance)}` : `可贖回: ${formatEther(stakedAmount)}`}
            </p>
            <ActionButton 
                onClick={handleMainAction} 
                isLoading={isTxPending || isAwaitingStakeAfterApproval} 
                disabled={!amount || Number(amount) <= 0 || isAwaitingStakeAfterApproval} 
                className="w-full h-12"
            >
                {isTxPending 
                    ? '請在錢包確認...' 
                    : isAwaitingStakeAfterApproval 
                        ? '授權完成，準備質押...'
                        : (needsApproval ? '授權' : (mode === 'stake' ? '質押' : '請求贖回'))
                }
            </ActionButton>
        </div>
    );

    if (!chainId || chainId !== bsc.id) {
        return (
            <section>
                <h2 className="page-title">VIP 質押中心</h2>
                <div className="card-bg p-10 rounded-xl text-center text-gray-400">
                    <p>請連接到支援的網路以使用 VIP 功能。</p>
                </div>
            </section>
        );
    }
    
    const hasStaked = stakedAmount > 0n || (tokenId !== null && typeof tokenId === 'bigint' && tokenId > 0n);

    return (
        <section className="space-y-8 max-w-5xl mx-auto">
            <h2 className="page-title">VIP 質押中心</h2>
            <p className="text-center text-gray-500 dark:text-gray-400 max-w-2xl mx-auto -mt-4">
                質押您的 $SoulShard 代幣以提升 VIP 等級，享受提現稅率減免等尊榮禮遇。
            </p>
            
            {/* VIP 等級說明卡片 */}
            <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 p-6 rounded-xl border border-purple-500/20">
                <h3 className="text-lg font-bold text-purple-300 mb-4 flex items-center gap-2">
                    <span>👑</span> VIP 等級與福利
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center py-2 px-3 bg-gray-800/50 rounded">
                            <span className="text-gray-300">VIP 1</span>
                            <span className="text-yellow-400">$100+ USD 質押價值</span>
                            <span className="text-green-400">50 BP (0.5%) 稅率減免</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-gray-800/50 rounded">
                            <span className="text-gray-300">VIP 2</span>
                            <span className="text-yellow-400">$400+ USD 質押價值</span>
                            <span className="text-green-400">100 BP (1%) 稅率減免</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-gray-800/50 rounded">
                            <span className="text-gray-300">VIP 3</span>
                            <span className="text-yellow-400">$900+ USD 質押價值</span>
                            <span className="text-green-400">150 BP (1.5%) 稅率減免</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-gray-800/50 rounded">
                            <span className="text-gray-300">VIP 4</span>
                            <span className="text-yellow-400">$1,600+ USD 質押價值</span>
                            <span className="text-green-400">200 BP (2%) 稅率減免</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-gray-800/50 rounded">
                            <span className="text-gray-300">VIP 5</span>
                            <span className="text-yellow-400">$2,500+ USD 質押價值</span>
                            <span className="text-green-400">250 BP (2.5%) 稅率減免</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center py-2 px-3 bg-gray-800/50 rounded">
                            <span className="text-gray-300">VIP 10</span>
                            <span className="text-yellow-400">$10,000+ USD 質押價值</span>
                            <span className="text-green-400">500 BP (5%) 稅率減免</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-gray-800/50 rounded">
                            <span className="text-gray-300">VIP 20</span>
                            <span className="text-yellow-400">$40,000+ USD 質押價值</span>
                            <span className="text-green-400">1000 BP (10%) 稅率減免</span>
                        </div>
                        <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded">
                            <p className="text-xs text-blue-300 mb-2">
                                💡 <strong>稅率減免</strong>適用於從玩家金庫提取代幣時的手續費 (BP = 基點，1 BP = 0.01%)
                            </p>
                            <p className="text-xs text-green-300">
                                ✅ <strong>等級計算</strong>：VIP等級 = √(USD價值/100)，平滑成長無上限<br/>
                                🔢 <strong>稅率公式</strong>：每個VIP等級減免50基點 (0.5%)
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* 錢包授權說明 */}

            {isLoading && !tokenId ? (
                <div className="flex justify-center"><LoadingSpinner /></div>
            ) : hasStaked ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="lg:col-span-1 card-bg p-6 rounded-2xl space-y-6">
                        <h3 className="section-title text-xl">我的 VIP 狀態</h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-sm text-gray-400">質押總額</div>
                                <div className="font-bold text-2xl text-white">
                                    {isLoading ? <LoadingSpinner /> : parseFloat(formatEther(stakedAmount)).toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-500">
                                    ≈ ${isLoading ? '...' : parseFloat(formatEther(stakedValueUSD)).toFixed(2)} USD
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-400">VIP 等級</div>
                                <div className="font-bold text-2xl text-yellow-400">
                                    LV {isLoading ? '...' : vipLevel.toString()}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-400">稅率減免</div>
                                <div className="font-bold text-2xl text-green-400">
                                    {isLoading ? '...' : `${Number(taxReduction)} BP (${(Number(taxReduction) / 10000 * 100).toFixed(1)}%)`}
                                </div>
                            </div>
                        </div>
                        
                        {pendingUnstakeAmount > 0n && (
                            <div className="bg-yellow-900/50 p-4 rounded-lg text-center">
                                <h4 className="font-bold text-yellow-300">待領取請求</h4>
                                <p className="text-2xl font-mono text-white">
                                    {formatEther(pendingUnstakeAmount)} $SoulShard
                                </p>
                                {isCooldownOver ? (
                                    <ActionButton 
                                        onClick={handleClaim} 
                                        isLoading={isTxPending} 
                                        className="mt-2 w-full h-10"
                                    >
                                        立即領取
                                    </ActionButton>
                                ) : (
                                    <p className="text-sm text-yellow-400">可領取倒數: {countdown}</p>
                                )}
                            </div>
                        )}
                        
                        {renderActionPanel()}
                    </div>
                    
                    <div className="lg:col-span-1">
                        <h3 className="section-title text-xl text-center mb-4">我的 VIP 卡</h3>
                        <VipCardDisplay 
                            tokenId={tokenId} 
                            chainId={chainId} 
                            vipLevel={vipLevel}
                            contractAddress={vipStakingContract?.address}
                        />
                    </div>
                </div>
            ) : (
                <div className="max-w-xl mx-auto card-bg p-8 rounded-2xl space-y-6">
                    <h3 className="section-title text-2xl text-center">成為 VIP 會員</h3>
                    <p className="text-center text-gray-400">
                        質押 $SoulShard 即可鑄造您的專屬 VIP 卡，並開始累積福利！
                    </p>
                    {renderActionPanel()}
                </div>
            )}
        </section>
    );
};

const VipPage: React.FC = () => {
    return (
        <ErrorBoundary>
            <VipPageContent />
        </ErrorBoundary>
    );
};

export default VipPage;
