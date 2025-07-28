# 歸檔的配置檔案

此目錄包含舊版本的配置檔案，僅供歷史參考。

## 檔案列表

- `contract-config-v2-2025-01-17.json` - V2 版本的合約配置（2025-01-17 部署）
- `v15.json`, `v18.json`, `v19.json` - 舊版 CDN 配置檔案
- `dist-configs/` - 從 dist 目錄歸檔的配置檔案

## 注意事項

⚠️ **這些配置檔案已過時，請勿使用！**

當前活躍的配置：
- V25 配置：`/public/config/v25.json`
- 最新配置：`/public/config/latest.json`
- 共享配置：`/shared-config.json`

所有配置更新請使用：
```bash
cd /Users/sotadic/Documents/DungeonDelversContracts
node scripts/active/v25-sync-all.js
```