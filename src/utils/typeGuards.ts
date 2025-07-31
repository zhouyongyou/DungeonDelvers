/**
 * 類型安全工具 - 防止運行時類型錯誤
 * 解決 DungeonDelvers 項目中的類型安全問題
 */

import { type AnyNft, type BaseNft, type PartyNft, type HeroNft, type RelicNft, type VipNft } from '../types/nft';
import { logger } from './logger';

/**
 * 安全的 bigint 轉字符串轉換
 */
export const safeBigintToString = (value: unknown): string => {
  if (value === null || value === undefined) return '0';
  
  try {
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    
    // 嘗試轉換為 BigInt 再轉字符串
    if (typeof value === 'object' && value !== null) {
      const str = String(value);
      if (str !== '[object Object]') {
        return BigInt(str).toString();
      }
    }
    
    logger.warn('Unable to convert value to string:', value);
    return '0';
  } catch (error) {
    logger.warn('Failed to convert bigint to string:', error, value);
    return '0';
  }
};

/**
 * 安全的 bigint 格式化（帶千位分隔符）
 */
export const formatBigintSafe = (value: unknown): string => {
  const str = safeBigintToString(value);
  const num = parseInt(str);
  return isNaN(num) ? '0' : num.toLocaleString();
};

/**
 * 檢查是否為有效的 NFT
 */
export const isValidNft = (obj: unknown): obj is BaseNft => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'type' in obj &&
    'name' in obj &&
    'contractAddress' in obj
  );
};

/**
 * 類型守護：PartyNft
 */
export const isPartyNft = (nft: AnyNft): nft is PartyNft => {
  return nft.type === 'party';
};

/**
 * 類型守護：HeroNft
 */
export const isHeroNft = (nft: AnyNft): nft is HeroNft => {
  return nft.type === 'hero';
};

/**
 * 類型守護：RelicNft
 */
export const isRelicNft = (nft: AnyNft): nft is RelicNft => {
  return nft.type === 'relic';
};

/**
 * 類型守護：VipNft
 */
export const isVipNft = (nft: AnyNft): nft is VipNft => {
  return nft.type === 'vip';
};

/**
 * 安全的屬性訪問
 */
export const safePropertyAccess = <T>(obj: unknown, path: string[]): T | undefined => {
  try {
    return path.reduce((current: any, key: string) => current?.[key], obj) as T;
  } catch (error) {
    logger.warn('Safe property access failed:', error, { obj, path });
    return undefined;
  }
};

/**
 * 安全獲取 Party 戰力
 */
export const getPartyPowerSafe = (party: unknown): string => {
  if (!isValidNft(party) || !isPartyNft(party)) return '0';
  return safeBigintToString(party.totalPower);
};

/**
 * 安全獲取 Party 容量
 */
export const getPartyCapacitySafe = (party: unknown): string => {
  if (!isValidNft(party) || !isPartyNft(party)) return '0';
  return safeBigintToString(party.totalCapacity);
};

/**
 * 安全獲取 NFT ID
 */
export const getNftIdSafe = (nft: unknown): string => {
  if (!isValidNft(nft)) return '0';
  return safeBigintToString(nft.id);
};

/**
 * 合約事件參數類型守護
 */
export const isUpgradeEventArgs = (args: unknown): args is { 
  outcome: number; 
  tokenId: bigint; 
  player: string;
} => {
  return (
    typeof args === 'object' && 
    args !== null && 
    'outcome' in args && 
    'tokenId' in args &&
    'player' in args &&
    typeof (args as any).outcome === 'number' &&
    typeof (args as any).tokenId === 'bigint' &&
    typeof (args as any).player === 'string'
  );
};

/**
 * 合約事件日誌類型守護
 */
export const isValidEventLog = (log: unknown): boolean => {
  return (
    typeof log === 'object' &&
    log !== null &&
    'args' in log &&
    'eventName' in log
  );
};

/**
 * 安全的陣列檢查
 */
export const isValidArray = <T>(value: unknown, validator?: (item: unknown) => item is T): value is T[] => {
  if (!Array.isArray(value)) return false;
  if (!validator) return true;
  return value.every(validator);
};

/**
 * NFT 集合驗證
 */
export const validateNftCollection = (data: unknown): data is AnyNft[] => {
  return isValidArray(data, isValidNft);
};

/**
 * 安全的數字轉換
 */
export const safeNumberConversion = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === 'bigint') {
    try {
      return Number(value);
    } catch {
      return 0;
    }
  }
  return 0;
};