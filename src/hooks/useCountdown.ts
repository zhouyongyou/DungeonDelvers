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
        // 每秒更新一次當前時間
        const interval = setInterval(() => setNow(Date.now() / 1000), 1000);
        return () => clearInterval(interval);
    }, []);

    const secondsRemaining = Math.max(0, targetTimestamp - now);
    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    const seconds = Math.floor(secondsRemaining % 60);

    return {
        isOver: secondsRemaining === 0,
        formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    };
};
