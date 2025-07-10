# ★ 優化：多階段構建
FROM node:18-alpine AS builder

# 設定工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝所有依賴 (包括開發依賴)
RUN npm ci && npm cache clean --force

# 複製源代碼
COPY src ./src

# 運行時階段
FROM node:18-alpine AS runtime

# 安裝 dumb-init 用於正確的信號處理
RUN apk add --no-cache dumb-init

# 創建非 root 用戶
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 設定工作目錄
WORKDIR /app

# 從 builder 階段複製構建產物
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs src ./src
COPY --chown=nodejs:nodejs package*.json ./

# 切換到非 root 用戶
USER nodejs

# 暴露端口
EXPOSE 3001

# 優化健康檢查 (使用更輕量的檢查)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# 使用 dumb-init 和優化的 Node.js 參數
CMD ["dumb-init", "node", "--max-old-space-size=512", "--enable-source-maps", "src/index.js"]