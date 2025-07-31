import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合併 className 的工具函數
 * 使用 clsx 處理條件類名，使用 tailwind-merge 解決衝突
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}