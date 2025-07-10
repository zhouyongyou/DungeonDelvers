# BSC 網路切換功能實作文件

## 問題描述

您提到的問題是對的！網站確實缺少讓用戶切換到 BSC 鏈的按鈕功能。用戶可能使用 ETH 錢包連接，但由於沒有網路切換功能，導致功能無法正常運作。

## 問題分析

### 原始狀況：
1. **應用程式只支援 BSC 主網**：`src/wagmi.ts` 中的設定只包含 BSC 鏈
2. **缺少網路切換 UI**：沒有提供用戶切換網路的介面
3. **用戶體驗差**：用戶連接錢包後，如果在錯誤的網路上，沒有明確的提示或解決方案

### 根本原因：
- 用戶可能預設連接到以太坊主網
- 應用程式期望用戶在 BSC 主網上
- 沒有自動檢測或提示用戶切換網路

## 實作解決方案

### 1. 新增網路切換元件（NetworkSwitcher）

**檔案：** `src/components/ui/NetworkSwitcher.tsx`

**功能：**
- 顯示目前連接的網路狀態
- 提供一鍵切換到 BSC 主網的功能
- 視覺化指示器（綠色 = 正確網路，紅色 = 錯誤網路）
- 響應式設計，適配桌面和行動裝置

**主要特色：**
```typescript
const isOnBSC = chain?.id === bsc.id;
const isOnWrongNetwork = isConnected && !isOnBSC;
```

### 2. 新增網路錯誤警告橫幅（WrongNetworkBanner）

**檔案：** `src/components/ui/WrongNetworkBanner.tsx`

**功能：**
- 在用戶連接錯誤網路時顯示明顯的警告訊息
- 說明當前網路和需要的網路
- 提供直接切換按鈕
- 自動隱藏（當用戶在正確網路上時）

### 3. 新增 AlertTriangle 圖示

**檔案：** `src/components/ui/icons.tsx`

**新增內容：**
- `AlertTriangleIcon` 元件
- 整合到 `Icons` 物件中
- 用於警告和錯誤狀態的視覺指示

### 4. 整合到主要元件

**更新的檔案：**
- `src/components/layout/Header.tsx`：新增 NetworkSwitcher
- `src/App.tsx`：新增 WrongNetworkBanner

## 使用者體驗流程

### 正常流程：
1. 用戶連接錢包
2. 如果已在 BSC 主網 → 顯示綠色狀態指示器
3. 所有功能正常運作

### 錯誤網路流程：
1. 用戶連接錢包（但在以太坊主網）
2. 顯示紅色狀態指示器
3. 顯示警告橫幅，說明需要切換到 BSC
4. 用戶點擊切換按鈕
5. 錢包提示切換網路
6. 切換完成後，警告消失，功能正常運作

## 技術實作細節

### 使用的 wagmi hooks：
- `useAccount()`: 取得當前連接狀態和鏈資訊
- `useSwitchChain()`: 處理網路切換功能

### 網路檢測邏輯：
```typescript
const { chain, isConnected } = useAccount();
const isOnBSC = chain?.id === bsc.id;
const isOnWrongNetwork = isConnected && !isOnBSC;
```

### 切換網路邏輯：
```typescript
const { switchChain, isPending } = useSwitchChain();
const handleSwitchToBSC = () => {
  switchChain({ chainId: bsc.id });
};
```

## 視覺設計

### 網路狀態指示器：
- ✅ **正確網路 (BSC)**：綠色背景，綠色點，顯示 "BSC 主網"
- ❌ **錯誤網路**：紅色背景，紅色點，顯示實際網路名稱 + 警告圖示

### 警告橫幅：
- 紅色邊框和背景
- 警告三角形圖示
- 清楚的說明文字
- 顯著的切換按鈕

## 測試建議

### 測試場景：
1. **正確網路連接**：
   - 錢包已設定 BSC 主網
   - 連接後應顯示綠色狀態
   - 不應顯示警告橫幅

2. **錯誤網路連接**：
   - 錢包設定為以太坊主網
   - 連接後應顯示紅色狀態
   - 應顯示警告橫幅
   - 點擊切換按鈕應觸發錢包切換網路

3. **網路切換後**：
   - 切換完成後狀態應更新
   - 警告橫幅應消失
   - 應用程式功能應正常運作

## 後續建議

### 可能的改進：
1. **自動切換提示**：第一次連接時如果在錯誤網路，自動彈出切換提示
2. **網路歷史記錄**：記住用戶的網路偏好
3. **多鏈支援**：如果未來需要支援其他鏈，可以擴展這個架構
4. **錯誤處理**：處理網路切換失敗的情況

### 維護注意事項：
- 確保 BSC 鏈 ID 正確（目前使用 `bsc.id` 從 wagmi/chains）
- 監控 RPC 節點的可用性
- 定期檢查網路切換功能是否正常

## 檔案變更摘要

```
新增檔案：
├── src/components/ui/NetworkSwitcher.tsx
├── src/components/ui/WrongNetworkBanner.tsx
└── BSC_NETWORK_SWITCHING_IMPLEMENTATION.md

修改檔案：
├── src/components/ui/icons.tsx (新增 AlertTriangle 圖示)
├── src/components/layout/Header.tsx (整合 NetworkSwitcher)
└── src/App.tsx (整合 WrongNetworkBanner)
```

這個實作完全解決了您提到的問題：用戶現在可以清楚地看到網路狀態，並且有明確的方式切換到 BSC 主網！