// src/pages/MintPage.tsx (增強錯誤提示版)

import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useBalance, usePublicClient } from 'wagmi';
import { formatEther, maxUint256, type Abi, decodeEventLog } from 'viem';
import { useAppToast } from '../hooks/useAppToast';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useTransactionStore } from '../stores/useTransactionStore';
import { bsc } from 'wagmi/chains';
import { Modal } from '../components/ui/Modal';
import { NftCard } from '../components/ui/NftCard';
import type { AnyNft, NftAttribute } from '../types/nft';
import { fetchMetadata } from '../api/nfts';

// Debounce Hook (保持不變)
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

// 子元件 (保持不變)
const RarityProbabilities: React.FC = () => (
    <div className="w-full text-xs text-gray-400 mt-4">
        <h4 className="font-bold text-center mb-1 text-gray-500 dark:text-gray-300">稀有度機率</h4>
        <div className="grid grid-cols-5 gap-1 text-center">
            <div className="bg-black/20 p-1 rounded"><div>普通</div><div className="font-bold text-white">44%</div></div>
            <div className="bg-black/20 p-1 rounded"><div>罕見</div><div className="font-bold text-white">35%</div></div>
            <div className="bg-black/20 p-1 rounded"><div>稀有</div><div className="font-bold text-white">15%</div></div>
            <div className="bg-black/20 p-1 rounded"><div>史詩</div><div className="font-bold text-white">5%</div></div>
            <div className="bg-black/20 p-1 rounded"><div>傳說</div><div className="font-bold text-white">1%</div></div>
        </div>
    </div>
);

const MintResultModal: React.FC<{ nft: AnyNft | null; onClose: () => void }> = ({ nft, onClose }) => {
    if (!nft) return null;
    return (
        <Modal isOpen={!!nft} onClose={onClose} title="鑄造成功！" confirmText="太棒了！" onConfirm={onClose}>
            <div className="flex flex-col items-center">
                <p className="mb-4 text-center text-gray-300">恭喜您獲得了新的{nft.type === 'hero' ? '英雄' : '聖物'}！</p>
                <div className="w-64">
                    <NftCard nft={nft} />
                </div>
            </div>
        </Modal>
    );
};


type PaymentSource = 'wallet' | 'vault';
type SupportedChainId = typeof bsc.id;

// ★ 核心改動 #1: useMintLogic Hook 現在會回傳詳細的 error 物件
const useMintLogic = (type: 'hero' | 'relic', quantity: number, paymentSource: PaymentSource, chainId: SupportedChainId) => {
    const { address } = useAccount();
    const contractConfig = getContract(chainId, type);
    const soulShardContract = getContract(chainId, 'soulShard');
    const playerVaultContract = getContract(chainId, 'playerVault');
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');

    const { data: requiredAmountInUsd, isLoading: isLoadingPrice } = useReadContract({
        address: contractConfig?.address,
        abi: contractConfig?.abi,
        functionName: 'mintPriceUSD',
        query: { enabled: !!contractConfig },
    });

    const { data: totalRequiredAmount, isLoading: isLoadingConversion, isError, error } = useReadContract({
        address: dungeonCoreContract?.address,
        abi: dungeonCoreContract?.abi,
        functionName: 'getSoulShardAmountForUSD',
        args: [typeof requiredAmountInUsd === 'bigint' ? requiredAmountInUsd * BigInt(quantity) : 0n],
        query: {
            enabled: !!dungeonCoreContract && !!requiredAmountInUsd && quantity > 0,
        },
    });

    const { data: walletBalance } = useBalance({ address, token: soulShardContract?.address, query: { enabled: !!address && !!soulShardContract } });
    
    const { data: vaultInfo } = useReadContract({
        address: playerVaultContract?.address,
        abi: playerVaultContract?.abi,
        functionName: 'playerInfo',
        args: [address!],
        query: { enabled: !!address && !!playerVaultContract },
    });
    const vaultBalance = useMemo(() => (Array.isArray(vaultInfo) ? vaultInfo[0] as bigint : 0n), [vaultInfo]);

    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: soulShardContract?.address,
        abi: soulShardContract?.abi,
        functionName: 'allowance',
        args: [address!, contractConfig?.address!],
        query: { enabled: !!address && !!contractConfig && paymentSource === 'wallet' },
    });

    const needsApproval = useMemo(() => {
        if (
            paymentSource !== 'wallet' ||
            typeof allowance !== 'bigint' ||
            typeof totalRequiredAmount !== 'bigint'
        ) return false;
        return allowance < totalRequiredAmount;
    }, [paymentSource, allowance, totalRequiredAmount]);
    
    const { data: platformFee } = useReadContract({
        address: contractConfig?.address,
        abi: contractConfig?.abi,
        functionName: 'platformFee',
        query: { enabled: !!contractConfig }
    });

    return {
        requiredAmount: totalRequiredAmount ?? 0n,
        balance: paymentSource === 'wallet' ? (walletBalance?.value ?? 0n) : vaultBalance,
        needsApproval,
        isLoading: isLoadingPrice || isLoadingConversion,
        isError,
        error, // 回傳錯誤物件
        platformFee: platformFee as bigint ?? 0n,
        refetchAllowance,
    };
};

interface MintCardProps {
    type: 'hero' | 'relic';
    options: number[];
    chainId: SupportedChainId;
}

const MintCard: React.FC<MintCardProps> = ({ type, options, chainId }) => {
    const { address } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    const publicClient = usePublicClient();
    
    const [quantity, setQuantity] = useState(1);
    const [paymentSource, setPaymentSource] = useState<PaymentSource>('wallet');
    const [mintingResult, setMintingResult] = useState<AnyNft | null>(null);

    const debouncedQuantity = useDebounce(quantity, 300);
    
    const { requiredAmount, balance, needsApproval, isLoading, isError, error, platformFee, refetchAllowance } = useMintLogic(type, debouncedQuantity, paymentSource, chainId);
    const { writeContractAsync, isPending: isMinting } = useWriteContract();
    
    const title = type === 'hero' ? '英雄' : '聖物';
    const contractConfig = getContract(chainId, type);
    const soulShardContract = getContract(chainId, 'soulShard');

    if (!contractConfig || !soulShardContract) {
        return (
            <div className="card-bg p-6 rounded-xl shadow-lg flex flex-col items-center justify-center h-full text-center">
                <h3 className="text-xl font-bold text-red-500">設定錯誤</h3>
                <p className="text-gray-400 mt-2">
                    找不到 '{type}' 或 '$SoulShard' 的合約地址。
                </p>
                <p className="text-gray-500 text-xs mt-1">
                    請檢查您的 <code>.env</code> 環境變數設定是否正確。
                </p>
            </div>
        );
    }

    const handleApprove = async () => {
        if (!soulShardContract || !contractConfig) return;
        try {
            const hash = await writeContractAsync({
                address: soulShardContract.address,
                abi: soulShardContract.abi,
                functionName: 'approve',
                args: [contractConfig.address, maxUint256]
            });
            addTransaction({ hash, description: `批准 ${title} 合約使用代幣` });
            setTimeout(() => { refetchAllowance(); }, 3000);
        } catch (e: any) {
             if (!e.message.includes('User rejected the request')) showToast(e.shortMessage || "授權失敗", "error");
        }
    };

    const handleMint = async () => {
        if (!contractConfig || !publicClient) return showToast('客戶端尚未準備好，請稍後再試', 'error');
        if (isError) return showToast('價格讀取失敗，無法鑄造', 'error');
        if (typeof balance === 'bigint' && typeof requiredAmount === 'bigint' && balance < requiredAmount) {
            return showToast(`${paymentSource === 'wallet' ? '錢包' : '金庫'}餘額不足`, 'error');
        }
        if (paymentSource === 'wallet' && needsApproval) return showToast(`請先完成授權`, 'error');

        try {
            const description = `從${paymentSource === 'wallet' ? '錢包' : '金庫'}鑄造 ${quantity} 個${title}`;
            const functionName = paymentSource === 'wallet' ? 'mintFromWallet' : 'mintFromVault';
            const fee = typeof platformFee === 'bigint' ? platformFee : 0n;
            
            const hash = await writeContractAsync({
                address: contractConfig.address,
                abi: contractConfig.abi as Abi,
                functionName,
                args: [BigInt(quantity)],
                value: fee * BigInt(quantity),
            });
            addTransaction({ hash, description });

            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            
            const mintEventName = type === 'hero' ? 'HeroMinted' : 'RelicMinted';
            const mintLog = receipt.logs.find(log => {
                try {
                    const decoded = decodeEventLog({ abi: contractConfig.abi, ...log });
                    return decoded.eventName === mintEventName;
                } catch { return false; }
            });
            
            if (mintLog) {
                const decodedLog = decodeEventLog({ abi: contractConfig.abi, ...mintLog });
                const tokenId = (decodedLog.args as any).tokenId;
                
                const tokenUri = await publicClient.readContract({
                    address: contractConfig.address,
                    abi: contractConfig.abi,
                    functionName: 'tokenURI',
                    args: [tokenId]
                }) as string;

                const metadata = await fetchMetadata(tokenUri);
                const findAttr = (trait: string, defaultValue: any = 0) => metadata.attributes?.find((a: NftAttribute) => a.trait_type === trait)?.value ?? defaultValue;
                
                let nftData: AnyNft;
                if(type === 'hero') {
                    nftData = { ...metadata, id: tokenId, type, contractAddress: contractConfig.address, power: Number(findAttr('Power')), rarity: Number(findAttr('Rarity')) };
                } else {
                    nftData = { ...metadata, id: tokenId, type, contractAddress: contractConfig.address, capacity: Number(findAttr('Capacity')), rarity: Number(findAttr('Rarity')) };
                }
                setMintingResult(nftData);
            }

        } catch (error: any) {
            if (!error.message.includes('User rejected the request')) {
                showToast(error.shortMessage || "鑄造失敗", "error");
            }
        }
    };
    
    const actionButton = (paymentSource === 'wallet' && needsApproval)
        ? <ActionButton onClick={handleApprove} isLoading={isMinting} className="w-48 h-12">授權</ActionButton>
        : <ActionButton 
            onClick={handleMint} 
            isLoading={isMinting || isLoading}
            disabled={
                !address ||
                isLoading ||
                isError ||
                !(typeof balance === 'bigint' && typeof requiredAmount === 'bigint') ||
                balance < requiredAmount ||
                requiredAmount === 0n
            } 
            className="w-48 h-12"
          >
            {isMinting ? '請在錢包確認' : (address ? `招募 ${quantity} 個` : '請先連接錢包')}
          </ActionButton>;

    return (
        <div className="card-bg p-6 rounded-xl shadow-lg flex flex-col items-center h-full">
            <MintResultModal nft={mintingResult} onClose={() => setMintingResult(null)} />
            <div className="w-full h-48 bg-gray-200 dark:bg-gray-800/50 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                <p className="text-6xl opacity-80">{type === 'hero' ? '⚔️' : '💎'}</p>
            </div>

            <h3 className="section-title">招募{title}</h3>
            <div className="flex items-center justify-center gap-2 my-4">
                {options.map(q => 
                    <button key={q} onClick={() => setQuantity(q)} className={`w-12 h-12 rounded-full font-bold text-lg transition-all flex items-center justify-center border-2 ${quantity === q ? 'bg-indigo-500 text-white border-transparent scale-110' : 'bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 border-gray-400 dark:border-gray-600'}`}>
                        {q}
                    </button>
                )}
            </div>
            
            <div className="w-full my-4">
                <label className="block text-sm font-medium mb-2 text-center text-gray-500 dark:text-gray-400">選擇支付方式</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-200 dark:bg-gray-900/50 rounded-lg">
                    <button onClick={() => setPaymentSource('wallet')} className={`px-4 py-2 rounded-md text-sm font-semibold transition ${paymentSource === 'wallet' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow' : 'text-gray-600 dark:text-gray-300'}`}>錢包支付</button>
                    <button onClick={() => setPaymentSource('vault')} className={`px-4 py-2 rounded-md text-sm font-semibold transition ${paymentSource === 'vault' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow' : 'text-gray-600 dark:text-gray-300'}`}>金庫支付 (免稅)</button>
                </div>
                <p className="text-xs text-center mt-2 text-gray-500 dark:text-gray-500">
                    {paymentSource === 'wallet' ? '錢包餘額' : '金庫餘額'}: {address ? parseFloat(formatEther(balance)).toFixed(4) : '0.00'} $SoulShard
                </p>
            </div>

            <div className="text-center mb-4 min-h-[72px] flex-grow flex flex-col justify-center">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center">
                        <LoadingSpinner color="border-gray-500" />
                        <p className="text-sm text-gray-500 mt-2">讀取價格中...</p>
                    </div>
                ) : isError ? (
                    // ★ 核心改動 #3: 顯示更詳細的錯誤訊息
                    <div className="text-red-500 text-center">
                        <p className="font-bold">價格讀取失敗</p>
                        <p className="text-xs mt-1">
                            {(error as any)?.shortMessage?.includes('DungeonCore address not set') 
                                ? '原因：Hero/Relic 合約尚未設定總機地址。' 
                                : (error as any)?.shortMessage?.includes('Oracle not set')
                                ? '原因：總機合約尚未設定預言機地址。'
                                : '請檢查合約串接或網路連線。'}
                        </p>
                        <p className="text-xs mt-2 text-gray-500">
                            提示：請前往「管理後台」完成所有合約的串接設定。
                        </p>
                    </div>
                ) : (
                    <div>
                        <p className="text-lg text-gray-500 dark:text-gray-400">總價:</p>
                        <p className="font-bold text-yellow-500 dark:text-yellow-400 text-2xl">{parseFloat(formatEther(typeof requiredAmount === 'bigint' ? requiredAmount : 0n)).toFixed(4)}</p>
                        <p className="text-xs text-gray-500">$SoulShard + {formatEther(platformFee * BigInt(quantity))} BNB</p>
                    </div>
                )}
            </div>
            
            {actionButton}
            <a href={contractConfig.address ? `https://www.okx.com/web3/nft/markets/collection/bscn/${contractConfig.address}` : '#'} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 dark:text-indigo-400 hover:underline mt-2">
                前往市場交易
            </a>
            <RarityProbabilities />
        </div>
    );
};

const MintingInterface: React.FC<{ chainId: SupportedChainId }> = ({ chainId }) => {
    const heroMintOptions = [1, 5, 10, 20, 50];
    const relicMintOptions = [1, 5, 10, 20, 50];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <MintCard type="hero" options={heroMintOptions} chainId={chainId} />
            <MintCard type="relic" options={relicMintOptions} chainId={chainId} />
        </div>
    );
};

const MintPage: React.FC = () => {
    const { chainId } = useAccount();
    
    const isSupportedChain = (id: number | undefined): id is SupportedChainId => id === bsc.id;

    return (
        <section>
            <h2 className="page-title">鑄造工坊</h2>
            {chainId && isSupportedChain(chainId) ? (
                <MintingInterface chainId={chainId} />
            ) : (
                <div className="card-bg p-10 rounded-xl text-center text-gray-400">
                    <p>請先連接到支援的網路 (BSC 主網) 以使用鑄造功能。</p>
                </div>
            )}
        </section>
    );
};

export default MintPage;
