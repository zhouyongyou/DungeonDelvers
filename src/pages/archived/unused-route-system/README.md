# 🚏 未使用的路由系統

此目錄包含一個完整但未被使用的備用路由系統。

## 📁 封存內容

### 核心文件
- **RouteManager.tsx** - 備用路由管理器
  - 功能：動態頁面導入、錯誤處理、載入狀態管理
  - 特色：支援頁面預取、分組預載、webpack chunk 分割
  - 狀態：功能完整但未被主系統採用

- **useResourcePreloader.ts** - 資源預加載 Hook
  - 功能：根據用戶類型智能預載頁面
  - 特色：支援新手、活躍用戶、VIP 用戶不同預載策略
  - 狀態：僅被 RouteManager 使用

## 🏗️ 系統架構

```typescript
// RouteManager 支援的頁面映射
const pageModules = {
  // 核心頁面
  mint: lazy(() => import('../../pages/MintPage')),
  dashboard: lazy(() => import('../../pages/OverviewPage')),
  
  // 遊戲相關頁面
  dungeon: lazy(() => import('../../pages/DungeonPage')),
  altar: lazy(() => import('../../pages/AltarPage')),
  party: lazy(() => import('../../pages/MyAssetsPageEnhanced')),
  
  // 工具頁面
  codex: lazy(() => import('../../pages/CodexPage')), // ⚠️ 已停用
  admin: lazy(() => import('../../pages/AdminPage')), // ⚠️ 直接引用，非包裝版
}
```

## 🔍 為什麼未被使用？

1. **主系統選擇**: App.tsx 採用了更直接的路由方式
2. **複雜度考量**: RouteManager 雖然功能強大，但可能被認為過度設計
3. **維護成本**: 兩套路由系統會增加維護複雜度

## 💡 技術價值

雖然未被使用，但此系統有以下技術亮點：
- ✅ 智能錯誤處理和回退機制
- ✅ 頁面預取和性能優化
- ✅ 用戶分群的預載策略
- ✅ Webpack chunk 優化配置
- ✅ TypeScript 類型安全

## 🔄 可能的重新啟用情況

如果未來需要以下功能，可以考慮重新啟用：
- 更複雜的頁面預取策略
- 基於用戶行為的智能預載
- 更細緻的錯誤處理
- 頁面載入性能監控

## 封存原因

- **功能重複**: 與 App.tsx 的主路由系統功能重疊
- **未被使用**: 沒有任何組件實際使用此系統
- **獨立性**: 可以安全移除，不會影響現有功能

---

**封存日期**: 2025-08-02  
**系統狀態**: 功能完整，可隨時重新啟用  
**代碼品質**: 高，值得參考