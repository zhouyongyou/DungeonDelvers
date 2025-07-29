# 🗺️ 未來清理優化路線圖

## 📍 當前狀態總結（2025-01-29）

### 已完成的優化 ✅
1. **導航系統重構**
   - 實施扁平化導航，移除多層級選單
   - 整合頁面：Dashboard + Profile → OverviewPage
   - 整合資產管理：MyAssets + Explorer → MyAssetsPageEnhanced
   
2. **開發/生產環境分離**
   - 調試頁面實施條件載入（僅在開發環境可用）
   - 創建 `src/__dev__` 目錄結構
   - 保持代碼完整性的同時提升安全性

3. **文件封存**
   - 已替換頁面移至 `src/pages/archived/replaced-pages/`
   - 保留歷史代碼供參考

## 🚀 未來優化計劃

### 第一階段：配置系統統一（建議優先級：高）
**預估時間**：2-3 小時  
**風險等級**：🟡 中等

#### 現況問題
```
src/config/
├── contracts.ts         # 主要配置
├── contractsWithABI.ts  # 包含 ABI 的配置
├── smartRpcTransport.ts # RPC 相關配置
└── constants.ts         # 常量定義
```

#### 實施步驟
```typescript
// 1. 創建統一配置文件
// src/config/index.ts
export * from './contracts';
export * from './constants';
export { configLoader } from './configLoader';

// 2. 整合 ABI 到主配置
// 將 contractsWithABI.ts 內容合併到 contracts.ts

// 3. 更新所有引用
// 使用全局搜尋替換更新 import 路徑
```

#### 安全措施
- 創建配置遷移測試腳本
- 逐個文件更新並測試
- 保留原文件直到確認無誤

### 第二階段：路由系統精簡（建議優先級：中）
**預估時間**：1-2 小時  
**風險等級**：🟡 中等

#### 現況
```typescript
type Page = 'dashboard' | 'mint' | 'party' | 'dungeon' | 'explorer' | 
            'admin' | 'altar' | 'profile' | 'vip' | 'referral' | 
            'codex' | 'debug' | 'testbatch' | 'pitch' | 'myAssets';
```

#### 目標
```typescript
// 生產環境路由
type ProductionPage = 'dashboard' | 'myAssets' | 'mint' | 'altar' | 
                      'dungeon' | 'vip' | 'referral' | 'admin';

// 開發環境額外路由
type DevPage = 'debug' | 'priceDebug' | 'testbatch';

// 完整路由類型
type Page = ProductionPage | (DEV ? DevPage : never);
```

#### 實施步驟
1. 創建新的路由類型定義
2. 實施路由過濾機制
3. 更新導航組件
4. 測試所有頁面訪問

### 第三階段：目錄結構優化（建議優先級：低）
**預估時間**：3-4 小時  
**風險等級**：🔴 較高

#### 目標結構
```
DungeonDelvers/
├── src/
│   ├── features/        # 功能模組（取代 pages）
│   │   ├── overview/
│   │   ├── assets/
│   │   ├── minting/
│   │   └── dungeon/
│   ├── shared/          # 共用組件
│   └── core/            # 核心功能
├── __dev__/             # 開發工具（移出 src）
└── __archived__/        # 封存文件（移出 src）
```

#### 優勢
- 更清晰的模組劃分
- 避免生產打包包含開發文件
- 符合現代前端架構規範

### 第四階段：依賴清理（建議優先級：低）
**預估時間**：1 小時  
**風險等級**：🟢 低

#### 檢查項目
- 移除未使用的 npm 包
- 更新過時的依賴
- 檢查重複功能的庫

## 📋 執行前檢查清單

### 開始任何階段前：
- [ ] 創建新的 Git 分支
- [ ] 執行完整測試套件
- [ ] 備份當前工作狀態
- [ ] 記錄當前性能指標

### 每個改動後：
- [ ] 執行 `npm run dev` 測試
- [ ] 檢查主要功能是否正常
- [ ] 執行 `npm run build` 確認能構建
- [ ] 使用 `test-cleanup-safety.cjs` 驗證

## 🛡️ 回滾策略

```bash
# 如果出現問題，快速回滾
git checkout main
git reset --hard safe-cleanup-v1

# 或使用特定階段標籤
git reset --hard cleanup-stage-1
git reset --hard cleanup-stage-2
```

## 💡 最佳實踐建議

1. **小步快跑**：每次只做一個小改動
2. **充分測試**：自動化測試 + 手動驗證
3. **文檔先行**：先更新文檔，再改代碼
4. **團隊溝通**：重大改動前先討論

## 🎯 成功指標

- 代碼行數減少 20%+
- 構建體積減少 15%+
- 頁面載入速度提升 10%+
- 開發體驗滿意度提升

## 📅 建議時間表

1. **短期（1-2 週）**
   - 完成配置系統統一
   - 實施路由精簡

2. **中期（1 個月）**
   - 評估目錄結構調整
   - 清理未使用依賴

3. **長期（季度）**
   - 持續監控和優化
   - 定期審查和清理

---

*記住：完美是優秀的敵人。保持平衡，確保穩定性始終是第一優先級。*

**下次執行時，從這份文檔開始，按照路線圖逐步推進。**