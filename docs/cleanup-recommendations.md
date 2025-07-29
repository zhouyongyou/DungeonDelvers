# 代碼清理建議

## 🧹 立即行動清單

### 1. 頁面文件清理
```bash
# 已完成封存
✅ DashboardPage.tsx → archived
✅ ProfilePage.tsx → archived  
✅ ExplorerPage.tsx → archived
✅ MyAssetsPage.tsx → archived

# 建議刪除或移至開發環境
❌ DebugContractPage.tsx
❌ PriceDebugPage.tsx
❌ CodexPage.tsx (如果暫時禁用)
```

### 2. 組件目錄整理
```
components/
├── ui/          # ✅ 基礎 UI 組件
├── admin/       # ⚠️ 檢查是否有重複功能
├── debug/       # ❌ 考慮移至開發環境
├── archived/    # ❌ 不應在 src 中
└── core/        # ✅ 核心功能組件
```

### 3. 配置文件統一
當前存在多個合約配置：
- contracts.ts
- contractsWithABI.ts  
- smartRpcTransport.ts

**建議**：統一為單一配置源

### 4. 路由簡化
```typescript
// 當前路由過多
type Page = 'dashboard' | 'mint' | 'party' | 'dungeon' | 'explorer' | 
            'admin' | 'altar' | 'profile' | 'vip' | 'referral' | 
            'codex' | 'debug' | 'testbatch' | 'pitch' | 'myAssets';

// 建議精簡為
type Page = 'dashboard' | 'myAssets' | 'mint' | 'altar' | 
            'dungeon' | 'vip' | 'referral' | 'admin';
```

### 5. 開發/生產分離
創建明確的開發工具結構：
```
src/
├── __dev__/     # 開發環境專用
│   ├── DebugPage.tsx
│   ├── TestComponents.tsx
│   └── MockData.ts
└── pages/       # 生產環境頁面
```

## 🎯 長期維護建議

1. **一個功能，一個位置**
   - 避免相似功能分散在多處
   - 整合相關功能到單一模組

2. **定期審查**
   - 每月檢查未使用的導入
   - 刪除註釋掉的代碼
   - 移除 TODO 超過 3 個月的項目

3. **文件命名規範**
   - 生產文件：`FeatureName.tsx`
   - 開發文件：`FeatureName.dev.tsx`
   - 測試文件：`FeatureName.test.tsx`

4. **版本控制策略**
   - 使用 Git 歷史而非保留舊文件
   - 重要變更寫入 CHANGELOG
   - 刪除而非註釋廢棄代碼

## 🚀 執行步驟

1. **第一階段**：封存已替換頁面（✅ 已完成）
2. **第二階段**：移除測試/調試頁面
3. **第三階段**：整合重複組件
4. **第四階段**：統一配置系統
5. **第五階段**：建立開發/生產分離結構

---

*記住：少即是多。每個文件都應該有明確的存在理由。*