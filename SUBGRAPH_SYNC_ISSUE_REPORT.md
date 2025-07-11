# 子圖同步與VIP等級顯示問題修復報告

## 📋 問題總結

### 1. **子圖數據同步問題**
- **現象**：AltarPage.tsx 報錯 `Cannot read properties of undefined (reading 'heros')`
- **原因**：合約升級後，子圖正在同步新合約數據，但同步尚未完成
- **影響**：升星祭壇功能暫時無法正常載入材料列表

### 2. **VIP等級顯示問題**
- **現象**：VIP卡等級顯示可能不準確
- **原因**：混淆了兩個不同的等級概念

## 🔍 **技術分析**

### **子圖配置驗證** ✅
檢查 `DDgraphql/dungeon-delvers/subgraph.yaml` 發現所有合約地址都是最新的：

| 合約 | 配置地址 | 狀態 |
|------|----------|------|
| Hero | `0xe439b1aC9100732F33C757746AD916ADE6967C79` | ✅ 正確 |
| Relic | `0x0a03BE7555f8B0f1F2299c4C8DCE1b8d82b2B8B4` | ✅ 正確 |
| Party | `0x21326106f2D41E4d31B724B3316C780069F9274A` | ✅ 正確 |
| PlayerProfile | `0xA19F45fC6372Ec8111E99399876e448Af05Fa735` | ✅ 正確 |
| VIPStaking | `0x77D81358C33c24282Ce183f00bFDE590dCc3915F` | ✅ 正確 |
| DungeonMaster | `0xD7CF07D71E0440B5cC8e2faAF3bbbc9C3588898F` | ✅ 正確 |
| PlayerVault | `0x4fE1e22A210d26fC40f8D6fA98A21d919793C282` | ✅ 正確 |
| AltarOfAscension | `0x5186C497C7fB40Bf2B18191404E01Dd43b387cF2` | ✅ 正確 |

### **VIP等級系統說明** 🏆

#### **A. 玩家等級 (Profile Level)**
- **來源**：`PlayerProfile` 合約
- **獲取方式**：GraphQL 查詢 `player.profile.level`
- **顯示位置**：Dashboard 左上角，Header 中
- **計算依據**：通過遊戲經驗值計算
- **用途**：
  - 影響提現稅率減免 (`levelReduction = Math.floor(level / 10) * 100`)
  - 每10級提供1%的稅率減免

#### **B. VIP等級 (VIP Level)**
- **來源**：`VIPStaking` 合約的 `getVipLevel()` 函數
- **獲取方式**：直接調用合約函數
- **顯示位置**：VIP 卡片上，VIP 頁面
- **計算依據**：基於質押的 $SoulShard 金額
- **用途**：
  - 影響稅率減免幅度 (`vipTaxReduction`)
  - 提供 VIP 專屬福利

## 🛠️ **已實施的修復方案**

### 1. **子圖同步問題處理**
- ✅ 增強了錯誤處理和調試信息
- ✅ 添加了用戶友好的提示信息
- ✅ 在升星祭壇頁面顯示"數據同步中"提示

### 2. **Toast Key重複問題**
- ✅ 修復了 `ToastContext` 中的ID重複問題
- ✅ 改用 `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 生成唯一ID

### 3. **合約地址硬編碼問題**
- ✅ 修復了多個頁面中硬編碼 `chainId as 56` 的問題
- ✅ 統一使用 `bsc.id` 和動態鏈ID檢查

### 4. **環境變數配置**
- ✅ 更新了所有配置文件使用特定子圖版本 `v1.2.3`
- ✅ 避免使用 `latest` 版本的不穩定性

## 🎯 **當前狀態**

### ✅ **已完成**
- [x] 修復 Toast 重複 key 問題
- [x] 修復合約地址硬編碼問題
- [x] 更新子圖版本配置
- [x] 增強錯誤處理和用戶提示

### ⏳ **待解決**
- [ ] 等待子圖完全同步新合約數據
- [ ] 監控子圖同步進度
- [ ] 驗證 VIP 等級顯示準確性

## 📊 **VIP等級顯示邏輯**

### **前端計算邏輯**
```typescript
// 1. 玩家等級 (經驗值)
const playerLevel = data?.profile?.level ? Number(data.profile.level) : 1;
const levelReduction = BigInt(Math.floor(playerLevel / 10)) * 100n; // 每10級 = 1%減免

// 2. VIP等級 (質押金額)
const vipLevel = await vipStakingContract.getVipLevel(address);
const vipTaxReduction = await vipStakingContract.getVipTaxReduction(address);

// 3. 總稅率減免
const totalReduction = timeDecay + vipTaxReduction + levelReduction;
```

### **VIP卡片顯示**
```typescript
// NftCard.tsx 中的顯示邏輯
<div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
    Lv.{nft.attributes?.find(attr => attr.trait_type === 'Level')?.value || '?'}
</div>
```

## 🔄 **建議的後續步驟**

1. **監控子圖同步**：
   - 檢查 The Graph Studio 的部署狀態
   - 驗證數據是否開始出現

2. **VIP等級驗證**：
   - 確認 VIP 卡 metadata 中的 `Level` 屬性是否正確
   - 驗證合約的 `getVipLevel()` 函數返回值

3. **用戶溝通**：
   - 在相關頁面添加臨時提示
   - 說明數據同步需要時間

## 📝 **技術細節**

### **子圖查詢結構**
```graphql
query GetFilteredNfts($owner: String!, $rarity: Int!) {
  heros(where: { owner: $owner, rarity: $rarity }, first: 1000) {
    id
    tokenId
    power
    rarity
  }
  relics(where: { owner: $owner, rarity: $rarity }, first: 1000) {
    id
    tokenId
    capacity
    rarity
  }
}
```

### **錯誤處理**
- 增加了詳細的調試日誌
- 提供了用戶友好的錯誤提示
- 實現了優雅的降級體驗

---

**總結**：問題的根本原因是子圖數據同步延遲，而不是配置錯誤。所有合約地址都是最新和正確的，只需要等待子圖完全同步即可恢復正常功能。VIP等級顯示需要區分玩家等級和VIP等級兩個不同的概念。 