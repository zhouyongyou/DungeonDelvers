// 勝利畫面重播模態 - 讓玩家可以重新查看勝利/失敗畫面
import React from 'react';
import { Modal } from './ui/Modal';
import victoryImageUrl from '/dungeon/win_screen_500x500.png';
import defeatImageUrl from '/dungeon/lose_screen_500x500.png';
import { formatEther } from 'viem';

interface ExpeditionResult {
    success: boolean;
    dungeonName: string;
    reward: string | bigint;
    expGained: string | number;
    partyName?: string;
    partyPower?: number;
    timestamp?: string;
}

interface VictoryReplayModalProps {
    isOpen: boolean;
    onClose: () => void;
    result: ExpeditionResult;
}

export const VictoryReplayModal: React.FC<VictoryReplayModalProps> = ({
    isOpen,
    onClose,
    result
}) => {
    const reward = typeof result.reward === 'string' ? BigInt(result.reward) : result.reward;
    const expGained = typeof result.expGained === 'string' ? BigInt(result.expGained) : BigInt(result.expGained);
    const rewardAmount = parseFloat(formatEther(reward)).toFixed(1);

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            onConfirm={onClose} 
            title={result.success ? "遠征成功！" : "遠征失敗"} 
            confirmText={result.success ? "太棒了！" : "返回"} 
            isConfirming={false}
        >
            <div className="text-center">
                {/* 複製原始勝利/失敗畫面的樣式 */}
                <img 
                    src={result.success ? victoryImageUrl : defeatImageUrl} 
                    alt={result.success ? "勝利" : "失敗"} 
                    className="mx-auto mb-4 rounded-full border-4 border-yellow-600/50 w-36 h-36 object-cover" 
                />
                <h3 className={`text-3xl font-bold font-serif mb-2 ${result.success ? 'text-yellow-500' : 'text-gray-600 dark:text-gray-400'}`}>
                    {result.success ? "遠征成功！" : "遠征失敗"}
                </h3>
                <p className="text-lg mb-4 text-gray-300">
                    {result.success ? "你的隊伍滿載而歸！" : "你的隊伍遭遇了強敵，但勇氣可嘉！"}
                </p>
                
                {result.success && (
                    <div className="space-y-3 text-xl bg-gradient-to-r from-green-900/20 to-yellow-900/20 p-4 rounded-lg border border-green-600/30">
                        <p className="font-bold text-green-400 flex items-center justify-center gap-2">
                            <span>💰</span>
                            獲得 {rewardAmount} SOUL
                        </p>
                        <p className="font-bold text-blue-400 flex items-center justify-center gap-2">
                            <span>⭐</span>
                            獲得 {expGained.toString()} 經驗值
                        </p>
                        {result.partyName && (
                            <p className="text-sm text-gray-300">
                                使用隊伍: {result.partyName}
                            </p>
                        )}
                        {result.partyPower && (
                            <p className="text-sm text-gray-300">
                                隊伍戰力: {result.partyPower}
                            </p>
                        )}
                    </div>
                )}

                <div className="mt-4 text-xs text-gray-400">
                    地下城: {result.dungeonName}
                    {result.timestamp && (
                        <div className="mt-1">
                            時間: {new Date(parseInt(result.timestamp) * 1000).toLocaleString('zh-TW')}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};