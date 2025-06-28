import React, { createContext, useState, useCallback, useContext, type ReactNode } from 'react';
import { formatEther } from 'viem';
import { Modal } from '../components/ui/Modal';
import victoryImageUrl from '/assets/images/win_screen_500x500.png';
import defeatImageUrl from '/assets/images/lose_screen_500x500.png';

// [修改 1] 擴充介面，加入 expGained
interface ExpeditionResult { 
    success: boolean; 
    reward: bigint; 
    expGained: bigint; // 新增經驗值欄位
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
    const showExpeditionResult = useCallback((res: ExpeditionResult) => { setResult(res); }, []);
    const handleClose = () => { setResult(null); };

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
                        <p className="text-sm text-gray-500 mt-4">{result.success ? "獎勵與經驗已發放至您的帳號。" : "再接再厲，下次好運！"}</p>
                    </div>
                </Modal>
            )}
        </ExpeditionContext.Provider>
    );
};