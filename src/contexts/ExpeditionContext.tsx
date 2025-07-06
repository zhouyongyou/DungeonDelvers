// src/contexts/ExpeditionContext.tsx

import React, { createContext, useState, useCallback, useContext, type ReactNode, useMemo } from 'react';
import { formatEther } from 'viem';
import { Modal } from '../components/ui/Modal';
import victoryImageUrl from '/assets/images/win_screen_500x500.png';
import defeatImageUrl from '/assets/images/lose_screen_500x500.png';
import { Icons } from '../components/ui/icons'; // ★ 新增：導入圖示
import { useAppToast } from '../hooks/useAppToast'; // ★ 新增：導入 Toast

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
        if (!result || !result.success) return { text: '', url: '' };
        
        const rewardAmount = parseFloat(formatEther(result.reward)).toFixed(4);
        const text = `我剛剛在《Dungeon Delvers》的遠征中大獲全勝！🏆\n\n獲得了 ${rewardAmount} $SoulShard 和 ${result.expGained.toString()} 經驗值！快來加入我，一起探索地下城吧！\n\n#DungeonDelvers #GameFi #BNBChain`;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://www.dungeondelvers.xyz/')}`;
        
        return { text, twitterUrl };
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
                        <p className="text-lg mb-4 text-gray-700 dark:text-gray-300">{result.success ? "你的隊伍滿載而歸！" : "你的隊伍遭遇了強敵，但勇氣可嘉！"}</p>
                        
                        {result.success && (
                            <div className="space-y-2 text-xl bg-black/10 dark:bg-black/20 p-4 rounded-lg">
                                <p className="font-bold text-green-500">
                                    獲得獎勵: {parseFloat(formatEther(result.reward)).toFixed(4)} $SoulShard
                                </p>
                                <p className="font-bold text-sky-400">
                                    獲得經驗: {result.expGained.toString()} EXP
                                </p>
                            </div>
                        )}
                        
                        {/* ★ 新增：分享按鈕區塊 */}
                        {result.success && (
                            <div className="mt-6 pt-4 border-t border-gray-300 dark:border-gray-700">
                                <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">分享你的勝利！</p>
                                <div className="flex justify-center gap-4">
                                    <a 
                                        href={shareContent.twitterUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#1DA1F2] text-white font-semibold transition hover:opacity-90"
                                    >
                                        <Icons.Twitter className="w-5 h-5" />
                                        <span>分享到 X</span>
                                    </a>
                                    <button
                                        onClick={handleCopy}
                                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-600 text-white font-semibold transition hover:bg-gray-500"
                                    >
                                        <Icons.Copy className="w-5 h-5" />
                                        <span>複製內容</span>
                                    </button>
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
