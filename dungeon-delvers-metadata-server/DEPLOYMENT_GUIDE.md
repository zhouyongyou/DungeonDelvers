# 🚀 Dungeon Delvers Metadata Server 部署指南

## 📋 優化概要

本次優化包含以下主要改進：

### ✅ 已實現的優化
- **Redis 分布式快取** - 大幅提升併發處理能力
- **DataLoader 批量查詢** - 減少 GraphQL 查詢次數
- **Nginx 反向代理** - 負載均衡和請求快取
- **增強健康檢查** - 全面系統狀態監控
- **SVG 模板快取** - 減少 SVG 生成時間
- **性能監控** - 即時指標收集
- **優化 Docker 配置** - 多階段構建和資源限制
- **Graceful Shutdown** - 優雅關閉處理

### 🎯 預期性能提升
- **響應時間**: 減少 60-80%
- **併發處理**: 提升 3-5 倍
- **快取命中率**: 提升至 90%+
- **資源使用**: 優化 30-40%

## 🛠️ 部署步驟

### 1. 準備環境

```bash
# 克隆專案
git clone <your-repo>
cd dungeon-delvers-metadata-server

# 複製環境變數範例
cp .env.example .env
```

### 2. 配置環境變數

編輯 `.env` 文件：

```bash
# 必要配置
NODE_ENV=production
PORT=3001

# Redis 配置
REDIS_HOST=redis
REDIS_PORT=6379

# The Graph API
VITE_THE_GRAPH_STUDIO_API_URL=https://api.studio.thegraph.com/query/your-subgraph-id/dungeon-delvers/version/latest

# 合約地址 (替換為實際地址)
VITE_MAINNET_HERO_ADDRESS=0x...
VITE_MAINNET_RELIC_ADDRESS=0x...
# ... 其他合約地址
```

### 3. 開發環境部署

```bash
# 安裝依賴
npm install

# 啟動開發環境 (包含 Redis)
docker-compose up -d

# 檢查服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f
```

### 4. 生產環境部署

```bash
# 構建生產鏡像
docker build -t dungeon-delvers-metadata:latest .

# 啟動生產環境 (包含監控)
docker-compose -f docker-compose.production.yml up -d

# 檢查服務狀態
docker-compose -f docker-compose.production.yml ps
```

### 5. 驗證部署

```bash
# 檢查健康狀態
curl http://localhost/health

# 測試 API 端點
curl http://localhost/api/hero/1
curl http://localhost/api/profile/1
curl http://localhost/api/vip/1

# 檢查快取統計
curl http://localhost/admin/cache/stats

# 檢查性能指標
curl http://localhost/admin/metrics
```

## 📊 監控和管理

### 服務端點

| 端點 | 描述 | 範例 |
|------|------|------|
| `/health` | 健康檢查 | `GET /health` |
| `/api/hero/:id` | 英雄元數據 | `GET /api/hero/1` |
| `/api/relic/:id` | 遺物元數據 | `GET /api/relic/1` |
| `/api/party/:id` | 隊伍元數據 | `GET /api/party/1` |
| `/api/profile/:id` | 玩家檔案元數據 | `GET /api/profile/1` |
| `/api/vip/:id` | VIP 卡元數據 | `GET /api/vip/1` |
| `/admin/cache/stats` | 快取統計 | `GET /admin/cache/stats` |
| `/admin/cache/clear` | 清除快取 | `POST /admin/cache/clear` |
| `/admin/metrics` | 性能指標 | `GET /admin/metrics` |

### 監控儀表板

生產環境包含以下監控服務：

- **Grafana**: http://localhost:3000 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **Consul**: http://localhost:8500

### 快取管理

```bash
# 查看快取統計
curl http://localhost/admin/cache/stats

# 清除所有快取
curl -X POST http://localhost/admin/cache/clear \
  -H "Content-Type: application/json" \
  -d '{"pattern": "*"}'

# 清除特定類型快取
curl -X POST http://localhost/admin/cache/clear \
  -H "Content-Type: application/json" \
  -d '{"pattern": "hero-*"}'

# 預熱快取
curl -X POST http://localhost/admin/cache/preload \
  -H "Content-Type: application/json" \
  -d '{"tokenIds": [1,2,3,4,5], "type": "hero"}'
```

## 🔧 故障排除

### 常見問題

**1. Redis 連接失敗**
```bash
# 檢查 Redis 狀態
docker-compose logs redis
docker-compose exec redis redis-cli ping

# 重啟 Redis
docker-compose restart redis
```

**2. GraphQL 查詢失敗**
```bash
# 檢查 The Graph 端點
curl "YOUR_GRAPH_API_URL" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ _meta { block { number } } }"}'

# 查看服務日誌
docker-compose logs metadata-server
```

**3. 性能問題**
```bash
# 檢查資源使用
docker stats

# 查看快取命中率
curl http://localhost/admin/cache/stats

# 查看性能指標
curl http://localhost/admin/metrics
```

### 日誌查看

```bash
# 查看所有服務日誌
docker-compose logs -f

# 查看特定服務日誌
docker-compose logs -f metadata-server
docker-compose logs -f nginx
docker-compose logs -f redis

# 查看最近的錯誤
docker-compose logs --tail=100 metadata-server | grep ERROR
```

## 🔄 維護操作

### 定期維護

```bash
# 清理 Docker 資源
docker system prune -a

# 備份 Redis 數據
docker-compose exec redis redis-cli BGSAVE

# 更新服務
docker-compose pull
docker-compose up -d --build

# 檢查服務健康
docker-compose ps
```

### 擴展服務

```bash
# 水平擴展 metadata-server
docker-compose up -d --scale metadata-server=3

# 查看負載均衡
docker-compose logs nginx
```

### 監控警報

建議設置以下監控警報：

- API 響應時間 > 2秒
- 快取命中率 < 80%
- 記憶體使用率 > 80%
- GraphQL 錯誤率 > 5%

## 🚀 性能調優

### Redis 優化

```bash
# 調整 Redis 配置
docker-compose exec redis redis-cli CONFIG SET maxmemory 1gb
docker-compose exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Nginx 優化

```bash
# 調整 Nginx 配置
# 編輯 nginx.conf 中的 worker_processes 和 worker_connections
# 重載配置
docker-compose exec nginx nginx -s reload
```

### 應用程式優化

```bash
# 預熱常用 NFT 快取
curl -X POST http://localhost/admin/cache/preload \
  -H "Content-Type: application/json" \
  -d '{"tokenIds": [1,2,3,4,5,6,7,8,9,10], "type": "hero"}'

# 定期清理過期快取
curl -X POST http://localhost/admin/cache/clear \
  -H "Content-Type: application/json" \
  -d '{"pattern": "expired-*"}'
```

## 📈 效能測試

### 負載測試

```bash
# 安裝 artillery
npm install -g artillery

# 基本負載測試
artillery quick --count 10 --num 100 http://localhost/api/hero/1

# 持續測試
artillery run loadtest.yml
```

### 快取測試

```bash
# 測試快取命中
time curl http://localhost/api/hero/1  # 第一次請求
time curl http://localhost/api/hero/1  # 第二次請求 (應該更快)

# 查看快取統計
curl http://localhost/admin/cache/stats
```

## 📞 支援

如果遇到問題，請：

1. 檢查服務日誌
2. 查看健康檢查端點
3. 查看監控儀表板
4. 聯繫技術支援

---

*此部署指南基於優化後的 Dungeon Delvers Metadata Server v2.0*