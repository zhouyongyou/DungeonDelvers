// formatters.ts - 統一的格式化工具
// 整合所有格式化函數，避免重複實現

import { formatEther } from 'viem';

// =================================================================
// 代幣格式化
// =================================================================

/**
 * 格式化 SOUL 代幣顯示
 * @param value - bigint 格式的代幣數量
 * @param decimals - 顯示的小數位數（預設 4）
 * @param minDecimals - 最少顯示的小數位數（預設 0）
 * @returns 格式化的字串
 */
export function formatSoul(value: bigint, decimals: number = 4, minDecimals: number = 0): string {
    const ethValue = formatEther(value);
    const numValue = parseFloat(ethValue);
    
    // 如果是 0，直接返回
    if (numValue === 0) {
        return '0';
    }
    
    // 如果數值極小（小於 0.0001 SOUL），視為 0
    if (numValue < 0.0001) {
        return '0';
    }
    
    // 一般情況，限制小數位數
    const formatted = numValue.toFixed(decimals);
    
    // 移除尾部的 0（但保留最少 minDecimals 位）
    if (minDecimals === 0) {
        return parseFloat(formatted).toString();
    }
    
    const parts = formatted.split('.');
    if (parts.length === 2) {
        const decimalPart = parts[1].replace(/0+$/, ''); // 移除尾部 0
        if (decimalPart.length < minDecimals) {
            // 補足最少小數位數
            return `${parts[0]}.${decimalPart.padEnd(minDecimals, '0')}`;
        }
        return decimalPart ? `${parts[0]}.${decimalPart}` : parts[0];
    }
    
    return formatted;
}

/**
 * 格式化大數字（如總獎勵）
 * @param value - bigint 格式的數字
 * @returns 格式化的字串，帶千位分隔符
 */
export function formatLargeNumber(value: bigint): string {
    const ethValue = formatEther(value);
    const numValue = parseFloat(ethValue);
    
    // 使用千位分隔符
    return numValue.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
    });
}

/**
 * 格式化百分比
 * @param value - 數值（0-100）
 * @param decimals - 小數位數
 * @returns 格式化的百分比字串
 */
export function formatPercentage(value: number, decimals: number = 0): string {
    return `${value.toFixed(decimals)}%`;
}

/**
 * 格式化時間戳為相對時間
 * @param timestamp - Unix 時間戳（秒）
 * @returns 相對時間字串（如：5 分鐘前）
 */
export function formatRelativeTime(timestamp: number): string {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    
    if (diff < 60) return '剛剛';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
    
    return new Date(timestamp * 1000).toLocaleDateString('zh-TW');
}

// =================================================================
// 地址格式化（從 constants.ts 整合）
// =================================================================

/**
 * 格式化錢包地址
 * @param address - 完整地址
 * @param startChars - 開頭顯示字元數
 * @param endChars - 結尾顯示字元數
 * @returns 格式化的地址
 */
export function formatAddress(address: string, startChars = 6, endChars = 4): string {
    if (!address) return '';
    if (address.length <= startChars + endChars) return address;
    
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * 驗證地址格式
 * @param address - 要驗證的地址
 * @returns 是否為有效地址
 */
export function isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// =================================================================
// 通用數字格式化（整合 constants.ts 的 formatNumber）
// =================================================================

/**
 * 通用數字格式化
 * @param value - 要格式化的數值
 * @param options - 格式化選項
 * @returns 格式化的字串
 */
export function formatNumber(
    value: number | string | bigint,
    options: {
        type?: 'token' | 'usd' | 'percentage' | 'compact';
        decimals?: number;
        useCompact?: boolean;
    } = {}
): string {
    const { type = 'token', decimals, useCompact = true } = options;
    const numValue = typeof value === 'bigint' ? Number(value) : Number(value);
    
    if (isNaN(numValue)) return '0';
    
    // 預設小數位數
    const defaultDecimals = {
        token: 2,
        usd: 2,
        percentage: 2,
        compact: 0,
    };
    
    const decimalPlaces = decimals ?? defaultDecimals[type];
    
    // 如果啟用緊湊模式且數字很大
    if (useCompact && numValue >= 1000) {
        const units = ['', 'K', 'M', 'B', 'T'];
        let unitIndex = 0;
        let scaledValue = numValue;
        
        while (scaledValue >= 1000 && unitIndex < units.length - 1) {
            scaledValue /= 1000;
            unitIndex++;
        }
        
        return `${scaledValue.toFixed(decimalPlaces)}${units[unitIndex]}`;
    }
    
    // 百分比特殊處理
    if (type === 'percentage') {
        return formatPercentage(numValue, decimalPlaces);
    }
    
    // 一般數字格式化
    return numValue.toFixed(decimalPlaces).replace(/\.?0+$/, '');
}

// =================================================================
// 時間格式化
// =================================================================

/**
 * 格式化持續時間
 * @param seconds - 秒數
 * @returns 格式化的時間字串
 */
export function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分鐘`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}小時`;
    return `${Math.floor(seconds / 86400)}天`;
}

/**
 * 格式化時間戳
 * @param timestamp - Unix 時間戳（秒或毫秒）
 * @returns 格式化的日期時間字串
 */
export function formatTimestamp(timestamp: number | bigint): string {
    const ts = Number(timestamp);
    // 判斷是秒還是毫秒
    const date = new Date(ts < 10000000000 ? ts * 1000 : ts);
    
    return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// =================================================================
// 貨幣格式化
// =================================================================

/**
 * 格式化 USD 金額
 * @param value - 金額
 * @param includeSymbol - 是否包含 $ 符號
 * @returns 格式化的金額字串
 */
export function formatUSD(value: number | bigint, includeSymbol = true): string {
    const num = typeof value === 'bigint' ? Number(value) : value;
    const formatted = num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    
    return includeSymbol ? `$${formatted}` : formatted;
}

/**
 * 格式化 BNB 金額
 * @param value - BNB 金額（wei）
 * @param decimals - 小數位數
 * @returns 格式化的 BNB 字串
 */
export function formatBNB(value: bigint, decimals = 4): string {
    const formatted = formatEther(value);
    const num = parseFloat(formatted);
    
    if (num === 0) return '0 BNB';
    if (num < 0.0001) return '<0.0001 BNB';
    
    return `${num.toFixed(decimals).replace(/\.?0+$/, '')} BNB`;
}

// =================================================================
// 遊戲相關格式化
// =================================================================

/**
 * 格式化稀有度
 * @param rarity - 稀有度數值
 * @returns 稀有度名稱
 */
export function formatRarity(rarity: number): string {
    const rarityNames = ['', '普通', '稀有', '史詩', '傳說', '神話'];
    return rarityNames[rarity] || '未知';
}

/**
 * 獲取稀有度顏色類別
 * @param rarity - 稀有度數值
 * @returns Tailwind CSS 顏色類別
 */
export function getRarityColor(rarity: number): string {
    const colors = {
        1: 'text-gray-400',
        2: 'text-green-400',
        3: 'text-blue-400',
        4: 'text-purple-400',
        5: 'text-yellow-400',
    };
    return colors[rarity as keyof typeof colors] || 'text-gray-400';
}

/**
 * 格式化戰力數值
 * @param power - 戰力值
 * @returns 格式化的戰力字串
 */
export function formatPower(power: number | bigint): string {
    return formatNumber(power, { type: 'compact', decimals: 0 });
}