// src/components/CooldownTimer.tsx
// 冷卻時間倒數組件

import React, { useState, useEffect } from 'react';

interface CooldownTimerProps {
    cooldownEndsAt: bigint;
    onCooldownEnd?: () => void;
}

export const CooldownTimer: React.FC<CooldownTimerProps> = ({ 
    cooldownEndsAt, 
    onCooldownEnd 
}) => {
    const [timeLeft, setTimeLeft] = useState<number>(0);
    
    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = Math.floor(Date.now() / 1000);
            const endTime = Number(cooldownEndsAt);
            const remaining = Math.max(0, endTime - now);
            setTimeLeft(remaining);
            
            // 調試日誌
            console.log('[CooldownTimer] 計算剩餘時間:', {
                cooldownEndsAt: cooldownEndsAt.toString(),
                endTime,
                now,
                remaining,
                willRender: remaining > 0
            });
            
            if (remaining === 0 && onCooldownEnd) {
                onCooldownEnd();
            }
            
            return remaining;
        };
        
        // 初始計算
        const remaining = calculateTimeLeft();
        
        if (remaining > 0) {
            // 每秒更新一次
            const interval = setInterval(() => {
                const newRemaining = calculateTimeLeft();
                if (newRemaining === 0) {
                    clearInterval(interval);
                }
            }, 1000);
            
            return () => clearInterval(interval);
        }
    }, [cooldownEndsAt, onCooldownEnd]);
    
    if (timeLeft === 0) return null;
    
    // 格式化時間顯示
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    // 計算進度百分比（基於5分鐘總冷卻時間）
    const COOLDOWN_DURATION = 300; // 5分鐘
    const progress = Math.max(0, Math.min(100, ((COOLDOWN_DURATION - timeLeft) / COOLDOWN_DURATION) * 100));
    
    return (
        <div className="mt-3 p-3 bg-yellow-900/20 rounded-lg border border-yellow-600/30">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-yellow-400 animate-pulse">⏱️</span>
                    <span className="text-sm font-medium text-yellow-300">冷卻中</span>
                </div>
                <span className="text-lg font-bold text-white">
                    {formatTime(timeLeft)}
                </span>
            </div>
            
            {/* 進度條 */}
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                />
            </div>
            
            <p className="text-xs text-gray-400 mt-2 text-center">
                冷卻結束後即可再次出征
            </p>
        </div>
    );
};