// src/hooks/useCountdown.ts (★ 全新檔案)

import { useState, useEffect } from 'react';

/**
 * @notice 一個自定義的倒數計時 Hook。
 * @param targetTimestamp 目標時間戳 (秒)。
 * @returns 一個包含倒數計時狀態和格式化字串的物件。
 */
export const useCountdown = (targetTimestamp: number) => {
    const [now, setNow] = useState(Date.now() / 1000);

    useEffect(() => {
        // 如果沒有目標時間戳，不需要計時器
        if (!targetTimestamp || targetTimestamp === 0) {
            return;
        }
        
        // 立即更新一次
        setNow(Date.now() / 1000);
        
        // 設置計時器每秒更新
        const interval = setInterval(() => setNow(Date.now() / 1000), 1000);
        return () => clearInterval(interval);
    }, [targetTimestamp]);

    // 如果沒有設置目標時間戳，返回默認值
    if (!targetTimestamp || targetTimestamp === 0) {
        return {
            isOver: false,
            formatted: '00:00:00'
        };
    }

    const secondsRemaining = Math.max(0, targetTimestamp - now);
    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    const seconds = Math.floor(secondsRemaining % 60);

    return {
        isOver: secondsRemaining === 0 && targetTimestamp <= now,
        formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    };
};
