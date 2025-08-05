// src/contexts/ExpeditionContext.tsx

import React, { createContext, useState, useCallback, useContext, type ReactNode, useMemo } from 'react';
import { formatEther } from 'viem';
import { Modal } from '../components/ui/Modal';
import victoryImageUrl from '/dungeon/win_screen_500x500.png';
import defeatImageUrl from '/dungeon/lose_screen_500x500.png';
import { Icons } from '../components/ui/icons'; // ★ 新增：導入圖示
import { useAppToast } from '../contexts/SimpleToastContext'; // ★ 新增：導入 Toast
import { VictoryImageGenerator } from '../components/VictoryImageGenerator'; // ★ 新增：勝利圖片生成器

interface ExpeditionResult { 
    success: boolean; 
    reward: bigint; 
    expGained: bigint;
}
interface ExpeditionContextValue { 
    showExpeditionResult: (result: ExpeditionResult) => void; 
}

const ExpeditionContext = createContext<ExpeditionContextValue | undefined>(undefined);

export const useExpeditionResult = () => {
    const context = useContext(ExpeditionContext);
    if (!context) throw new Error('useExpeditionResult must be used within a ExpeditionProvider');
    return context;
};

export const ExpeditionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [result, setResult] = useState<ExpeditionResult | null>(null);
    const { showToast } = useAppToast(); // ★ 新增：使用 Toast
    
    const showExpeditionResult = useCallback((res: ExpeditionResult) => { setResult(res); }, []);
    const handleClose = () => { setResult(null); };

    // ★ 新增：產生分享內容的邏輯
    const shareContent = useMemo(() => {
        if (!result || !result.success) return { text: '', twitterUrl: '', referralUrl: '' };
        
        const rewardAmount = parseFloat(formatEther(result.reward)).toFixed(1);
        const baseUrl = 'https://www.dungeondelvers.xyz';
        // TODO: 從用戶設定獲取邀請碼，這裡先使用預設值
        // 💡 暫緩：當前使用固定邀請碼，待用戶設定系統完善後實作
        const referralCode = 'PLAYER123'; // 實際應該從用戶數據獲取
        const referralUrl = `${baseUrl}?ref=${referralCode}`;
        
        const text = `我剛剛在《Dungeon Delvers》的遠征中大獲全勝！🏆\n\n💰 獲得了 ${rewardAmount} $SoulShard\n⭐ 獲得了 ${result.expGained.toString()} 經驗值\n\n🎮 快來加入我，一起探索地下城吧！\n🎁 使用我的邀請鏈接還有額外獎勵哦！\n\n${referralUrl}\n\n#DungeonDelvers #GameFi #BNBChain #Web3Gaming`;
        
        // Twitter支援圖片，但需要先上傳圖片到Twitter或使用公開的圖片URL
        const imageUrl = 'https://www.dungeondelvers.xyz/images/victory-share.png'; // 需要準備這個圖片
        const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
        
        return { text, twitterUrl, referralUrl, imageUrl };
    }, [result]);

    // ★ 新增：處理複製文字的函式
    const handleCopy = () => {
        navigator.clipboard.writeText(shareContent.text);
        showToast('已複製分享內容！', 'success');
    };

    return (
        <ExpeditionContext.Provider value={{ showExpeditionResult }}>
            {children}
            {result && (
                <Modal isOpen={!!result} onClose={handleClose} onConfirm={handleClose} title={result.success ? "遠征成功！" : "遠征失敗"} confirmText={result.success ? "太棒了！" : "返回"} isConfirming={false}>
                    <div className="text-center">
                        <img 
                            src={result.success ? victoryImageUrl : defeatImageUrl} 
                            alt={result.success ? "勝利" : "失敗"} 
                            className="mx-auto mb-4 rounded-full border-4 border-yellow-600/50 w-36 h-36 object-cover" 
                        />
                        <h3 className={`text-3xl font-bold font-serif mb-2 ${result.success ? 'text-yellow-500' : 'text-gray-600 dark:text-gray-400'}`}>{result.success ? "遠征成功！" : "遠征失敗"}</h3>
                        <p className="text-lg mb-4 text-gray-300">{result.success ? "你的隊伍滿載而歸！" : "你的隊伍遭遇了強敵，但勇氣可嘉！"}</p>
                        
                        {result.success && (
                            <div className="space-y-3 text-xl bg-gradient-to-r from-green-900/20 to-yellow-900/20 p-4 rounded-lg border border-green-600/30">
                                <p className="font-bold text-green-400 flex items-center justify-center gap-2">
                                    <span>💰</span>
                                    獲得獎勵: {parseFloat(formatEther(result.reward || 0n)).toFixed(1)} $SoulShard
                                </p>
                                <p className="font-bold text-sky-400 flex items-center justify-center gap-2">
                                    <span>⭐</span>
                                    獲得經驗: {result.expGained?.toString() || '0'} EXP
                                </p>
                                {result.reward === 0n && (
                                    <p className="text-yellow-400 text-sm text-center">
                                        ⚠️ 獎勵數據可能尚未同步，請稍後檢查金庫餘額
                                    </p>
                                )}
                            </div>
                        )}
                        
                        {/* ★ 新增：勝利圖片生成器 */}
                        {result.success && (
                            <div className="mt-6 pt-4 border-t border-gray-700">
                                <p className="text-sm font-bold text-gray-300 mb-4 text-center">分享你的勝利！</p>
                                
                                {/* 勝利圖片生成器 */}
                                <VictoryImageGenerator 
                                    reward={result.reward || 0n}
                                    expGained={result.expGained || 0n}
                                    className="mb-4"
                                />
                                
                                {/* 傳統分享選項 */}
                                <div className="border-t border-gray-600 pt-4">
                                    <p className="text-xs text-gray-400 mb-3 text-center">或使用快速分享：</p>
                                    <div className="flex justify-center gap-3">
                                        <a 
                                            href={shareContent.twitterUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#1DA1F2] text-white font-medium transition hover:opacity-90 text-sm"
                                        >
                                            <Icons.Twitter className="w-4 h-4" />
                                            <span>文字分享</span>
                                        </a>
                                        <button
                                            onClick={handleCopy}
                                            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-600 text-white font-medium transition hover:bg-gray-500 text-sm"
                                        >
                                            <Icons.Copy className="w-4 h-4" />
                                            <span>複製文字</span>
                                        </button>
                                    </div>
                                    
                                    <div className="text-center mt-3">
                                        <p className="text-xs text-gray-400 mb-2">你的邀請鏈接：</p>
                                        <div className="bg-gray-700/50 rounded-lg p-2 border border-gray-600">
                                            <code className="text-xs text-green-400 break-all">{shareContent.referralUrl}</code>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!result.success && (
                            <p className="text-sm text-gray-500 mt-4">再接再厲，下次好運！</p>
                        )}
                    </div>
                </Modal>
            )}
        </ExpeditionContext.Provider>
    );
};
