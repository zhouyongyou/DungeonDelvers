# TypeScript 錯誤說明

## 🚨 錯誤信息
```
Cannot find global type 'CallableFunction'.
Cannot find global type 'NewableFunction'.
```

## 📋 問題分析

### 這些錯誤是什麼？
- 這是 IDE (VS Code) 的 TypeScript 語言服務錯誤
- 與我們修復的 GraphQL 查詢問題**完全無關**
- 不影響 subgraph 的實際功能

### 為什麼會出現？
1. **The Graph 的特殊配置**
   - `@graphprotocol/graph-ts` 有自己的 TypeScript 配置
   - 它禁用了某些全局類型定義
   - 這是為了避免與 AssemblyScript 衝突

2. **IDE 與實際運行環境的差異**
   - IDE 使用標準 TypeScript 檢查
   - 實際運行使用 AssemblyScript 編譯器
   - 兩者的類型系統不完全兼容

## ✅ 解決方案

### 方案 1：忽略 IDE 錯誤（推薦）
- 這些錯誤不影響實際功能
- subgraph 可以正常構建和部署
- 可以安全地忽略這些錯誤

### 方案 2：使用 AssemblyScript 插件
- 安裝 AssemblyScript VS Code 插件
- 使用 AssemblyScript 的語言服務
- 避免 TypeScript 的類型檢查

### 方案 3：修改 IDE 設置
在 VS Code 的 workspace 設置中添加：
```json
{
  "typescript.validate.enable": false,
  "typescript.suggest.enabled": false
}
```

## 🎯 重要提醒

### ✅ 不影響的功能
- subgraph 構建 (`npm run build`)
- subgraph 部署 (`npm run deploy`)
- 數據索引和查詢
- GraphQL API 功能

### 🔧 我們修復的真正問題
- GraphQL 查詢字段名錯誤 (`heroes` → `heros`)
- 前端查詢語法問題
- Metadata Server 查詢問題

## 📊 驗證方法

### 1. 測試構建
```bash
npm run build
```
如果構建成功，說明 TypeScript 錯誤不影響功能。

### 2. 測試部署
```bash
npm run deploy
```
如果部署成功，說明一切正常。

### 3. 測試查詢
使用正確的查詢格式測試 GraphQL API。

## 🎉 結論

**這些 TypeScript 錯誤可以安全忽略！**

- 它們是 IDE 顯示問題，不是功能問題
- 不影響我們修復的 GraphQL 查詢問題
- subgraph 功能完全正常
- 重點是測試修復後的查詢功能 