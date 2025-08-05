# 🔐 DungeonDelvers 錢包連接狀態頁面對照表

> 最後更新：2025-08-05

## 📊 未連接錢包時的頁面顯示完整對照

### 🌐 生產環境絕對路徑

#### ✅ 有預覽或特殊處理的頁面

| 絕對路徑 | 未連接時顯示 | 連接後顯示 | 說明 |
|---------|-------------|-----------|------|
| `https://dungeondelvers.com/#/` | OverviewPage.tsx（項目介紹模式） | OverviewPage.tsx（個人儀表板模式） | 根據連接狀態顯示不同內容 |
| `https://dungeondelvers.com/#/dashboard` | 同上 | 同上 | 與首頁相同 |
| `https://dungeondelvers.com/#/mint` | MintPagePreview.tsx | MintPage.tsx | 預覽顯示鑄造機制說明 |
| `https://dungeondelvers.com/#/altar` | AltarPagePreview.tsx | AltarPage.tsx | 預覽顯示升星機制說明 |
| `https://dungeondelvers.com/#/profile` | EmptyState.tsx | ProfilePage.tsx | 提示「請先連接錢包」 |
| `https://dungeondelvers.com/#/admin` | EmptyState.tsx | AdminPageFixed.tsx | 提示「請先連接錢包」 |
| `https://dungeondelvers.com/#/referral` | ReferralPage.tsx（落地頁模式） | ReferralPage.tsx（推薦統計模式） | 根據 URL 參數和連接狀態動態顯示 |
| `https://dungeondelvers.com/#/referral?ref=0x...` | ReferralPage.tsx（推薦落地頁） | ReferralPage.tsx（推薦統計） | 帶推薦參數時顯示特殊落地頁 |

#### ✅ 已修復 - 現在有錢包連接檢查的頁面

| 絕對路徑 | 未連接時顯示 | 提示訊息 | 修復日期 |
|---------|------------|---------|----------|
| `https://dungeondelvers.com/#/myAssets` | EmptyState.tsx | 「請先連接錢包以查看你的資產」 | 2025-08-05 |
| `https://dungeondelvers.com/#/dungeon` | EmptyState.tsx | 「請先連接錢包以進行地下城探索」 | 2025-08-05 |
| `https://dungeondelvers.com/#/vip` | EmptyState.tsx | 「請先連接錢包以使用 VIP 功能」 | 2025-08-05 |

#### ✅ 不需要錢包的公開頁面

| 絕對路徑 | 功能說明 | 為何不需要錢包 |
|---------|---------|--------------|
| `https://dungeondelvers.com/#/gameData` | 遊戲數據中心、排行榜 | 公開資訊，所有人可查看 |
| `https://dungeondelvers.com/#/marketplace` | 市場重定向頁 | 僅作跳轉用途 |
| `https://dungeondelvers.com/#/pitch` | 投資者簡報（已封存） | 靜態展示頁面 |

### 🖥️ 本地開發環境絕對路徑

#### ✅ 有預覽或特殊處理的頁面

| 絕對路徑 | 未連接時顯示 | 說明 |
|---------|-------------|------|
| `http://localhost:5173/#/` | OverviewPage.tsx（項目介紹） | 顯示遊戲介紹、特色、路線圖 |
| `http://localhost:5173/#/mint` | MintPagePreview.tsx | 鑄造機制預覽 |
| `http://localhost:5173/#/altar` | AltarPagePreview.tsx | 升星機制預覽 |
| `http://localhost:5173/#/profile` | EmptyState.tsx | 錢包連接提示 |
| `http://localhost:5173/#/admin` | EmptyState.tsx | 錢包連接提示 |
| `http://localhost:5173/#/referral?ref=0x...` | ReferralPage.tsx（落地頁） | 推薦落地頁 |

#### ⚠️ 開發環境特有頁面

| 絕對路徑 | 未連接時行為 | 說明 |
|---------|------------|------|
| `http://localhost:5173/#/debug` | EmptyState.tsx | 調試工具需要錢包 |
| `http://localhost:5173/#/priceDebug` | EmptyState.tsx | 價格調試需要錢包 |

## 📍 組件檔案位置對照

### 預覽組件位置
```
src/components/
├── mint/
│   ├── MintPagePreview.tsx         # 鑄造頁預覽
│   └── MintPagePreviewResponsive.tsx # 響應式版本
├── altar/
│   └── AltarPagePreview.tsx        # 升星頁預覽
├── marketplace/
│   ├── MarketplacePreview.tsx      # 市場預覽（未使用）
│   └── MarketplacePreviewNoData.tsx # 無數據市場預覽
├── common/
│   ├── PagePreview.tsx             # 通用預覽模板
│   └── PreviewFooterNote.tsx       # 預覽頁腳註
└── ui/
    └── EmptyState.tsx              # 空狀態/錢包提示
```

### 頁面組件位置
```
src/pages/
├── OverviewPage.tsx               # 總覽頁（條件渲染）
├── MintPage.tsx                   # 鑄造頁（有預覽檢查）
├── AltarPage.tsx                  # 升星頁（有預覽檢查）
├── MyAssetsPageEnhanced.tsx       # 我的資產（⚠️ 無檢查）
├── DungeonPage.tsx                # 地城頁（⚠️ 無檢查）
├── VipPage.tsx                    # VIP頁（有網路檢查）
├── ReferralPage.tsx               # 推薦頁（智慧處理）
├── GameDataPage.tsx               # 數據中心（公開頁面）
├── MarketplaceRedirect.tsx        # 市場跳轉（公開頁面）
├── ProfilePage.tsx                # 個人檔案（App.tsx 攔截）
├── AdminPageFixed.tsx             # 管理頁（App.tsx 攔截）
└── archived/
    └── PitchPage.tsx              # 投資簡報（已封存）
```

## 🔍 技術實現細節

### 1. App.tsx 的錢包檢查邏輯

```typescript
// App.tsx 第 184-193 行
const pageRequiresWallet: Page[] = ['admin', 'profile'];

if (!isConnected && pageRequiresWallet.includes(activePage)) {
    return (
        <div className="mt-10">
            <EmptyState message="請先連接錢包" />
        </div>
    );
}
```

### 2. 頁面級錢包檢查模式

```typescript
// 模式 A：返回預覽組件
if (!address) {
    return <MintPagePreview />;
}

// 模式 B：條件渲染不同內容
if (!isConnected) {
    return (
        <div>項目介紹內容...</div>
    );
} else {
    return (
        <div>個人化儀表板...</div>
    );
}

// 模式 C：顯示錯誤提示
if (!isConnected || chainId !== bsc.id) {
    return <EmptyState message="請連接到 BSC 網路" />;
}
```

## 🚨 重要發現與建議

### ✅ 已完成的改進
1. **MyAssetsPageEnhanced.tsx** - 已添加錢包連接檢查（2025-08-05）
2. **DungeonPage.tsx** - 已添加錢包連接檢查（2025-08-05）
3. **VipPage.tsx** - 已添加錢包連接檢查（2025-08-05）

### 🎯 未來改進建議
1. 為 DungeonPage 和 VipPage 創建預覽組件
2. 實施漸進式 Web3 體驗設計模式
3. 添加更多引導性內容幫助新用戶了解功能

## 📱 特殊域名處理

- **Pitch 專用域名**：`https://pitch.dungeondelvers.com` → 自動導向 `#/pitch`
- **檢測函數**：`isPitchDomain()` 在 `src/utils/domainRouter.ts`

## 🔄 路由處理流程

1. 用戶訪問 URL
2. `App.tsx` 的 `getPageFromHash()` 解析路由
3. 檢查是否在 `pageRequiresWallet` 列表中
4. 如果需要錢包但未連接 → 顯示 `EmptyState`
5. 否則 → 載入對應頁面組件
6. 頁面組件內部可能有額外的錢包檢查

---

*此文檔應與 [PAGE_ROUTES.md](./PAGE_ROUTES.md) 一起閱讀，以獲得完整的路由系統理解。*