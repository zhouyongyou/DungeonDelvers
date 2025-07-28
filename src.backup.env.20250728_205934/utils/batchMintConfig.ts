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
    maxRarity: 2,
    tierName: "單個鑄造",
    description: "最高2★ (防撞庫限制)",
    probabilities: [70, 30, 0, 0, 0]  // 更嚴格的機率，1星更高
  },
  {
    minQuantity: 5,
    maxRarity: 2,
    tierName: "青銅包",
    description: "入門級批量，最高2★",
    probabilities: [60, 40, 0, 0, 0]
  },
  {
    minQuantity: 10,
    maxRarity: 3,
    tierName: "白銀包", 
    description: "進階批量，最高3★",
    probabilities: [50, 35, 15, 0, 0]
  },
  {
    minQuantity: 20,
    maxRarity: 4,
    tierName: "黃金包",
    description: "高級批量，最高4★", 
    probabilities: [45, 35, 15, 5, 0]
  },
  {
    minQuantity: 50,
    maxRarity: 5,
    tierName: "鉑金包",
    description: "完整機率，最高5★",
    probabilities: [44, 35, 15, 5, 1]
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