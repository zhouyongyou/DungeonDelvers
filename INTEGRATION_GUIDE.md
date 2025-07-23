# DungeonDelvers 前端整合指南

## 概述

本指南記錄了 DungeonDelvers 前端專案的整合工作，旨在消除重複代碼、統一服務架構，提升程式碼的可維護性和效能。

## 整合背景

### 發現的問題
1. **多個 Apollo Client 實例**：導致重複請求和 429 錯誤
2. **混用 Studio 和去中心化 Graph API**：配置不一致
3. **7-8 個 RPC 監控工具**：功能重疊，維護困難
4. **分散的快取系統**：localStorage、IndexedDB、記憶體快取各自為政
5. **重複的格式化函數**：相同功能在多處實現
6. **多種錯誤處理機制**：缺乏統一的錯誤處理策略

### 整合目標
- 統一環境配置管理
- 統一 GraphQL 客戶端
- 整合 RPC 監控工具
- 統一快取管理器
- 整合錯誤處理機制
- 消除重複的工具函數

## 已完成的整合工作

### 1. 統一環境配置 (`src/config/env.ts`)

創建了集中式的環境配置檔案，整合所有環境變數：

```typescript
export const ENV = {
  THE_GRAPH: {
    USE_DECENTRALIZED: true,  // 統一使用去中心化版本
    API_URL: import.meta.env.VITE_THE_GRAPH_NETWORK_URL,
    STUDIO_URL: import.meta.env.VITE_THE_GRAPH_API_URL,
  },
  RPC: {
    BSC_RPC: import.meta.env.VITE_BSC_RPC_URL,
    ALCHEMY_KEYS: [
      import.meta.env.VITE_ALCHEMY_KEY,
      import.meta.env.VITE_ALCHEMY_KEY_2,
      import.meta.env.VITE_ALCHEMY_KEY_3,
    ],
  },
  // ... 其他配置
};
```

**遷移步驟**：
1. 將所有直接使用 `import.meta.env` 的地方改為使用 `ENV`
2. 刪除重複的環境變數定義
3. 更新 `.env.example` 檔案

### 2. 移除 Apollo Client

完全移除了 Apollo Client，統一使用 Fetch API：

**已刪除的檔案**：
- `src/simpleApolloClient.ts`
- `src/utils/rpcMonitorFix.ts`
- `src/components/WebSocketIndicator.tsx`

**更新的檔案**：
- `src/main.tsx` - 移除 ApolloProvider
- `src/App.tsx` - 移除 Apollo 相關引用
- 所有 GraphQL 查詢改用 `graphqlRequest.ts`

### 3. 統一 RPC 服務 (`src/services/rpc/index.ts`)

整合了所有 RPC 相關功能到單一服務：

```typescript
export const rpcService = {
  monitor: {       // 監控功能
    start, stop, getStats, reset
  },
  optimizer: {     // 優化建議
    optimize, getRecommendations
  },
  analytics: {     // 分析報告
    analyze, getInsights, exportData
  },
  dedupe: {        // 請求去重
    request, clear
  },
  health: {        // 健康檢查
    check, checkEndpoint
  },
  error: {         // 錯誤處理
    handle, getErrorStats
  },
  config: {        // 配置管理
    getRPCUrl, getAllRPCUrls
  }
};
```

**使用範例**：
```typescript
// 獲取 RPC URL
const rpcUrl = rpcService.config.getRPCUrl();

// 監控統計
const stats = rpcService.monitor.getStats();

// 請求去重
const result = await rpcService.dedupe.request('key', async () => {
  return fetch(url);
});
```

### 4. 統一快取管理器 (`src/services/cache/index.ts`)

整合所有快取邏輯到統一管理器：

```typescript
// 統一 API
export const cache = {
  get: <T>(key: string, options?: CacheOptions) => Promise<T | null>,
  set: <T>(key: string, value: T, options?: CacheOptions) => Promise<void>,
  delete: (key: string, options?: CacheOptions) => Promise<void>,
  clear: (options?: { prefix?: string }) => Promise<void>,
};

// 支援多種策略
type CacheStrategy = 'memory' | 'local' | 'persistent' | 'auto';
```

**特性**：
- 自動選擇最佳儲存層（基於資料大小）
- TTL 支援
- 前綴管理
- 自動過期清理

### 5. 增強格式化工具 (`src/utils/formatters.ts`)

整合了所有格式化函數到單一檔案：

**新增功能**：
- 地址格式化（從 constants.ts 整合）
- 通用數字格式化（支援 compact 模式）
- 時間和持續時間格式化
- 貨幣格式化（USD、BNB）
- 遊戲相關格式化（稀有度、戰力）

### 6. 統一錯誤處理 (`src/services/error/index.ts`)

創建了完整的錯誤處理服務：

```typescript
export const errorHandler = {
  handle(error: any, context: ErrorContext): void
  categorizeError(error: any): ErrorCategory
  getStats(): ErrorStats
};

// React 錯誤邊界
export class ErrorBoundary extends React.Component { ... }
```

**特性**：
- 自動分類錯誤（網路、合約、錢包、驗證）
- 用戶友好的錯誤訊息
- 統計和監控
- 全局錯誤捕獲
- 特殊錯誤處理（如 429 自動切換 RPC）

## 遷移指南

### 1. 環境變數
```typescript
// 舊寫法
const apiUrl = import.meta.env.VITE_THE_GRAPH_API_URL;

// 新寫法
import { ENV } from '@/config/env';
const apiUrl = ENV.THE_GRAPH.API_URL;
```

### 2. RPC 監控
```typescript
// 舊寫法（使用多個工具）
import { rpcMonitor } from '@/utils/rpcMonitor';
import { rpcOptimizer } from '@/utils/rpcOptimizer';

// 新寫法（統一服務）
import { rpcService } from '@/services/rpc';
const stats = rpcService.monitor.getStats();
const recommendations = rpcService.optimizer.getRecommendations();
```

### 3. 快取使用
```typescript
// 舊寫法（直接使用 localStorage）
localStorage.setItem('key', JSON.stringify(value));
const value = JSON.parse(localStorage.getItem('key'));

// 新寫法（統一快取）
import { cache } from '@/services/cache';
await cache.set('key', value, { ttl: 3600000 });
const value = await cache.get('key');
```

### 4. 錯誤處理
```typescript
// 舊寫法
try {
  // ...
} catch (error) {
  console.error(error);
  toast.error('操作失敗');
}

// 新寫法
import { handleError } from '@/services/error';
try {
  // ...
} catch (error) {
  handleError(error, {
    category: 'contract',
    userMessage: '交易失敗，請重試',
  });
}
```

### 5. 格式化函數
```typescript
// 舊寫法（從 constants.ts）
import { formatAddress } from '@/config/constants';

// 新寫法（統一位置）
import { formatAddress } from '@/utils/formatters';
```

## 效能提升

### 1. 請求減少
- 移除 Apollo Client 後，消除了重複的 GraphQL 請求
- RPC 請求去重避免了並發重複請求

### 2. 快取優化
- 統一快取管理器自動選擇最佳儲存層
- 自動過期清理減少記憶體使用

### 3. 錯誤恢復
- 429 錯誤自動切換 RPC 端點
- 網路錯誤自動重試機制

## 後續優化建議

### 1. 進一步整合
- 整合所有 API 呼叫到統一的 API 服務
- 統一所有 React Query 配置
- 整合所有 WebSocket 連接管理

### 2. 監控增強
- 添加更詳細的效能指標
- 實現自動告警機制
- 建立效能基準測試

### 3. 開發體驗
- 創建統一的開發工具面板
- 添加更多的 TypeScript 類型定義
- 改進錯誤訊息的可讀性

## 注意事項

1. **環境變數更新**：確保所有開發和生產環境的 `.env` 檔案都已更新
2. **快取遷移**：舊的快取資料可能需要手動清理
3. **錯誤監控**：新的錯誤處理系統會收集更多統計資料，注意隱私合規
4. **向後相容**：部分舊 API 保留了相容層，但建議盡快遷移

## 結論

這次整合工作大幅提升了程式碼的可維護性和效能。通過統一的服務架構，我們消除了大量重複代碼，簡化了開發流程，並為未來的擴展打下了良好基礎。

建議團隊成員熟悉新的統一 API，並在開發新功能時優先使用這些整合後的服務。