# 🚀 Dungeon Delvers 測試與效能優化 - 設置指南

## 📦 安裝依賴

### 1. 測試相關依賴
```bash
# 核心測試框架
npm install --save-dev vitest jsdom @vitest/ui

# React 測試工具
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Web3 測試支援
npm install --save-dev @wagmi/core/test

# Mock 服務
npm install --save-dev msw

# 類型定義
npm install --save-dev @types/node
```

### 2. E2E 測試
```bash
# Playwright
npm install --save-dev @playwright/test
npx playwright install
```

### 3. 智能合約測試
```bash
# Hardhat 生態
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-chai-matchers @typechain/hardhat

# Gas 報告
npm install --save-dev hardhat-gas-reporter
```

### 4. 效能優化依賴
```bash
# Bundle 分析
npm install --save-dev rollup-plugin-visualizer

# 圖片優化 (可選)
npm install --save-dev vite-plugin-imagemin imagemin-webp imagemin-mozjpeg imagemin-pngquant

# PWA 支援 (可選)
npm install --save-dev vite-plugin-pwa

# 虛擬化列表
npm install @tanstack/react-virtual

# Web Vitals 監控
npm install web-vitals
```

### 5. 程式碼品質工具
```bash
# Prettier
npm install --save-dev prettier

# 額外的 ESLint 規則
npm install --save-dev eslint-plugin-testing-library eslint-plugin-jest-dom
```

## 📝 更新 package.json 腳本

將以下腳本添加到您的 `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "type-check": "tsc --noEmit",
    
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch",
    
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    
    "hardhat:compile": "hardhat compile",
    "hardhat:test": "hardhat test",
    "hardhat:test:gas": "REPORT_GAS=true hardhat test",
    
    "analyze": "vite build --mode analyze",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx}\""
  }
}
```

## ⚙️ 配置文件設置

### 1. 創建 Hardhat 配置
創建 `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("@typechain/hardhat");
require("hardhat-gas-reporter");

/** @type import('hardhat/config').HardhatUserConfig */
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
        url: process.env.BSC_MAINNET_RPC_URL || "https://bsc-dataseed1.binance.org/",
        blockNumber: 35000000
      }
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD"
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  }
};
```

### 2. 創建 Playwright 配置
創建 `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run preview',
    port: 4173,
  },
});
```

### 3. 創建 Prettier 配置
創建 `.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### 4. 更新 ESLint 配置
在 `eslint.config.js` 中添加測試相關規則:

```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import testingLibrary from 'eslint-plugin-testing-library'
import jestDom from 'eslint-plugin-jest-dom'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'typechain-types'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  // 測試文件專用配置
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    plugins: {
      'testing-library': testingLibrary,
      'jest-dom': jestDom,
    },
    rules: {
      ...testingLibrary.configs.react.rules,
      ...jestDom.configs.recommended.rules,
    },
  }
)
```

## 🚀 實施步驟

### Phase 1: 基礎設置 (第1週)
1. **安裝測試依賴**
   ```bash
   npm install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/node
   ```

2. **配置 Vitest**
   - 使用已創建的 `vitest.config.ts`
   - 設置 `src/test/setup.ts`

3. **編寫第一個測試**
   ```bash
   npm run test:run
   ```

### Phase 2: 智能合約測試 (第2週)
1. **安裝 Hardhat**
   ```bash
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
   ```

2. **初始化 Hardhat**
   ```bash
   npx hardhat init
   ```

3. **編寫合約測試**
   ```bash
   npm run hardhat:test
   ```

### Phase 3: 效能優化 (第3-4週)
1. **Bundle 分析**
   ```bash
   npm install --save-dev rollup-plugin-visualizer
   npm run analyze
   ```

2. **代碼分割優化**
   - 實施 lazy loading
   - 優化 chunk 分割

3. **圖片優化**
   ```bash
   npm install --save-dev vite-plugin-imagemin imagemin-webp
   ```

### Phase 4: E2E 測試與監控 (第5週)
1. **設置 Playwright**
   ```bash
   npm install --save-dev @playwright/test
   npx playwright install
   ```

2. **編寫 E2E 測試**
   ```bash
   npm run test:e2e
   ```

3. **設置 CI/CD**
   - 使用已創建的 `.github/workflows/ci.yml`

## 📊 效能監控設置

### 1. Web Vitals 監控
在 `src/main.tsx` 中添加:

```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// 效能監控
if (import.meta.env.PROD) {
  getCLS(console.log);
  getFID(console.log);
  getFCP(console.log);
  getLCP(console.log);
  getTTFB(console.log);
}
```

### 2. 錯誤邊界
在 `src/App.tsx` 中包裝 ErrorBoundary:

```tsx
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      {/* 現有的應用內容 */}
    </ErrorBoundary>
  );
}
```

## 🎯 驗證設置

運行以下命令驗證設置是否正確:

```bash
# 測試
npm run test:run
npm run test:coverage

# 類型檢查
npm run type-check

# 代碼檢查
npm run lint

# 構建
npm run build

# 分析
npm run analyze

# E2E 測試
npm run test:e2e

# 智能合約測試
npm run hardhat:test
```

## 🔧 故障排除

### 常見問題

1. **TypeScript 錯誤**
   ```bash
   npm install --save-dev @types/node
   ```

2. **Vitest 配置問題**
   確保 `jsdom` 已安裝：
   ```bash
   npm install --save-dev jsdom
   ```

3. **Web3 測試問題**
   確保 Mock 配置正確，參考 `src/test/setup.ts`

4. **CI/CD 失敗**
   檢查環境變數是否正確設置

## 📈 預期成果

完成所有設置後，您應該達到：

- ✅ **測試覆蓋率**: 80%+
- ✅ **頁面載入時間**: <2秒
- ✅ **Bundle 大小**: <500KB (gzipped)
- ✅ **CI/CD 流程**: 完整的自動化測試和部署
- ✅ **效能監控**: 實時的 Web Vitals 追蹤

準備好開始優化您的專案了嗎？🚀