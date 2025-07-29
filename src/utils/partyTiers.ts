// src/utils/partyTiers.ts
// 隊伍戰力分級系統 - 基於實際圖片檔案

export interface PartyTier {
  name: string;
  displayName: string;
  minPower: number;
  maxPower: number;
  image: string;
  color: string;
  borderColor: string;
  glowColor?: string;
}

// 定義詳細的戰力分級 - 對應實際的圖片檔案
export const DETAILED_PARTY_TIERS: PartyTier[] = [
  // 300-4199 範圍內的詳細分級
  { 
    name: 'novice-1', 
    displayName: '新手隊伍 I',
    minPower: 300, 
    maxPower: 599, 
    image: '300-4199/300-599.png', 
    color: '#8B4513',
    borderColor: '#654321',
  },
  { 
    name: 'novice-2', 
    displayName: '新手隊伍 II',
    minPower: 600, 
    maxPower: 899, 
    image: '300-4199/600-899.png', 
    color: '#A0522D',
    borderColor: '#8B4513',
  },
  { 
    name: 'novice-3', 
    displayName: '新手隊伍 III',
    minPower: 900, 
    maxPower: 1199, 
    image: '300-4199/900-1199.png', 
    color: '#CD853F',
    borderColor: '#A0522D',
  },
  { 
    name: 'bronze-1', 
    displayName: '青銅隊伍 I',
    minPower: 1200, 
    maxPower: 1499, 
    image: '300-4199/1200-1499.png', 
    color: '#B87333',
    borderColor: '#8B4513',
  },
  { 
    name: 'bronze-2', 
    displayName: '青銅隊伍 II',
    minPower: 1500, 
    maxPower: 1799, 
    image: '300-4199/1500-1799.png', 
    color: '#CD7F32',
    borderColor: '#A0522D',
  },
  { 
    name: 'bronze-3', 
    displayName: '青銅隊伍 III',
    minPower: 1800, 
    maxPower: 2099, 
    image: '300-4199/1800-2099.png', 
    color: '#D2691E',
    borderColor: '#B87333',
  },
  { 
    name: 'bronze-elite-1', 
    displayName: '精英青銅 I',
    minPower: 2100, 
    maxPower: 2399, 
    image: '300-4199/2100-2399.png', 
    color: '#DAA520',
    borderColor: '#B8860B',
    glowColor: 'rgba(218, 165, 32, 0.2)',
  },
  { 
    name: 'bronze-elite-2', 
    displayName: '精英青銅 II',
    minPower: 2400, 
    maxPower: 2699, 
    image: '300-4199/2400-2699.png', 
    color: '#F4A460',
    borderColor: '#CD853F',
    glowColor: 'rgba(244, 164, 96, 0.2)',
  },
  { 
    name: 'bronze-elite-3', 
    displayName: '精英青銅 III',
    minPower: 2700, 
    maxPower: 2999, 
    image: '300-4199/2700-2999.png', 
    color: '#DEB887',
    borderColor: '#D2691E',
    glowColor: 'rgba(222, 184, 135, 0.2)',
  },
  { 
    name: 'silver-prep-1', 
    displayName: '準白銀 I',
    minPower: 3000, 
    maxPower: 3299, 
    image: '300-4199/3000-3299.png', 
    color: '#A8A8A8',
    borderColor: '#808080',
    glowColor: 'rgba(168, 168, 168, 0.25)',
  },
  { 
    name: 'silver-prep-2', 
    displayName: '準白銀 II',
    minPower: 3300, 
    maxPower: 3599, 
    image: '300-4199/3300-3599.png', 
    color: '#B8B8B8',
    borderColor: '#909090',
    glowColor: 'rgba(184, 184, 184, 0.25)',
  },
  { 
    name: 'silver-prep-3', 
    displayName: '準白銀 III',
    minPower: 3600, 
    maxPower: 3899, 
    image: '300-4199/3600-3899.png', 
    color: '#C0C0C0',
    borderColor: '#A0A0A0',
    glowColor: 'rgba(192, 192, 192, 0.3)',
  },
  { 
    name: 'silver-prep-4', 
    displayName: '準白銀 IV',
    minPower: 3900, 
    maxPower: 4199, 
    image: '300-4199/3900-4199.png', 
    color: '#D3D3D3',
    borderColor: '#B0B0B0',
    glowColor: 'rgba(211, 211, 211, 0.3)',
  }
];

// 為了兼容性，保留大範圍的分級
export const PARTY_TIERS: PartyTier[] = [
  { 
    name: 'early', 
    displayName: '初級隊伍',
    minPower: 300, 
    maxPower: 4199, 
    image: 'party.png', // 默認圖片
    color: '#CD7F32',
    borderColor: '#8B4513',
  },
  { 
    name: 'silver', 
    displayName: '白銀隊伍',
    minPower: 4200, 
    maxPower: 9999, 
    image: 'party.png', 
    color: '#C0C0C0',
    borderColor: '#808080',
  },
  // ... 其他更高等級可以後續添加
];

/**
 * 根據總戰力獲取隊伍等級
 */
export function getPartyTier(totalPower: number): PartyTier {
  // 確保 totalPower 是有效數字
  const power = Number(totalPower) || 0;
  
  // 首先嘗試從詳細分級中查找（300-4199 範圍）
  const detailedTier = DETAILED_PARTY_TIERS.find(tier => 
    power >= tier.minPower && power <= tier.maxPower
  );
  
  if (detailedTier) {
    return detailedTier;
  }
  
  // 如果不在詳細分級範圍內，使用大範圍分級
  return PARTY_TIERS.find(tier => 
    power >= tier.minPower && power <= tier.maxPower
  ) || PARTY_TIERS[0]; // 默認返回初級隊伍
}

/**
 * 根據總戰力獲取隊伍圖片路徑
 */
export function getPartyImagePath(totalPower: number | bigint): string {
  const power = typeof totalPower === 'bigint' ? Number(totalPower) : totalPower;
  const tier = getPartyTier(power);
  
  // 如果圖片不存在，返回默認圖片
  return `/images/party/${tier.image}`;
}

/**
 * 獲取默認的隊伍圖片路徑（用於 fallback）
 */
export function getDefaultPartyImage(): string {
  return '/images/party/party.png';
}

/**
 * 獲取隊伍等級的顯示樣式
 */
export function getPartyTierStyles(totalPower: number | bigint) {
  const tier = getPartyTier(Number(totalPower));
  
  return {
    color: tier.color,
    borderColor: tier.borderColor,
    boxShadow: tier.glowColor ? `0 0 20px ${tier.glowColor}` : undefined,
    className: `party-tier-${tier.name}`
  };
}

/**
 * 格式化戰力顯示
 */
export function formatPowerDisplay(totalPower: number | bigint): string {
  const power = Number(totalPower);
  
  if (power >= 1000000) {
    return `${(power / 1000000).toFixed(1)}M`;
  } else if (power >= 1000) {
    return `${(power / 1000).toFixed(1)}K`;
  }
  
  return power.toLocaleString();
}

/**
 * 獲取下一個等級的信息
 */
export function getNextTierInfo(totalPower: number | bigint): { 
  nextTier: PartyTier | null; 
  powerNeeded: number;
  percentage: number;
} {
  const power = Number(totalPower);
  const currentTier = getPartyTier(power);
  const currentIndex = PARTY_TIERS.findIndex(t => t.name === currentTier.name);
  
  if (currentIndex === PARTY_TIERS.length - 1) {
    // 已經是最高等級
    return { nextTier: null, powerNeeded: 0, percentage: 100 };
  }
  
  const nextTier = PARTY_TIERS[currentIndex + 1];
  const powerNeeded = nextTier.minPower - power;
  const rangeSize = currentTier.maxPower - currentTier.minPower + 1;
  const progress = power - currentTier.minPower;
  const percentage = Math.min(100, (progress / rangeSize) * 100);
  
  return { nextTier, powerNeeded, percentage };
}