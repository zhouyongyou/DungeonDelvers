// src/utils/rarityConverter.ts
import { logger } from './logger';
// 稀有度轉換工具

export interface RarityInfo {
  number: number;
  name: string;
  color: string;
  chineseName: string;
}

// 稀有度映射表
const RARITY_MAP: Record<string, RarityInfo> = {
  // 英文 -> 數字映射
  'common': { number: 1, name: 'Common', color: '#9ca3af', chineseName: '普通' },
  'uncommon': { number: 2, name: 'Uncommon', color: '#10b981', chineseName: '優秀' },
  'rare': { number: 3, name: 'Rare', color: '#3b82f6', chineseName: '稀有' },
  'epic': { number: 4, name: 'Epic', color: '#8b5cf6', chineseName: '史詩' },
  'legendary': { number: 5, name: 'Legendary', color: '#f59e0b', chineseName: '傳說' },
  'mythic': { number: 6, name: 'Mythic', color: '#ec4899', chineseName: '神話' },
  
  // 數字 -> 信息映射
  '1': { number: 1, name: 'Common', color: '#9ca3af', chineseName: '普通' },
  '2': { number: 2, name: 'Uncommon', color: '#10b981', chineseName: '優秀' },
  '3': { number: 3, name: 'Rare', color: '#3b82f6', chineseName: '稀有' },
  '4': { number: 4, name: 'Epic', color: '#8b5cf6', chineseName: '史詩' },
  '5': { number: 5, name: 'Legendary', color: '#f59e0b', chineseName: '傳說' },
  '6': { number: 6, name: 'Mythic', color: '#ec4899', chineseName: '神話' },
};

/**
 * 將任何格式的稀有度轉換為標準化的 RarityInfo
 */
export function convertRarity(input: string | number | bigint): RarityInfo {
  const inputStr = String(input).toLowerCase().trim();
  
  // 直接查找映射
  if (RARITY_MAP[inputStr]) {
    return RARITY_MAP[inputStr];
  }
  
  // 嘗試數字轉換
  const numValue = Number(input);
  if (!isNaN(numValue) && numValue >= 1 && numValue <= 6) {
    return RARITY_MAP[String(Math.floor(numValue))];
  }
  
  // 默認返回普通
  logger.warn(`未知的稀有度值: ${input}，使用默認值 Common`);
  return RARITY_MAP['common'];
}

/**
 * 獲取稀有度數字
 */
export function getRarityNumber(input: string | number | bigint): number {
  return convertRarity(input).number;
}

/**
 * 獲取稀有度中文名稱
 */
export function getRarityChineseName(input: string | number | bigint): string {
  return convertRarity(input).chineseName;
}

/**
 * 獲取稀有度顏色
 */
export function getRarityColor(input: string | number | bigint): string {
  return convertRarity(input).color;
}

/**
 * 獲取稀有度英文名稱
 */
export function getRarityName(input: string | number | bigint): string {
  return convertRarity(input).name;
}

/**
 * 檢查是否為有效的稀有度值
 */
export function isValidRarity(input: string | number | bigint): boolean {
  const inputStr = String(input).toLowerCase().trim();
  return RARITY_MAP[inputStr] !== undefined || 
         (Number(input) >= 1 && Number(input) <= 6);
}

/**
 * 獲取稀有度縮寫（用於名稱前綴）
 */
export function getRarityAbbreviation(input: string | number | bigint): string {
  // 如果是無效值或預設值，返回空字符串
  if (!input || input === 0 || input === '0' || input === '') {
    return '';
  }
  
  const rarity = convertRarity(input);
  
  switch (rarity.number) {
    case 1: return 'N';    // Normal (Common)
    case 2: return 'R';    // Rare (Uncommon) 
    case 3: return 'SR';   // Super Rare (Rare)
    case 4: return 'SSR';  // Super Super Rare (Epic)
    case 5: return 'UR';   // Ultra Rare (Legendary)
    case 6: return 'UR+';  // Ultra Rare Plus (Mythic)
    default: return '';    // 預設值不顯示前綴
  }
}

/**
 * 獲取隊伍戰力範圍前綴
 */
export function getPartyPowerRangePrefix(totalPower: number): string {
  // 使用300為單位劃分等級
  const lowerBound = Math.floor(totalPower / 300) * 300;
  const upperBound = lowerBound + 299;
  return `${lowerBound}-${upperBound}`;
} 