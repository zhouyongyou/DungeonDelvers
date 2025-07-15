# RPC 代理設置指南

## 概述
為了保護 Alchemy API Key 不暴露給前端，我們使用了一個簡單的 Vercel API 路由作為代理。

## 工作原理
1. 前端在生產環境中請求 `/api/rpc`
2. Vercel API 路由接收請求，使用服務器端的 API Key
3. 將請求轉發到 Alchemy
4. 返回結果給前端

## 設置步驟

### 1. Vercel 環境變量設置
在 Vercel Dashboard 中設置以下環境變量（**不要**使用 `VITE_` 前綴）：

```
ALCHEMY_KEY=3lmTWjUVbFylAurhdU-rSUefTC-P4tKf
ALCHEMY_API_KEY_1=3lmTWjUVbFylAurhdU-rSUefTC-P4tKf
ALCHEMY_API_KEY_2=tiPlQVTwx4_2P98Pl7hb-LfzaTyi5HOn
ALCHEMY_API_KEY_3=QzXiHWkNRovjd_EeDRqVfR9rApUDiXRp
ALCHEMY_API_KEY_4=fB2BrBD6zFEhc6YoWxwuP5UQJ_ee-99M
# 不要使用 ALCHEMY_API_KEY_5，它不完整
```

### 2. 本地開發
本地開發時，在 `.env` 文件中設置：
```
VITE_ALCHEMY_KEY=你的開發key
```

### 3. 代碼結構
- `/api/rpc.ts` - Vercel API 路由，處理 RPC 代理
- `/src/config/smartRpcTransport.ts` - 前端 RPC 配置，生產環境使用代理

## 優勢
1. **安全性**：API Key 只存在於服務器端，不會暴露
2. **簡單性**：只有一個 API 文件，易於維護
3. **自動切換**：開發環境直連，生產環境使用代理
4. **輪換機制**：支持多個 API Key 自動輪換

## 注意事項
- 確保 Vercel 環境變量**不要**使用 `VITE_` 前綴
- API 路由已配置 CORS，支持跨域請求
- 支持所有標準的 JSON-RPC 方法