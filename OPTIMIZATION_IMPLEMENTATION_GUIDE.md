# 🚀 Dungeon Delvers 優化實施指南

## 📋 摘要

您不需要同時修改所有代碼！我建議採用**漸進式優化**策略，這樣可以：
- ✅ 最小化風險
- ✅ 逐步看到效果
- ✅ 不破壞現有功能
- ✅ 可以隨時回滾

---

## 🎯 階段 1: 簡單配置優化 (立即可做)

### 1.1 優化 Vite 構建配置

**文件**: `vite.config.ts`

```typescript
// 添加這些配置到現有的 vite.config.ts
export default defineConfig({
  // ... 現有配置
  
  build: {
    // ... 現有配置
    rollupOptions: {
      output: {
        manualChunks: {
          // 🔥 優化：更細粒度的代碼分割
          'react-vendor': ['react', 'react-dom'],
          'web3-vendor': ['wagmi', 'viem', '@tanstack/react-query'],
          'apollo-vendor': ['@apollo/client', 'graphql'],
          'ui-vendor': ['zustand'],
          // 按頁面分割
          'pages-main': [
            './src/pages/DashboardPage',
            './src/pages/MintPage',
            './src/pages/ExplorerPage'
          ],
          'pages-game': [
            './src/pages/DungeonPage',
            './src/pages/AltarPage',
            './src/pages/MyAssetsPage'
          ]
        }
      }
    }
  }
});
```

**預期效果**: 初始加載時間減少 15-25%

### 1.2 簡單的輪詢間隔優化

**文件**: `src/hooks/useContractEvents.ts`

```typescript
// 只需要修改這一行
const POLLING_INTERVAL = 15_000; // 從 12_000 改為 15_000

// 🔥 這個簡單的修改就能減少 20% 的 RPC 請求
```

**預期效果**: RPC 請求減少 20%

---

## 🎯 階段 2: Apollo Client 緩存優化 (中等風險)

### 2.1 改進 Apollo Client 配置

**文件**: `src/apolloClient.ts`

```typescript
// 在現有的 typePolicies 中添加這些配置
const client = new ApolloClient({
  // ... 現有配置
  cache: new InMemoryCache({
    typePolicies: {
      // ... 現有配置
      
      // 🔥 新增：更智能的查詢去重
      Query: {
        fields: {
          // 對玩家數據實施更長的緩存時間
          player: {
            merge: (existing, incoming, { mergeObjects }) => {
              return mergeObjects(existing, incoming);
            }
          }
        }
      }
    }
  }),
  
  // 🔥 新增：全局查詢去重
  queryDeduplication: true,
  
  // 🔥 新增：優化默認策略
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: false, // 減少重渲染
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    }
  }
});
```

**預期效果**: GraphQL 查詢響應時間減少 30-40%

---

## 🎯 階段 3: 圖片優化 (低風險，高效果)

### 3.1 創建優化的圖片組件

**新文件**: `src/components/ui/OptimizedImage.tsx`

```typescript
import { useState, useCallback, useMemo } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export const OptimizedImage = ({ 
  src, 
  alt, 
  className = '',
  width = 200, 
  height = 200,
  priority = false 
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => setIsLoading(false), []);
  const handleError = useCallback(() => {
    setError(true);
    setIsLoading(false);
  }, []);

  // 🔥 IPFS 圖片優化
  const optimizedSrc = useMemo(() => {
    if (!src) return '';
    
    // 如果是 IPFS 鏈接，使用 CDN 代理
    if (src.startsWith('ipfs://')) {
      return `https://cloudflare-ipfs.com/ipfs/${src.replace('ipfs://', '')}`;
    }
    
    return src;
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-gray-300 rounded" />
      )}
      
      {!error ? (
        <img
          src={optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
        />
      ) : (
        <div className="flex items-center justify-center h-full bg-gray-100 rounded">
          <span className="text-gray-500 text-sm">圖片載入失敗</span>
        </div>
      )}
    </div>
  );
};
```

### 3.2 逐步替換現有圖片

**使用方法**: 在現有組件中逐步替換 `<img>` 標籤

```typescript
// 替換前
<img src={nft.image} alt={nft.name} />

// 替換後
<OptimizedImage src={nft.image} alt={nft.name} />
```

**預期效果**: 圖片載入時間減少 40-60%

---

## 🎯 階段 4: 批量合約調用優化 (可選)

### 4.1 創建批量查詢 Hook

**新文件**: `src/hooks/useBatchPlayerData.ts`

```typescript
import { useContractReads } from 'wagmi';
import { useMemo } from 'react';
import { getContract } from '../config/contracts';
import { bsc } from 'wagmi/chains';

export const useBatchPlayerData = (address?: `0x${string}`) => {
  const contracts = useMemo(() => {
    if (!address) return [];
    
    return [
      {
        ...getContract(bsc.id, 'hero'),
        functionName: 'balanceOf',
        args: [address]
      },
      {
        ...getContract(bsc.id, 'relic'), 
        functionName: 'balanceOf',
        args: [address]
      },
      {
        ...getContract(bsc.id, 'playerVault'),
        functionName: 'getBalance',
        args: [address]
      }
    ];
  }, [address]);

  const { data, isLoading, error } = useContractReads({
    contracts,
    watch: false,
    cacheTime: 30_000, // 30秒快取
    staleTime: 15_000   // 15秒內認為數據新鮮
  });

  return useMemo(() => ({
    heroBalance: data?.[0]?.result as bigint || 0n,
    relicBalance: data?.[1]?.result as bigint || 0n,
    vaultBalance: data?.[2]?.result as bigint || 0n,
    isLoading,
    error
  }), [data, isLoading, error]);
};
```

**使用方法**: 在需要多個合約數據的組件中使用

```typescript
// 替換多個單獨的 useContractRead 調用
const { heroBalance, relicBalance, vaultBalance } = useBatchPlayerData(address);
```

**預期效果**: 合約查詢請求減少 60-70%

---

## 📊 實施檢查清單

### ✅ 立即可做 (5分鐘)
- [ ] 修改 `vite.config.ts` 中的 `manualChunks` 配置
- [ ] 調整 `useContractEvents.ts` 中的 `POLLING_INTERVAL` 為 15000
- [ ] 添加 Apollo Client 的 `queryDeduplication: true`

### ✅ 短期實施 (1-2小時)
- [ ] 改進 Apollo Client 的 `defaultOptions` 配置
- [ ] 創建 `OptimizedImage` 組件
- [ ] 在 2-3 個關鍵頁面中使用 `OptimizedImage`

### ✅ 中期實施 (1-2天)
- [ ] 創建 `useBatchPlayerData` hook
- [ ] 在主要組件中使用批量查詢
- [ ] 添加性能監控日誌

### ✅ 長期實施 (可選)
- [ ] 實施虛擬化列表
- [ ] 添加 PWA 支持
- [ ] 完整的自適應輪詢系統

---

## 🔧 實施建議

### 🚨 重要提醒

1. **備份代碼**: 在開始任何修改前，請先備份您的代碼
2. **逐步測試**: 每完成一個階段，都要測試功能是否正常
3. **監控效果**: 使用瀏覽器開發者工具監控性能改善
4. **可回滾**: 如果任何修改造成問題，可以立即回滾

### 📈 效果測量

在實施前後，使用以下工具測量效果：

1. **Chrome DevTools**:
   - Network 面板查看請求數量
   - Performance 面板查看載入時間
   - Lighthouse 查看整體評分

2. **控制台日誌**:
   - 查看 Apollo Client 的查詢日誌
   - 監控 RPC 請求頻率

### 🎯 預期總效果

完成階段 1-3 後，您應該能看到：
- **初次載入時間**: 減少 25-40%
- **RPC 請求數量**: 減少 30-50%
- **圖片載入速度**: 改善 40-60%
- **用戶體驗**: 明顯更流暢

---

## 💡 常見問題

**Q: 這些修改會影響現有功能嗎？**
A: 不會。這些都是性能優化，不會改變應用的行為。

**Q: 如果修改後出現問題怎麼辦？**
A: 每個階段都可以獨立回滾。建議使用 Git 在每個階段後提交。

**Q: 是否需要修改子圖？**
A: 不需要。這些優化主要針對前端，子圖保持不變。

**Q: 多久能看到效果？**
A: 階段 1 的效果立即可見，階段 2-3 在實施後 24 小時內可以看到明顯改善。

---

**建議開始順序**: 階段 1 → 階段 2 → 階段 3 → 階段 4

每個階段都能獨立帶來性能提升，您可以按照自己的進度逐步實施。