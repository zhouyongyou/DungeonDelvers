# 管理員權限頁面設置指南

## 概述
本專案的管理員權限頁面主要位於 `src/pages/AdminPage.tsx`，提供完整的智能合約管理功能。此頁面僅對特定開發者地址開放，具有嚴格的權限控制機制。

## 主要組件位置

### 1. 核心頁面檔案
- **主要頁面**: `src/pages/AdminPage.tsx` (355行)
  - 超級管理控制台的主要介面
  - 包含合約串接、參數管理、價格控制等功能
  - 實現了嚴格的權限驗證機制

### 2. 管理員專用組件目錄
位於 `src/components/admin/` 目錄下的組件：

- `AdminSection.tsx` - 管理頁面區塊包裝器
- `AddressSettingRow.tsx` - 合約地址設定行組件
- `SettingRow.tsx` - 一般設定行組件
- `ReadOnlyRow.tsx` - 唯讀顯示行組件
- `DungeonManager.tsx` - 地城參數管理器
- `AltarRuleManager.tsx` - 升星祭壇規則管理器

## 權限控制機制

### 1. 開發者身份驗證
在 `src/components/layout/Header.tsx` 第108-112行：
```typescript
const isDeveloper = isConnected && address?.toLowerCase() === DEVELOPER_ADDRESS.toLowerCase();

// 在導航選單中僅對開發者顯示管理員選項
if (isDeveloper) {
    items.push({ key: 'admin', label: t('navigation:menu.admin') });
}
```

### 2. 合約擁有者驗證
在 `AdminPage.tsx` 第185-187行：
```typescript
if (ownerAddress && ownerAddress.toLowerCase() !== address?.toLowerCase()) {
    return <EmptyState message="權限不足，僅合約擁有者可訪問。" />;
}
```

### 3. 開發者地址配置
開發者地址定義在 `src/config/constants.ts` 中的 `DEVELOPER_ADDRESS` 常數。

## 頁面路由設置

### 1. 應用程式路由配置
在 `src/App.tsx` 中：

- **第22行**: 動態導入管理員頁面
  ```typescript
  const AdminPage = lazy(() => import('./pages/AdminPage'));
  ```

- **第46行**: 有效頁面列表包含 'admin'
  ```typescript
  const validPages: Page[] = ['dashboard', 'mint', 'party', 'dungeon', 'explorer', 'admin', 'altar', 'profile', 'vip', 'referral', 'codex'];
  ```

- **第78行**: 需要錢包連接的頁面列表
  ```typescript
  const pageRequiresWallet: Page[] = ['dashboard', 'mint', 'party', 'dungeon', 'admin', 'altar', 'profile', 'vip', 'referral', 'codex'];
  ```

- **第95行**: 頁面渲染邏輯
  ```typescript
  case 'admin': return <AdminPage />;
  ```

## 管理功能模組

### 1. 合約串接中心
- 設定各模組合約地址
- 批次配置功能
- 從環境變數載入設定

### 2. 地城參數管理
- 地城難度設定
- 探索參數調整
- 獎勵機制配置

### 3. 升星祭壇規則管理
- 升星機率設定
- 材料需求配置
- 費用設定

### 4. 核心價格管理 (USD)
- 英雄鑄造價格
- 聖物鑄造價格
- 儲備購買價格

### 5. 平台費用管理 (BNB)
- 各類平台手續費
- 探索費用設定

### 6. 稅務與提現系統
- 稅率參數設定
- 提現門檻配置
- 佣金比例設定

### 7. 遊戲機制參數
- 休息成本係數
- VIP質押冷卻時間

## 存取方式

1. **連接錢包**: 必須使用指定的開發者地址連接錢包
2. **網路要求**: 必須連接到 BSC (Binance Smart Chain) 主網
3. **URL存取**: 透過 `#/admin` 路由存取
4. **導航選單**: 僅對開發者顯示「管理員」選項

## 安全特性

1. **雙重驗證**: 
   - 前端檢查開發者地址
   - 後端檢查合約擁有者身份

2. **鏈上權限**: 
   - 所有管理功能都需要合約擁有者權限
   - 無法通過前端繞過權限限制

3. **交易追蹤**: 
   - 所有管理操作都會產生區塊鏈交易
   - 具有完整的操作記錄和追蹤

## 技術實現細節

- 使用 **wagmi** 進行鏈上互動
- 採用 **React Suspense** 實現頁面懶加載
- 整合 **錯誤邊界** 確保穩定性
- 支援 **多語言** 顯示
- 具備 **交易狀態追蹤** 功能

## 總結

管理員權限頁面是一個功能完整、安全性高的智能合約管理介面，主要設置在 `AdminPage.tsx` 並配合相關組件實現。其權限控制機制確保只有授權用戶才能存取和操作關鍵的合約參數。