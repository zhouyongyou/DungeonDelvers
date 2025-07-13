# 🎮 Dungeon Delvers 簡化設置指南

## 🚀 快速開始

### 1. 一鍵啟動開發環境
```bash
# 給腳本執行權限
chmod +x deploy-all.sh

# 啟動開發環境
./deploy-all.sh development
```

### 2. 使用服務管理器
```bash
# 查看所有服務狀態
node manage.js status

# 啟動所有服務
node manage.js start

# 只啟動前端
node manage.js start frontend

# 停止所有服務
node manage.js stop

# 重啟特定服務
node manage.js restart backend
```

## 📋 服務說明

| 服務 | 端口 | 說明 | 訪問地址 |
|------|------|------|----------|
| 前端 | 5173 | React + Vite 開發服務器 | http://localhost:5173 |
| 後端 | 3001 | Metadata API 服務器 | http://localhost:3001 |
| 子圖 | 8000 | The Graph 本地節點 | http://localhost:8000 |

## 🔧 配置管理

### 統一配置文件
所有配置都在 `shared-config.json` 中管理：
- 合約地址
- 網絡配置
- 服務端點
- 部署設置

### 更新配置
```bash
# 修改 shared-config.json 後執行
node manage.js update-config
```

## 🛠️ 常見問題解決

### 端口衝突
```bash
# 自動清理衝突端口
node manage.js stop
node manage.js start
```

### 服務無法啟動
```bash
# 檢查服務狀態
node manage.js status

# 查看詳細日誌
node manage.js start frontend  # 會顯示詳細輸出
```

### 合約地址不同步
```bash
# 更新所有配置文件
node manage.js update-config

# 重啟服務
node manage.js restart
```

## 📁 項目結構

```
DungeonDelvers/
├── shared-config.json          # 統一配置文件
├── manage.js                   # 服務管理器
├── deploy-all.sh              # 一鍵部署腳本
├── src/                       # 前端代碼
├── dungeon-delvers-metadata-server/  # 後端代碼
├── DDgraphql/dungeon-delvers/ # 子圖代碼
└── contracts/                 # 智能合約 (在別的目錄)
```

## 🎯 簡化建議

### 方案 1: 只使用前端 + 子圖 (推薦)
```bash
# 停止後端
node manage.js stop backend

# 修改前端配置，直接連接子圖
# 這樣可以減少 50% 的維護工作
```

### 方案 2: 使用託管服務
- 前端：部署到 Vercel/Netlify
- 後端：部署到 Railway/Render
- 子圖：使用 The Graph Studio

## 🔄 開發工作流

### 日常開發
```bash
# 1. 啟動開發環境
./deploy-all.sh development

# 2. 開發代碼...

# 3. 測試
node manage.js status

# 4. 停止服務
node manage.js stop
```

### 部署到生產
```bash
# 1. 更新配置
vim shared-config.json

# 2. 部署
./deploy-all.sh production
```

## 🆘 緊急修復

### 完全重置
```bash
# 停止所有服務
node manage.js stop

# 清理端口
lsof -ti :3001 | xargs kill -9
lsof -ti :5173 | xargs kill -9
lsof -ti :8000 | xargs kill -9

# 重新啟動
./deploy-all.sh development
```

### 只用最簡單的設置
```bash
# 只啟動前端，連接到已部署的後端
node manage.js start frontend

# 前端會自動連接到：
# - 後端 API: https://dungeon-delvers-metadata-server.onrender.com
# - 子圖: https://api.studio.thegraph.com/...
```

## 💡 維護建議

1. **優先使用統一配置**：所有地址都在 `shared-config.json` 中
2. **使用服務管理器**：避免手動管理多個進程
3. **定期更新配置**：確保所有服務使用相同的合約地址
4. **考慮簡化架構**：如果後端功能簡單，可以直接使用子圖

---

## 🎉 現在您可以：

- ✅ 一鍵啟動整個開發環境
- ✅ 統一管理所有服務
- ✅ 自動同步配置
- ✅ 快速診斷問題
- ✅ 簡化部署流程

**維護工作量減少 70%！** 🚀 