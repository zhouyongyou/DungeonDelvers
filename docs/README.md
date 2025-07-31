# DungeonDelvers 技術文檔

## 📚 文檔索引

### 核心技術
- [GraphQL Code Generator 完整指南](./GraphQL-CodeGenerator-Guide.md) - 類型安全的 GraphQL 開發環境
- [GraphQL Code Generator 對比示例](./graphql-codegen-comparison.md) - 傳統方式 vs 自動生成方式
- [Code Generator 設置成功記錄](./codegen-setup-success.md) - 設置過程記錄

### 開發指南
- [前端開發指南](../CLAUDE.md) - React + TypeScript + Web3 開發規範
- [子圖開發指南](../DDgraphql/dungeon-delvers/CLAUDE.md) - The Graph 子圖開發

### 最佳實踐
- [RPC 監控系統](../CLAUDE.md#rpc-監控系統) - 全面的 RPC 請求監控和優化
- [配置管理系統](../CLAUDE.md#-配置管理系統) - 自動化配置同步機制

## 🛠 開發工具

### GraphQL 相關
```bash
# 生成 GraphQL 類型
npm run codegen

# 開發時監聽變化
npm run codegen:watch
```

### 類型檢查
```bash
# TypeScript 類型檢查
npm run type-check

# ESLint 檢查
npm run lint
```

### 測試
```bash
# 運行測試
npm run test

# 測試覆蓋率
npm run test:coverage
```

## 🎯 快速開始

1. **設置開發環境**
   ```bash
   npm install
   npm run codegen  # 生成 GraphQL 類型
   npm run dev      # 啟動開發服務器
   ```

2. **開發新功能**
   - 參考 [GraphQL Code Generator 指南](./GraphQL-CodeGenerator-Guide.md)
   - 使用類型安全的 GraphQL 查詢
   - 遵循現有的程式碼風格

3. **提交程式碼**
   ```bash
   npm run lint     # 檢查程式碼風格
   npm run type-check  # 檢查類型
   npm run test     # 運行測試
   ```

## 📈 技術架構

### 前端技術棧
- **框架**: React 18 + TypeScript
- **構建工具**: Vite
- **Web3**: wagmi v2 + viem
- **樣式**: Tailwind CSS
- **狀態管理**: Zustand
- **GraphQL**: 自動生成類型 + React Query

### 後端服務
- **區塊鏈**: BSC (Binance Smart Chain)
- **索引服務**: The Graph (去中心化網路)
- **智能合約**: Solidity
- **開發工具**: Foundry

## 🔗 相關連結

- [DungeonDelvers 官網](https://dungeondelvers.xyz)
- [The Graph 端點](https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs)
- [智能合約倉庫](../../DungeonDelversContracts/)

---

*保持文檔更新，讓開發更高效！* 🚀