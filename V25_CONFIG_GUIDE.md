# V25 統一配置管理指南

## 🎯 核心理念
**單一事實來源** - 所有配置都來自 `.env.v25` 文件

## 📁 文件結構
```
.env.v25                    # 主配置文件（唯一編輯此文件）
├── .env                    # 自動生成（前端）
├── .env.local             # 自動更新（前端本地）
├── shared-config.json     # 自動更新（共享配置）
└── scripts/sync-config.cjs # 同步腳本
```

## 🚀 使用流程

### 1. 更新配置
編輯 `.env.v25` 文件，修改合約地址或版本：
```bash
# 只需要在這裡修改
VITE_HERO_ADDRESS=0x新地址
VITE_SUBGRAPH_VERSION=v3.8.2
```

### 2. 同步所有配置
```bash
npm run config:sync
```

### 3. 驗證配置
```bash
npm run config:validate
```

## 📋 支援的配置同步

### ✅ 自動同步到：
- 前端 `.env` 和 `.env.local`
- 後端 `contracts.json` 
- 共享配置 `shared-config.json`
- 子圖配置（透過 shared-config.json）

### 🔄 同步覆蓋範圍：
- 所有合約地址
- 子圖 URL 和版本
- VRF 配置參數
- 網路和 RPC 設定

## 🛠️ 命令列工具

```bash
# 完整同步（推薦）
npm run config:sync

# 僅驗證（不修改文件）
npm run config:validate
```

## ⚡ 優勢

### 傳統方式問題：
- 需要手動更新 3-5 個文件
- 容易遺漏或輸入錯誤
- 難以驗證一致性
- 版本混亂

### 統一管理優勢：
- ✅ 單文件更新
- ✅ 自動同步
- ✅ 配置驗證
- ✅ 版本追蹤
- ✅ 錯誤檢測

## 🔧 配置文件說明

### `.env.v25` 格式
```bash
# 合約地址（必需 0x 開頭 + 40 位十六進位）
VITE_HERO_ADDRESS=0x671d937b171e2ba2c4dc23c133b07e4449f283ef

# 子圖配置
VITE_SUBGRAPH_VERSION=v3.8.1
VITE_SUBGRAPH_URL=https://api.studio.thegraph.com/...

# VRF 設定
VITE_VRF_SUBSCRIPTION_ID=29062
```

## 🚨 注意事項

1. **只編輯 `.env.v25`**，其他文件會自動生成
2. **地址格式**：必須是 `0x` 開頭的 40 位十六進位
3. **重新啟動**：同步後需要重新啟動開發服務器
4. **版本控制**：`.env.v25` 應該加入 git 追蹤

## 📊 配置驗證

腳本會自動檢查：
- ✅ 必要配置項存在
- ✅ 地址格式正確
- ✅ 版本一致性
- ⚠️ 潛在問題警告

## 🎉 部署新版本流程

1. 更新 `.env.v25` 中的合約地址
2. 執行 `npm run config:sync`
3. 檢查同步結果
4. 重新啟動服務
5. 驗證功能正常

**一次配置，全域同步！**