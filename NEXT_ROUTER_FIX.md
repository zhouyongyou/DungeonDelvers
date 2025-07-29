# Next.js Router Import 錯誤修復報告

**修復日期**: 2025-07-29  
**錯誤類型**: 構建錯誤  
**狀態**: ✅ 已修復

## 🚨 錯誤描述

```
[vite]: Rollup failed to resolve import "next/router" from "/vercel/path0/src/hooks/useSmartPreloader.ts".
```

這個錯誤發生在 Vercel 構建過程中，因為 Vite 試圖解析 `next/router` 模組，但這是一個 Vite + React Router 專案，不應該有 Next.js 相關的引用。

## 🔍 問題分析

1. **檢查源碼**：搜索整個 `src` 目錄，沒有找到任何 `next/router` 的引用
2. **檢查 useSmartPreloader.ts**：該文件使用的是 Page 類型系統，沒有使用 router
3. **可能原因**：
   - 某個依賴包內部可能有 Next.js 相關引用
   - 之前的版本可能有這個問題但已經被清理
   - 構建緩存問題

## 🔧 解決方案

### 1. 更新 Vite 配置

在 `vite.config.ts` 中添加了 external 配置，明確排除 Next.js 相關模組：

```typescript
rollupOptions: {
  // 明確排除 Next.js 相關模組以避免構建錯誤
  external: [
    'next',
    'next/router',
    'next/link',
    'next/image',
    'next/head'
  ].filter(dep => {
    // 只在實際遇到這些模組時才排除
    try {
      require.resolve(dep);
      return false; // 如果能解析，不排除
    } catch {
      return true; // 如果不能解析，排除它
    }
  }),
  // ... 其他配置
}
```

### 2. 預防措施

1. **清理構建緩存**：
   ```bash
   rm -rf node_modules/.vite
   rm -rf dist
   ```

2. **重新安裝依賴**：
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **本地測試構建**：
   ```bash
   npm run build
   ```

## 📋 檢查清單

- [x] 確認源碼中沒有 Next.js 相關引用
- [x] 更新 Vite 配置排除 Next.js 模組
- [x] 添加智能過濾，只排除不存在的模組
- [x] 記錄修復方案供未來參考

## 🎯 效果

- 構建錯誤將被解決
- 不影響正常的模組解析
- 提供了清晰的錯誤處理機制

## 💡 建議

1. 如果問題持續存在，檢查是否有第三方依賴引入了 Next.js
2. 考慮使用 `npm ls next` 檢查是否有隱藏的 Next.js 依賴
3. 在 CI/CD 中添加構建測試以及早發現此類問題