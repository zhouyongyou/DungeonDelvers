# 🛠️ Dungeon Delvers 開發指南

## 📋 目錄
- [快速開始](#快速開始)
- [開發環境](#開發環境)
- [項目結構](#項目結構)
- [開發流程](#開發流程)
- [最佳實踐](#最佳實踐)
- [性能優化](#性能優化)
- [測試策略](#測試策略)
- [部署指南](#部署指南)
- [故障排除](#故障排除)

## 🚀 快速開始

### 環境要求
- Node.js 18+ 
- npm 9+ 或 yarn 1.22+
- Git

### 安裝和運行
```bash
# 克隆項目
git clone <repository-url>
cd DungeonDelvers

# 安裝依賴
npm install

# 啟動開發服務器
npm run dev

# 訪問應用
open http://localhost:5174
```

### 環境變數配置
創建 `.env.local` 文件：
```env
# The Graph API
VITE_THE_GRAPH_STUDIO_API_URL=https://api.studio.thegraph.com/query/...

# 開發者地址
VITE_DEVELOPER_ADDRESS=0x10925A7138649C7E1794CE646182eeb5BF8ba647
```

## 🏗️ 開發環境

### 推薦工具
- **IDE**: VS Code
- **瀏覽器**: Chrome DevTools
- **錢包**: MetaMask
- **網絡**: BSC 主網

### VS Code 擴展
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### 開發腳本
```bash
# 開發
npm run dev              # 啟動開發服務器
npm run build            # 構建生產版本
npm run build:optimized  # 構建優化版本
npm run preview          # 預覽生產版本

# 代碼質量
npm run lint             # ESLint 檢查
npm run format           # Prettier 格式化
npm run type-check       # TypeScript 類型檢查

# 性能分析
npm run analyze          # 包大小分析
npm run performance      # 性能測試

# 維護
npm run clean            # 清理構建文件
npm run clean:all        # 完全清理並重新安裝
```

## 📁 項目結構

```
src/
├── api/                 # API 相關
│   ├── nfts.ts         # NFT API
│   └── announcements.json
├── assets/             # 靜態資源
│   ├── index.css       # 全局樣式
│   └── images/         # 圖片資源
├── components/         # React 組件
│   ├── admin/          # 管理組件
│   ├── common/         # 通用組件
│   ├── core/           # 核心組件
│   ├── debug/          # 調試組件
│   ├── dungeon/        # 地牢組件
│   ├── layout/         # 布局組件
│   └── ui/             # UI 組件
├── config/             # 配置文件
│   ├── abis.ts         # 合約 ABI
│   ├── constants.ts    # 常量
│   ├── contracts.ts    # 合約配置
│   └── env.ts          # 環境配置
├── contexts/           # React Context
├── hooks/              # 自定義 Hooks
├── pages/              # 頁面組件
├── stores/             # 狀態管理
├── styles/             # 樣式文件
├── types/              # TypeScript 類型
├── utils/              # 工具函數
├── App.tsx             # 主應用組件
├── main.tsx            # 應用入口
└── wagmi.ts            # wagmi 配置
```

## 🔄 開發流程

### 1. 功能開發流程
```bash
# 1. 創建功能分支
git checkout -b feature/new-feature

# 2. 開發功能
# - 創建組件
# - 實現邏輯
# - 添加類型定義
# - 編寫樣式

# 3. 代碼檢查
npm run lint
npm run type-check
npm run format

# 4. 測試功能
npm run dev
# 在瀏覽器中測試

# 5. 提交代碼
git add .
git commit -m "feat: add new feature"

# 6. 推送分支
git push origin feature/new-feature
```

### 2. 組件開發規範
```typescript
// 1. 組件結構
interface ComponentProps {
  // 定義 props 類型
}

const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // 1. Hooks
  const [state, setState] = useState()
  
  // 2. 事件處理
  const handleEvent = useCallback(() => {
    // 處理邏輯
  }, [])
  
  // 3. 副作用
  useEffect(() => {
    // 副作用邏輯
  }, [])
  
  // 4. 渲染
  return (
    <div className="component">
      {/* JSX */}
    </div>
  )
}

export default Component
```

### 3. 頁面開發規範
```typescript
// 1. 頁面結構
const PageName: React.FC = () => {
  // 1. 狀態管理
  const { data, isLoading, error } = useQuery()
  
  // 2. 錯誤處理
  if (error) return <ErrorState />
  if (isLoading) return <LoadingState />
  
  // 3. 頁面渲染
  return (
    <section className="space-y-8">
      <h2 className="page-title">頁面標題</h2>
      {/* 頁面內容 */}
    </section>
  )
}
```

## ✅ 最佳實踐

### 1. TypeScript 最佳實踐
```typescript
// ✅ 好的做法
interface User {
  id: string
  name: string
  email: string
}

const getUser = async (id: string): Promise<User> => {
  // 實現
}

// ❌ 避免的做法
const getUser = async (id: any): Promise<any> => {
  // 實現
}
```

### 2. React 最佳實踐
```typescript
// ✅ 使用 useCallback 優化性能
const handleClick = useCallback(() => {
  // 處理邏輯
}, [dependencies])

// ✅ 使用 useMemo 緩存計算結果
const expensiveValue = useMemo(() => {
  return heavyCalculation(data)
}, [data])

// ✅ 正確的依賴數組
useEffect(() => {
  // 副作用
}, [dependency1, dependency2])
```

### 3. 樣式最佳實踐
```css
/* ✅ 使用 Tailwind CSS 類名 */
<div className="card-bg p-6 rounded-xl shadow-lg">

/* ✅ 自定義 CSS 變數 */
:root {
  --primary-color: #3b82f6;
  --secondary-color: #1f2937;
}

/* ✅ 響應式設計 */
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

### 4. 錯誤處理最佳實踐
```typescript
// ✅ 使用錯誤邊界
<ErrorBoundary fallback={<ErrorComponent />}>
  <Component />
</ErrorBoundary>

// ✅ 優雅的錯誤處理
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  console.error('Operation failed:', error)
  showToast('操作失敗，請重試', 'error')
  return null
}
```

## ⚡ 性能優化

### 1. 代碼分割
```typescript
// ✅ 懶加載組件
const LazyComponent = lazy(() => import('./LazyComponent'))

// ✅ 懶加載頁面
const LazyPage = lazy(() => import('./pages/LazyPage'))
```

### 2. 圖片優化
```typescript
// ✅ 使用懶加載 Hook
const { imgRef, imageSrc, isLoading } = useLazyLoad(src, fallback)

// ✅ 響應式圖片
<img 
  srcSet={`${src} 1x, ${src2x} 2x`}
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="描述"
/>
```

### 3. 緩存策略
```typescript
// ✅ React Query 緩存
const { data } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  staleTime: 5 * 60 * 1000, // 5分鐘
  cacheTime: 10 * 60 * 1000, // 10分鐘
})
```

### 4. 包大小優化
```bash
# 分析包大小
npm run analyze

# 構建優化版本
npm run build:optimized
```

## 🧪 測試策略

### 1. 單元測試
```typescript
// 使用 Jest + React Testing Library
import { render, screen } from '@testing-library/react'
import { Component } from './Component'

test('renders component', () => {
  render(<Component />)
  expect(screen.getByText('Hello')).toBeInTheDocument()
})
```

### 2. 集成測試
```typescript
// 測試組件交互
test('handles user interaction', async () => {
  render(<Component />)
  const button = screen.getByRole('button')
  await userEvent.click(button)
  expect(screen.getByText('Clicked')).toBeInTheDocument()
})
```

### 3. E2E 測試
```typescript
// 使用 Playwright
test('complete user flow', async ({ page }) => {
  await page.goto('/')
  await page.click('[data-testid="mint-button"]')
  await expect(page.locator('.success-message')).toBeVisible()
})
```

## 🚀 部署指南

### 1. 生產構建
```bash
# 構建生產版本
npm run build:optimized

# 預覽生產版本
npm run preview
```

### 2. 環境配置
```bash
# 生產環境變數
VITE_THE_GRAPH_STUDIO_API_URL=https://api.studio.thegraph.com/query/...
VITE_DEVELOPER_ADDRESS=0x...
```

### 3. 部署平台
- **Vercel**: 自動部署
- **Netlify**: 靜態網站託管
- **GitHub Pages**: 免費託管
- **AWS S3 + CloudFront**: 企業級部署

## 🔧 故障排除

### 常見問題

#### 1. 構建失敗
```bash
# 清理緩存
npm run clean

# 重新安裝依賴
npm run clean:all
```

#### 2. 類型錯誤
```bash
# 檢查類型
npm run type-check

# 修復類型錯誤
# 添加適當的類型定義
```

#### 3. 樣式問題
```bash
# 重新生成 Tailwind CSS
npx tailwindcss -i ./src/assets/index.css -o ./dist/output.css --watch
```

#### 4. 網絡問題
```bash
# 檢查網絡連接
# 確認 BSC 網絡配置
# 檢查錢包連接
```

### 調試技巧

#### 1. 開發者工具
```javascript
// 在瀏覽器控制台中
console.log('Debug info:', data)
debugger // 設置斷點
```

#### 2. React DevTools
- 安裝 React DevTools 擴展
- 檢查組件狀態
- 分析性能問題

#### 3. 網絡調試
```javascript
// 監控網絡請求
console.log('API Response:', response)
```

## 📚 學習資源

### 官方文檔
- [React 文檔](https://react.dev/)
- [TypeScript 文檔](https://www.typescriptlang.org/)
- [Vite 文檔](https://vitejs.dev/)
- [wagmi 文檔](https://wagmi.sh/)
- [Tailwind CSS 文檔](https://tailwindcss.com/)

### 社區資源
- [React 社區](https://reactjs.org/community/)
- [TypeScript 社區](https://www.typescriptlang.org/community/)
- [Web3 開發者社區](https://ethereum.org/en/developers/)

---

**最後更新**: 2024年12月  
**版本**: v2.0.0  
**維護者**: 開發團隊 