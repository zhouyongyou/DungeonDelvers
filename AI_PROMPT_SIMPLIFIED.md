# 🎯 AI PROMPT - 簡化版

## 任務簡述
為 "Dungeon Delvers" Web3 GameFi 專案 (React+TypeScript+Wagmi+Solidity) 建立完整的測試與效能優化方案。

## 專案背景
- **技術棧**: React 18, TypeScript, Vite, Wagmi v2, BSC
- **當前狀態**: 功能完整但缺少測試，效能未優化
- **目標**: 從 4 星提升到 5 星專案品質

## 🎯 核心任務

### 1. 建立測試架構 (Week 1)
```bash
# 安裝依賴
npm install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom @types/node

# 創建配置
- vitest.config.ts (測試配置)
- src/test/setup.ts (環境設置，包含 Web3 mocking)
- src/test/components/Header.test.tsx (組件測試示例)
```

### 2. 智能合約測試 (Week 2)
```bash
# Hardhat 設置
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# 創建配置
- hardhat.config.js (Solidity 0.8.20, BSC forking)
- test/DungeonMaster.test.ts (核心合約測試)
```

### 3. 效能優化 (Week 3-4)
```typescript
// vite.config.ts 優化
- Bundle 分割 (vendor, web3, ui)
- Lazy loading 實施
- 圖片優化支援

// 前端優化
- React Query 緩存策略
- 虛擬化列表 (@tanstack/react-virtual)
- Web Vitals 監控
```

### 4. CI/CD 設置 (Week 5)
```yaml
# .github/workflows/ci.yml
- 測試執行
- 類型檢查
- 覆蓋率報告
- E2E 測試 (Playwright)
```

## 📁 必須創建的文件

1. **project-analysis-report.md** - 詳細分析報告
2. **optimization-guide.md** - 技術實施指南
3. **setup-optimization.md** - 設置步驟
4. **quick-setup.sh** - 自動化腳本
5. **OPTIMIZATION_README.md** - 總覽指南

## 🎯 成功指標

- 測試覆蓋率: 80%+
- 頁面載入: <2秒
- Bundle 大小: <500KB
- CI/CD 流程: 完整運行
- TypeScript: 零錯誤

## ✅ 交付檢查

- [ ] 所有配置文件可直接運行
- [ ] 測試套件完整且通過
- [ ] 文檔清晰（繁體中文）
- [ ] 自動化腳本功能正常
- [ ] 效能指標達標

**重點**: 創建可立即執行的解決方案，包含詳細說明和最佳實踐。