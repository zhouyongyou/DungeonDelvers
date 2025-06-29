import React, { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, maxUint256, type Abi, type Hash } from 'viem';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getContract } from '../config/contracts';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { fetchAllOwnedNfts } from '../api/nfts';
import type { VipNft } from '../types/nft';

// VIP 黑卡 SVG 預覽元件
const VipCardPreview: React.FC<{ tokenId: number, level: number }> = ({ tokenId, level }) => {
    const generateSVG = (_tokenId: number, _level: number) => {
        const bgColor1="#111111"; const bgColor2="#2d2d2d"; const goldColor="#ffd700"; const platinumColor="#FFFFFF";
        return `<svg width="100%" height="100%" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="bg-gradient-plat" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${bgColor2}" /><stop offset="100%" stop-color="${bgColor1}" /></radialGradient><pattern id="grid-plat" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ffffff" stroke-width="0.2" opacity="0.05"/></pattern><filter id="engrave-plat"><feDropShadow dx="1" dy="1" stdDeviation="0.5" flood-color="#000000" flood-opacity="0.5"/></filter><style>@keyframes breathing-glow-plat { 0% { text-shadow: 0 0 10px ${platinumColor}; } 50% { text-shadow: 0 0 20px ${platinumColor}, 0 0 30px ${platinumColor}; } 100% { text-shadow: 0 0 10px ${platinumColor}; } }.title-plat { font-family: serif; font-size: 24px; fill: ${goldColor}; font-weight: bold; letter-spacing: 4px; text-transform: uppercase; filter: url(#engrave-plat);}.level-plat { font-family: sans-serif; font-size: 96px; fill: ${platinumColor}; font-weight: bold; animation: breathing-glow-plat 5s ease-in-out infinite; }.bonus-plat { font-family: sans-serif; font-size: 20px; fill: ${platinumColor}; opacity: 0.9; animation: breathing-glow-plat 5s ease-in-out infinite; animation-delay: -0.2s;}.card-id-plat { font-family: monospace; font-size: 12px; fill: ${platinumColor}; opacity: 0.5;}</style></defs><rect width="100%" height="100%" rx="20" fill="url(#bg-gradient-plat)"/><rect width="100%" height="100%" rx="20" fill="url(#grid-plat)"/><g><circle cx="50" cy="100" r="1.5" fill="white" opacity="0.1"><animate attributeName="opacity" values="0.1;0.3;0.1" dur="5s" repeatCount="indefinite" begin="0s"/></circle><circle cx="320" cy="80" r="0.8" fill="white" opacity="0.2"><animate attributeName="opacity" values="0.2;0.5;0.2" dur="7s" repeatCount="indefinite" begin="-2s"/></circle><circle cx="150" cy="350" r="1.2" fill="white" opacity="0.1"><animate attributeName="opacity" values="0.1;0.4;0.1" dur="6s" repeatCount="indefinite" begin="-1s"/></circle><circle cx="250" cy="280" r="1" fill="white" opacity="0.3"><animate attributeName="opacity" values="0.3;0.1;0.3" dur="8s" repeatCount="indefinite" begin="-3s"/></circle></g><rect x="30" y="40" width="60" height="40" rx="5" fill="#2c2c2c" /><rect x="35" y="45" width="50" height="30" rx="3" fill="#444" /><text x="50%" y="60" text-anchor="middle" class="title-plat">VIP PRIVILEGE</text><g text-anchor="middle"><text x="50%" y="220" class="level-plat">${_level}</text><text x="50%" y="260" class="bonus-plat">SUCCESS RATE +${_level}%</text></g><text x="35" y="370" class="card-id-plat">CARD # ${_tokenId}</text><text x="360" y="370" text-anchor="end" class="card-id-plat" font-weight="bold">Dungeon Delvers</text><g stroke="${platinumColor}" stroke-width="1.5" opacity="0.3"><path d="M 30 20 L 20 20 L 20 30" fill="none" /><path d="M 370 20 L 380 20 L 380 30" fill="none" /><path d="M 30 380 L 20 380 L 20 370" fill="none" /><path d="M 370 380 L 380 380 L 380 370" fill="none" /></g></svg>`;
    };
    
    const svgString = generateSVG(tokenId, level);
    return <div className="w-full max-w-sm mx-auto aspect-square" dangerouslySetInnerHTML={{ __html: svgString }} />;
};

// 倒數計時器元件
const CountdownTimer: React.FC<{ unlockTime: bigint }> = ({ unlockTime }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const unlockTimeMs = Number(unlockTime) * 1000;

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, unlockTimeMs - now);
      
      if (remaining === 0) {
        setTimeLeft('可以解鎖');
        return;
      }
      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000).toString().padStart(2, '0');
      
      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, [unlockTimeMs]);

  return <span className="font-mono text-xl text-yellow-400">{timeLeft}</span>;
};

// VIP 頁面主元件
const VipPage: React.FC = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    const queryClient = useQueryClient();
    
    const [selectedUnstakedCardId, setSelectedUnstakedCardId] = useState<bigint | null>(null);
    const [approvalTxHash, setApprovalTxHash] = useState<Hash | undefined>();

    const vipStakingContract = getContract(chainId, 'vipStaking');
    const soulShardContract = getContract(chainId, 'soulShard');
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');

    const { data: nfts, isLoading: isLoadingNfts } = useQuery({
        queryKey: ['ownedNfts', address, chainId],
        queryFn: () => fetchAllOwnedNfts(address!, chainId!),
        enabled: !!address && !!chainId,
    });
    
    const { data: tokenIdCounter } = useReadContract({ 
        ...vipStakingContract, 
        functionName: 'tokenIdCounter',
        query: { enabled: !!vipStakingContract, refetchInterval: 10000 } 
    });

    const { data: totalStaked } = useReadContract({ 
        ...vipStakingContract, 
        functionName: 'totalStaked', 
        query: { enabled: !!vipStakingContract, refetchInterval: 10000 } 
    });

    const { data: mintPrice } = useReadContract({ 
        ...vipStakingContract, 
        functionName: 'mintPriceUSD' 
    });
    
    const { data: soulShardPrice } = useReadContract({ 
        ...dungeonCoreContract, 
        functionName: 'getSoulShardAmountForUSD', 
        args: [mintPrice!],
        query: { 
            enabled: !!dungeonCoreContract && typeof mintPrice === 'bigint'
        } 
    });

    const { data: allowance, refetch: refetchAllowance } = useReadContract({ 
        ...soulShardContract, 
        functionName: 'allowance', 
        args: [address!, vipStakingContract!.address], 
        query: { enabled: !!address && !!vipStakingContract?.address }
    });
    
    const { data: stakedInfo } = useReadContract({ 
        ...vipStakingContract, 
        functionName: 'userStakes', 
        args: [address!], 
        query: { 
            enabled: !!address && !!vipStakingContract,
            select: (data: unknown): { tokenId: bigint; stakeTime: bigint; unlockTime: bigint; } => {
                if (Array.isArray(data) && data.length >= 3) {
                    return { tokenId: data[0] as bigint, stakeTime: data[1] as bigint, unlockTime: data[2] as bigint };
                }
                return { tokenId: 0n, stakeTime: 0n, unlockTime: 0n };
            },
            refetchInterval: 5000,
        }
    });
    
    const { writeContractAsync, isPending } = useWriteContract({
        mutation: {
            onSuccess: () => {
                showToast('交易已送出！', 'info');
                setTimeout(() => {
                    queryClient.invalidateQueries({ queryKey: ['ownedNfts'] });
                    queryClient.invalidateQueries({ queryKey: ['userStakes'] });
                    queryClient.invalidateQueries({ queryKey: ['totalStaked'] });
                    queryClient.invalidateQueries({ queryKey: ['tokenIdCounter'] });
                }, 1000);
            },
        },
    });
    
    const { isLoading: isConfirmingApproval, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({
        hash: approvalTxHash,
    });
    
    useEffect(() => {
        if (isApprovalSuccess && approvalTxHash) {
            showToast('授權成功！', 'success');
            refetchAllowance();
            setApprovalTxHash(undefined);
        }
    }, [isApprovalSuccess, approvalTxHash, showToast, refetchAllowance]);


    const needsApproval = useMemo(() => {
        if (typeof allowance !== 'bigint' || typeof soulShardPrice !== 'bigint') return false;
        return allowance < soulShardPrice;
    }, [allowance, soulShardPrice]);
    
    const handleAction = async (action: 'approve' | 'mint' | 'stake' | 'unstake') => {
        if (!vipStakingContract) return;
        
        let txConfig;
        let description = '';

        try {
            switch (action) {
                case 'approve':
                    if (!soulShardContract) return;
                    description = "授權 VIP 合約";
                    txConfig = { address: soulShardContract.address, abi: soulShardContract.abi as Abi, functionName: 'approve', args: [vipStakingContract.address, maxUint256] };
                    break;
                case 'mint':
                    if (needsApproval) return showToast("請先完成授權", "error");
                    description = "鑄造 VIP 卡";
                    txConfig = { address: vipStakingContract.address, abi: vipStakingContract.abi, functionName: 'mint' };
                    break;
                case 'stake':
                    if (!selectedUnstakedCardId) return showToast("請選擇一張卡", "error");
                    description = `質押 VIP 卡 #${selectedUnstakedCardId}`;
                    txConfig = { address: vipStakingContract.address, abi: vipStakingContract.abi, functionName: 'stake', args: [selectedUnstakedCardId] };
                    break;
                case 'unstake':
                    description = "取消質押 VIP 卡";
                    txConfig = { address: vipStakingContract.address, abi: vipStakingContract.abi, functionName: 'unstake' };
                    break;
            }
        
            const hash = await writeContractAsync(txConfig);
            addTransaction({ hash, description });
            
            if (action === 'approve') {
                setApprovalTxHash(hash);
            }
        } catch (e: any) {
             if (!e.message.includes('User rejected the request')) {
                showToast(e.shortMessage || "交易失敗", "error");
            }
        }
    };
    
    const unstakedVipCards = useMemo(() => {
        if (!nfts?.vipCards) return [];
        const stakedTokenId = stakedInfo?.tokenId;
        if (!stakedTokenId || stakedTokenId === 0n) return nfts.vipCards;
        return nfts.vipCards.filter((card: VipNft) => card.id !== stakedTokenId);
    }, [nfts, stakedInfo]);

    const totalSupply = useMemo(() => {
        return tokenIdCounter ? Number(tokenIdCounter) - 1 : 0;
    }, [tokenIdCounter]);
    
    const currentStakedTokenId = stakedInfo?.tokenId;
    const currentUnlockTime = stakedInfo?.unlockTime ?? 0n;
    
    const isActionLoading = isPending || isConfirmingApproval;

    return (
        <section>
            <h2 className="page-title font-serif">VIP 會員俱樂部</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                <div className="card-bg p-6 rounded-2xl shadow-lg flex flex-col items-center justify-between h-full">
                    <h3 className="section-title text-2xl font-serif text-yellow-300">鑄造您的專屬 VIP 卡</h3>
                    <div className="my-4 w-full max-w-xs">
                       <VipCardPreview tokenId={Number(tokenIdCounter || 1)} level={5} />
                    </div>
                    <div className="text-center my-4 w-full">
                        <div className="bg-black/20 p-3 rounded-lg">
                            <p className="text-sm text-gray-400">限量發行: <span className="font-bold text-white">{totalSupply} / 2000</span></p>
                        </div>
                        <div className="bg-black/20 p-3 rounded-lg mt-2">
                             <p className="text-sm text-gray-400">價格: <span className="font-bold text-yellow-400">
                                 {/* 【最終修正】使用更嚴格的型別檢查來徹底解決 TypeScript 錯誤 */}
                                 {typeof soulShardPrice === 'bigint' 
                                     ? parseFloat(formatEther(soulShardPrice)).toFixed(2) 
                                     : '...'
                                 } $SoulShard
                             </span></p>
                        </div>
                    </div>
                     {needsApproval ? (
                        <ActionButton onClick={() => handleAction('approve')} isLoading={isActionLoading} className="w-full h-12 text-lg">授權代幣</ActionButton>
                    ) : (
                        <ActionButton onClick={() => handleAction('mint')} isLoading={isActionLoading} disabled={totalSupply >= 2000} className="w-full h-12 text-lg">
                            {totalSupply >= 2000 ? "已售罄" : "立即鑄造"}
                        </ActionButton>
                    )}
                </div>

                <div className="card-bg p-6 rounded-2xl shadow-lg h-full flex flex-col">
                    <h3 className="section-title font-serif">我的 VIP 狀態</h3>
                     <div className="text-center text-sm mb-4 bg-black/20 p-2 rounded-lg">
                        當前質押池: <span className="font-bold text-teal-400">{totalStaked?.toString() ?? '...'} / 2000</span> 張
                     </div>
                    {currentStakedTokenId && currentStakedTokenId > 0n ? (
                        <div className="text-center flex-grow flex flex-col justify-center items-center">
                           <p className="text-green-400 font-bold mb-2">✅ 已質押</p>
                           <p className="text-gray-300">卡片 ID: <span className="font-mono text-xl text-white">#{currentStakedTokenId.toString()}</span></p>
                           <p className="text-gray-400 text-xs mt-1">成功率 +5% 已生效</p>
                           <div className="w-full my-4 p-3 bg-black/10 rounded-lg">
                               <p className="text-gray-400 text-sm">7 天鎖倉解鎖倒數</p>
                               <CountdownTimer unlockTime={currentUnlockTime} />
                           </div>
                           <ActionButton onClick={() => handleAction('unstake')} isLoading={isActionLoading} disabled={Date.now()/1000 < Number(currentUnlockTime)} className="w-full mt-2 h-10 bg-red-600 hover:bg-red-500">取消質押</ActionButton>
                        </div>
                    ) : (
                        <div className="text-center flex-grow flex flex-col justify-center">
                            <p className="text-gray-400 mb-4">您目前沒有質押中的 VIP 卡。</p>
                             {isLoadingNfts ? <LoadingSpinner/> : (
                                <>
                                    <select onChange={(e) => setSelectedUnstakedCardId(e.target.value ? BigInt(e.target.value) : null)} className="w-full p-2 border rounded-lg bg-gray-700 border-gray-600 text-white mb-4" defaultValue="">
                                        <option value="">-- 選擇您要質押的卡 --</option>
                                        {unstakedVipCards.map((card: VipNft) => (
                                            <option key={card.id.toString()} value={card.id.toString()}>VIP 卡 #{card.id.toString()}</option>
                                        ))}
                                    </select>
                                    <ActionButton onClick={() => handleAction('stake')} isLoading={isActionLoading} disabled={!selectedUnstakedCardId} className="w-full h-10">質押選中的卡</ActionButton>
                                    <p className="text-xs text-gray-500 mt-2">質押您的 VIP 卡以啟動遠征成功率加成。</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default VipPage;
