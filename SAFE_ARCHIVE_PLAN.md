# 安全封存計劃

## 📋 概述
本文檔列出了可以安全封存的文件和資料夾，避免影響項目運行。

## 🟢 第一階段 - 高安全性封存

### 1. 備份文件清理
```bash
# 找出所有備份文件
find . -name "*.backup-*" -type f | wc -l

# 創建備份文件清單
find . -name "*.backup-*" -type f > backup_files_list.txt

# 可以安全刪除這些備份文件
```

### 2. 舊版本文件
```bash
mkdir -p archive/2025-01-28-cleanup/

# 移動舊版本合約
mv contracts/_old/ archive/2025-01-28-cleanup/
mv contracts/old/ archive/2025-01-28-cleanup/

# 移動調試文件
mv debug-*.js archive/2025-01-28-cleanup/
mv test-*.js archive/2025-01-28-cleanup/
mv manual-*.cjs archive/2025-01-28-cleanup/
mv *.log archive/2025-01-28-cleanup/ 2>/dev/null || true
```

### 3. 文檔整理
```bash
# 移動過時的指南文檔
mkdir -p archive/2025-01-28-cleanup/old-docs/
mv *_GUIDE.md archive/2025-01-28-cleanup/old-docs/ 2>/dev/null || true
mv *_REPORT.md archive/2025-01-28-cleanup/old-docs/ 2>/dev/null || true
mv *_CHECKLIST.md archive/2025-01-28-cleanup/old-docs/ 2>/dev/null || true
```

## 🟡 第二階段 - 謹慎封存

### 1. 測試和調試組件
```bash
# 移動測試組件（需要確認不再使用）
mkdir -p archive/2025-01-28-cleanup/test-components/
# mv src/test-*.tsx archive/2025-01-28-cleanup/test-components/
# mv src/DiagnosticApp.tsx archive/2025-01-28-cleanup/test-components/
# mv src/MinimalApp.tsx archive/2025-01-28-cleanup/test-components/
# mv src/StableApp.tsx archive/2025-01-28-cleanup/test-components/
```

### 2. 未使用的配置
```bash
# 檢查是否還在使用這些配置
# mv shared-config.json.backup-* archive/2025-01-28-cleanup/
```

## ❌ 不要封存的關鍵文件

### 必須保留的文件夾
- `src/` - 主要源碼
- `public/` - 靜態資源  
- `api/` - API 端點
- `node_modules/` - 依賴包
- `DDgraphql/dungeon-delvers/` - 子圖配置

### 必須保留的配置文件
- `package.json`
- `vite.config.ts` 
- `tsconfig.json`
- `vercel.json`
- `render.yaml`
- `tailwind.config.js`

### 必須保留的腳本
- `scripts/` 中活躍使用的腳本
- 部署相關腳本

## 🔍 封存前檢查清單

- [ ] 確認備份文件不包含唯一數據
- [ ] 測試應用仍能正常運行
- [ ] 檢查 CI/CD 不依賴被封存的文件
- [ ] 確認團隊成員不需要被封存的文件
- [ ] 創建封存清單文檔

## 📊 預期效果

### 磁盤空間節省
- 備份文件：預計 50-100MB
- 舊版本文件：預計 20-50MB  
- 總節省：70-150MB

### 項目整潔度
- 減少 80% 的過時文件
- 提升開發者體驗
- 降低混淆風險

## ⚠️ 安全提醒

1. **執行前備份**：先創建整個項目的備份
2. **分階段執行**：不要一次性封存所有文件
3. **測試驗證**：每個階段後都要測試應用功能
4. **保留日誌**：記錄封存的文件清單，方便回滾

## 📞 聯繫信息

**維護者**: Claude Code Assistant  
**文檔版本**: 1.0  
**創建時間**: 2025-07-28  

如需恢復任何封存文件，請參考 `archive/2025-01-28-cleanup/` 資料夾中的備份。