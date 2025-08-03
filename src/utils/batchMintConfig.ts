// 批量鑄造防撞庫配置
export interface BatchTier {
  minQuantity: number;
  maxRarity: number;
  tierName: string;
  description: string;
  probabilities: number[];
}

export const BATCH_TIERS: BatchTier[] = [
  {
    minQuantity: 1,
    maxRarity: 5, // V26: 統一機率，所有數量都支援最高 5★
    tierName: "單個鑄造",
    description: "統一機率分布",
    probabilities: [44, 35, 15, 5, 1]  // V26: 統一使用相同機率
  },
  {
    minQuantity: 5,
    maxRarity: 5, // V26: 統一機率
    tierName: "青銅包",
    description: "統一機率分布",
    probabilities: [44, 35, 15, 5, 1]  // V26: 統一使用相同機率
  },
  {
    minQuantity: 10,
    maxRarity: 5, // V26: 統一機率
    tierName: "白銀包", 
    description: "統一機率分布",
    probabilities: [44, 35, 15, 5, 1]  // V26: 統一使用相同機率
  },
  {
    minQuantity: 20,
    maxRarity: 5, // V26: 統一機率
    tierName: "黃金包",
    description: "統一機率分布", 
    probabilities: [44, 35, 15, 5, 1]  // V26: 統一使用相同機率
  },
  {
    minQuantity: 50,
    maxRarity: 5, // V26: 保持不變
    tierName: "鉑金包",
    description: "統一機率分布",
    probabilities: [44, 35, 15, 5, 1]  // V26: 保持相同機率
  }
];

export const RARITY_LABELS = ['普通 ★', '罕見 ★★', '稀有 ★★★', '史詩 ★★★★', '傳說 ★★★★★'];
export const RARITY_COLORS = ['text-gray-400', 'text-green-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400'];

// 根據數量獲取對應的批量階層
export function getBatchTierForQuantity(quantity: number): BatchTier | null {
  // 從高到低檢查階層
  for (let i = BATCH_TIERS.length - 1; i >= 0; i--) {
    if (quantity >= BATCH_TIERS[i].minQuantity) {
      return BATCH_TIERS[i];
    }
  }
  return null;
}