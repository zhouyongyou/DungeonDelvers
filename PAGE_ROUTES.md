# 📍 DungeonDelvers 頁面路由對照表

> 最後更新：2025-08-05

## 🌐 完整頁面路由對照

### 主要頁面路由

| 路由路徑 | 頁面組件 | 功能說明 | 錢包連接要求 |
|---------|---------|---------|-------------|
| `#/` 或 `#/dashboard` | `OverviewPage.tsx` | 總覽頁（預設首頁） | 選擇性 |
| `#/mint` | `MintPage.tsx` | 鑄造英雄/聖物 NFT | 必須 |
| `#/altar` | `AltarPage.tsx` | 升星祭壇 | 必須 |
| `#/myAssets` | `MyAssetsPageEnhanced.tsx` | 我的資產（組隊功能） | 必須 |
| `#/dungeon` | `DungeonPage.tsx` | 地下城探索 | 必須 |
| `#/marketplace` | `MarketplaceRedirect.tsx` | 市場（重定向到外部） | 選擇性 |
| `#/gameData` | `GameDataPage.tsx` | 數據中心 | 選擇性 |
| `#/vip` | `VipPage.tsx` | VIP 質押系統 | 必須 |
| `#/referral` | `ReferralPage.tsx` | 推薦邀請系統 | 必須 |
| `#/profile` | `ProfilePage.tsx` | 個人檔案 | 必須 |
| `#/admin` | `AdminPageFixed.tsx` | 管理員頁面 | 必須（管理員） |

### 特殊路由

| 路由路徑 | 頁面組件 | 功能說明 | 備註 |
|---------|---------|---------|------|
| `#/pitch` | `PitchPage.tsx` | 投資者簡報 | 支援隨機路徑 |
| `#/pitch/[任意路徑]` | `PitchPage.tsx` | 投資者簡報 | 用於分享連結 |

### 開發環境專用路由

| 路由路徑 | 頁面組件 | 功能說明 | 環境限制 |
|---------|---------|---------|----------|
| `#/debug` | `DebugContractPage.tsx` | 合約調試工具 | 僅開發環境 |
| `#/priceDebug` | `PriceDebugPage.tsx` | 價格調試工具 | 僅開發環境 |

### 舊路由重定向（向後兼容）

| 舊路由 | 新路由 | 說明 |
|--------|--------|------|
| `#/party` | `#/myAssets` | 組隊功能整合到我的資產 |
| `#/explorer` | `#/gameData` | 探索者改名為數據中心 |

## 🔗 絕對路徑範例

### 生產環境
```
https://dungeondelvers.com/#/
https://dungeondelvers.com/#/mint
https://dungeondelvers.com/#/altar
https://dungeondelvers.com/#/myAssets
https://dungeondelvers.com/#/dungeon
https://dungeondelvers.com/#/marketplace
https://dungeondelvers.com/#/gameData
https://dungeondelvers.com/#/vip
https://dungeondelvers.com/#/referral
https://dungeondelvers.com/#/profile
https://dungeondelvers.com/#/admin
```

### 本地開發
```
http://localhost:5173/#/
http://localhost:5173/#/mint
http://localhost:5173/#/altar
http://localhost:5173/#/myAssets
http://localhost:5173/#/dungeon
http://localhost:5173/#/marketplace
http://localhost:5173/#/gameData
http://localhost:5173/#/vip
http://localhost:5173/#/referral
http://localhost:5173/#/profile
http://localhost:5173/#/admin
http://localhost:5173/#/debug
http://localhost:5173/#/priceDebug
```

## 📂 頁面檔案位置

所有頁面組件都位於 `/src/pages/` 目錄下：

```
src/pages/
├── OverviewPage.tsx          # 總覽頁
├── MintPage.tsx              # 鑄造頁
├── AltarPage.tsx             # 升星頁
├── MyAssetsPageEnhanced.tsx  # 我的資產頁
├── DungeonPage.tsx           # 地城頁
├── MarketplaceRedirect.tsx   # 市場重定向頁
├── GameDataPage.tsx          # 數據中心頁
├── VipPage.tsx               # VIP頁
├── ReferralPage.tsx          # 推薦頁
├── ProfilePage.tsx           # 個人檔案頁
├── AdminPageFixed.tsx        # 管理頁
├── PitchPage.tsx             # 投資者簡報頁
├── DebugContractPage.tsx     # 合約調試頁（開發用）
└── PriceDebugPage.tsx        # 價格調試頁（開發用）
```

## 🔄 路由系統說明

1. **Hash 路由**：使用 `#/` 格式的 hash 路由系統
2. **預設路由**：空路徑或無效路徑都會導向 `OverviewPage`
3. **懶加載**：所有頁面都使用 React.lazy 進行動態導入
4. **錯誤處理**：404 錯誤會自動導向總覽頁

## 🎯 查詢參數支援

部分頁面支援查詢參數：

- `#/myAssets?tab=heroes` - 直接打開英雄標籤
- `#/myAssets?tab=relics` - 直接打開聖物標籤
- `#/myAssets?tab=parties` - 直接打開隊伍標籤
- `#/gameData?view=leaderboard` - 直接打開排行榜

## 🔐 權限說明

- **選擇性**：未連接錢包可查看部分內容
- **必須**：需要連接錢包才能使用功能
- **管理員**：需要管理員權限的錢包地址

## 📱 特殊域名處理

- **Pitch 專用域名**：`pitch.dungeondelvers.com` 會自動導向投資者簡報頁
- **域名檢測**：通過 `isPitchDomain()` 函數判斷

## 🚀 快速導航

在開發時，可以使用鍵盤快捷鍵：
- `Ctrl+K` 或 `Cmd+K`：打開命令面板快速導航
- `?`：顯示鍵盤快捷鍵幫助