import React, { createContext, useState, useCallback, useContext, type ReactNode } from 'react';
import { formatEther } from 'viem';
import { Modal } from '../components/ui/Modal';
import victoryImageUrl from '/assets/images/win_screen_500x500.png';
import defeatImageUrl from '/assets/images/lose_screen_500x500.png';

interface ExpeditionResult { 
    success: boolean; 
    reward: bigint; 
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
                        {/* 2. 將 img 的 src 屬性替換為導入的圖片變數 */}
                        <img 
                            src={result.success ? victoryImageUrl : defeatImageUrl} 
                            alt={result.success ? "勝利" : "失敗"} 
                            className="mx-auto mb-4 rounded-full border-4 border-yellow-600/50 w-36 h-36 object-cover" 
                        />
                        <h3 className={`text-3xl font-bold font-serif mb-2 ${result.success ? 'text-yellow-600' : 'text-gray-600 dark:text-gray-400'}`}>{result.success ? "遠征成功！" : "遠征失敗"}</h3>
                        <p className="text-lg mb-2 text-gray-700 dark:text-gray-300">{result.success ? "你的隊伍滿載而歸！" : "你的隊伍遭遇了強敵，但勇氣可嘉！"}</p>
                        {result.success && (<p className="font-bold text-green-600 text-xl">獲得獎勵: {parseFloat(formatEther(result.reward)).toFixed(4)} $SoulShard</p>)}
                        <p className="text-sm text-gray-500 mt-4">{result.success ? "獎勵已存入您的個人金庫。" : "再接再厲，下次好運！"}</p>
                    </div>
                </Modal>
            )}
        </ExpeditionContext.Provider>
    );
};