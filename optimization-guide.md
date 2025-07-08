# 🚀 Dungeon Delvers 測試與效能優化指南

## 📋 目錄
- [測試優化](#測試優化)
- [效能優化](#效能優化)
- [監控與分析](#監控與分析)
- [實施時程](#實施時程)

---

## 🧪 測試優化

### 1. 前端測試架構設置

#### 安裝測試依賴
```bash
npm install --save-dev \
  vitest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jsdom \
  @vitejs/plugin-react \
  msw \
  @wagmi/core/test
```

#### Vitest 配置
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    }
  },
})
```

#### 測試環境設置
```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './mocks/server'

// Mock Web3 環境
Object.defineProperty(window, 'ethereum', {
  value: {
    isMetaMask: true,
    request: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
  writable: true,
})

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### 2. 核心組件測試示例

#### Web3 連接測試
```typescript
// src/test/components/Header.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { Header } from '../../components/layout/Header'
import { wagmiConfig } from '../../wagmi'

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

describe('Header Component', () => {
  it('renders navigation items correctly', () => {
    render(
      <TestWrapper>
        <Header activePage="mint" setActivePage={vi.fn()} />
      </TestWrapper>
    )
    
    expect(screen.getByText('鑄造')).toBeInTheDocument()
    expect(screen.getByText('探索')).toBeInTheDocument()
  })

  it('calls setActivePage when navigation item is clicked', () => {
    const mockSetActivePage = vi.fn()
    
    render(
      <TestWrapper>
        <Header activePage="mint" setActivePage={mockSetActivePage} />
      </TestWrapper>
    )
    
    fireEvent.click(screen.getByText('探索'))
    expect(mockSetActivePage).toHaveBeenCalledWith('explorer')
  })
})
```

#### Hooks 測試
```typescript
// src/test/hooks/useVipStatus.test.tsx
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useVipStatus } from '../../hooks/useVipStatus'

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: () => ({ address: '0x123...', isConnected: true }),
  useReadContract: () => ({ data: 1, isLoading: false, error: null }),
}))

describe('useVipStatus Hook', () => {
  it('returns correct VIP level', async () => {
    const { result } = renderHook(() => useVipStatus())
    
    await waitFor(() => {
      expect(result.current.vipLevel).toBe(1)
      expect(result.current.isLoading).toBe(false)
    })
  })
})
```

### 3. 智能合約測試

#### Hardhat 設置
```bash
npm install --save-dev \
  hardhat \
  @nomicfoundation/hardhat-toolbox \
  @nomicfoundation/hardhat-chai-matchers \
  @typechain/hardhat
```

```javascript
// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");
require("@typechain/hardhat");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.BSC_MAINNET_RPC_URL,
        blockNumber: 35000000 // 固定區塊避免測試不一致
      }
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  }
};
```

#### 合約測試示例
```typescript
// test/DungeonMaster.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { DungeonMaster, MockERC20 } from "../typechain-types";

describe("DungeonMaster", function () {
  let dungeonMaster: DungeonMaster;
  let soulShard: MockERC20;
  let owner: any, player: any;

  beforeEach(async function () {
    [owner, player] = await ethers.getSigners();
    
    // 部署測試代幣
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    soulShard = await MockERC20Factory.deploy("SoulShard", "SOUL");
    
    // 部署主合約
    const DungeonMasterFactory = await ethers.getContractFactory("DungeonMaster");
    dungeonMaster = await DungeonMasterFactory.deploy(owner.address);
    
    // 初始化設置
    await soulShard.mint(player.address, ethers.parseEther("1000"));
  });

  describe("Buy Provisions", function () {
    it("Should allow players to buy provisions", async function () {
      const amount = 5;
      const cost = ethers.parseEther("10"); // 假設成本
      
      await soulShard.connect(player).approve(dungeonMaster.target, cost);
      
      await expect(
        dungeonMaster.connect(player).buyProvisions(1, amount)
      ).to.emit(dungeonMaster, "ProvisionsBought")
       .withArgs(1, amount, cost);
    });

    it("Should revert if insufficient balance", async function () {
      await expect(
        dungeonMaster.connect(player).buyProvisions(1, 1000000)
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should use reasonable gas for expedition", async function () {
      // 設置測試數據
      await setupTestExpedition();
      
      const tx = await dungeonMaster.connect(player).requestExpedition(1, 1);
      const receipt = await tx.wait();
      
      expect(receipt!.gasUsed).to.be.lessThan(300000); // 設定合理的 gas 限制
    });
  });
});
```

### 4. E2E 測試

#### Playwright 設置
```bash
npm install --save-dev @playwright/test
npx playwright install
```

```typescript
// e2e/mint.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Minting Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    // Mock MetaMask 連接
    await page.addInitScript(() => {
      window.ethereum = {
        isMetaMask: true,
        request: async ({ method }: any) => {
          if (method === 'eth_requestAccounts') {
            return ['0x123...'];
          }
          return null;
        },
        on: () => {},
        removeListener: () => {},
      };
    });
  });

  test('should connect wallet and mint hero', async ({ page }) => {
    // 連接錢包
    await page.click('[data-testid="connect-wallet"]');
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();
    
    // 導航到鑄造頁面
    await page.click('[data-testid="nav-mint"]');
    await expect(page.locator('h1:has-text("鑄造英雄")')).toBeVisible();
    
    // 鑄造英雄
    await page.click('[data-testid="mint-hero-button"]');
    await expect(page.locator('[data-testid="transaction-pending"]')).toBeVisible();
  });
});
```

---

## ⚡ 效能優化

### 1. 前端效能優化

#### 代碼分割與懶加載
```typescript
// src/components/LazyComponents.tsx
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from './ui/LoadingSpinner';

// 將大型頁面組件拆分
const AdminUserManagement = lazy(() => 
  import('./admin/UserManagement').then(module => ({
    default: module.UserManagement
  }))
);

const AdminContractManagement = lazy(() => 
  import('./admin/ContractManagement')
);

// 優化的加載組件
export const OptimizedAdminPage = () => {
  return (
    <div className="admin-container">
      <Suspense fallback={<LoadingSpinner />}>
        <AdminUserManagement />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <AdminContractManagement />
      </Suspense>
    </div>
  );
};
```

#### React Query 優化
```typescript
// src/hooks/useOptimizedQueries.ts
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';

export const useOptimizedUserData = () => {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  return useQueries({
    queries: [
      {
        queryKey: ['userBalance', address],
        queryFn: () => getUserBalance(address),
        enabled: !!address,
        staleTime: 30000, // 30秒內不重新請求
        cacheTime: 300000, // 5分鐘緩存
      },
      {
        queryKey: ['userNFTs', address],
        queryFn: () => getUserNFTs(address),
        enabled: !!address,
        staleTime: 60000, // 1分鐘
        // 預加載相關數據
        onSuccess: (data) => {
          data.forEach((nft: any) => {
            queryClient.setQueryData(['nft', nft.id], nft);
          });
        },
      },
    ],
  });
};
```

#### 虛擬化長列表
```bash
npm install @tanstack/react-virtual
```

```typescript
// src/components/VirtualizedNFTList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface NFTListProps {
  nfts: NFTData[];
}

export const VirtualizedNFTList = ({ nfts }: NFTListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: nfts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // 每個項目的估計高度
    overscan: 5, // 預渲染額外的項目
  });

  return (
    <div
      ref={parentRef}
      className="h-96 overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <NFTCard nft={nfts[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 2. 圖片與資源優化

#### Vite 圖片優化插件
```bash
npm install --save-dev vite-plugin-imagemin imagemin-webp imagemin-mozjpeg imagemin-pngquant
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHtmlPlugin } from 'vite-plugin-html';
import viteImagemin from 'vite-plugin-imagemin';

export default defineConfig({
  plugins: [
    react(),
    viteImagemin({
      gifsicle: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.8, 0.9], speed: 4 },
      webp: { quality: 75 }
    }),
    createHtmlPlugin({
      minify: true,
      inject: {
        data: {
          title: 'Dungeon Delvers - 地下城探索者',
        },
      },
    }),
  ],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          web3: ['wagmi', 'viem', '@apollo/client'],
          ui: ['@tanstack/react-query', 'zustand']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    fs: { strict: false }
  }
});
```

#### 響應式圖片組件
```typescript
// src/components/OptimizedImage.tsx
import { useState, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
}

export const OptimizedImage = ({ src, alt, className, sizes }: OptimizedImageProps) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const img = new Image();
    
    // 生成 WebP 和備用格式
    const webpSrc = src.replace(/\.(jpg|jpeg|png)$/, '.webp');
    
    // 檢查瀏覽器是否支持 WebP
    const supportsWebP = document.createElement('canvas')
      .toDataURL('image/webp')
      .indexOf('data:image/webp') === 0;
    
    img.onload = () => {
      setImageSrc(supportsWebP ? webpSrc : src);
      setIsLoading(false);
    };
    
    img.onerror = () => {
      setImageSrc(src); // 回退到原始格式
      setIsLoading(false);
    };
    
    img.src = supportsWebP ? webpSrc : src;
  }, [src]);

  if (isLoading) {
    return (
      <div className={`bg-gray-200 animate-pulse ${className}`}>
        <div className="w-full h-full bg-gray-300 rounded"></div>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      sizes={sizes}
      loading="lazy"
      decoding="async"
    />
  );
};
```

### 3. Web3 效能優化

#### 批量請求優化
```typescript
// src/hooks/useBatchContractReads.ts
import { useContractReads } from 'wagmi';
import { useMemo } from 'react';

export const useBatchContractReads = (contracts: any[]) => {
  const batchedContracts = useMemo(() => {
    // 將請求分批，每批最多 50 個
    const batches = [];
    for (let i = 0; i < contracts.length; i += 50) {
      batches.push(contracts.slice(i, i + 50));
    }
    return batches;
  }, [contracts]);

  const results = useContractReads({
    contracts: batchedContracts[0] || [],
    watch: false,
    cacheTime: 60000, // 1分鐘緩存
  });

  return results;
};
```

#### 智能合約 Gas 優化
```solidity
// contracts/optimized/OptimizedDungeonMaster.sol
contract OptimizedDungeonMaster {
    // 使用 packed structs 減少存儲成本
    struct PackedPartyStatus {
        uint128 provisionsRemaining;  // 足夠大的範圍
        uint64 cooldownEndsAt;        // 時間戳壓縮
        uint32 unclaimedRewards;      // 獎勵數量
        uint16 fatigueLevel;          // 疲勞等級
        uint16 reserved;              // 預留空間
    }
    
    // 批量操作減少 gas 成本
    function batchBuyProvisions(
        uint256[] calldata partyIds,
        uint256[] calldata amounts
    ) external nonReentrant {
        require(partyIds.length == amounts.length, "Array length mismatch");
        
        uint256 totalCost = 0;
        
        // 計算總成本
        for (uint256 i = 0; i < amounts.length; i++) {
            totalCost += provisionPriceUSD * amounts[i];
        }
        
        uint256 requiredSoulShard = dungeonCore.getSoulShardAmountForUSD(totalCost);
        playerVault.spendForGame(msg.sender, requiredSoulShard);
        
        // 批量更新狀態
        for (uint256 i = 0; i < partyIds.length; i++) {
            PackedPartyStatus storage status = packedPartyStatuses[partyIds[i]];
            status.provisionsRemaining += uint128(amounts[i]);
            
            emit ProvisionsBought(partyIds[i], amounts[i], requiredSoulShard * amounts[i] / totalCost);
        }
    }
}
```

---

## 📊 監控與分析

### 1. 效能監控設置

#### Web Vitals 監控
```typescript
// src/utils/performance.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export const trackWebVitals = () => {
  getCLS(console.log);
  getFID(console.log);
  getFCP(console.log);
  getLCP(console.log);
  getTTFB(console.log);
};

// 在 main.tsx 中調用
trackWebVitals();
```

#### Bundle 分析
```bash
npm install --save-dev rollup-plugin-visualizer
```

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    // ... 其他插件
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
```

### 2. 錯誤邊界與監控
```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // 發送錯誤報告到監控服務
    if (import.meta.env.PROD) {
      this.sendErrorReport(error, errorInfo);
    }
  }

  private sendErrorReport(error: Error, errorInfo: ErrorInfo) {
    // 集成 Sentry 或其他錯誤監控服務
    fetch('/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      }),
    });
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-fallback">
          <h2>出現了一些問題</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 📅 實施時程

### Phase 1: 基礎測試框架 (1週)
- [x] 安裝和配置 Vitest
- [x] 設置基本的組件測試
- [x] 建立 CI/CD 基礎配置

### Phase 2: 智能合約測試 (1-2週)
- [x] 設置 Hardhat 測試環境
- [x] 編寫核心合約測試
- [x] Gas 使用量測試和優化

### Phase 3: 效能優化 (2-3週)
- [x] 實施代碼分割和懶加載
- [x] 圖片和資源優化
- [x] Web3 請求優化

### Phase 4: 監控與E2E (1-2週)
- [x] 設置效能監控
- [x] 建立 E2E 測試
- [x] 錯誤邊界和報告系統

### 總預估時間: **5-8週**

---

## 🎯 預期成果

**測試覆蓋率目標**: 80%+  
**頁面載入時間**: <2秒  
**Bundle 大小**: <500KB (gzipped)  
**Gas 使用量**: 優化 20-30%  

通過這些優化，您的專案將在穩定性、效能和用戶體驗方面得到顯著提升！