import { describe, it, expect } from 'vitest';
import { 
  APP_CONSTANTS, 
  getVipTier, 
  formatAddress, 
  isValidAddress, 
  formatNumber 
} from '../constants';

describe('APP_CONSTANTS', () => {
  it('應該包含所有必要的配置', () => {
    expect(APP_CONSTANTS.SUPPORTED_CHAIN_ID).toBe(56);
    expect(APP_CONSTANTS.CHAIN_NAMES[56]).toBe('BSC');
    expect(APP_CONSTANTS.TRANSACTION_TIMEOUT).toBe(60_000);
    expect(APP_CONSTANTS.GRAPHQL_REQUEST_TIMEOUT).toBe(30_000);
  });

  it('應該有正確的快取 TTL 配置', () => {
    expect(APP_CONSTANTS.CACHE_TTL.SHORT).toBe(1000 * 60 * 2);
    expect(APP_CONSTANTS.CACHE_TTL.MEDIUM).toBe(1000 * 60 * 5);
    expect(APP_CONSTANTS.CACHE_TTL.LONG).toBe(1000 * 60 * 30);
    expect(APP_CONSTANTS.CACHE_TTL.EXTRA_LONG).toBe(1000 * 60 * 60 * 2);
  });

  it('應該有正確的 VIP 等級配置', () => {
    expect(APP_CONSTANTS.VIP_LEVELS.BRONZE.min).toBe(1);
    expect(APP_CONSTANTS.VIP_LEVELS.BRONZE.max).toBe(3);
    expect(APP_CONSTANTS.VIP_LEVELS.BRONZE.icon).toBe('🥉');
    
    expect(APP_CONSTANTS.VIP_LEVELS.DIAMOND.min).toBe(13);
    expect(APP_CONSTANTS.VIP_LEVELS.DIAMOND.max).toBe(20);
    expect(APP_CONSTANTS.VIP_LEVELS.DIAMOND.icon).toBe('💎');
  });

  it('應該有正確的外部連結', () => {
    expect(APP_CONSTANTS.EXTERNAL_LINKS.BSC_SCAN).toBe('https://bscscan.com');
    expect(APP_CONSTANTS.EXTERNAL_LINKS.PANCAKESWAP).toBe('https://pancakeswap.finance');
  });
});

describe('getVipTier', () => {
  it('應該返回正確的 VIP 等級', () => {
    // BRONZE (1-3)
    expect(getVipTier(1).name).toBe('BRONZE');
    expect(getVipTier(2).name).toBe('BRONZE');
    expect(getVipTier(3).name).toBe('BRONZE');
    
    // SILVER (4-6)
    expect(getVipTier(4).name).toBe('SILVER');
    expect(getVipTier(5).name).toBe('SILVER');
    expect(getVipTier(6).name).toBe('SILVER');
    
    // GOLD (7-9)
    expect(getVipTier(7).name).toBe('GOLD');
    expect(getVipTier(8).name).toBe('GOLD');
    expect(getVipTier(9).name).toBe('GOLD');
    
    // PLATINUM (10-12)
    expect(getVipTier(10).name).toBe('PLATINUM');
    expect(getVipTier(11).name).toBe('PLATINUM');
    expect(getVipTier(12).name).toBe('PLATINUM');
    
    // DIAMOND (13-20)
    expect(getVipTier(13).name).toBe('DIAMOND');
    expect(getVipTier(15).name).toBe('DIAMOND');
    expect(getVipTier(20).name).toBe('DIAMOND');
    
    // STANDARD (0 或超出範圍)
    expect(getVipTier(0).name).toBe('STANDARD');
    expect(getVipTier(25).name).toBe('STANDARD');
  });

  it('應該返回正確的圖標', () => {
    expect(getVipTier(1).icon).toBe('🥉');
    expect(getVipTier(4).icon).toBe('🥈');
    expect(getVipTier(7).icon).toBe('🏆');
    expect(getVipTier(10).icon).toBe('⭐');
    expect(getVipTier(13).icon).toBe('💎');
    expect(getVipTier(0).icon).toBe('👑');
  });
});

describe('formatAddress', () => {
  const testAddress = '0x1234567890abcdef1234567890abcdef12345678';

  it('應該正確格式化地址', () => {
    expect(formatAddress(testAddress)).toBe('0x1234...5678');
    expect(formatAddress(testAddress, 4, 4)).toBe('0x12...5678');
    expect(formatAddress(testAddress, 8, 6)).toBe('0x123456...345678');
  });

  it('應該處理短地址', () => {
    const shortAddress = '0x123';
    expect(formatAddress(shortAddress)).toBe('0x123');
  });

  it('應該處理空地址', () => {
    expect(formatAddress('')).toBe('');
    expect(formatAddress(null as any)).toBe('');
    expect(formatAddress(undefined as any)).toBe('');
  });
});

describe('isValidAddress', () => {
  it('應該驗證有效的以太坊地址', () => {
    expect(isValidAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
    expect(isValidAddress('0xAbCdEf1234567890aBcDeF1234567890AbCdEf12')).toBe(true);
  });

  it('應該拒絕無效的地址', () => {
    expect(isValidAddress('0x123')).toBe(false); // 太短
    expect(isValidAddress('1234567890abcdef1234567890abcdef12345678')).toBe(false); // 沒有 0x
    expect(isValidAddress('0xGGGG567890abcdef1234567890abcdef12345678')).toBe(false); // 無效字符
    expect(isValidAddress('')).toBe(false); // 空字符串
    expect(isValidAddress('0x')).toBe(false); // 只有前綴
  });
});

describe('formatNumber', () => {
  it('應該格式化 token 數量', () => {
    expect(formatNumber(1234.5678, 'token')).toBe('1234.5678');
    expect(formatNumber(1000000, 'token')).toBe('1000.0000K');
    expect(formatNumber(1500000, 'token')).toBe('1500.0000K');
    expect(formatNumber(1000000000, 'token')).toBe('1000.0000M');
  });

  it('應該格式化 USD 金額', () => {
    expect(formatNumber(1234.567, 'usd')).toBe('1234.57');
    expect(formatNumber(1000000, 'usd')).toBe('1000.00K');
    expect(formatNumber(1500000, 'usd')).toBe('1500.00K');
  });

  it('應該格式化百分比', () => {
    expect(formatNumber(12.345, 'percentage')).toBe('12.3');
    expect(formatNumber(1000000, 'percentage')).toBe('1000.0K');
  });

  it('應該處理 BigInt', () => {
    expect(formatNumber(1234n, 'token')).toBe('1234.0000');
    expect(formatNumber(1000000n, 'token')).toBe('1000.0000K');
  });

  it('應該處理字符串', () => {
    expect(formatNumber('1234.5678', 'token')).toBe('1234.5678');
    expect(formatNumber('1000000', 'token')).toBe('1000.0000K');
  });

  it('應該處理無效輸入', () => {
    expect(formatNumber('invalid', 'token')).toBe('0');
    expect(formatNumber(NaN, 'token')).toBe('0');
    expect(formatNumber(null as any, 'token')).toBe('0');
    expect(formatNumber(undefined as any, 'token')).toBe('0');
  });

  it('應該處理大數字', () => {
    expect(formatNumber(1000000000000, 'token')).toBe('1000.0000B'); // 1T
    expect(formatNumber(1000000000000000, 'token')).toBe('1000.0000T'); // 1Q
  });
});