// src/components/ShareBattleResult.tsx
// 分享戰績組件 - 支援即時和事後分享

import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { formatEther } from 'viem';
import { useAccount } from 'wagmi';
import { Icons } from './ui/icons';
import { ActionButton } from './ui/ActionButton';
import { formatSoul } from '../utils/formatters';
import { useAppToast } from '../contexts/SimpleToastContext';
import { VictoryImageGenerator } from './VictoryImageGenerator';
import { useSoulPrice } from '../hooks/useSoulPrice';

interface BattleResult {
    success: boolean;
    dungeonName: string;
    dungeonLevel?: number;
    reward: string | bigint;
    expGained: string | number;
    partyName?: string;
    partyPower?: number;
    timestamp?: string;
    transactionHash?: string;
}

interface ShareBattleResultProps {
    result: BattleResult;
    className?: string;
    compact?: boolean;
}

export const ShareBattleResult: React.FC<ShareBattleResultProps> = ({
    result,
    className = '',
    compact = false
}) => {
    const { showToast } = useAppToast();
    const { address } = useAccount();
    const [showImageGenerator, setShowImageGenerator] = useState(false);
    const [shareMode, setShareMode] = useState<'text' | 'image'>('text');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 獲取 SOUL 價格
    const { formatSoulToUsd, hasValidPrice, priceInUsd } = useSoulPrice();
    
    // 生成邀請連結
    const referralLink = useMemo(() => {
        if (typeof window === 'undefined' || !address) return '';
        return `${window.location.origin}/#/referral?ref=${address}`;
    }, [address]);
    
    // 點擊外部關閉下拉選單
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowImageGenerator(false);
            }
        };
        
        if (showImageGenerator) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showImageGenerator]);
    
    // 轉換數據格式
    const reward = typeof result.reward === 'string' ? BigInt(result.reward) : result.reward;
    const expGained = typeof result.expGained === 'string' ? BigInt(result.expGained) : BigInt(result.expGained);
    const rewardAmount = parseFloat(formatEther(reward)).toFixed(1);
    
    // 生成分享文本
    const generateShareText = useCallback(() => {
        const dungeonInfo = result.dungeonName || '地下城';
        const time = result.timestamp ? new Date(parseInt(result.timestamp) * 1000).toLocaleString('zh-TW') : '剛剛';
        
        // 隨機選擇吸引人的開場白
        const openings = [
            '🔥 又是一場精彩的冒險！',
            '⚔️ 地下城征服者歸來！',
            '💎 今天的收穫豐富！',
            '🚀 戰鬥力爆表的一天！',
            '🏆 完美的地下城探索！'
        ];
        const randomOpening = openings[Math.floor(Math.random() * openings.length)];
        
        // 計算 USD 價值
        const usdValue = hasValidPrice ? formatSoulToUsd(rewardAmount) : null;
        const soulDisplay = usdValue ? `${rewardAmount} SOUL ($${usdValue} USD)` : `${rewardAmount} SOUL`;
        
        return `${randomOpening}

✨ ${dungeonInfo} 征服成功！
💰 獲得 ${soulDisplay} (+${expGained.toString()} EXP)
⚔️ 隊伍戰力: ${result.partyPower || 0} | 使用: ${result.partyName || 'Party'}

🎮 想體驗同樣的刺激嗎？
${referralLink ? `來和我一起探索吧：${referralLink}` : ''}

#DungeonDelvers #GameFi #BNBChain #區塊鏈遊戲`;
    }, [result, rewardAmount, expGained, referralLink, hasValidPrice, formatSoulToUsd]);
    
    // 複製到剪貼板
    const copyToClipboard = useCallback(async () => {
        try {
            const text = generateShareText();
            await navigator.clipboard.writeText(text);
            showToast('戰績已複製到剪貼板！', 'success');
        } catch (error) {
            console.error('複製失敗:', error);
            showToast('複製失敗，請手動複製', 'error');
        }
    }, [generateShareText, showToast]);
    
    // 分享到 Twitter
    const shareToTwitter = useCallback(() => {
        const text = generateShareText();
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://www.dungeondelvers.xyz')}`;
        window.open(twitterUrl, '_blank');
    }, [generateShareText]);
    
    // 分享到 Telegram
    const shareToTelegram = useCallback(() => {
        const text = generateShareText();
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent('https://www.dungeondelvers.xyz')}&text=${encodeURIComponent(text)}`;
        window.open(telegramUrl, '_blank');
    }, [generateShareText]);
    
    if (!result.success) {
        return null; // 只分享成功的戰績
    }
    
    if (compact) {
        // 緊湊模式 - 顯示下拉選單
        return (
            <div className={`relative ${className}`} ref={dropdownRef}>
                <div className="flex items-center gap-1">
                    <ActionButton
                        onClick={() => setShowImageGenerator(!showImageGenerator)}
                        className="text-xs px-2 py-1 flex items-center gap-1"
                        title="分享戰績"
                    >
                        <Icons.Share2 className="h-3 w-3" />
                        <span className="hidden sm:inline">分享</span>
                    </ActionButton>
                </div>
                
                {/* 展開的分享選項 */}
                {showImageGenerator && (
                    <div className="absolute right-0 top-full mt-1 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-3 z-50 min-w-[300px] max-w-[90vw]">
                        {/* 模式切換 */}
                        <div className="flex items-center gap-1 bg-gray-700 rounded p-1 mb-2">
                            <button
                                onClick={() => setShareMode('text')}
                                className={`flex-1 px-2 py-1 text-xs rounded transition-all ${
                                    shareMode === 'text' 
                                        ? 'bg-gray-600 text-white' 
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                文字
                            </button>
                            <button
                                onClick={() => setShareMode('image')}
                                className={`flex-1 px-2 py-1 text-xs rounded transition-all ${
                                    shareMode === 'image' 
                                        ? 'bg-gray-600 text-white' 
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                圖片
                            </button>
                        </div>
                        
                        {shareMode === 'text' ? (
                            <div className="space-y-1">
                                <ActionButton
                                    onClick={copyToClipboard}
                                    className="w-full text-xs justify-start"
                                >
                                    <Icons.Copy className="h-3 w-3 mr-2" />
                                    複製文字
                                </ActionButton>
                                <ActionButton
                                    onClick={shareToTwitter}
                                    className="w-full text-xs justify-start"
                                >
                                    <Icons.Twitter className="h-3 w-3 mr-2" />
                                    分享到 X
                                </ActionButton>
                                <ActionButton
                                    onClick={shareToTelegram}
                                    className="w-full text-xs justify-start"
                                >
                                    <Icons.Send className="h-3 w-3 mr-2" />
                                    分享到 TG
                                </ActionButton>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <VictoryImageGenerator
                                    reward={reward}
                                    expGained={expGained}
                                    playerName={result.partyName}
                                    dungeonName={result.dungeonName}
                                    partyPower={result.partyPower}
                                    className="scale-75 origin-top"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }
    
    return (
        <div className={`space-y-4 ${className}`}>
            {/* 戰績摘要 */}
            <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 rounded-lg p-4 border border-green-500/30">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Icons.Share2 className="w-4 h-4" />
                        分享戰績
                    </h4>
                    
                    {/* 分享模式切換 */}
                    <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
                        <button
                            onClick={() => setShareMode('text')}
                            className={`px-3 py-1 text-xs rounded transition-all ${
                                shareMode === 'text' 
                                    ? 'bg-gray-600 text-white' 
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <Icons.FileText className="h-3 w-3 inline mr-1" />
                            文字
                        </button>
                        <button
                            onClick={() => setShareMode('image')}
                            className={`px-3 py-1 text-xs rounded transition-all ${
                                shareMode === 'image' 
                                    ? 'bg-gray-600 text-white' 
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <Icons.Image className="h-3 w-3 inline mr-1" />
                            圖片
                        </button>
                    </div>
                </div>
                
                <div className="text-sm text-gray-300 mb-3">
                    <p className="font-semibold text-green-400">✅ {result.dungeonName || '地下城'} - 成功！</p>
                    <p>💰 獲得 {rewardAmount} SOUL</p>
                    <p>⭐ 獲得 {expGained.toString()} 經驗值</p>
                    {result.partyName && <p>⚔️ 使用隊伍: {result.partyName}</p>}
                </div>
                
                {/* 根據模式顯示不同的分享選項 */}
                {shareMode === 'text' ? (
                    <div className="grid grid-cols-3 gap-2">
                        <ActionButton
                            onClick={copyToClipboard}
                            className="text-xs"
                        >
                            <Icons.Copy className="h-3 w-3 mr-1" />
                            複製
                        </ActionButton>
                        
                        <ActionButton
                            onClick={shareToTwitter}
                            className="text-xs bg-blue-600 hover:bg-blue-700"
                        >
                            <Icons.Twitter className="h-3 w-3 mr-1" />
                            X
                        </ActionButton>
                        
                        <ActionButton
                            onClick={shareToTelegram}
                            className="text-xs bg-sky-600 hover:bg-sky-700"
                        >
                            <Icons.Send className="h-3 w-3 mr-1" />
                            TG
                        </ActionButton>
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-xs text-gray-400 mb-2">
                            使用下方的圖片生成器創建精美的分享圖片
                        </p>
                    </div>
                )}
            </div>
            
            {/* 圖片生成器 - 在圖片模式下自動顯示 */}
            {shareMode === 'image' && (
                <VictoryImageGenerator
                    reward={reward}
                    expGained={expGained}
                    playerName={result.partyName}
                    dungeonName={result.dungeonName}
                    partyPower={result.partyPower}
                />
            )}
        </div>
    );
};