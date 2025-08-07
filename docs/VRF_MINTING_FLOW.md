# VRF 鑄造流程文檔

## 🎯 問題背景

之前的鑄造流程存在嚴重的用戶體驗問題：
- 交易確認後立即顯示「鑄造成功」，但實際上 NFT 的屬性還未確定
- 缺少 VRF 等待狀態的 UI 反饋
- 用戶不理解為什麼需要等待 2-3 分鐘才能看到 NFT

## 🔧 解決方案

實施了完整的 VRF 雙階段監聽系統：

### 階段 1：MintCommitted 事件（VRF 請求提交）
- 交易確認後觸發
- 顯示 VRF 等待模態框
- 告知用戶正在生成隨機屬性

### 階段 2：HeroMinted/RelicMinted 事件（VRF 完成）
- Chainlink VRF 返回隨機數後觸發
- NFT 屬性確定
- 顯示鑄造成功結果

## 📁 修改的文件

### 1. `/src/components/mint/VRFWaitingModal.tsx`
新創建的 VRF 等待狀態模態框組件，包含：
- 動態進度指示
- 三階段視覺化（請求→處理→完成）
- VRF 機制說明
- 超時處理

### 2. `/src/hooks/useContractEvents.optimized.ts`
添加了 `MintCommitted` 事件監聽：
```typescript
// VRF 階段 1：監聽 MintCommitted
useWatchContractEvent({ 
    eventName: 'MintCommitted',
    onLogs: (log) => {
        // 設置 VRF 等待狀態
        queryClient.setQueryData(['vrfWaiting', type, address], {
            isWaiting: true,
            quantity: Number(quantity),
            timestamp: Date.now()
        });
    }
});

// VRF 階段 2：監聽 HeroMinted
useWatchContractEvent({
    eventName: 'HeroMinted', 
    onLogs: (log) => {
        // 清除 VRF 等待狀態
        queryClient.setQueryData(['vrfWaiting', type, address], null);
    }
});
```

### 3. `/src/pages/MintPage.tsx`
修改了鑄造成功處理邏輯：
- 交易成功後不立即顯示「鑄造成功」
- 改為顯示 VRF 等待模態框
- 監聽 VRF 完成狀態並更新 UI

## 🚀 用戶體驗改進

### 之前的流程（錯誤）
1. 用戶點擊鑄造 → 交易確認 → 顯示「鑄造成功」
2. 用戶查看資產 → 看不到 NFT（還在 VRF 處理中）
3. 用戶困惑：「為什麼沒有 NFT？」

### 現在的流程（正確）
1. 用戶點擊鑄造 → 交易確認 → 顯示「VRF 請求已提交」
2. 顯示等待動畫和預計時間（10-30秒）
3. VRF 完成 → 顯示「鑄造成功」→ NFT 立即可見

## 🎲 VRF 機制說明

### 什麼是 VRF？
VRF（Verifiable Random Function）是 Chainlink 提供的可驗證隨機數服務：
- 確保 NFT 稀有度的絕對公平
- 無法預測或操控結果
- 鏈上可驗證的隨機性

### 為什麼需要等待？
1. 智能合約向 Chainlink 請求隨機數
2. Chainlink 節點生成隨機數（10-30秒）
3. 隨機數返回後確定 NFT 屬性

## 📊 技術實現細節

### 狀態管理
使用 React Query 管理 VRF 等待狀態：
```typescript
// 設置等待狀態
queryClient.setQueryData(['vrfWaiting', type, address], {
    isWaiting: true,
    quantity,
    timestamp
});

// 訂閱狀態變化
const { data: vrfState } = useQuery({
    queryKey: ['vrfWaiting', type, address],
    refetchInterval: 2000 // 每2秒檢查
});
```

### 事件流程圖
```
用戶鑄造
    ↓
交易提交
    ↓
MintCommitted 事件 ← [監聽點 1]
    ↓
顯示 VRF 等待 UI
    ↓
Chainlink VRF 處理（10-30秒）
    ↓
HeroMinted/RelicMinted 事件 ← [監聽點 2]
    ↓
顯示鑄造成功
```

## 🔍 調試與監控

### 查看 VRF 狀態
開發者工具 Console 中可以看到：
```javascript
// VRF 請求提交
[MintPage] VRF 請求已提交 {type: "hero", quantity: "5", blockNumber: 12345}

// VRF 完成
[useContractEvents] ✨ 英雄 #1234 鑄造完成！屬性已確定
```

### 常見問題

**Q: VRF 等待超過 1 分鐘怎麼辦？**
A: 模態框會顯示手動刷新按鈕，用戶可以刷新頁面查看結果

**Q: 如何知道 VRF 是否成功？**
A: 監聽 `HeroMinted`/`RelicMinted` 事件，這些事件只在 VRF 成功後觸發

## 🚨 注意事項

1. **不要**在 `MintCommitted` 時就更新 NFT 列表
2. **不要**假設固定的 VRF 處理時間
3. **要**提供清晰的等待狀態反饋
4. **要**處理超時情況

## 📈 未來優化建議

1. **WebSocket 實時通知**：建立 WebSocket 連接實時推送 VRF 狀態
2. **批量優化**：合併多個 VRF 請求降低成本
3. **離線通知**：通過郵件/推送通知 VRF 結果
4. **預測優化**：基於歷史數據預測更準確的等待時間

---

更新日期：2025-08-07
作者：Claude Code Assistant