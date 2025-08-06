# 隊伍戰力分級系統 - 實施指南

## 🎯 實施步驟

### 步驟 1：準備圖片資源

在 `/public/images/party/` 目錄下創建以下圖片文件：

```bash
# 圖片命名規範
party-bronze.png      # 青銅隊伍 (300-4,199)
party-silver.png      # 白銀隊伍 (4,200-9,999)
party-gold.png        # 黃金隊伍 (10,000-19,999)
party-platinum.png    # 白金隊伍 (20,000-39,999)
party-diamond.png     # 鑽石隊伍 (40,000-79,999)
party-master.png      # 大師隊伍 (80,000-149,999)
party-grandmaster.png # 宗師隊伍 (150,000-299,999)
party-legend.png      # 傳奇隊伍 (300,000+)
```

### 步驟 2：已實現的功能

✅ **已完成的文件：**

1. **`src/utils/partyTiers.ts`** - 戰力分級核心邏輯
   - `getPartyTier()` - 根據戰力獲取等級
   - `getPartyImagePath()` - 獲取對應圖片路徑
   - `getPartyTierStyles()` - 獲取視覺樣式
   - `formatPowerDisplay()` - 格式化戰力顯示

2. **`src/api/nfts.ts`** - 已更新支持動態圖片
   - 在 `parseNfts` 函數中自動根據戰力選擇圖片
   - 添加了 "Tier" 屬性到 NFT attributes

3. **`src/components/ui/PartyTierBadge.tsx`** - 新增徽章組件
   - 顯示隊伍等級的視覺徽章
   - 可選顯示升級進度條

### 步驟 3：使用範例

#### 在 NFT 卡片中使用：

```tsx
import { PartyTierBadge, PartyTierIcon } from './components/ui/PartyTierBadge';

// 在 NftCard 組件中
{nft.type === 'party' && (
  <div className="absolute top-2 right-2">
    <PartyTierIcon totalPower={nft.totalPower} size={32} />
  </div>
)}

// 在詳情頁面中
{nft.type === 'party' && (
  <PartyTierBadge 
    totalPower={nft.totalPower} 
    showProgress={true}
    size="lg"
  />
)}
```

#### 在隊伍列表中使用：

```tsx
// 隊伍卡片組件
const PartyCard = ({ party }) => {
  const tier = getPartyTier(Number(party.totalPower));
  const styles = getPartyTierStyles(party.totalPower);
  
  return (
    <div 
      className="party-card"
      style={{ borderColor: styles.borderColor }}
    >
      <img 
        src={getPartyImagePath(party.totalPower)} 
        alt={`${tier.displayName}`}
      />
      <PartyTierBadge totalPower={party.totalPower} />
    </div>
  );
};
```

### 步驟 4：可選的增強功能

#### 1. 添加動畫效果

```css
/* 在 globals.css 中添加 */
.party-tier-legend {
  animation: legendary-glow 2s ease-in-out infinite;
}

@keyframes legendary-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(243, 156, 18, 0.6); }
  50% { box-shadow: 0 0 40px rgba(243, 156, 18, 0.8); }
}
```

#### 2. 更新 ImageWithFallback 組件

如果需要在 ImageWithFallback 中支持動態隊伍圖片：

```tsx
// 添加 totalPower prop
interface ImageWithFallbackProps {
  // ... 現有 props
  totalPower?: number | bigint; // 新增
}

// 在 getSmartFallback 函數中
case 'party':
  return totalPower 
    ? getPartyImagePath(totalPower)
    : `/images/party/party.png`;
```

### 步驟 5：測試檢查清單

- [ ] 準備 8 張不同等級的隊伍圖片
- [ ] 確認圖片路徑正確 (`/public/images/party/party-{tier}.png`)
- [ ] 測試不同戰力值的隊伍顯示正確圖片
- [ ] 確認 NFT 屬性中包含 "Tier" 信息
- [ ] 測試 PartyTierBadge 組件顯示效果
- [ ] 檢查手機版顯示效果

### 步驟 6：後續優化建議

1. **緩存優化**：
   - 預加載常見等級的圖片
   - 使用 service worker 緩存圖片

2. **視覺增強**：
   - 為高等級隊伍添加粒子效果
   - 實現等級提升動畫

3. **數據分析**：
   - 統計各等級隊伍分佈
   - 顯示玩家在所有隊伍中的排名

## 🚨 注意事項

1. **圖片大小**：建議每張圖片控制在 100KB 以內
2. **兼容性**：系統會自動 fallback 到默認圖片
3. **性能**：大量隊伍列表時考慮使用虛擬滾動

## 📝 更新日誌

- 2025-07-29：初始實現戰力分級系統
- 已更新 `nfts.ts` 支持動態圖片選擇
- 創建 `PartyTierBadge` 組件