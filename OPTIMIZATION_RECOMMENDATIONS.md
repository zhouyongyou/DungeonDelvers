# Dungeon Delvers 系統優化建議報告

## 🎯 執行摘要

基於對您的 Dungeon Delvers 專案的深入分析，我識別出了多個關鍵優化領域，特別是在 GraphQL/The Graph 實現、前端性能、Web3 交互和整體架構方面。

---

## 📊 當前架構分析

### 技術堆疊
- **前端**: React 18 + TypeScript + Vite
- **狀態管理**: Zustand + Apollo Client Cache
- **Web3**: Wagmi + Viem
- **數據層**: The Graph Protocol + Apollo Client
- **UI**: Tailwind CSS
- **區塊鏈**: BSC (Binance Smart Chain)

### 現有優勢
✅ 已實現代碼分割和懶加載  
✅ 合理的 Apollo Client 快取策略  
✅ 事件驅動的數據更新機制  
✅ TypeScript 類型安全  

---

## 🚀 重點優化建議

## 1. GraphQL/The Graph 優化

### 1.1 子圖查詢優化 (高優先級)

**當前問題**: 可能存在過度查詢和 N+1 查詢問題

**建議實現**:
```graphql
# 優化前：可能的多次查詢
query GetPlayerAssets($playerId: String!) {
  player(id: $playerId) {
    heroes { id rarity power metadata }
    relics { id rarity capacity metadata }
    parties { id heroes relics totalPower }
  }
}

# 優化後：使用 fragments 和批量查詢
fragment HeroDetails on Hero {
  id
  rarity
  power
  # 僅在需要時查詢 metadata
}

fragment RelicDetails on Relic {
  id
  rarity
  capacity
}

query GetPlayerAssetsOptimized($playerId: String!, $includeMetadata: Boolean = false) {
  player(id: $playerId) {
    id
    heroes(first: 100) {
      ...HeroDetails
      metadata @include(if: $includeMetadata)
    }
    relics(first: 100) {
      ...RelicDetails
      metadata @include(if: $includeMetadata)
    }
    parties(first: 20) {
      id
      totalPower
      partyRarity
      heroes(first: 10) { id }
      relics(first: 5) { id }
    }
  }
}
```

### 1.2 分頁和過濾優化

```typescript
// 在 src/api/graphql/queries.ts 中實現
export const GET_PLAYER_HEROES_PAGINATED = gql`
  query GetPlayerHeroesPaginated(
    $playerId: String!
    $first: Int = 20
    $skip: Int = 0
    $orderBy: Hero_orderBy = createdAt
    $orderDirection: OrderDirection = desc
    $rarityFilter: [Int!] = []
  ) {
    player(id: $playerId) {
      heroes(
        first: $first
        skip: $skip
        orderBy: $orderBy
        orderDirection: $orderDirection
        where: { rarity_in: $rarityFilter }
      ) {
        id
        rarity
        power
        createdAt
      }
    }
  }
`;
```

### 1.3 Apollo Client 快取進階優化

```typescript
// 更新 src/apolloClient.ts
const client = new ApolloClient({
  uri: THE_GRAPH_API_URL,
  cache: new InMemoryCache({
    typePolicies: {
      Player: {
        keyFields: ['id'],
        fields: {
          heroes: {
            merge: false,
            // 實現基於時間的快取策略
            read(existing = [], { args, readField }) {
              const { first = 20, skip = 0 } = args || {};
              return existing.slice(skip, skip + first);
            }
          }
        }
      },
      // 新增：實現更智能的快取合併策略
      Hero: {
        keyFields: ['id'],
        fields: {
          power: {
            merge: (existing, incoming, { mergeObjects }) => {
              // 如果新數據更新，才進行合併
              if (!existing || incoming.lastUpdated > existing.lastUpdated) {
                return incoming;
              }
              return existing;
            }
          }
        }
      }
    }
  }),
  // 新增：查詢去重和批量處理
  link: from([
    new BatchHttpLink({
      uri: THE_GRAPH_API_URL,
      batchMax: 10,
      batchInterval: 100
    })
  ])
});
```

## 2. 前端性能優化

### 2.1 虛擬化長列表 (中優先級)

對於英雄、聖物列表，實現虛擬滾動：

```bash
npm install @tanstack/react-virtual
```

```typescript
// 在 src/components/ui/VirtualizedList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export const VirtualizedNftList = ({ items, renderItem, estimateSize = 120 }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 5
  });

  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualItem.size,
              transform: `translateY(${virtualItem.start}px)`
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 2.2 圖片優化和懶加載

```typescript
// 在 src/components/ui/OptimizedImage.tsx
import { useState, useCallback } from 'react';

export const OptimizedNftImage = ({ 
  src, 
  alt, 
  width = 200, 
  height = 200,
  priority = false 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => setIsLoading(false), []);
  const handleError = useCallback(() => {
    setError(true);
    setIsLoading(false);
  }, []);

  // 實現漸進式 JPEG 和 WebP 支持
  const optimizedSrc = useMemo(() => {
    if (!src) return '';
    
    // 如果是 IPFS 鏈接，使用 CDN 代理
    if (src.startsWith('ipfs://')) {
      return `https://cloudflare-ipfs.com/ipfs/${src.replace('ipfs://', '')}`;
    }
    
    return src;
  }, [src]);

  return (
    <div className="relative overflow-hidden rounded-lg bg-gray-200">
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-gray-300" />
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
        <div className="flex items-center justify-center h-full bg-gray-100">
          <span className="text-gray-500">圖片載入失敗</span>
        </div>
      )}
    </div>
  );
};
```

### 2.3 狀態管理優化

```typescript
// 在 src/stores/gameStore.ts - 使用 Zustand 進行更細粒度的狀態管理
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface GameState {
  // 分離不同類型的數據，避免不必要的重渲染
  ui: {
    activePage: string;
    isLoading: boolean;
    notifications: Notification[];
  };
  
  player: {
    address?: string;
    balance?: bigint;
    heroes: Hero[];
    relics: Relic[];
    parties: Party[];
  };
  
  // 動作
  updateHeroes: (heroes: Hero[]) => void;
  updateRelics: (relics: Relic[]) => void;
  addNotification: (notification: Notification) => void;
}

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    ui: {
      activePage: 'mint',
      isLoading: false,
      notifications: []
    },
    
    player: {
      heroes: [],
      relics: [],
      parties: []
    },
    
    updateHeroes: (heroes) => set((state) => ({
      player: { ...state.player, heroes }
    })),
    
    updateRelics: (relics) => set((state) => ({
      player: { ...state.player, relics }
    })),
    
    addNotification: (notification) => set((state) => ({
      ui: {
        ...state.ui,
        notifications: [...state.ui.notifications, notification]
      }
    }))
  }))
);

// 選擇器 hooks，避免不必要的重渲染
export const useHeroes = () => useGameStore(state => state.player.heroes);
export const useRelics = () => useGameStore(state => state.player.relics);
export const useUIState = () => useGameStore(state => state.ui);
```

## 3. Web3 交互優化

### 3.1 批量合約呼叫優化

```typescript
// 在 src/hooks/useBatchContractReads.ts
import { useContractReads } from 'wagmi';

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
      },
      {
        ...getContract(bsc.id, 'playerProfile'),
        functionName: 'getLevel',
        args: [address]
      }
    ];
  }, [address]);

  const { data, isLoading, error } = useContractReads({
    contracts,
    watch: false, // 避免不必要的重複查詢
    cacheTime: 30_000, // 30秒快取
    staleTime: 15_000   // 15秒內認為數據新鮮
  });

  return useMemo(() => ({
    heroBalance: data?.[0]?.result as bigint || 0n,
    relicBalance: data?.[1]?.result as bigint || 0n,
    vaultBalance: data?.[2]?.result as bigint || 0n,
    playerLevel: data?.[3]?.result as number || 0,
    isLoading,
    error
  }), [data, isLoading, error]);
};
```

### 3.2 事件監聽優化

```typescript
// 更新 src/hooks/useContractEvents.ts 中的輪詢策略
const ADAPTIVE_POLLING_INTERVAL = {
  active: 8_000,    // 用戶活躍時更頻繁
  idle: 30_000,     // 用戶不活躍時降低頻率
  background: 60_000 // 頁面在背景時最低頻率
};

export const useAdaptiveContractEvents = () => {
  const [userActivity, setUserActivity] = useState<'active' | 'idle' | 'background'>('active');
  
  useEffect(() => {
    let idleTimer: NodeJS.Timeout;
    
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      setUserActivity('active');
      
      idleTimer = setTimeout(() => {
        setUserActivity('idle');
      }, 30_000); // 30秒無活動認為閒置
    };
    
    const handleVisibilityChange = () => {
      setUserActivity(document.hidden ? 'background' : 'active');
    };
    
    // 監聽用戶活動
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetIdleTimer, true);
    });
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    resetIdleTimer();
    
    return () => {
      clearTimeout(idleTimer);
      ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.removeEventListener(event, resetIdleTimer, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  const pollingInterval = ADAPTIVE_POLLING_INTERVAL[userActivity];
  
  // 使用動態輪詢間隔
  useWatchContractEvent({
    // ... 其他配置
    pollingInterval,
    enabled: userActivity !== 'background' // 背景時完全停止
  });
};
```

## 4. 構建和部署優化

### 4.1 進階 Vite 配置優化

```typescript
// 更新 vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    // 包大小分析
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true
    })
  ],
  
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          // 更細粒度的代碼分割
          'react-core': ['react', 'react-dom'],
          'web3-core': ['wagmi', 'viem'],
          'apollo-core': ['@apollo/client', 'graphql'],
          'ui-libs': ['zustand', '@tanstack/react-query'],
          
          // 按頁面分割
          'pages-core': [
            './src/pages/DashboardPage',
            './src/pages/MintPage'
          ],
          'pages-game': [
            './src/pages/DungeonPage',
            './src/pages/AltarPage',
            './src/pages/MyAssetsPage'
          ]
        }
      }
    },
    
    // 優化資源處理
    assetsInlineLimit: 4096, // 4KB 以下內聯
    sourcemap: false, // 生產環境關閉 sourcemap
    
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.warn', 'console.info']
      }
    }
  },
  
  // 開發環境優化
  server: {
    hmr: {
      overlay: false // 減少開發環境干擾
    }
  },
  
  // 預構建優化
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@apollo/client',
      'wagmi',
      'viem'
    ],
    exclude: ['@tanstack/react-virtual'] // 大型庫按需載入
  }
});
```

### 4.2 PWA 支持

```bash
npm install vite-plugin-pwa workbox-window
```

```typescript
// 在 vite.config.ts 中新增 PWA 配置
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cloudflare-ipfs\.com\/ipfs\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ipfs-cache',
              expiration: {
                maxEntries: 1000,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30天
              }
            }
          }
        ]
      }
    })
  ]
});
```

## 5. 監控和分析

### 5.1 性能監控

```typescript
// 在 src/utils/performance.ts
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }
  
  measureGraphQLQuery(queryName: string) {
    const start = performance.now();
    
    return {
      end: () => {
        const duration = performance.now() - start;
        console.log(`GraphQL Query ${queryName}: ${duration.toFixed(2)}ms`);
        
        // 如果查詢時間超過 1 秒，記錄警告
        if (duration > 1000) {
          console.warn(`Slow GraphQL query detected: ${queryName}`);
        }
      }
    };
  }
  
  measureComponentRender(componentName: string) {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      if (duration > 16) { // 超過一個 frame (60fps)
        console.warn(`Slow component render: ${componentName} (${duration.toFixed(2)}ms)`);
      }
    };
  }
}

// 使用示例
export const withPerformanceMonitoring = <T extends object>(
  Component: React.ComponentType<T>,
  componentName: string
) => {
  return React.memo((props: T) => {
    const endMeasure = PerformanceMonitor.getInstance().measureComponentRender(componentName);
    
    useEffect(() => {
      endMeasure();
    });
    
    return <Component {...props} />;
  });
};
```

## 6. 實施優先級

### 🚨 高優先級 (立即實施)
1. **GraphQL 查詢優化** - 減少 The Graph 查詢次數
2. **Apollo Client 快取策略優化** - 改善數據載入速度
3. **事件監聽輪詢間隔優化** - 減少 RPC 壓力

### ⚡ 中優先級 (2-4週內)
1. **虛擬化列表實現** - 改善大量 NFT 顯示性能
2. **圖片優化和懶加載** - 減少初始載入時間
3. **批量合約呼叫** - 減少 Web3 請求次數

### 🔧 低優先級 (長期改進)
1. **PWA 支持** - 離線體驗
2. **性能監控系統** - 持續優化指導
3. **進階快取策略** - 更智能的數據管理

## 7. 預期效果

實施這些優化後，預期可以達到：

- **首次載入時間減少 40-60%**
- **GraphQL 查詢響應時間減少 50%**
- **RPC 請求數量減少 70%**
- **記憶體使用量減少 30%**
- **整體用戶體驗評分提升 2-3 分**

## 8. 後續監控指標

1. **Core Web Vitals**
   - LCP (Largest Contentful Paint) < 2.5s
   - FID (First Input Delay) < 100ms
   - CLS (Cumulative Layout Shift) < 0.1

2. **自定義指標**
   - GraphQL 查詢平均響應時間
   - 錢包連接成功率
   - NFT 圖片載入成功率
   - 交易確認時間

---

**建議開始實施順序**: 從 GraphQL 查詢優化開始，因為這會帶來最直接和明顯的性能提升。