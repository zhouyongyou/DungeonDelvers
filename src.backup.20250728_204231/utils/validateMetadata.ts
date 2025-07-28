// src/utils/validateMetadata.ts - NFT Metadata 格式驗證

import { logger } from './logger';
import type { NftAttribute } from '../types/nft';

interface MetadataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedMetadata?: any;
}

/**
 * 驗證 NFT Metadata 格式
 */
export function validateNftMetadata(metadata: any, nftType: 'hero' | 'relic' | 'party' | 'vip'): MetadataValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 1. 基本結構檢查
  if (!metadata || typeof metadata !== 'object') {
    errors.push('Metadata 必須是物件');
    return { isValid: false, errors, warnings };
  }
  
  // 2. 必要欄位檢查
  if (!metadata.name || typeof metadata.name !== 'string') {
    errors.push('缺少必要欄位: name');
  }
  
  if (!metadata.description || typeof metadata.description !== 'string') {
    warnings.push('缺少描述欄位: description');
  }
  
  if (!metadata.image || typeof metadata.image !== 'string') {
    errors.push('缺少必要欄位: image');
  } else {
    // 驗證 image URL 格式
    if (!isValidImageUrl(metadata.image)) {
      errors.push('無效的圖片 URL 格式');
    }
  }
  
  // 3. attributes 驗證
  if (!Array.isArray(metadata.attributes)) {
    errors.push('attributes 必須是陣列');
  } else {
    // 驗證每個 attribute
    metadata.attributes.forEach((attr: any, index: number) => {
      if (!attr || typeof attr !== 'object') {
        errors.push(`attributes[${index}] 必須是物件`);
        return;
      }
      
      if (!attr.trait_type || typeof attr.trait_type !== 'string') {
        errors.push(`attributes[${index}] 缺少 trait_type`);
      }
      
      if (attr.value === undefined || attr.value === null) {
        errors.push(`attributes[${index}] 缺少 value`);
      }
    });
    
    // 4. 根據 NFT 類型檢查必要屬性
    const requiredAttributes = getRequiredAttributes(nftType);
    const existingTraits = metadata.attributes.map((attr: NftAttribute) => attr.trait_type);
    
    requiredAttributes.forEach(trait => {
      if (!existingTraits.includes(trait)) {
        errors.push(`缺少必要屬性: ${trait}`);
      }
    });
  }
  
  // 5. 清理和修正 metadata
  const sanitizedMetadata = sanitizeMetadata(metadata, nftType);
  
  const isValid = errors.length === 0;
  
  if (!isValid) {
    logger.error('Metadata 驗證失敗', { metadata, errors, warnings });
  } else if (warnings.length > 0) {
    logger.warn('Metadata 驗證警告', { warnings });
  }
  
  return {
    isValid,
    errors,
    warnings,
    sanitizedMetadata
  };
}

/**
 * 獲取必要的屬性
 */
function getRequiredAttributes(nftType: string): string[] {
  switch (nftType) {
    case 'hero':
      return ['Power', 'Rarity'];
    case 'relic':
      return ['Capacity', 'Rarity'];
    case 'party':
      return ['CombinedPower', 'TotalHeroes', 'TotalRelics'];
    case 'vip':
      return ['VIP Level'];
    default:
      return [];
  }
}

/**
 * 驗證圖片 URL
 */
function isValidImageUrl(url: string): boolean {
  try {
    // 允許 data URL
    if (url.startsWith('data:image/')) {
      return true;
    }
    
    // 允許 IPFS URL
    if (url.startsWith('ipfs://')) {
      return true;
    }
    
    // 允許 HTTP(S) URL
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 清理和修正 metadata
 */
function sanitizeMetadata(metadata: any, nftType: string): any {
  const sanitized = {
    name: metadata.name || `Unknown ${nftType}`,
    description: metadata.description || '',
    image: metadata.image || '',
    attributes: Array.isArray(metadata.attributes) ? metadata.attributes : []
  };
  
  // 確保數值類型正確
  sanitized.attributes = sanitized.attributes.map((attr: NftAttribute) => {
    const numericTraits = ['Power', 'Capacity', 'Rarity', 'CombinedPower', 'TotalHeroes', 'TotalRelics', 'VIP Level'];
    
    if (numericTraits.includes(attr.trait_type)) {
      return {
        ...attr,
        value: typeof attr.value === 'number' ? attr.value : parseInt(String(attr.value)) || 0
      };
    }
    
    return attr;
  });
  
  // 移除無效的屬性
  sanitized.attributes = sanitized.attributes.filter((attr: NftAttribute) => 
    attr.trait_type && attr.value !== undefined && attr.value !== null
  );
  
  return sanitized;
}

/**
 * 批量驗證 metadata
 */
export function validateMetadataBatch(metadataList: any[], nftType: 'hero' | 'relic' | 'party' | 'vip'): {
  valid: any[];
  invalid: Array<{ metadata: any; errors: string[] }>;
} {
  const valid: any[] = [];
  const invalid: Array<{ metadata: any; errors: string[] }> = [];
  
  metadataList.forEach(metadata => {
    const result = validateNftMetadata(metadata, nftType);
    
    if (result.isValid && result.sanitizedMetadata) {
      valid.push(result.sanitizedMetadata);
    } else {
      invalid.push({ metadata, errors: result.errors });
    }
  });
  
  return { valid, invalid };
}