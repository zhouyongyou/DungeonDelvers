// 臨時價格覆蓋配置
// 當 Oracle 無法正常工作時使用

export const PRICE_OVERRIDE = {
  // 是否啟用價格覆蓋
  enabled: false, // 關閉以進行實際 DEBUG
  
  // 價格配置
  prices: {
    // 1 USD = 16,500 SOUL (基於 Uniswap Pool 的近似值)
    usdToSoul: 16500,
    
    // 每個 NFT 的 USD 價格
    mintPriceUSD: 2,
    
    // 計算每個 NFT 需要的 SOUL
    soulPerNft: 33000 // 2 USD * 16,500 = 33,000 SOUL
  },
  
  // 計算函數
  calculateSoulRequired: (quantity: number): bigint => {
    // 33,000 SOUL per NFT * quantity
    const totalSoul = BigInt(33000) * BigInt(quantity);
    // 轉換為 wei (18 decimals)
    return totalSoul * BigInt(10) ** BigInt(18);
  }
};

// 日誌函數
export function logPriceOverride(type: string, quantity: number) {
  if (PRICE_OVERRIDE.enabled) {
    console.log(`[PriceOverride] 使用固定價格計算 ${type}:`, {
      quantity,
      pricePerNft: PRICE_OVERRIDE.prices.soulPerNft,
      totalSoul: PRICE_OVERRIDE.prices.soulPerNft * quantity,
      reason: 'Oracle 合約無法正常工作'
    });
  }
}