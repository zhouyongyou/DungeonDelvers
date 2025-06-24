import React, { createContext, useState, useCallback, useContext, ReactNode } from 'react';
import { formatEther } from 'viem';
import { Modal } from '../components/ui/Modal';

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
    if (!context) {
        throw new Error('useExpeditionResult must be used within a ExpeditionProvider');
    }
    return context;
};

export const ExpeditionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [result, setResult] = useState<ExpeditionResult | null>(null);

    const showExpeditionResult = useCallback((res: ExpeditionResult) => {
        setResult(res);
    }, []);

    const handleClose = () => {
        setResult(null);
    };

    return (
        <ExpeditionContext.Provider value={{ showExpeditionResult }}>
            {children}
            {/* 【修正】確保在 result 存在時，渲染 Modal 組件 */}
            {result && (
                <Modal
                    isOpen={!!result}
                    onClose={handleClose}
                    onConfirm={handleClose}
                    title={result.success ? "遠征成功！" : "遠征失敗"}
                    confirmText={result.success ? "太棒了！" : "返回"}
                    isConfirming={false} // 戰報彈窗不需要確認中狀態
                >
                    <div className="text-center">
                        <img 
                            src={result.success 
                                ? `https://placehold.co/150x150/fde047/a16207?text=🏆` // 成功的寶箱圖示
                                : `https://placehold.co/150x150/9ca3af/4b5563?text=⚔️` // 失敗的斷劍圖示
                            }
                            alt={result.success ? "勝利" : "失敗"}
                            className="mx-auto mb-4 rounded-full border-4 border-yellow-600/50"
                        />
                        <h3 className={`text-3xl font-bold font-serif mb-2 ${result.success ? 'text-yellow-600' : 'text-gray-600 dark:text-gray-400'}`}>
                            {result.success ? "遠征成功！" : "遠征失敗"}
                        </h3>
                        <p className="text-lg mb-2 text-gray-700 dark:text-gray-300">
                            {result.success 
                                ? "你的隊伍滿載而歸！"
                                : "你的隊伍遭遇了強敵，但勇氣可嘉！"
                            }
                        </p>
                        {result.success && (
                            <p className="font-bold text-green-600 text-xl">
                                獲得獎勵: {parseFloat(formatEther(result.reward)).toFixed(4)} $SoulShard
                            </p>
                        )}
                        <p className="text-sm text-gray-500 mt-4">
                            {result.success 
                                ? "獎勵已存入您的個人金庫。"
                                : "再接再厲，下次好運！"
                            }
                        </p>
                    </div>
                </Modal>
            )}
        </ExpeditionContext.Provider>
    );
};
