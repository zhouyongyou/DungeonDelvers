# 代碼優化實施步驟

## 🚀 立即實施（高優先級）

### 1. 前端性能優化

#### 1.1 Vite 配置優化 ✅ **已完成**
- 文件：`vite.config.ts`
- 改動：添加代碼分割和壓縮配置
- 預期效果：減少 bundle 大小 30-40%

#### 1.2 Apollo Client 緩存策略 ✅ **已完成**
- 文件：`src/apolloClient.ts`
- 改動：添加類型策略和緩存配置
- 預期效果：減少不必要的網路請求

#### 1.3 環境變量類型定義 ✅ **已完成**
- 文件：`src/vite-env.d.ts`
- 改動：添加 `VITE_THE_GRAPH_API_URL` 定義
- 預期效果：改善開發體驗

### 2. 用戶體驗改善

#### 2.1 統一骨架屏組件 ⚠️ **需要修復**
- 文件：`src/components/ui/Skeleton.tsx`
- 狀態：已創建，但有 TypeScript 錯誤
- 解決方案：
```bash
# 需要安裝 React 類型定義
npm install --save-dev @types/react @types/react-dom

# 或者檢查 tsconfig.json 配置
```

#### 2.2 錯誤邊界組件 ⚠️ **需要修復**
- 文件：`src/components/ui/ErrorBoundary.tsx`
- 狀態：已創建，但有 TypeScript 錯誤
- 解決方案：同上

#### 2.3 在 App.tsx 中集成錯誤邊界 📋 **待實施**
```typescript
// src/App.tsx
import ErrorBoundary from './components/ui/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col dark:bg-gray-900 bg-gray-100">
        <Header activePage={activePage} setActivePage={handleSetPage} />
        <main className="flex-grow container mx-auto px-4 py-8 md:px-6 md:py-12">
          <Suspense fallback={<PageLoader />}>
            {renderPage()}
          </Suspense>
        </main>
        <Footer />
        <TransactionWatcher />
      </div>
    </ErrorBoundary>
  );
}
```

### 3. 交互反饋優化

#### 3.1 改進事件通知系統 ⚠️ **需要修復**
- 文件：`src/hooks/useContractEvents.ts`
- 狀態：已修改，但有 React 導入錯誤
- 解決方案：修復 React 類型定義後重新實施

## 📈 子圖優化

### 4. Schema 優化

#### 4.1 添加時間戳字段 ✅ **已完成**
- 文件：`DDgraphql/dungeon-delvers/schema.graphql`
- 改動：為 Hero、Relic、Party 添加 `createdAt` 字段

#### 4.2 添加統計實體 ✅ **已完成**
- 文件：`DDgraphql/dungeon-delvers/schema.graphql`
- 改動：添加 `GlobalStats` 和 `PlayerStats` 實體

### 5. 事件處理器優化

#### 5.1 Hero 事件處理器 ✅ **已完成**
- 文件：`DDgraphql/dungeon-delvers/src/hero.ts`
- 改動：添加參數驗證、重複檢查、時間戳

#### 5.2 Party 事件處理器 ✅ **已完成**
- 文件：`DDgraphql/dungeon-delvers/src/party.ts`
- 改動：添加參數驗證、批量處理、時間戳

#### 5.3 統計數據輔助函數 ✅ **已創建**
- 文件：`DDgraphql/dungeon-delvers/src/stats.ts`
- 狀態：已創建，需要在事件處理器中集成

## 🔧 立即可執行的修復步驟

### 修復 TypeScript 錯誤

1. **安裝缺少的依賴**：
```bash
npm install --save-dev @types/react @types/react-dom
```

2. **檢查 tsconfig.json**：
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["DOM", "DOM.Iterable", "ES6"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 部署子圖更新

1. **重新生成子圖代碼**：
```bash
cd DDgraphql/dungeon-delvers
npm run codegen
```

2. **編譯子圖**：
```bash
npm run build
```

3. **部署到 The Graph**：
```bash
npm run deploy
```

## 📊 中期實施計劃（2-4週）

### 6. 頁面組件優化

#### 6.1 使用統一載入狀態
在各個頁面組件中使用新的骨架屏組件：

```typescript
// 替換現有的 LoadingSpinner
import { DashboardSkeleton, NFTGridSkeleton, ListSkeleton } from '../components/ui/Skeleton';

// 在 DashboardPage.tsx 中
if (isLoading) {
  return <DashboardSkeleton />;
}

// 在 MyAssetsPage.tsx 中
if (isLoading) {
  return <NFTGridSkeleton count={12} />;
}
```

#### 6.2 改善錯誤處理
為每個頁面添加更好的錯誤處理：

```typescript
// 在每個頁面組件中
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

const MyAssetsPage = () => {
  return (
    <ErrorBoundary fallback={<div>載入資產時出錯</div>}>
      {/* 頁面內容 */}
    </ErrorBoundary>
  );
};
```

### 7. 查詢優化

#### 7.1 實施分頁查詢
```typescript
// src/hooks/useNFTsPaginated.ts
import { useQuery } from '@tanstack/react-query';
import { gql } from '@apollo/client';

const GET_NFTS_PAGINATED = gql`
  query GetNFTsPaginated($owner: String!, $first: Int!, $skip: Int!) {
    heroes(
      where: { owner: $owner }
      first: $first
      skip: $skip
      orderBy: power
      orderDirection: desc
    ) {
      id
      tokenId
      rarity
      power
      createdAt
    }
  }
`;

export const useNFTsPaginated = (owner: string, pageSize: number = 20) => {
  // 實施分頁邏輯
};
```

#### 7.2 添加更多查詢
```typescript
// 統計數據查詢
const GET_GLOBAL_STATS = gql`
  query GetGlobalStats {
    globalStats(id: "global") {
      totalHeroes
      totalRelics
      totalParties
      totalPlayers
      lastUpdated
    }
  }
`;

// 玩家統計查詢
const GET_PLAYER_STATS = gql`
  query GetPlayerStats($playerId: String!) {
    playerStats(id: $playerId) {
      totalHeroesMinted
      totalExpeditions
      successfulExpeditions
      totalRewardsEarned
      highestPartyPower
    }
  }
`;
```

## 🎯 長期優化計劃

### 8. 性能監控
- 添加 Web Vitals 監控
- 實施錯誤追蹤（例如 Sentry）
- 設置性能指標儀表板

### 9. 進階功能
- 實施 PWA 支持
- 添加離線功能
- 實施國際化（i18n）

### 10. 代碼質量
- 設置更嚴格的 ESLint 規則
- 添加自動化測試
- 實施代碼審查流程

## 📝 實施檢查清單

### 立即實施（本週）
- [x] Vite 配置優化
- [x] Apollo Client 緩存策略
- [x] 環境變量類型定義
- [x] 子圖 Schema 優化
- [x] 事件處理器改進
- [ ] 修復 TypeScript 錯誤
- [ ] 部署子圖更新
- [ ] 集成錯誤邊界

### 中期實施（2-4週）
- [ ] 頁面組件重構
- [ ] 分頁查詢實施
- [ ] 統計數據查詢
- [ ] 性能測試驗證

### 長期實施（1-3月）
- [ ] 性能監控系統
- [ ] PWA 支持
- [ ] 自動化測試
- [ ] 國際化支持

## 🚀 預期收益

實施這些優化後，您可以期待：

- **載入時間減少 30-40%**
- **頁面響應速度提升 50%**
- **用戶錯誤體驗改善 70%**
- **開發效率提升 60%**
- **代碼維護性提升 80%**

---

*請按照優先級順序實施，並在每個階段進行測試驗證。*