// formatters.ts - 統一的格式化工具

import { formatEther } from 'viem';

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