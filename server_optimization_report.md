# Dungeon Delvers 伺服器優化分析報告

## 📊 系統架構概覽

您的系統包含以下核心組件：

1. **Metadata Server** (Express.js + Node.js)
   - 動態 NFT 元數據生成
   - SVG 圖像即時渲染
   - GraphQL 數據查詢
   - 多層快取機制

2. **Frontend** (React + Vite)
   - 現代化前端框架
   - 代碼分割配置
   - Web3 整合

3. **GraphQL Subgraph**
   - The Graph 協議整合
   - 區塊鏈數據索引

4. **API 靜態資源**
   - JSON 格式的英雄數據

## 🚀 優化建議

### 1. Metadata Server 優化

#### 🔥 關鍵改進點

**A. 快取策略優化**
- ✅ 已實現多層快取 (NodeCache)
- ⚠️ **改進建議**: 添加 Redis 作為分布式快取
- ⚠️ **改進建議**: 實現快取預熱機制

```javascript
// 建議添加 Redis 配置
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
});

// 預熱常用 NFT 快取
const preloadPopularNFTs = async () => {
  const popularTokenIds = await getPopularTokenIds();
  await Promise.allSettled(
    popularTokenIds.map(id => generateMetadata(id))
  );
};
```

**B. SVG 生成優化**
- ✅ SVG 生成邏輯已模組化
- ⚠️ **改進建議**: 使用 SVG 模板快取

```javascript
// SVG 模板快取
const svgTemplateCache = new Map();

const getCachedSVGTemplate = (type, rarity) => {
  const key = `${type}_${rarity}`;
  if (!svgTemplateCache.has(key)) {
    svgTemplateCache.set(key, generateSVGTemplate(type, rarity));
  }
  return svgTemplateCache.get(key);
};
```

**C. GraphQL 查詢優化**
- ✅ 已實現重試機制
- ✅ 指數退避策略
- ⚠️ **改進建議**: 添加查詢合併 (DataLoader)

```javascript
import DataLoader from 'dataloader';

const heroLoader = new DataLoader(async (tokenIds) => {
  // 批量查詢減少 GraphQL 請求
  const { heroes } = await graphClient.request(BATCH_HEROES_QUERY, { 
    ids: tokenIds 
  });
  return tokenIds.map(id => heroes.find(h => h.id === id));
});
```

#### 🔧 性能監控改進

**A. 增強日誌結構**
```javascript
// 添加性能指標
const performanceMetrics = {
  requestDuration: new Map(),
  cacheHitRate: 0,
  graphqlErrors: 0,
  svgGenerationTime: new Map()
};

// APM 整合建議
const apm = require('elastic-apm-node').start({
  serviceName: 'dungeon-delvers-metadata',
  secretToken: process.env.ELASTIC_APM_SECRET_TOKEN,
  serverUrl: process.env.ELASTIC_APM_SERVER_URL
});
```

**B. 健康檢查增強**
```javascript
app.get('/health', async (req, res) => {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      graphql: await checkGraphQLHealth(),
      redis: await checkRedisHealth(),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      cacheStats: getCacheStatistics()
    }
  };
  
  const isHealthy = Object.values(checks.checks)
    .every(check => check.status === 'ok');
    
  res.status(isHealthy ? 200 : 503).json(checks);
});
```

### 2. 基礎設施優化

#### 🏗️ Docker 容器優化

**當前 Dockerfile 已實現最佳實踐：**
- ✅ Alpine Linux 基礎鏡像
- ✅ 多階段構建
- ✅ 非 root 用戶
- ✅ 健康檢查

**建議改進：**
```dockerfile
# 多階段構建優化
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS runtime
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
WORKDIR /app

# 複製構建產物而非源碼
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs src ./src
COPY --chown=nodejs:nodejs package*.json ./

USER nodejs
EXPOSE 3001

# 優化啟動命令
CMD ["node", "--max-old-space-size=512", "src/index.js"]
```

#### 📦 部署架構建議

**A. 添加 Nginx 反向代理**
```nginx
# nginx.conf
upstream metadata_server {
    server metadata-server:3001;
    keepalive 32;
}

server {
    listen 80;
    
    # 靜態資源快取
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API 請求
    location /api/ {
        proxy_pass http://metadata_server;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_cache_valid 200 5m;
    }
    
    # 壓縮設定
    gzip on;
    gzip_types text/plain application/json image/svg+xml;
}
```

**B. 水平擴展配置**
```yaml
# docker-compose.production.yml
version: '3.8'
services:
  metadata-server:
    image: dungeon-delvers-metadata:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      
  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    depends_on:
      - metadata-server
```

### 3. Frontend 優化

#### ⚡ Vite 配置已優化
- ✅ 代碼分割 (React, Web3, Apollo, UI 分離)
- ✅ Terser 壓縮
- ✅ 控制台日誌移除

**建議額外改進：**
```typescript
// vite.config.ts 追加配置
export default defineConfig({
  // PWA 支援
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
  
  // 預載入優化
  build: {
    rollupOptions: {
      output: {
        // 動態導入優化
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react-vendor';
            if (id.includes('wagmi') || id.includes('viem')) return 'web3-vendor';
            if (id.includes('@apollo')) return 'apollo-vendor';
            return 'vendor';
          }
        }
      }
    }
  }
});
```

### 4. GraphQL Subgraph 優化

#### 📈 查詢效率提升

**A. 索引優化建議**
```graphql
# schema.graphql 建議改進
type Hero @entity {
  id: ID!
  tokenId: BigInt! @index  # 添加索引
  owner: Player! @index    # 添加索引
  rarity: Int! @index      # 熱查詢字段索引
  power: BigInt!
  contractAddress: Bytes!
  createdAt: BigInt! @index
}
```

**B. 實體關聯優化**
```typescript
// 批量載入器設計
export function handleHeroMinted(event: HeroMinted): void {
  let entity = new Hero(
    event.address.toHex() + "-" + event.params.tokenId.toString()
  );
  
  // 優化：減少外部調用
  entity.tokenId = event.params.tokenId;
  entity.rarity = event.params.rarity;
  entity.power = event.params.power;
  entity.contractAddress = event.address;
  entity.createdAt = event.block.timestamp;
  
  // 延遲載入玩家資料
  entity.owner = event.params.to.toHex();
  entity.save();
  
  // 更新玩家統計 (批量)
  updatePlayerStats(event.params.to.toHex());
}
```

### 5. 監控與報警

#### 📊 推薦監控指標

**A. 應用指標**
- API 響應時間 (p95, p99)
- 快取命中率
- GraphQL 查詢延遲
- SVG 生成時間
- 錯誤率

**B. 基礎設施指標**
- CPU 使用率
- 記憶體使用率
- 網路 I/O
- 磁碟 I/O

**C. 業務指標**
- NFT 元數據請求量
- 熱門 Token ID
- 用戶訪問模式

#### 🚨 推薦警報規則
```yaml
# prometheus.yml 範例
groups:
  - name: dungeon-delvers-alerts
    rules:
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 2
        labels:
          severity: warning
        annotations:
          summary: "API 響應時間過高"
          
      - alert: LowCacheHitRate
        expr: cache_hit_rate < 0.8
        labels:
          severity: warning
        annotations:
          summary: "快取命中率過低"
```

## 🎯 優先級實施建議

### 高優先級 (立即實施)
1. **添加 Redis 分布式快取**
2. **GraphQL 查詢合併 (DataLoader)**
3. **Nginx 反向代理部署**
4. **增強健康檢查**

### 中優先級 (短期內實施)
1. **SVG 模板快取**
2. **監控指標收集**
3. **水平擴展配置**
4. **PWA 支援**

### 低優先級 (長期規劃)
1. **APM 整合**
2. **CDN 整合**
3. **更複雜的快取策略**
4. **自動擴展**

## 💰 預期效益

實施上述優化後，預期可達成：

- **響應時間**: 減少 60-80%
- **併發處理能力**: 提升 3-5 倍
- **系統穩定性**: 顯著提升
- **運營成本**: 降低 30-40%
- **用戶體驗**: 大幅改善

## 📋 實施檢查清單

- [ ] 設置 Redis 分布式快取
- [ ] 實施 GraphQL DataLoader
- [ ] 部署 Nginx 反向代理
- [ ] 配置監控與警報
- [ ] 添加 SVG 模板快取
- [ ] 實施水平擴展
- [ ] 性能測試與調優
- [ ] 文檔更新

---

*此報告基於 2024 年最佳實踐，建議根據實際業務需求調整實施優先級。*