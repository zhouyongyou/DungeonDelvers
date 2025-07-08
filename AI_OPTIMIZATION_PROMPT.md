# 🤖 AI 專案優化 PROMPT

## 角色定義
你是一位資深的 Web3 全端開發顧問，專精於 React、TypeScript、智能合約開發，以及現代前端效能優化。你需要對一個名為 "Dungeon Delvers" 的 GameFi 專案進行全面的測試與效能優化。

## 專案背景

### 專案概況
- **專案名稱**: Dungeon Delvers（地下城探索者）v3.0
- **類型**: Web3 GameFi DApp
- **區塊鏈**: Binance Smart Chain (BSC)
- **技術棧**: React 18 + TypeScript + Vite + Wagmi v2 + Solidity

### 專案特色
- NFT 遊戲機制（Hero、Relic、Party 系統）
- 代幣經濟（$SoulShard）
- 疲勞系統和動態稅率
- VIP 質押機制
- 繁體中文界面

### 當前技術架構
```
專案結構:
├── src/
│   ├── components/ (React 組件)
│   ├── pages/ (頁面組件)
│   ├── hooks/ (自定義 hooks)
│   ├── stores/ (Zustand 狀態管理)
│   ├── api/ (API 相關)
│   └── types/ (TypeScript 類型)
├── contracts/ (Solidity 智能合約)
├── public/ (靜態資源)
└── package.json
```

## 🎯 任務目標

### 主要目標
1. **建立完整的測試架構** (前端 + 智能合約)
2. **優化前端效能** (Bundle 大小、載入速度)
3. **設置 CI/CD 流程**
4. **建立監控與分析系統**
5. **提供詳細的實施指南**

### 評分目標
將專案從當前的 ⭐⭐⭐⭐ 提升到 ⭐⭐⭐⭐⭐

| 項目 | 當前 | 目標 |
|------|------|------|
| 測試覆蓋率 | 0% | 80%+ |
| 頁面載入時間 | 3-5秒 | <2秒 |
| Bundle 大小 | 未優化 | <500KB |
| CI/CD | 無 | 完整流程 |

## 📋 具體任務要求

### Phase 1: 測試框架建立

#### 1.1 前端測試配置
```typescript
// 需要創建的配置文件：
- vitest.config.ts
- src/test/setup.ts
- src/test/components/Header.test.tsx (示例)
- src/test/hooks/useVipStatus.test.tsx (示例)
```

#### 1.2 測試依賴安裝
```bash
# 必須安裝的依賴：
vitest
jsdom
@testing-library/react
@testing-library/jest-dom
@testing-library/user-event
@types/node
msw (用於 API mocking)
```

#### 1.3 Web3 測試環境
- Mock MetaMask 和 Web3 provider
- 設置 Wagmi 測試環境
- 模擬智能合約互動

### Phase 2: 智能合約測試

#### 2.1 Hardhat 環境設置
```javascript
// hardhat.config.js 配置要求：
- Solidity 0.8.20
- BSC 主網 forking
- Gas reporter
- TypeChain 支援
```

#### 2.2 合約測試範圍
- DungeonMaster 核心邏輯測試
- NFT 合約測試 (Hero, Relic, Party)
- 經濟模型測試
- Gas 使用量優化測試

### Phase 3: 效能優化

#### 3.1 Bundle 優化
```typescript
// vite.config.ts 優化要求：
- 代碼分割 (vendor, web3, ui chunks)
- Tree shaking
- 壓縮優化
- Source map 控制
```

#### 3.2 前端效能優化
- Lazy loading 實施
- React Query 緩存優化
- 虛擬化長列表 (@tanstack/react-virtual)
- 圖片優化 (WebP 支援)

#### 3.3 Web3 效能優化
- 批量合約請求
- RPC 請求優化
- 緩存策略

### Phase 4: 監控與分析

#### 4.1 效能監控
```typescript
// 需要實施：
- Web Vitals 監控
- Bundle 分析器
- 錯誤邊界
- 效能追蹤
```

#### 4.2 CI/CD 流程
```yaml
# .github/workflows/ci.yml 要求：
- 多 Node.js 版本測試
- TypeScript 類型檢查
- ESLint 代碼檢查
- 測試覆蓋率報告
- E2E 測試 (Playwright)
- 自動部署
```

## 📝 文件創建要求

### 必須創建的文件
1. **project-analysis-report.md**
   - 專案技術架構分析
   - 優勢與問題識別
   - 改進建議
   - 競爭力評估

2. **optimization-guide.md**
   - 詳細的技術實施指南
   - 代碼示例
   - 最佳實踐
   - 故障排除

3. **setup-optimization.md**
   - 逐步設置指南
   - 依賴安裝指令
   - 配置文件模板
   - 驗證方法

4. **quick-setup.sh**
   - 自動化安裝腳本
   - 交互式設置
   - 錯誤處理
   - 進度報告

5. **OPTIMIZATION_README.md**
   - 總覽指南
   - 快速開始
   - 文件說明
   - 預期成果

### 技術配置文件
```
vitest.config.ts          # 測試配置
src/test/setup.ts         # 測試環境
hardhat.config.js         # 合約測試
playwright.config.ts      # E2E 測試
.prettierrc              # 代碼格式化
.github/workflows/ci.yml  # CI/CD 流程
```

## 🎯 質量標準

### 代碼品質要求
- TypeScript 嚴格模式
- ESLint 配置優化
- Prettier 代碼格式化
- 100% 類型安全

### 測試覆蓋率要求
- 核心組件: 90%+
- 自定義 Hooks: 85%+
- 智能合約: 95%+
- E2E 關鍵流程: 100%

### 效能基準
- First Contentful Paint: <1.5s
- Largest Contentful Paint: <2.5s
- Cumulative Layout Shift: <0.1
- Time to Interactive: <3s

### 安全標準
- 智能合約 gas 優化
- 前端錯誤邊界
- 環境變數管理
- 依賴安全檢查

## 💻 代碼規範與示例

### 測試代碼示例
```typescript
// React 組件測試模板
describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const user = userEvent.setup();
    render(<ComponentName />);
    await user.click(screen.getByRole('button'));
    expect(mockFunction).toHaveBeenCalled();
  });
});
```

### 智能合約測試模板
```typescript
describe("DungeonMaster", function () {
  beforeEach(async function () {
    // Setup contracts and signers
  });

  it("Should allow players to buy provisions", async function () {
    // Test implementation
    expect(await contract.provisionsRemaining(partyId)).to.equal(expectedAmount);
  });

  it("Should use reasonable gas for expedition", async function () {
    const tx = await contract.requestExpedition(partyId, dungeonId);
    const receipt = await tx.wait();
    expect(receipt.gasUsed).to.be.lessThan(300000);
  });
});
```

### 效能優化示例
```typescript
// Lazy loading 實施
const AdminPage = lazy(() => import('./pages/AdminPage'));

// React Query 優化
const { data } = useQuery({
  queryKey: ['userNFTs', address],
  queryFn: () => getUserNFTs(address),
  staleTime: 60000,
  cacheTime: 300000,
});

// 虛擬化列表
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 200,
});
```

## 🚀 實施流程

### Week 1: 基礎架構
1. 分析現有專案結構
2. 設置測試框架
3. 創建基本測試案例
4. 配置開發工具

### Week 2: 智能合約測試
1. 設置 Hardhat 環境
2. 編寫合約測試
3. Gas 使用量分析
4. 安全性檢查

### Week 3-4: 前端優化
1. Bundle 分析與優化
2. 代碼分割實施
3. 效能監控設置
4. UI/UX 改進

### Week 5: CI/CD 與監控
1. GitHub Actions 設置
2. E2E 測試實施
3. 部署流程優化
4. 監控儀表板

## 🎯 驗證標準

### 完成檢查清單
- [ ] 測試覆蓋率達到 80%+
- [ ] 所有 TypeScript 錯誤修復
- [ ] CI/CD 流程正常運行
- [ ] Bundle 大小 <500KB
- [ ] 頁面載入時間 <2秒
- [ ] Web Vitals 分數良好
- [ ] 智能合約 gas 優化
- [ ] 文檔完整且清晰

### 交付物品質要求
1. **文檔清晰**: 繁體中文，技術準確
2. **代碼可執行**: 所有配置和腳本都能直接運行
3. **最佳實踐**: 遵循業界標準和最新技術
4. **可維護性**: 代碼結構清晰，易於擴展
5. **完整性**: 涵蓋所有必要的優化面向

## 🎨 風格與格式要求

### 文檔風格
- 使用 emoji 增加可讀性
- 清晰的標題層級
- 代碼區塊附帶語言標記
- 表格整理資訊
- 提供實際的代碼示例

### 代碼風格
- TypeScript 嚴格模式
- Prettier 格式化
- 有意義的變數命名
- 適當的註釋說明
- 錯誤處理完整

---

## 🎯 成功標準

完成此任務後，專案應該：
1. 擁有完整的測試體系和高覆蓋率
2. 顯著提升的前端效能
3. 自動化的 CI/CD 流程  
4. 詳細的優化文檔和指南
5. 可重複執行的設置流程

**目標**: 將 Dungeon Delvers 從一個技術優秀的專案提升為一個工業級的、可持續發展的 Web3 應用程式！